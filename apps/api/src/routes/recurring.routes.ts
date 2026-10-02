/**
 * Tekrarlayan fatura rotaları: CRUD + manuel çalıştırma.
 */
import type { FastifyInstance } from "fastify";
import { recurringInvoiceSchema } from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import {
  catchUpRecurring,
  computeNextRun,
  generateInvoiceFromRecurring,
  runDueRecurringInvoices,
} from "../services/recurring.service.js";
import type { RecurringFrequency } from "@flinkli/shared";

export async function recurringRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Tekrarlayan faturaları listele */
  app.get("/", async (request, reply) => {
    const { companyId, status } = request.query as {
      companyId?: string;
      status?: string;
    };

    const recurring = await prisma.recurringInvoice.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: recurring });
  });

  /** Tek şablon getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const recurring = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { customer: true },
    });
    if (!recurring) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }
    return reply.send({ data: recurring });
  });

  /** Şablon oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = recurringInvoiceSchema.parse(body);

    if (!body.companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }

    const company = await prisma.company.findFirst({
      where: { id: body.companyId, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, companyId: body.companyId },
    });
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }

    const startDate = new Date(input.startDate);
    const nextRunAt = computeNextRun(
      startDate,
      input.frequency as RecurringFrequency,
      input.intervalCount,
    );

    const recurring = await prisma.recurringInvoice.create({
      data: {
        companyId: body.companyId,
        customerId: input.customerId,
        name: input.name,
        frequency: input.frequency,
        intervalCount: input.intervalCount,
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        nextRunAt,
        dueDays: input.dueDays,
        currency: input.currency,
        qrReferenceType: input.qrReferenceType,
        notes: input.notes ?? null,
        status: input.status,
        autoSend: input.autoSend,
        items: input.items,
      },
      include: { customer: true },
    });

    return reply.code(201).send({ data: recurring });
  });

  /** Şablon güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = recurringInvoiceSchema.partial().parse(request.body);

    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }

    // Sıklık veya başlangıç değiştiyse sonraki çalışmayı yeniden hesapla
    let nextRunAt: Date | undefined;
    if (input.frequency || input.intervalCount || input.startDate) {
      const base = input.startDate
        ? new Date(input.startDate)
        : existing.startDate;
      nextRunAt = computeNextRun(
        base,
        (input.frequency ?? existing.frequency) as RecurringFrequency,
        input.intervalCount ?? existing.intervalCount,
      );
    }

    const recurring = await prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.frequency ? { frequency: input.frequency } : {}),
        ...(input.intervalCount ? { intervalCount: input.intervalCount } : {}),
        ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
        ...(nextRunAt ? { nextRunAt } : {}),
        ...(input.dueDays !== undefined ? { dueDays: input.dueDays } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.qrReferenceType
          ? { qrReferenceType: input.qrReferenceType }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.autoSend !== undefined ? { autoSend: input.autoSend } : {}),
        ...(input.items ? { items: input.items } : {}),
      },
      include: { customer: true },
    });

    return reply.send({ data: recurring });
  });

  /** Şablon durumunu değiştir (active/paused/completed) */
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }

    const recurring = await prisma.recurringInvoice.update({
      where: { id },
      data: { status },
    });
    return reply.send({ data: recurring });
  });

  /** Şablonu sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }
    await prisma.recurringInvoice.delete({ where: { id } });
    return reply.code(204).send();
  });

  /** Şablonu hemen çalıştır (fatura üret) */
  app.post("/:id/run", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { skipEmail?: boolean };

    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }

    const result = await generateInvoiceFromRecurring(id, {
      skipEmail: body.skipEmail ?? false,
    });
    if (!result) {
      throw new AppError(
        "RECURRING_RUN_FAILED",
        "Fatura üretilemedi (şablon pasif veya kalem yok)",
        422,
      );
    }
    return reply.send({ data: result });
  });

  /** Kaçırılan çalışmaları telafi et (catch-up) */
  app.post("/:id/catch-up", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { maxCatchUp?: number };

    const existing = await prisma.recurringInvoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("RECURRING_NOT_FOUND", "Tekrarlayan fatura bulunamadı", 404);
    }

    const result = await catchUpRecurring(id, body.maxCatchUp ?? 12);
    return reply.send({ data: result });
  });

  /** Vadesi gelen tüm şablonları çalıştır (cron/manual tetikleme) */
  app.post("/run-due", async (_request, reply) => {
    const result = await runDueRecurringInvoices();
    return reply.send({ data: result });
  });
}
