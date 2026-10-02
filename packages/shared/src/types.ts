/**
 * Uygulama genelinde paylaşılan tip tanımları.
 */
import type {
  ExpenseCategory,
  InvoiceStatus,
  Locale,
  Plan,
  QrReferenceType,
  QuoteStatus,
  RecurringFrequency,
  RecurringStatus,
} from "./constants.js";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  locale: Locale;
  createdAt: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  street?: string | null;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string | null;
  iban: string;
  logoUrl?: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  street?: string | null;
  zip?: string | null;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string;
  invoiceNumber: string;
  /** Görüntüleme kolaylığı için fatura numarası takma adı */
  number?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  qrReference?: string | null;
  /** Görüntüleme kolaylığı için QR referans takma adı */
  reference?: string | null;
  qrReferenceType: QrReferenceType;
  pdfUrl?: string | null;
  notes?: string | null;
  /** Gönderilen ödeme hatırlatma sayısı */
  reminderCount?: number;
  /** Son hatırlatmanın gönderildiği tarih */
  lastReminderAt?: string | null;
  /** TWINT ödeme linki (müşteriye gösterilir) */
  twintPaymentLink?: string | null;
  /** TWINT ödeme durumu */
  twintStatus?: TwintStatus;
  /** TWINT ile ödendiği zaman */
  twintPaidAt?: string | null;
  /** Müşteri e-imzası (data URL, PNG) */
  signatureData?: string | null;
  /** İmzalayan kişinin adı */
  signedByName?: string | null;
  /** İmza zamanı */
  signedAt?: string | null;
  /** İmza IP adresi (denetim izi) */
  signedIp?: string | null;
  items: InvoiceItem[];
  customer?: Customer | null;
  company?: Company | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  companyId: string;
  customerId: string;
  name: string;
  description?: string | null;
  status: string;
  hourlyRate?: number | null;
  budget?: number | null;
  customer?: Customer | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  currentPeriodEnd?: string | null;
}

export interface RecurringInvoice {
  id: string;
  companyId: string;
  customerId: string;
  name: string;
  frequency: RecurringFrequency;
  intervalCount: number;
  startDate: string;
  endDate?: string | null;
  nextRunAt: string;
  lastRunAt?: string | null;
  dueDays: number;
  currency: string;
  qrReferenceType: QrReferenceType;
  notes?: string | null;
  status: RecurringStatus;
  autoSend: boolean;
  items: InvoiceItemInputLike[];
  customer?: Customer | null;
  createdAt: string;
  updatedAt: string;
}

/** Tekrarlayan fatura şablon kalemi (JSON olarak saklanır) */
export interface InvoiceItemInputLike {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  companyId: string;
  customerId: string;
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  notes?: string | null;
  convertedInvoiceId?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  /** Müşteri e-imzası (data URL, PNG) */
  signatureData?: string | null;
  /** İmzalayan kişinin adı */
  signedByName?: string | null;
  /** İmza zamanı */
  signedAt?: string | null;
  /** İmza IP adresi (denetim izi) */
  signedIp?: string | null;
  items: QuoteItem[];
  customer?: Customer | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  companyId: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  vatAmount: number;
  currency: string;
  vendor?: string | null;
  reference?: string | null;
  deductible: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPortal {
  id: string;
  customerId: string;
  token: string;
  active: boolean;
  lastAccessAt?: string | null;
  accessCount: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** TWINT ödeme durumu */
export type TwintStatus = "none" | "pending" | "paid";

/** TWINT ödeme bilgisi (API yanıtı) */
export interface TwintPaymentInfo {
  /** Ödeme linki (müşteriye gösterilir) */
  paymentLink: string;
  /** QR kod görseli (data URL, PNG) */
  qrDataUrl: string;
  /** Ödeme durumu */
  status: TwintStatus;
  /** Tutar (görüntüleme için) */
  amount: number;
  /** Para birimi */
  currency: string;
  /** Fatura numarası */
  invoiceNumber: string;
}

/** Muhasebe entegrasyonu sağlayıcısı */
export type AccountingProvider = "bexio" | "abacus" | "banana";

/** Muhasebe entegrasyonu bağlantı durumu */
export type AccountingIntegrationStatus =
  | "connected"
  | "disconnected"
  | "error";

/** Muhasebe entegrasyonu (API yanıtı) */
export interface AccountingIntegration {
  id: string;
  companyId: string;
  provider: AccountingProvider;
  status: AccountingIntegrationStatus;
  externalTenantId?: string | null;
  lastSyncAt?: string | null;
  syncError?: string | null;
  syncedInvoices: number;
  syncedExpenses: number;
  createdAt: string;
  updatedAt: string;
}

/** Senkronizasyon sonucu */
export interface AccountingSyncResult {
  provider: AccountingProvider;
  syncedInvoices: number;
  syncedExpenses: number;
  lastSyncAt: string;
}

/** Plan kullanım özeti (limit göstergeleri için) */
export interface PlanUsage {
  plan: Plan;
  customers: { used: number; limit: number };
  invoicesThisMonth: { used: number; limit: number };
  companies: { used: number; limit: number };
}

/** API genel yanıt zarfı */
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
