/**
 * Zod validasyon şemaları — hem frontend hem backend tarafından kullanılır.
 */
import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  INVOICE_STATUSES,
  LOCALES,
  PLANS,
  QR_REFERENCE_TYPES,
  QUOTE_STATUSES,
  RECURRING_FREQUENCIES,
  RECURRING_STATUSES,
} from "./constants.js";

/** İsviçre IBAN: CH + 2 kontrol + 17 karakter (toplam 21) */
const ibanRegex = /^CH\d{2}[A-Z0-9]{17}$/;
/** İsviçre KDV numarası: CHE-123.456.789 (MWST/TVA/IVA opsiyonel) */
const vatRegex = /^CHE-\d{3}\.\d{3}\.\d{3}(\s?(MWST|TVA|IVA))?$/;

export const localeSchema = z.enum(LOCALES);
export const planSchema = z.enum(PLANS);
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export const qrReferenceTypeSchema = z.enum(QR_REFERENCE_TYPES);

export const registerSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  locale: localeSchema.default("de-CH"),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export const companySchema = z.object({
  name: z.string().min(1, "Şirket adı gerekli"),
  addressLine1: z.string().min(1, "Adres gerekli"),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().min(4, "Posta kodu gerekli"),
  city: z.string().min(1, "Şehir gerekli"),
  country: z.string().default("CH"),
  vatNumber: z
    .string()
    .regex(vatRegex, "KDV numarası formatı: CHE-123.456.789 MWST")
    .optional()
    .nullable(),
  iban: z
    .string()
    .regex(ibanRegex, "Geçerli bir İsviçre IBAN girin (CH...)"),
  logoUrl: z.string().url().optional().nullable(),
  defaultCurrency: z.string().default("CHF"),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Müşteri adı gerekli"),
  email: z.string().email().optional().nullable(),
  addressLine1: z.string().min(1, "Adres gerekli"),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().min(4, "Posta kodu gerekli"),
  city: z.string().min(1, "Şehir gerekli"),
  country: z.string().default("CH"),
  vatNumber: z.string().optional().nullable(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Açıklama gerekli"),
  quantity: z.number().positive("Miktar pozitif olmalı"),
  unitPrice: z.number().min(0, "Birim fiyat negatif olamaz"),
  vatRate: z.number().min(0).max(100),
});

export const invoiceSchema = z.object({
  customerId: z.string().uuid("Geçerli müşteri seçin"),
  issueDate: z.string().datetime().or(z.string().date()),
  dueDate: z.string().datetime().or(z.string().date()),
  currency: z.string().default("CHF"),
  status: invoiceStatusSchema.default("draft"),
  qrReferenceType: qrReferenceTypeSchema.default("NON"),
  qrReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "En az bir kalem ekleyin"),
});

export const projectSchema = z.object({
  customerId: z.string().uuid("Geçerli müşteri seçin"),
  name: z.string().min(1, "Proje adı gerekli"),
  status: z.string().default("active"),
  hourlyRate: z.number().min(0).optional().nullable(),
});

// ============================================
// Tekrarlayan Fatura
// ============================================

export const recurringFrequencySchema = z.enum(RECURRING_FREQUENCIES);
export const recurringStatusSchema = z.enum(RECURRING_STATUSES);

export const recurringInvoiceSchema = z.object({
  customerId: z.string().uuid("Geçerli müşteri seçin"),
  name: z.string().min(1, "Şablon adı gerekli"),
  frequency: recurringFrequencySchema.default("monthly"),
  intervalCount: z.number().int().min(1).max(12).default(1),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z
    .string()
    .datetime()
    .or(z.string().date())
    .optional()
    .nullable(),
  dueDays: z.number().int().min(0).max(365).default(30),
  currency: z.string().default("CHF"),
  qrReferenceType: qrReferenceTypeSchema.default("NON"),
  notes: z.string().optional().nullable(),
  status: recurringStatusSchema.default("active"),
  autoSend: z.boolean().default(false),
  items: z.array(invoiceItemSchema).min(1, "En az bir kalem ekleyin"),
});

// ============================================
// Teklif (Quote)
// ============================================

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

export const quoteSchema = z.object({
  customerId: z.string().uuid("Geçerli müşteri seçin"),
  issueDate: z.string().datetime().or(z.string().date()),
  validUntil: z.string().datetime().or(z.string().date()),
  currency: z.string().default("CHF"),
  status: quoteStatusSchema.default("draft"),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "En az bir kalem ekleyin"),
});

// ============================================
// Gider (Expense)
// ============================================

// ============================================
// E-imza (Digital Signature)
// ============================================

/** PNG data URL olarak saklanan imza görseli. */
const signatureDataRegex = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export const signatureSchema = z.object({
  /** İmza görseli (data URL, PNG). Maks. ~500KB base64. */
  signatureData: z
    .string()
    .regex(signatureDataRegex, "Geçersiz imza verisi (PNG data URL bekleniyor)")
    .max(700_000, "İmza verisi çok büyük"),
  /** İmzalayan kişinin adı */
  signedByName: z.string().min(1, "İmzalayan adı gerekli").max(200),
});

export type SignatureInput = z.infer<typeof signatureSchema>;

// ============================================
// TWINT Ödeme
// ============================================

export const twintStatusSchema = z.enum(["none", "pending", "paid"]);

/** TWINT ödeme linki üretimi için istek gövdesi. */
export const twintPaymentSchema = z.object({
  /** Ödeme linkinin yönlendireceği taban URL (opsiyonel; yoksa varsayılan kullanılır) */
  returnUrl: z.string().url().optional().nullable(),
});

export type TwintPaymentInput = z.infer<typeof twintPaymentSchema>;

// ============================================
// Muhasebe Entegrasyonu (Accounting Integration)
// ============================================

export const accountingProviderSchema = z.enum([
  "bexio",
  "abacus",
  "banana",
]);

/** Entegrasyon başlatma isteği gövdesi. */
export const accountingConnectSchema = z.object({
  companyId: z.string().uuid("Geçerli bir şirket seçin"),
  provider: accountingProviderSchema.default("bexio"),
  /** OAuth dönüş adresi (opsiyonel; yoksa varsayılan kullanılır) */
  redirectUri: z.string().url().optional().nullable(),
});

/** Senkronizasyon isteği gövdesi. */
export const accountingSyncSchema = z.object({
  companyId: z.string().uuid("Geçerli bir şirket seçin"),
  provider: accountingProviderSchema.default("bexio"),
  /** Faturaları senkronize et */
  syncInvoices: z.boolean().default(true),
  /** Giderleri senkronize et */
  syncExpenses: z.boolean().default(true),
});

export type AccountingConnectInput = z.infer<typeof accountingConnectSchema>;
export type AccountingSyncInput = z.infer<typeof accountingSyncSchema>;

// ============================================
// Gider (Expense)
// ============================================

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);

export const expenseSchema = z.object({
  date: z.string().datetime().or(z.string().date()),
  description: z.string().min(1, "Açıklama gerekli"),
  category: expenseCategorySchema.default("other"),
  amount: z.number().min(0, "Tutar negatif olamaz"),
  vatAmount: z.number().min(0).default(0),
  currency: z.string().default("CHF"),
  vendor: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  deductible: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type RecurringInvoiceInput = z.infer<typeof recurringInvoiceSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
