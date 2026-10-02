/**
 * Abonelik (billing) rotaları: plan bilgisi, checkout, portal, webhook.
 */
import type { FastifyInstance } from "fastify";
import { planSchema, PLAN_PRICES } from "@flinkli/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import {
  createCheckoutSession,
  createPortalSession,
  createStripeCustomer,
  getPriceId,
  getStripe,
  constructWebhookEvent,
} from "../services/stripe.service.js";
import { getPlanUsage } from "../services/invoice.service.js";

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  /** Mevcut plan bilgisi */
  app.get(
    "/plan",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.user.sub },
      });
      const plan = sub?.plan ?? "free";
      return reply.send({
        data: {
          plan,
          status: sub?.status ?? "active",
          currentPeriodEnd: sub?.currentPeriodEnd ?? null,
          price: PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? 0,
          stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
        },
      });
    },
  );

  /** Mevcut abonelik bilgisi (web BillingPage tarafından kullanılır) */
  app.get(
    "/subscription",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.user.sub },
      });
      const plan = (sub?.plan ?? "free") as keyof typeof PLAN_PRICES;
      return reply.send({
        data: {
          id: sub?.id ?? null,
          userId: request.user.sub,
          plan,
          status: sub?.status ?? "active",
          stripeCustomerId: sub?.stripeCustomerId ?? null,
          stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
          currentPeriodEnd: sub?.currentPeriodEnd ?? null,
          price: PLAN_PRICES[plan] ?? 0,
          stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
        },
      });
    },
  );

  /** Plan kullanım özeti (limit göstergeleri için) */
  app.get(
    "/usage",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const usage = await getPlanUsage(request.user.sub);
      return reply.send({ data: usage });
    },
  );

  /** Checkout oturumu başlat (plan yükseltme) */
  app.post(
    "/checkout",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { plan } = request.body as { plan: string };
      const parsedPlan = planSchema.parse(plan);

      if (parsedPlan === "free") {
        throw new AppError(
          "INVALID_PLAN",
          "Ücretsiz plan için ödeme gerekmez",
          400,
        );
      }

      const priceId = getPriceId(parsedPlan);
      if (!priceId) {
        throw new AppError(
          "STRIPE_NOT_CONFIGURED",
          "Stripe fiyatlandırması yapılandırılmamış",
          503,
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        include: { subscription: true },
      });
      if (!user) {
        throw new AppError("USER_NOT_FOUND", "Kullanıcı bulunamadı", 404);
      }

      let customerId = user.subscription?.stripeCustomerId ?? null;
      if (!customerId) {
        customerId = await createStripeCustomer(user.email, user.id);
        if (customerId) {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: { userId: user.id, stripeCustomerId: customerId },
            update: { stripeCustomerId: customerId },
          });
        }
      }

      if (!customerId) {
        throw new AppError(
          "STRIPE_NOT_CONFIGURED",
          "Stripe yapılandırılmamış",
          503,
        );
      }

      const url = await createCheckoutSession({
        customerId,
        priceId,
        successUrl: `${env.APP_URL}/billing?success=1`,
        cancelUrl: `${env.APP_URL}/billing?canceled=1`,
      });

      return reply.send({ data: { url } });
    },
  );

  /** Müşteri portalı (abonelik yönetimi) */
  app.post(
    "/portal",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.user.sub },
      });
      if (!sub?.stripeCustomerId) {
        throw new AppError(
          "NO_SUBSCRIPTION",
          "Aktif abonelik bulunamadı",
          404,
        );
      }

      const url = await createPortalSession({
        customerId: sub.stripeCustomerId,
        returnUrl: `${env.APP_URL}/billing`,
      });

      return reply.send({ data: { url } });
    },
  );

  /** Stripe webhook — abonelik durumunu senkronize eder */
  app.post("/webhook", async (request, reply) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw new AppError("INVALID_SIGNATURE", "İmza eksik", 400);
    }

    const event = constructWebhookEvent(
      request.rawBody as Buffer,
      signature,
    );
    if (!event) {
      throw new AppError(
        "STRIPE_NOT_CONFIGURED",
        "Stripe webhook yapılandırılmamış",
        503,
      );
    }

    const stripe = getStripe();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (stripe && subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = stripeSub.items.data[0]?.price.id;
          const plan =
            priceId === env.STRIPE_PRICE_BUSINESS ? "business" : "pro";

          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              plan,
              status: stripeSub.status,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(
                stripeSub.current_period_end * 1000,
              ),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        const customerId = stripeSub.customer as string;
        const priceId = stripeSub.items.data[0]?.price.id;
        const isActive = stripeSub.status === "active";

        const plan = !isActive
          ? "free"
          : priceId === env.STRIPE_PRICE_BUSINESS
            ? "business"
            : "pro";

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan,
            status: stripeSub.status,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });
        break;
      }

      default:
        app.log.info(`İşlenmeyen Stripe olayı: ${event.type}`);
    }

    return reply.send({ received: true });
  });
}
