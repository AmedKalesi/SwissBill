/**
 * Ödeme hatırlatma servisi.
 * Vadesi geçmiş faturaları bulur ve hatırlatma e-postası gönderir.
 */
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import { sendReminderEmail, type EmailLocale } from "./email.service.js";
import { generateInvoicePdf } from "./pdf.service.js";
import type { QrBillData } from "./qrbill.service.js";

/** İki tarih arasındaki tam gün sayısı. */
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Hatırlatmalar arasında beklenecek minimum gün sayısı. */
const REMINDER_COOLDOWN_DAYS = 5;

/** Bir fatura için hatırlatma gönderilip gönderilemeyeceğini belirler. */
export function canSendReminder(invoice: {
  status: string;
  dueDate: Date;
  lastReminderAt: Date | null;
}): { allowed: boolean; reason?: string } {
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return { allowed: false, reason: "Fatura kapalı (ödendi/iptal)" };
  }
  if (invoice.dueDate.getTime() > Date.now()) {
    return { allowed: false, reason: "Vade tarihi henüz gelmedi" };
  }
  if (invoice.lastReminderAt) {
    const since = daysBetween(invoice.lastReminderAt, new Date());
    if (since < REMINDER_COOLDOWN_DAYS) {
      return {
        allowed: false,
        reason: `Son hatırlatmadan bu yana ${since} gün geçti (min. ${REMINDER_COOLDOWN_DAYS})`,
      };
    }
  }
  return { allowed: true };
}

type InvoiceForReminder = Awaited<ReturnType<typeof loadInvoice>>;

async function loadInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, company: true },
  });
  if (!invoice) {
    throw new AppError("INVOICE_NOT_FOUND", "Fatura bulunamadı", 404);
  }
  return invoice;
}

/** Fatura kaydından PDF üretir (hatırlatma eki için). */
async function buildPdf(invoice: InvoiceForReminder): Promise<Buffer> {
  const qrBill: QrBillData = {
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

  const vatGroups = new Map<number, number>();
  for (const item of invoice.items) {
    const rate = Number(item.vatRate);
    const base = vatGroups.get(rate) ?? 0;
    vatGroups.set(rate, Math.round((base + Number(item.lineTotal)) * 100) / 100);
  }

  return generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    currency: invoice.currency,
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    total: Number(invoice.total),
    vatBreakdown: Array.from(vatGroups.entries())
      .map(([rate, base]) => ({
        rate,
        base,
        vat: Math.round(((base * rate) / 100) * 100) / 100,
      }))
      .sort((a, b) => a.rate - b.rate),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      vatRate: Number(item.vatRate),
      lineTotal: Number(item.lineTotal),
    })),
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
}

/** Tek bir fatura için hatırlatma gönderir. */
export async function sendInvoiceReminder(
  invoiceId: string,
  options: { locale?: EmailLocale; attachPdf?: boolean } = {},
): Promise<{ id: string; to: string; reminderCount: number }> {
  const invoice = await loadInvoice(invoiceId);

  const check = canSendReminder(invoice);
  if (!check.allowed) {
    throw new AppError("REMINDER_NOT_ALLOWED", check.reason ?? "Hatırlatma gönderilemez", 400);
  }

  if (!invoice.customer.email) {
    throw new AppError(
      "CUSTOMER_EMAIL_REQUIRED",
      "Müşterinin e-posta adresi yok",
      400,
    );
  }

  const daysOverdue = daysBetween(invoice.dueDate, new Date());
  const pdf = options.attachPdf ? await buildPdf(invoice) : undefined;

  const result = await sendReminderEmail({
    to: invoice.customer.email,
    locale: options.locale ?? "de",
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate.toISOString(),
    total: Number(invoice.total),
    currency: invoice.currency,
    companyName: invoice.company.name,
    customerName: invoice.customer.name,
    iban: invoice.company.iban,
    reference: invoice.qrReference,
    daysOverdue,
    reminderNumber: invoice.reminderCount + 1,
    pdf,
  });

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      reminderCount: { increment: 1 },
      lastReminderAt: new Date(),
      status: "overdue",
    },
  });

  return {
    id: result.id,
    to: invoice.customer.email,
    reminderCount: updated.reminderCount,
  };
}

/**
 * Vadesi geçmiş tüm faturalar için toplu hatırlatma gönderir.
 * Cron job tarafından çağrılmak üzere tasarlanmıştır.
 */
export async function sendDueReminders(options: {
  userId?: string;
  locale?: EmailLocale;
  attachPdf?: boolean;
} = {}): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: Array<{ invoiceId: string; message: string }>;
}> {
  const overdue = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { in: ["sent", "overdue"] },
      ...(options.userId ? { company: { userId: options.userId } } : {}),
    },
    select: { id: true },
    orderBy: { dueDate: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ invoiceId: string; message: string }> = [];

  for (const { id } of overdue) {
    try {
      await sendInvoiceReminder(id, {
        locale: options.locale,
        attachPdf: options.attachPdf,
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof AppError && error.code === "REMINDER_NOT_ALLOWED") {
        skipped += 1;
      } else {
        errors.push({ invoiceId: id, message });
      }
    }
  }

  return { processed: overdue.length, sent, skipped, errors };
}
