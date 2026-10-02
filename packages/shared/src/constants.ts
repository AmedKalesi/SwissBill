/**
 * Uygulama genelinde paylaşılan sabitler.
 */

/** Desteklenen diller (İsviçre resmi dilleri + İngilizce) */
export const LOCALES = ["de-CH", "fr-CH", "it-CH", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de-CH";

/** Para birimi */
export const DEFAULT_CURRENCY = "CHF";

/** İsviçre KDV oranları (%) — 2024 itibarıyla */
export const VAT_RATES = {
  STANDARD: 8.1,
  REDUCED: 2.6,
  SPECIAL: 3.8,
} as const;

export type VatRate = (typeof VAT_RATES)[keyof typeof VAT_RATES];

/** Fatura durumları */
export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Abonelik planları */
export const PLANS = ["free", "pro", "business"] as const;
export type Plan = (typeof PLANS)[number];

/** Plan limitleri */
export const PLAN_LIMITS: Record<
  Plan,
  { customers: number; invoicesPerMonth: number; companies: number }
> = {
  free: { customers: 3, invoicesPerMonth: 5, companies: 1 },
  pro: { customers: Infinity, invoicesPerMonth: Infinity, companies: 1 },
  business: { customers: Infinity, invoicesPerMonth: Infinity, companies: 5 },
};

/** Plan fiyatları (CHF/ay) */
export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  pro: 29,
  business: 59,
};

/** QR-fatura referans tipleri */
export const QR_REFERENCE_TYPES = ["QRR", "SCOR", "NON"] as const;
export type QrReferenceType = (typeof QR_REFERENCE_TYPES)[number];

/** Tekrarlayan fatura sıklıkları */
export const RECURRING_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

/** Tekrarlayan fatura durumları */
export const RECURRING_STATUSES = ["active", "paused", "completed"] as const;
export type RecurringStatus = (typeof RECURRING_STATUSES)[number];

/** Teklif durumları */
export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "converted",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Gider kategorileri */
export const EXPENSE_CATEGORIES = [
  "office",
  "software",
  "hardware",
  "travel",
  "meals",
  "marketing",
  "education",
  "insurance",
  "rent",
  "utilities",
  "professional",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Sıklığa göre ay cinsinden periyot (yıllık raporlama için) */
export const FREQUENCY_MONTHS: Record<RecurringFrequency, number> = {
  daily: 0,
  weekly: 0,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};
