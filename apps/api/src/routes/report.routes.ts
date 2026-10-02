/**
 * Rapor rotaları: gelir özeti, aylık kırılım, müşteri bazlı gelir.
 */
import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";

interface MonthlyBucket {
  month: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  count: number;
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  count: number;
}

/** YYYY-MM anahtarı üretir. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Son N ayın boş kovalarını (eskiden yeniye) üretir. */
function emptyBuckets(months: number): Map<string, MonthlyBucket> {
  const buckets = new Map<string, MonthlyBucket>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, {
      month: key,
      invoiced: 0,
      paid: 0,
      outstanding: 0,
      count: 0,
    });
  }
  return buckets;
}

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /**
   * Gelir özeti: toplam ciro, tahsil edilen, bekleyen, gecikmiş ve
   * son 12 ayın aylık kırılımı ile müşteri bazlı gelir.
   */
  app.get("/revenue", async (request, reply) => {
    const { months, companyId } = request.query as {
      months?: string;
      companyId?: string;
    };
    const monthCount = Math.min(Math.max(Number(months) || 12, 1), 36);

    const invoices = await prisma.invoice.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { issueDate: "asc" },
    });

    const buckets = emptyBuckets(monthCount);
    const customerMap = new Map<string, CustomerRevenue>();

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const invoice of invoices) {
      const total = Number(invoice.total);
      const isPaid = invoice.status === "paid";
      const isCancelled = invoice.status === "cancelled";
      const isOverdue =
        !isPaid &&
        !isCancelled &&
        invoice.status !== "draft" &&
        new Date(invoice.dueDate).getTime() < now.getTime();

      if (!isCancelled) {
        totalInvoiced += total;
      }
      if (isPaid) {
        totalPaid += total;
        paidCount += 1;
      } else if (!isCancelled && invoice.status !== "draft") {
        totalOutstanding += total;
      }
      if (isOverdue) {
        totalOverdue += total;
        overdueCount += 1;
      }

      // Aylık kova (fatura kesim tarihine göre)
      const key = monthKey(new Date(invoice.issueDate));
      const bucket = buckets.get(key);
      if (bucket && !isCancelled) {
        bucket.invoiced += total;
        bucket.count += 1;
        if (isPaid) {
          bucket.paid += total;
        } else if (invoice.status !== "draft") {
          bucket.outstanding += total;
        }
      }

      // Müşteri bazlı gelir
      const customerId = invoice.customerId;
      const customerName = invoice.customer?.name ?? "—";
      const entry = customerMap.get(customerId) ?? {
        customerId,
        customerName,
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        count: 0,
      };
      if (!isCancelled) {
        entry.invoiced += total;
        entry.count += 1;
      }
      if (isPaid) {
        entry.paid += total;
      } else if (!isCancelled && invoice.status !== "draft") {
        entry.outstanding += total;
      }
      customerMap.set(customerId, entry);
    }

    const round = (value: number) => Math.round(value * 100) / 100;

    const monthly = Array.from(buckets.values()).map((bucket) => ({
      month: bucket.month,
      invoiced: round(bucket.invoiced),
      paid: round(bucket.paid),
      outstanding: round(bucket.outstanding),
      count: bucket.count,
    }));

    const byCustomer = Array.from(customerMap.values())
      .map((entry) => ({
        customerId: entry.customerId,
        customerName: entry.customerName,
        invoiced: round(entry.invoiced),
        paid: round(entry.paid),
        outstanding: round(entry.outstanding),
        count: entry.count,
      }))
      .sort((a, b) => b.invoiced - a.invoiced);

    return reply.send({
      data: {
        currency: invoices[0]?.currency ?? "CHF",
        summary: {
          totalInvoiced: round(totalInvoiced),
          totalPaid: round(totalPaid),
          totalOutstanding: round(totalOutstanding),
          totalOverdue: round(totalOverdue),
          invoiceCount: invoices.length,
          paidCount,
          overdueCount,
        },
        monthly,
        byCustomer,
      },
    });
  });
}
