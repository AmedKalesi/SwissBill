/**
 * Teklif (Quote) rotaları: CRUD, durum yönetimi, faturaya dönüştürme.
 */
import type { FastifyInstance } from "fastify";
import {
  calculateInvoiceTotals,
  quoteSchema,
  quoteStatusSchema,
  signatureSchema,
} from "@swissbill/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import { generateInvoiceNumber } from "../services/invoice.service.js";

/** Sıradaki teklif numarasını üretir. Format: ANG-{YIL}-{SIRA} */
async function generateQuoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ANG-${year}-`;

  const last = await prisma.quote.findFirst({
    where: { companyId, quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });

  let nextSeq = 1;
  if (last) {
    const seq = parseInt(last.quoteNumber.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) nextSeq = seq + 1;
  }
  return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
}

export async function quoteRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Teklifleri listele */
  app.get("/", async (request, reply) => {
    const { companyId, status } = request.query as {
      companyId?: string;
      status?: string;
    };

    const quotes = await prisma.quote.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: quotes });
  });

  /** Tek teklif getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const quote = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { customer: true, items: true, company: true },
    });
    if (!quote) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }
    return reply.send({ data: quote });
  });

  /** Teklif oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = quoteSchema.parse(body);

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

    const totals = calculateInvoiceTotals(input.items);
    const quoteNumber = await generateQuoteNumber(body.companyId);

    const quote = await prisma.quote.create({
      data: {
        companyId: body.companyId,
        customerId: input.customerId,
        quoteNumber,
        issueDate: new Date(input.issueDate),
        validUntil: new Date(input.validUntil),
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        currency: input.currency,
        status: input.status,
        notes: input.notes ?? null,
        items: {
          create: totals.lines.map((line, index) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            lineTotal: line.lineTotal,
            sortOrder: index,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    return reply.code(201).send({ data: quote });
  });

  /** Teklif güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = quoteSchema.partial().parse(request.body);

    const existing = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { items: true },
    });
    if (!existing) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }

    let totalsUpdate = {};
    if (input.items) {
      const totals = calculateInvoiceTotals(input.items);
      totalsUpdate = {
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
      };
    }

    const quote = await prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      }
      return tx.quote.update({
        where: { id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.issueDate ? { issueDate: new Date(input.issueDate) } : {}),
          ...(input.validUntil
            ? { validUntil: new Date(input.validUntil) }
            : {}),
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...totalsUpdate,
          ...(input.items
            ? {
                items: {
                  create: input.items.map((item, index) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    vatRate: item.vatRate,
                    lineTotal:
                      Math.round(item.quantity * item.unitPrice * 100) / 100,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: { items: true, customer: true },
      });
    });

    return reply.send({ data: quote });
  });

  /** Teklif durumunu güncelle */
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const parsed = quoteStatusSchema.parse(status);

    const existing = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        status: parsed,
        ...(parsed === "sent" ? { sentAt: new Date() } : {}),
        ...(parsed === "accepted" ? { acceptedAt: new Date() } : {}),
      },
    });
    return reply.send({ data: quote });
  });

  /** Teklife müşteri e-imzası ekle (manuel yakalama) */
  app.post("/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = signatureSchema.parse(request.body);

    const existing = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        signatureData: input.signatureData,
        signedByName: input.signedByName,
        signedAt: new Date(),
        signedIp: request.ip ?? null,
        // İmza, teklifin kabul edildiği anlamına gelir
        status: "accepted",
        acceptedAt: new Date(),
      },
    });
    return reply.send({ data: quote });
  });

  /** Teklifteki imzayı kaldır */
  app.delete("/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }
    const quote = await prisma.quote.update({
      where: { id },
      data: {
        signatureData: null,
        signedByName: null,
        signedAt: null,
        signedIp: null,
      },
    });
    return reply.send({ data: quote });
  });

  /** Teklifi sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }
    await prisma.quote.delete({ where: { id } });
    return reply.code(204).send();
  });

  /** Teklifi faturaya dönüştür */
  app.post("/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string };
    const quote = await prisma.quote.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { items: true },
    });
    if (!quote) {
      throw new AppError("QUOTE_NOT_FOUND", "Teklif bulunamadı", 404);
    }
    if (quote.convertedInvoiceId) {
      throw new AppError(
        "QUOTE_ALREADY_CONVERTED",
        "Bu teklif zaten faturaya dönüştürüldü",
        409,
      );
    }

    const invoiceNumber = await generateInvoiceNumber(quote.companyId);
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId: quote.companyId,
          customerId: quote.customerId,
          invoiceNumber,
          issueDate,
          dueDate,
          subtotal: quote.subtotal,
          vatAmount: quote.vatAmount,
          total: quote.total,
          currency: quote.currency,
          status: "draft",
          qrReferenceType: "NON",
          notes: quote.notes ?? null,
          items: {
            create: quote.items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              lineTotal: item.lineTotal,
              sortOrder: index,
            })),
          },
        },
        include: { items: true },
      });

      await tx.quote.update({
        where: { id },
        data: { status: "converted", convertedInvoiceId: created.id },
      });

      return created;
    });

    return reply.code(201).send({ data: invoice });
  });
}
