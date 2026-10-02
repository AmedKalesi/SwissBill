/**
 * Stripe abonelik servisi (CHF).
 */
import Stripe from "stripe";
import { env } from "../config/env.js";
import type { Plan } from "@swissbill/shared";

let stripeClient: Stripe | null = null;

/** Stripe istemcisini döner (yapılandırılmamışsa null). */
export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

/** Plan adından Stripe fiyat ID'sini döner. */
export function getPriceId(plan: Plan): string | null {
  switch (plan) {
    case "pro":
      return env.STRIPE_PRICE_PRO ?? null;
    case "business":
      return env.STRIPE_PRICE_BUSINESS ?? null;
    default:
      return null;
  }
}

/** Yeni Stripe müşterisi oluşturur. */
export async function createStripeCustomer(
  email: string,
  userId: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

/** Checkout oturumu oluşturur (abonelik başlatma). */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  // NOT: `payment_method_types` gönderilmez. Stripe hesabında "Managed Payments"
  // varsayılan olarak etkin olduğunda bu parametre reddedilir
  // ("Unsupported parameter: payment_method_types"). Ödeme yöntemleri Stripe
  // tarafından otomatik yönetilir.
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session.url;
}

/** Müşteri portalı oturumu oluşturur (abonelik yönetimi). */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

/** Stripe webhook imzasını doğrular ve olayı döner. */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return null;

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}
