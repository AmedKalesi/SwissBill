/**
 * Müşteri portalı rotaları.
 *
 * - Kimlik doğrulamalı yönetim: portal erişimi oluştur/iptal et, listele.
 * - Herkese açık görüntüleme: token ile müşterinin fatura/teklif geçmişi.
 */
import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { signatureSchema } from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";

/** Güvenli, URL-güvenli rastgele token üretir. */
function generatePortalToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function portalRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Bir müşteri için portal erişimlerini listele */
  app.get("/customer/:customerId", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, company: { userId: request.user.sub } },
    });
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }

    const portals = await prisma.customerPortal.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: portals });
  });

  /** Yeni portal erişimi oluştur (veya mevcut aktif olanı döner) */
  app.post("/customer/:customerId", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const body = (request.body ?? {}) as { expiresInDays?: number };

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, company: { userId: request.user.sub } },
    });
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }

    const existing = await prisma.customerPortal.findFirst({
      where: { customerId, active: true },
    });
    if (existing) {
      return reply.send({ data: existing });
    }

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const portal = await prisma.customerPortal.create({
      data: {
        customerId,
        token: generatePortalToken(),
        active: true,
        expiresAt,
      },
    });

    return reply.code(201).send({ data: portal });
  });

  /** Portal erişimini iptal et */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const portal = await prisma.customerPortal.findFirst({
      where: { id, customer: { company: { userId: request.user.sub } } },
    });
    if (!portal) {
      throw new AppError("PORTAL_NOT_FOUND", "Portal erişimi bulunamadı", 404);
    }
    await prisma.customerPortal.update({
      where: { id },
      data: { active: false },
    });
    return reply.code(204).send();
  });
}

/**
 * Herkese açık portal rotaları (kimlik doğrulamasız).
 * Token ile müşterinin kendi fatura/teklif geçmişini görüntüler.
 */
export async function publicPortalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const portal = await prisma.customerPortal.findUnique({
      where: { token },
      include: {
        customer: {
          include: {
            company: {
              select: {
                name: true,
                addressLine1: true,
                postalCode: true,
                city: true,
                country: true,
                iban: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!portal || !portal.active) {
      throw new AppError("PORTAL_NOT_FOUND", "Portal bulunamadı", 404);
    }
    if (portal.expiresAt && portal.expiresAt < new Date()) {
      throw new AppError("PORTAL_EXPIRED", "Portal erişiminin süresi doldu", 410);
    }

    const [invoices, quotes] = await Promise.all([
      prisma.invoice.findMany({
        where: { customerId: portal.customerId },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          total: true,
          currency: true,
          status: true,
          signedAt: true,
          signedByName: true,
          twintPaymentLink: true,
          twintStatus: true,
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.quote.findMany({
        where: { customerId: portal.customerId },
        select: {
          id: true,
          quoteNumber: true,
          issueDate: true,
          validUntil: true,
          total: true,
          currency: true,
          status: true,
          signedAt: true,
          signedByName: true,
        },
        orderBy: { issueDate: "desc" },
      }),
    ]);

    // Erişim istatistiklerini güncelle
    await prisma.customerPortal.update({
      where: { id: portal.id },
      data: {
        lastAccessAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    return reply.send({
      data: {
        customer: {
          name: portal.customer.name,
          email: portal.customer.email,
        },
        company: portal.customer.company,
        invoices,
        quotes,
      },
    });
  });

  /** Portal token'ı ile teklifi imzala (müşteri onayı) */
  app.post("/:token/sign/quote/:quoteId", async (request, reply) => {
    const { token, quoteId } = request.params as {
      token: string;
      quoteId: string;
    };
    const input = signatureSchema.parse(request.body);

    const portal = await loadActivePortal(token);

    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, customerId: portal.customerId },
    });
    if (!quote) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        signatureData: input.signatureData,
        signedByName: input.signedByName,
        signedAt: new Date(),
        signedIp: request.ip ?? null,
        status: "accepted",
        acceptedAt: new Date(),
      },
    });
    return reply.send({ data: updated });
  });

  /** Portal token'ı ile faturayı imzala (teslim onayı) */
  app.post("/:token/sign/invoice/:invoiceId", async (request, reply) => {
    const { token, invoiceId } = request.params as {
      token: string;
      invoiceId: string;
    };
    const input = signatureSchema.parse(request.body);

    const portal = await loadActivePortal(token);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, customerId: portal.customerId },
    });
    if (!invoice) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        signatureData: input.signatureData,
        signedByName: input.signedByName,
        signedAt: new Date(),
        signedIp: request.ip ?? null,
      },
    });
    return reply.send({ data: updated });
  });
}

/** Token ile aktif portal kaydını yükler ve süre kontrolü yapar. */
async function loadActivePortal(token: string) {
  const portal = await prisma.customerPortal.findUnique({ where: { token } });
  if (!portal || !portal.active) {
    throw new AppError("PORTAL_NOT_FOUND", "Portal bulunamadı", 404);
  }
  if (portal.expiresAt && portal.expiresAt < new Date()) {
    throw new AppError("PORTAL_EXPIRED", "Portal erişiminin süresi doldu", 410);
  }
  return portal;
}
