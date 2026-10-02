/**
 * Herkese açık (kimlik doğrulamasız) rotalar.
 *
 * Pazarlama amaçlı ücretsiz QR-fatura üretici (lead magnet) burada yer alır.
 * Kullanıcı kayıt olmadan tek bir QR-fatura PDF'i üretebilir.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../plugins/error-handler.js";
import {
  buildQrBillPayload,
  formatQrBillSummary,
  generateQrCodeDataUrl,
  validateQrBillData,
  type QrBillData,
} from "../services/qrbill.service.js";
import { generateInvoicePdf } from "../services/pdf.service.js";

const addressSchema = z.object({
  name: z.string().min(1).max(70),
  addressLine1: z.string().min(1).max(70),
  addressLine2: z.string().max(70).optional().nullable(),
  postalCode: z.string().min(1).max(16),
  city: z.string().min(1).max(35),
  country: z.string().length(2).default("CH"),
});

const publicQrBillSchema = z.object({
  creditor: addressSchema.extend({
    iban: z.string().min(15).max(34),
  }),
  debtor: addressSchema.optional().nullable(),
  amount: z.number().positive().max(999999999.99),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  reference: z.string().max(35).optional().nullable(),
  referenceType: z.enum(["QRR", "SCOR", "NON"]).default("NON"),
  message: z.string().max(140).optional().nullable(),
  invoiceNumber: z.string().max(40).optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Ücretsiz QR-fatura üretici.
   * Kimlik doğrulaması gerektirmez; tek seferlik PDF üretir.
   */
  app.post("/qr-generator", async (request, reply) => {
    const input = publicQrBillSchema.parse(request.body);

    const qrBill: QrBillData = {
      creditor: {
        name: input.creditor.name,
        addressLine1: input.creditor.addressLine1,
        addressLine2: input.creditor.addressLine2 ?? null,
        postalCode: input.creditor.postalCode,
        city: input.creditor.city,
        country: input.creditor.country,
        iban: input.creditor.iban,
      },
      debtor: input.debtor
        ? {
            name: input.debtor.name,
            addressLine1: input.debtor.addressLine1,
            addressLine2: input.debtor.addressLine2 ?? null,
            postalCode: input.debtor.postalCode,
            city: input.debtor.city,
            country: input.debtor.country,
          }
        : null,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference ?? null,
      referenceType: input.referenceType,
      message: input.message ?? null,
    };

    const errors = validateQrBillData(qrBill);
    if (errors.length > 0) {
      throw new AppError(
        "QR_BILL_INVALID",
        `QR-fatura verisi geçersiz: ${errors.join(" ")}`,
        422,
      );
    }

    const invoiceNumber = input.invoiceNumber ?? "QR-DEMO";
    const issueDate = input.issueDate ?? new Date().toISOString();
    const dueDate =
      input.dueDate ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const pdf = await generateInvoicePdf({
      invoiceNumber,
      issueDate,
      dueDate,
      currency: input.currency,
      subtotal: input.amount,
      vatAmount: 0,
      total: input.amount,
      vatBreakdown: [],
      items: [
        {
          description: input.message ?? "Dienstleistung",
          quantity: 1,
          unitPrice: input.amount,
          vatRate: 0,
          lineTotal: input.amount,
        },
      ],
      notes: null,
      company: {
        name: input.creditor.name,
        addressLine1: input.creditor.addressLine1,
        addressLine2: input.creditor.addressLine2 ?? null,
        postalCode: input.creditor.postalCode,
        city: input.creditor.city,
        country: input.creditor.country,
        vatNumber: null,
        iban: input.creditor.iban,
      },
      customer: {
        name: input.debtor?.name ?? "—",
        addressLine1: input.debtor?.addressLine1 ?? "",
        addressLine2: input.debtor?.addressLine2 ?? null,
        postalCode: input.debtor?.postalCode ?? "",
        city: input.debtor?.city ?? "",
        country: input.debtor?.country ?? "CH",
      },
      qrBill,
    });

    return reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="QR-Rechnung-${invoiceNumber}.pdf"`,
      )
      .send(pdf);
  });

  /** QR-fatura verisini doğrular ve QR kodunu (data URL) döner. */
  app.post("/qr-generator/preview", async (request, reply) => {
    const input = publicQrBillSchema.parse(request.body);

    const qrBill: QrBillData = {
      creditor: {
        name: input.creditor.name,
        addressLine1: input.creditor.addressLine1,
        addressLine2: input.creditor.addressLine2 ?? null,
        postalCode: input.creditor.postalCode,
        city: input.creditor.city,
        country: input.creditor.country,
        iban: input.creditor.iban,
      },
      debtor: input.debtor
        ? {
            name: input.debtor.name,
            addressLine1: input.debtor.addressLine1,
            addressLine2: input.debtor.addressLine2 ?? null,
            postalCode: input.debtor.postalCode,
            city: input.debtor.city,
            country: input.debtor.country,
          }
        : null,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference ?? null,
      referenceType: input.referenceType,
      message: input.message ?? null,
    };

    const errors = validateQrBillData(qrBill);
    const payload = buildQrBillPayload(qrBill);
    const qrCode = errors.length === 0 ? await generateQrCodeDataUrl(payload) : null;

    return reply.send({
      data: {
        valid: errors.length === 0,
        errors,
        qrCode,
        summary: formatQrBillSummary(qrBill),
      },
    });
  });
}
