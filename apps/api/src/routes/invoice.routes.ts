/**
 * Fatura rotaları: CRUD, PDF üretimi, durum güncelleme.
 */
import type { FastifyInstance } from "fastify";
import {
  invoiceSchema,
  invoiceStatusSchema,
  signatureSchema,
  twintPaymentSchema,
} from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import {
  createInvoiceWithNumber,
  enforceInvoiceLimit,
  prepareInvoiceData,
} from "../services/invoice.service.js";
import { generateInvoicePdf } from "../services/pdf.service.js";
import { sendInvoiceEmail } from "../services/email.service.js";
import {
  canSendReminder,
  sendDueReminders,
  sendInvoiceReminder,
} from "../services/reminder.service.js";
import {
  buildQrBillPayload,
  formatQrBillSummary,
  validateQrBillData,
  type QrBillData,
} from "../services/qrbill.service.js";
import { createTwintPayment } from "../services/twint.service.js";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Faturaları listele */
  app.get("/", async (request, reply) => {
    const { companyId, status } = request.query as {
      companyId?: string;
      status?: string;
    };

    const invoices = await prisma.invoice.findMany({
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
    return reply.send({ data: invoices });
  });

  /** Tek fatura getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { customer: true, items: true, company: true },
    });
    if (!invoice) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }
    return reply.send({ data: invoice });
  });

  /** Fatura oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = invoiceSchema.parse(body);

    if (!body.companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }
    // Daraltmayı closure içinde korumak için sabit değişkene al.
    const companyId = body.companyId;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, companyId },
    });
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }

    await enforceInvoiceLimit(request.user.sub, companyId);

    const { totals, qrReference } = prepareInvoiceData(input);

    // QR-fatura verisini Swiss Payment Standards 2026'ya göre doğrula.
    // Doğrulama fatura numarasına bağlı olduğu için (mesaj alanı) retry
    // döngüsünün içinde, her denemede yeniden çalıştırılır.
    const validateForNumber = (invoiceNumber: string): void => {
      const qrErrors = validateQrBillData({
        creditor: {
          name: company.name,
          addressLine1: company.addressLine1,
          addressLine2: company.addressLine2,
          postalCode: company.postalCode,
          city: company.city,
          country: company.country,
          iban: company.iban,
        },
        debtor: {
          name: customer.name,
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          postalCode: customer.postalCode,
          city: customer.city,
          country: customer.country,
        },
        amount: totals.total,
        currency: input.currency,
        reference: qrReference,
        referenceType: input.qrReferenceType,
        message: `Rechnung ${invoiceNumber}`,
      });
      if (qrErrors.length > 0) {
        throw new AppError(
          "QR_BILL_INVALID",
          `QR-fatura verisi geçersiz: ${qrErrors.join(" ")}`,
          422,
        );
      }
    };

    // Eşzamanlı isteklerde aynı fatura numarasının iki kez üretilmesini
    // önlemek için retry sarmalayıcısı kullanılır (P2002 → yeniden dene).
    const invoice = await createInvoiceWithNumber(
      companyId,
      async (invoiceNumber) => {
        validateForNumber(invoiceNumber);
        return prisma.invoice.create({
          data: {
            companyId,
            customerId: input.customerId,
            invoiceNumber,
            issueDate: new Date(input.issueDate),
            dueDate: new Date(input.dueDate),
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            currency: input.currency,
            status: input.status,
            qrReference,
            qrReferenceType: input.qrReferenceType,
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
      },
    );

    return reply.code(201).send({ data: invoice });
  });

  /** Fatura güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = invoiceSchema.partial().parse(request.body);

    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { items: true },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    // Kalemler verildiyse yeniden hesapla
    let totalsUpdate = {};
    if (input.items) {
      const { totals } = prepareInvoiceData({
        ...input,
        items: input.items,
      } as Parameters<typeof prepareInvoiceData>[0]);
      totalsUpdate = {
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
      };
    }

    const invoice = await prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }
      return tx.invoice.update({
        where: { id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.issueDate ? { issueDate: new Date(input.issueDate) } : {}),
          ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
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
                    lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: { items: true, customer: true },
      });
    });

    return reply.send({ data: invoice });
  });

  /** Fatura durumunu güncelle */
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const parsed = invoiceStatusSchema.parse(status);

    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: parsed,
        ...(parsed === "sent" ? { sentAt: new Date() } : {}),
        ...(parsed === "paid" ? { paidAt: new Date() } : {}),
      },
    });
    return reply.send({ data: invoice });
  });

  /** Faturaya müşteri e-imzası ekle (manuel yakalama) */
  app.post("/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = signatureSchema.parse(request.body);

    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        signatureData: input.signatureData,
        signedByName: input.signedByName,
        signedAt: new Date(),
        signedIp: request.ip ?? null,
      },
    });
    return reply.send({ data: invoice });
  });

  /** Faturadaki imzayı kaldır */
  app.delete("/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        signatureData: null,
        signedByName: null,
        signedAt: null,
        signedIp: null,
      },
    });
    return reply.send({ data: invoice });
  });

  /** TWINT ödeme linki + QR kod üret (veya mevcut olanı döndür) */
  app.post("/:id/twint", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = twintPaymentSchema.parse(request.body ?? {});

    const invoice = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!invoice) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const { paymentLink, qrDataUrl } = await createTwintPayment({
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.total),
      currency: invoice.currency,
      returnUrl: input.returnUrl ?? null,
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        twintPaymentLink: paymentLink,
        twintStatus: invoice.twintStatus === "paid" ? "paid" : "pending",
      },
    });

    return reply.send({
      data: {
        paymentLink,
        qrDataUrl,
        status: updated.twintStatus,
        amount: Number(updated.total),
        currency: updated.currency,
        invoiceNumber: updated.invoiceNumber,
      },
    });
  });

  /** TWINT ödemesini "ödendi" olarak işaretle (manuel onay) */
  app.post("/:id/twint/paid", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const now = new Date();
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        twintStatus: "paid",
        twintPaidAt: now,
        status: "paid",
        paidAt: existing.paidAt ?? now,
      },
    });
    return reply.send({ data: invoice });
  });

  /** TWINT ödeme durumunu sıfırla */
  app.delete("/:id/twint", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        twintPaymentLink: null,
        twintStatus: "none",
        twintPaidAt: null,
      },
    });
    return reply.send({ data: invoice });
  });

  /** Fatura sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }
    await prisma.invoice.delete({ where: { id } });
    return reply.code(204).send();
  });

  /** Fatura PDF'i indir (QR-fatura dahil) */
  app.get("/:id/pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await loadInvoiceForDocument(id, request.user.sub);
    const pdf = await buildInvoicePdf(invoice);

    return reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="Rechnung-${invoice.invoiceNumber}.pdf"`,
      )
      .send(pdf);
  });

  /** Faturanın QR-fatura verisini doğrula (SPC payload + hata listesi) */
  app.get("/:id/qrbill/validate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await loadInvoiceForDocument(id, request.user.sub);
    const qrBill = buildQrBillData(invoice);
    const errors = validateQrBillData(qrBill);

    return reply.send({
      data: {
        valid: errors.length === 0,
        errors,
        payload: buildQrBillPayload(qrBill),
        summary: formatQrBillSummary(qrBill),
      },
    });
  });

  /** Faturayı e-posta ile gönder (PDF ekli) */
  app.post("/:id/send", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { to?: string; locale?: string };

    const invoice = await loadInvoiceForDocument(id, request.user.sub);

    const to = body.to ?? invoice.customer.email;
    if (!to) {
      throw new AppError(
        "CUSTOMER_EMAIL_REQUIRED",
        "Müşterinin e-posta adresi yok. Lütfen alıcı adresini belirtin.",
        400,
      );
    }

    const locale = (["de", "fr", "it", "en"] as const).includes(
      body.locale as "de",
    )
      ? (body.locale as "de" | "fr" | "it" | "en")
      : "de";

    const pdf = await buildInvoicePdf(invoice);

    const result = await sendInvoiceEmail({
      to,
      locale,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      total: Number(invoice.total),
      currency: invoice.currency,
      companyName: invoice.company.name,
      customerName: invoice.customer.name,
      iban: invoice.company.iban,
      reference: invoice.qrReference,
      pdf,
    });

    // Gönderildi olarak işaretle
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "sent", sentAt: new Date() },
    });

    return reply.send({
      data: { id: result.id, to, status: updated.status },
    });
  });

  /** Tek fatura için ödeme hatırlatması gönder */
  app.post("/:id/remind", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as {
      locale?: string;
      attachPdf?: boolean;
    };

    const existing = await prisma.invoice.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
    }

    const locale = (["de", "fr", "it", "en"] as const).includes(
      body.locale as "de",
    )
      ? (body.locale as "de" | "fr" | "it" | "en")
      : "de";

    const result = await sendInvoiceReminder(id, {
      locale,
      attachPdf: body.attachPdf ?? true,
    });

    return reply.send({ data: result });
  });

  /** Vadesi geçmiş tüm faturalar için toplu hatırlatma gönder */
  app.post("/reminders/run", async (request, reply) => {
    const body = (request.body ?? {}) as {
      locale?: string;
      attachPdf?: boolean;
    };

    const locale = (["de", "fr", "it", "en"] as const).includes(
      body.locale as "de",
    )
      ? (body.locale as "de" | "fr" | "it" | "en")
      : "de";

    const result = await sendDueReminders({
      userId: request.user.sub,
      locale,
      attachPdf: body.attachPdf ?? false,
    });

    return reply.send({ data: result });
  });

  /** Vadesi geçmiş faturaları listele (hatırlatma adayları) */
  app.get("/reminders/candidates", async (request, reply) => {
    const invoices = await prisma.invoice.findMany({
      where: {
        company: { userId: request.user.sub },
        dueDate: { lt: new Date() },
        status: { in: ["sent", "overdue"] },
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { dueDate: "asc" },
    });

    const candidates = invoices.map((invoice) => ({
      ...invoice,
      reminder: canSendReminder(invoice),
    }));

    return reply.send({ data: candidates });
  });
}

type InvoiceWithRelations = Awaited<ReturnType<typeof loadInvoiceForDocument>>;

/** Faturayı ilişkileriyle yükler ve sahipliği doğrular. */
async function loadInvoiceForDocument(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, company: { userId } },
    include: { customer: true, items: true, company: true },
  });
  if (!invoice) {
    throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
  }
  return invoice;
}

/** Fatura kaydından QR-fatura verisini üretir. */
function buildQrBillData(invoice: InvoiceWithRelations): QrBillData {
  return {
    creditor: {
      name: invoice.company.name,
      addressLine1: invoice.company.addressLine1,
      addressLine2: invoice.company.addressLine2,
      postalCode: invoice.company.postalCode,
      city: invoice.company.city,
      country: invoice.company.country,
      iban: invoice.company.iban,
    },
    debtor: {
      name: invoice.customer.name,
      addressLine1: invoice.customer.addressLine1,
      addressLine2: invoice.customer.addressLine2,
      postalCode: invoice.customer.postalCode,
      city: invoice.customer.city,
      country: invoice.customer.country,
    },
    amount: Number(invoice.total),
    currency: invoice.currency,
    reference: invoice.qrReference,
    referenceType: invoice.qrReferenceType as "QRR" | "SCOR" | "NON",
    message: `Rechnung ${invoice.invoiceNumber}`,
  };
}

/** Fatura kaydından PDF üretir. */
async function buildInvoicePdf(
  invoice: InvoiceWithRelations,
): Promise<Buffer> {
  const qrBill = buildQrBillData(invoice);

  return generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    currency: invoice.currency,
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    total: Number(invoice.total),
    vatBreakdown: buildVatBreakdown(invoice.items),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      vatRate: Number(item.vatRate),
      lineTotal: Number(item.lineTotal),
    })),
    notes: invoice.notes,
    signatureData: invoice.signatureData,
    signedByName: invoice.signedByName,
    signedAt: invoice.signedAt ? invoice.signedAt.toISOString() : null,
    company: {
      name: invoice.company.name,
      addressLine1: invoice.company.addressLine1,
      addressLine2: invoice.company.addressLine2,
      postalCode: invoice.company.postalCode,
      city: invoice.company.city,
      country: invoice.company.country,
      vatNumber: invoice.company.vatNumber,
      iban: invoice.company.iban,
    },
    customer: {
      name: invoice.customer.name,
      addressLine1: invoice.customer.addressLine1,
      addressLine2: invoice.customer.addressLine2,
      postalCode: invoice.customer.postalCode,
      city: invoice.customer.city,
      country: invoice.customer.country,
    },
    qrBill,
  });
}

/** Kalemlerden KDV gruplaması üretir. */
function buildVatBreakdown(
  items: Array<{ vatRate: unknown; lineTotal: unknown }>,
): Array<{ rate: number; base: number; vat: number }> {
  const groups = new Map<number, number>();
  for (const item of items) {
    const rate = Number(item.vatRate);
    const base = groups.get(rate) ?? 0;
    groups.set(rate, Math.round((base + Number(item.lineTotal)) * 100) / 100);
  }
  return Array.from(groups.entries())
    .map(([rate, base]) => ({
      rate,
      base,
      vat: Math.round(((base * rate) / 100) * 100) / 100,
    }))
    .sort((a, b) => a.rate - b.rate);
}
