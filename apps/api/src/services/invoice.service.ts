/**
 * Fatura iş mantığı servisi.
 * Fatura numaralandırma, toplam hesaplama ve QR-referans üretimi.
 */
import {
  calculateInvoiceTotals,
  generateQrrReference,
  PLAN_LIMITS,
  type InvoiceInput,
  type Plan,
} from "@swissbill/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";

/** Kullanıcının planını döner (abonelik yoksa 'free'). */
export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return (sub?.plan as Plan) ?? "free";
}

/** Plan limitlerini kontrol eder. */
export async function enforceInvoiceLimit(
  userId: string,
  companyId: string,
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (limits.invoicesPerMonth === Infinity) return;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.invoice.count({
    where: {
      companyId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (count >= limits.invoicesPerMonth) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      `Aylık fatura limitine ulaşıldı (${limits.invoicesPerMonth}). Pro plana geçin.`,
      402,
    );
  }
}

/** Müşteri limitini kontrol eder. */
export async function enforceCustomerLimit(
  userId: string,
  companyId: string,
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (limits.customers === Infinity) return;

  const count = await prisma.customer.count({ where: { companyId } });

  if (count >= limits.customers) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      `Müşteri limitine ulaşıldı (${limits.customers}). Pro plana geçin.`,
      402,
      { limit: limits.customers, current: count, resource: "customers", plan },
    );
  }
}

/** Şirket limitini kontrol eder. */
export async function enforceCompanyLimit(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (limits.companies === Infinity) return;

  const count = await prisma.company.count({ where: { userId } });

  if (count >= limits.companies) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      `Şirket limitine ulaşıldı (${limits.companies}). Business plana geçin.`,
      402,
      { limit: limits.companies, current: count, resource: "companies", plan },
    );
  }
}

/** Kullanıcının plan kullanım özetini döner (UI göstergeleri için). */
export async function getPlanUsage(userId: string): Promise<{
  plan: Plan;
  customers: { used: number; limit: number };
  invoicesThisMonth: { used: number; limit: number };
  companies: { used: number; limit: number };
}> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [customers, invoicesThisMonth, companies] = await Promise.all([
    prisma.customer.count({ where: { company: { userId } } }),
    prisma.invoice.count({
      where: { company: { userId }, createdAt: { gte: startOfMonth } },
    }),
    prisma.company.count({ where: { userId } }),
  ]);

  return {
    plan,
    customers: { used: customers, limit: limits.customers },
    invoicesThisMonth: { used: invoicesThisMonth, limit: limits.invoicesPerMonth },
    companies: { used: companies, limit: limits.companies },
  };
}

/**
 * Sıradaki fatura numarasını üretir.
 * Format: {YIL}-{SIRA} örn. 2026-0001
 *
 * Not: Bu fonksiyon yalnızca numarayı hesaplar; eşzamanlı üretimde
 * çakışmayı önlemek için çağıran taraf `createInvoiceWithNumber` gibi
 * bir retry sarmalayıcı kullanmalıdır.
 */
export async function generateInvoiceNumber(
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const last = await prisma.invoice.findFirst({
    where: {
      companyId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextSeq = 1;
  if (last) {
    const seq = parseInt(last.invoiceNumber.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) nextSeq = seq + 1;
  }

  return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
}

/**
 * Fatura numarası çakışmasına (unique constraint) karşı retry ile
 * fatura oluşturur. Eşzamanlı üretimde aynı numaranın iki kez
 * kullanılmasını engeller.
 */
export async function createInvoiceWithNumber<T>(
  companyId: string,
  create: (invoiceNumber: string) => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const invoiceNumber = await generateInvoiceNumber(companyId);
    try {
      return await create(invoiceNumber);
    } catch (err) {
      // Prisma P2002 = unique constraint ihlali
      const code = (err as { code?: string })?.code;
      if (code !== "P2002") throw err;
      lastError = err;
    }
  }
  throw lastError ?? new Error("Fatura numarası üretilemedi");
}

/** Fatura girdisinden hesaplanmış toplamları ve QR-referansı üretir. */
export function prepareInvoiceData(input: InvoiceInput) {
  const totals = calculateInvoiceTotals(input.items);

  let qrReference = input.qrReference ?? null;
  if (input.qrReferenceType === "QRR" && !qrReference) {
    // Zaman damgasından 25 haneli taban üret
    const base = Date.now().toString().padStart(25, "0").slice(-25);
    qrReference = generateQrrReference(base);
  }

  return { totals, qrReference };
}
