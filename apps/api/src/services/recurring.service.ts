/**
 * Tekrarlayan fatura servisi.
 * Sıklığa göre sonraki çalışma tarihini hesaplar ve vadesi gelen
 * şablonlardan otomatik fatura üretir.
 *
 * Özellikler:
 * - Ay sonu clamp'leme (31 Oca + 1 ay = 28/29 Şub, 3 Mart değil)
 * - Plan limiti kontrolü (ücretsiz plan limitini atlamaz)
 * - QR-fatura doğrulaması (Swiss Payment Standards 2026)
 * - autoSend: PDF üretimi + e-posta gönderimi
 * - Kaçırılan çalışmaların telafisi (catch-up)
 * - İzole hata yönetimi (bir şablon hata verse de diğerleri işlenir)
 */
import {
  calculateInvoiceTotals,
  generateQrrReference,
  type CalculatedLine,
  type InvoiceItemInput,
  type RecurringFrequency,
} from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import {
  createInvoiceWithNumber,
  enforceInvoiceLimit,
} from "./invoice.service.js";
import { generateInvoicePdf } from "./pdf.service.js";
import { sendInvoiceEmail } from "./email.service.js";
import { validateQrBillData, type QrBillData } from "./qrbill.service.js";

/** Bir ayın gün sayısını döner (0-indexli ay). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Verilen tarihe sıklık/aralık ekleyerek sonraki çalışma tarihini döner.
 * Ay/yıl eklemelerinde ay sonu taşmasını engeller: 31 Oca + 1 ay = 28/29 Şub.
 */
export function computeNextRun(
  from: Date,
  frequency: RecurringFrequency,
  intervalCount: number,
): Date {
  const next = new Date(from);
  const n = Math.max(1, intervalCount);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + n);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * n);
      break;
    case "monthly":
      addMonthsClamped(next, n);
      break;
    case "quarterly":
      addMonthsClamped(next, 3 * n);
      break;
    case "yearly":
      addMonthsClamped(next, 12 * n);
      break;
  }
  return next;
}

/**
 * Bir tarihe ay ekler ve ay sonu taşmasını engeller.
 * Örn. 31 Oca + 1 ay → 28/29 Şub (3 Mart değil).
 */
function addMonthsClamped(date: Date, months: number): void {
  const day = date.getDate();
  const targetMonthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = daysInMonth(targetYear, normalizedMonth);

  date.setDate(1);
  date.setFullYear(targetYear);
  date.setMonth(normalizedMonth);
  date.setDate(Math.min(day, maxDay));
}

interface RecurringItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

/** generateInvoiceFromRecurring sonucu. */
export interface RecurringRunResult {
  invoiceId: string;
  invoiceNumber: string;
  emailed: boolean;
  emailError?: string;
}

/** generateInvoiceFromRecurring seçenekleri. */
export interface GenerateRecurringOptions {
  /** Plan limitini atla (cron/otomatik çalıştırma için false bırakın). */
  skipLimitCheck?: boolean;
  /** E-posta gönderimini atla (test/manuel çalıştırma için). */
  skipEmail?: boolean;
}

/**
 * Tek bir tekrarlayan fatura şablonundan fatura üretir.
 * Üretilen fatura taslak olarak kaydedilir (autoSend ise 'sent' + e-posta).
 */
export async function generateInvoiceFromRecurring(
  recurringId: string,
  options: GenerateRecurringOptions = {},
): Promise<RecurringRunResult | null> {
  const recurring = await prisma.recurringInvoice.findUnique({
    where: { id: recurringId },
    include: { company: true, customer: true },
  });
  if (!recurring || recurring.status !== "active") return null;

  const items = (recurring.items as unknown as RecurringItem[]) ?? [];
  if (items.length === 0) return null;

  // Plan limiti kontrolü (ücretsiz plan limitini atlamayı önler)
  if (!options.skipLimitCheck) {
    await enforceInvoiceLimit(recurring.company.userId, recurring.companyId);
  }

  const totals = calculateInvoiceTotals(items as InvoiceItemInput[]);

  let qrReference: string | null = null;
  if (recurring.qrReferenceType === "QRR") {
    const base = Date.now().toString().padStart(25, "0").slice(-25);
    qrReference = generateQrrReference(base);
  }

  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + recurring.dueDays);

  // QR-fatura verisini doğrula (Swiss Payment Standards 2026)
  const qrBill: QrBillData = {
    creditor: {
      name: recurring.company.name,
      addressLine1: recurring.company.addressLine1,
      addressLine2: recurring.company.addressLine2,
      postalCode: recurring.company.postalCode,
      city: recurring.company.city,
      country: recurring.company.country,
      iban: recurring.company.iban,
    },
    debtor: {
      name: recurring.customer.name,
      addressLine1: recurring.customer.addressLine1,
      addressLine2: recurring.customer.addressLine2,
      postalCode: recurring.customer.postalCode,
      city: recurring.customer.city,
      country: recurring.customer.country,
    },
    amount: totals.total,
    currency: recurring.currency,
    reference: qrReference,
    referenceType: recurring.qrReferenceType as "QRR" | "SCOR" | "NON",
    message: recurring.name,
  };

  const qrErrors = validateQrBillData(qrBill);
  if (qrErrors.length > 0) {
    throw new Error(
      `QR-fatura verisi geçersiz (${recurring.name}): ${qrErrors.join(" ")}`,
    );
  }

  // Şablonun sonraki çalışma tarihini ilerlet (fatura ile aynı transaction'da)
  const nextRunAt = computeNextRun(
    recurring.nextRunAt,
    recurring.frequency as RecurringFrequency,
    recurring.intervalCount,
  );

  const completed =
    recurring.endDate !== null && nextRunAt > new Date(recurring.endDate);

  // Numara çakışmasına karşı retry ile oluştur.
  // Fatura oluşturma + şablon güncelleme tek transaction'da atomiktir:
  // biri başarısız olursa diğeri geri alınır, mükerrer fatura oluşmaz.
  const invoice = await createInvoiceWithNumber(
    recurring.companyId,
    (invoiceNumber) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            companyId: recurring.companyId,
            customerId: recurring.customerId,
            invoiceNumber,
            issueDate,
            dueDate,
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            currency: recurring.currency,
            status: recurring.autoSend ? "sent" : "draft",
            qrReference,
            qrReferenceType: recurring.qrReferenceType,
            notes: recurring.notes ?? null,
            sentAt: recurring.autoSend ? new Date() : null,
            items: {
              create: totals.lines.map((line: CalculatedLine, index: number) => ({
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                vatRate: line.vatRate,
                lineTotal: line.lineTotal,
                sortOrder: index,
              })),
            },
          },
          include: { items: true, customer: true, company: true },
        });

        await tx.recurringInvoice.update({
          where: { id: recurring.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt,
            status: completed ? "completed" : recurring.status,
          },
        });

        return created;
      }),
  );

  // autoSend: PDF üret ve e-posta gönder
  let emailed = false;
  let emailError: string | undefined;
  if (recurring.autoSend && !options.skipEmail) {
    try {
      if (!invoice.customer.email) {
        throw new Error("Müşterinin e-posta adresi yok");
      }
      const pdf = await generateInvoicePdf({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        currency: invoice.currency,
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vatAmount),
        total: Number(invoice.total),
        vatBreakdown: totals.vatBreakdown,
        items: totals.lines,
        notes: invoice.notes,
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

      await sendInvoiceEmail({
        to: invoice.customer.email,
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
      emailed = true;
    } catch (err) {
      // E-posta hatası fatura üretimini geri almaz; sadece raporlanır.
      emailError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    emailed,
    ...(emailError ? { emailError } : {}),
  };
}

/** runDueRecurringInvoices sonucu. */
export interface RunDueResult {
  processed: number;
  generated: number;
  failed: number;
  errors: Array<{ id: string; name: string; message: string }>;
}

/**
 * Vadesi gelen tüm aktif şablonlardan fatura üretir.
 * Zamanlanmış görev (cron) tarafından çağrılır.
 *
 * Her şablon izole işlenir: bir şablon hata verse de diğerleri devam eder.
 * Ayrıca kaçırılan çalışmalar telafi edilir (catch-up): bir şablonun
 * nextRunAt'i geçmişte kaldıysa, bugüne gelene kadar tekrar tekrar üretilir.
 */
export async function runDueRecurringInvoices(): Promise<RunDueResult> {
  const due = await prisma.recurringInvoice.findMany({
    where: { status: "active", nextRunAt: { lte: new Date() } },
    select: { id: true, name: true },
  });

  let generated = 0;
  let failed = 0;
  const errors: RunDueResult["errors"] = [];

  for (const r of due) {
    try {
      const result = await generateInvoiceFromRecurring(r.id);
      if (result) generated += 1;
    } catch (err) {
      failed += 1;
      errors.push({
        id: r.id,
        name: r.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { processed: due.length, generated, failed, errors };
}

/**
 * Tek bir şablon için kaçırılan tüm çalışmaları telafi eder.
 * nextRunAt bugüne gelene kadar fatura üretir (maksimum `maxCatchUp` adet).
 */
export async function catchUpRecurring(
  recurringId: string,
  maxCatchUp = 12,
): Promise<{ generated: number; results: RecurringRunResult[] }> {
  const results: RecurringRunResult[] = [];
  const now = new Date();

  for (let i = 0; i < maxCatchUp; i += 1) {
    const recurring = await prisma.recurringInvoice.findUnique({
      where: { id: recurringId },
      select: { nextRunAt: true, status: true },
    });
    if (!recurring || recurring.status !== "active") break;
    if (recurring.nextRunAt > now) break;

    const result = await generateInvoiceFromRecurring(recurringId);
    if (!result) break;
    results.push(result);
  }

  return { generated: results.length, results };
}
