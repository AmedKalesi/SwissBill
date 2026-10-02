/**
 * Muhasebe entegrasyonu rotaları (Bexio vb.).
 *
 * - Bağlantı başlatma (OAuth yetkilendirme URL'i üretir)
 * - OAuth callback (kodu token'a çevirir)
 * - Durum sorgulama
 * - Bağlantıyı kaldırma
 * - Fatura/gider senkronizasyonu
 */
import type { FastifyInstance } from "fastify";
import {
  accountingConnectSchema,
  accountingSyncSchema,
} from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  normalizeProvider,
  syncExpenses,
  syncInvoices,
  type SyncableExpense,
  type SyncableInvoice,
} from "../services/bexio.service.js";

export async function accountingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Şirketin entegrasyonlarını listele */
  app.get("/", async (request, reply) => {
    const { companyId } = request.query as { companyId?: string };
    if (!companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }
    await assertCompanyOwnership(companyId, request.user.sub);

    const integrations = await prisma.accountingIntegration.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ data: integrations });
  });

  /** Entegrasyon başlat: OAuth yetkilendirme URL'i döndür */
  app.post("/connect", async (request, reply) => {
    const input = accountingConnectSchema.parse(request.body);
    await assertCompanyOwnership(input.companyId, request.user.sub);

    const provider = normalizeProvider(input.provider);
    const state = Buffer.from(
      JSON.stringify({ companyId: input.companyId, provider }),
    ).toString("base64url");

    const authorizationUrl = buildAuthorizationUrl(state, input.redirectUri);

    // Bağlantı kaydını "pending" olarak oluştur/güncelle
    const integration = await prisma.accountingIntegration.upsert({
      where: {
        companyId_provider: { companyId: input.companyId, provider },
      },
      create: {
        companyId: input.companyId,
        provider,
        status: "disconnected",
      },
      update: { status: "disconnected", syncError: null },
    });

    return reply.send({ data: { integration, authorizationUrl, state } });
  });

  /** OAuth callback: kodu token'a çevir ve bağlantıyı kaydet */
  app.get("/callback", async (request, reply) => {
    const { code, state } = request.query as {
      code?: string;
      state?: string;
    };
    if (!code || !state) {
      throw new AppError("INVALID_CALLBACK", "code ve state gerekli", 400);
    }

    let parsed: { companyId: string; provider: string };
    try {
      parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      throw new AppError("INVALID_STATE", "Geçersiz state", 400);
    }

    await assertCompanyOwnership(parsed.companyId, request.user.sub);
    const provider = normalizeProvider(parsed.provider);

    const token = await exchangeCodeForToken(code);

    const integration = await prisma.accountingIntegration.upsert({
      where: {
        companyId_provider: { companyId: parsed.companyId, provider },
      },
      create: {
        companyId: parsed.companyId,
        provider,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        externalTenantId: token.externalTenantId,
        status: "connected",
      },
      update: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        externalTenantId: token.externalTenantId,
        status: "connected",
        syncError: null,
      },
    });

    return reply.send({ data: integration });
  });

  /** Bağlantıyı kaldır */
  app.delete("/:companyId/:provider", async (request, reply) => {
    const { companyId, provider } = request.params as {
      companyId: string;
      provider: string;
    };
    await assertCompanyOwnership(companyId, request.user.sub);

    const existing = await prisma.accountingIntegration.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider: normalizeProvider(provider),
        },
      },
    });
    if (!existing) {
      throw new AppError("INTEGRATION_NOT_FOUND", "Entegrasyon bulunamadı", 404);
    }

    await prisma.accountingIntegration.update({
      where: { id: existing.id },
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        status: "disconnected",
        syncError: null,
      },
    });

    return reply.code(204).send();
  });

  /** Fatura ve giderleri senkronize et */
  app.post("/sync", async (request, reply) => {
    const input = accountingSyncSchema.parse(request.body);
    await assertCompanyOwnership(input.companyId, request.user.sub);
    const provider = normalizeProvider(input.provider);

    const integration = await prisma.accountingIntegration.findUnique({
      where: {
        companyId_provider: { companyId: input.companyId, provider },
      },
    });
    if (!integration || integration.status !== "connected") {
      throw new AppError(
        "INTEGRATION_NOT_CONNECTED",
        "Entegrasyon bağlı değil",
        400,
      );
    }

    const accessToken = integration.accessToken ?? "demo-access";

    try {
      let syncedInvoices = 0;
      let syncedExpenses = 0;

      if (input.syncInvoices) {
        const invoices = await prisma.invoice.findMany({
          where: { companyId: input.companyId },
          include: { customer: { select: { name: true } } },
          orderBy: { issueDate: "desc" },
        });
        const payload: SyncableInvoice[] = invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: Number(invoice.total),
          currency: invoice.currency,
          status: invoice.status,
          customerName: invoice.customer.name,
        }));
        syncedInvoices = await syncInvoices(accessToken, payload);
      }

      if (input.syncExpenses) {
        const expenses = await prisma.expense.findMany({
          where: { companyId: input.companyId },
          orderBy: { date: "desc" },
        });
        const payload: SyncableExpense[] = expenses.map((expense) => ({
          id: expense.id,
          date: expense.date,
          description: expense.description,
          amount: Number(expense.amount),
          vatAmount: Number(expense.vatAmount),
          currency: expense.currency,
          category: expense.category,
          vendor: expense.vendor,
        }));
        syncedExpenses = await syncExpenses(accessToken, payload);
      }

      const lastSyncAt = new Date();
      const updated = await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt,
          syncError: null,
          syncedInvoices: { increment: syncedInvoices },
          syncedExpenses: { increment: syncedExpenses },
        },
      });

      return reply.send({
        data: {
          provider,
          syncedInvoices,
          syncedExpenses,
          lastSyncAt: lastSyncAt.toISOString(),
          integration: updated,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Senkronizasyon başarısız";
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: { status: "error", syncError: message },
      });
      throw new AppError("SYNC_FAILED", message, 502);
    }
  });
}

/** Şirketin kullanıcıya ait olduğunu doğrular. */
async function assertCompanyOwnership(
  companyId: string,
  userId: string,
): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true },
  });
  if (!company) {
    throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
  }
}
