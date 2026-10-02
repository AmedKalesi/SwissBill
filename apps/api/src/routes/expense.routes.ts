/**
 * Gider (Expense) rotaları: CRUD + kategori/özet.
 */
import type { FastifyInstance } from "fastify";
import { expenseSchema } from "@swissbill/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Giderleri listele */
  app.get("/", async (request, reply) => {
    const { companyId, category, from, to } = request.query as {
      companyId?: string;
      category?: string;
      from?: string;
      to?: string;
    };

    const expenses = await prisma.expense.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
        ...(category ? { category } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
    });
    return reply.send({ data: expenses });
  });

  /** Gider özeti (kategori bazında toplamlar) */
  app.get("/summary", async (request, reply) => {
    const { companyId, from, to } = request.query as {
      companyId?: string;
      from?: string;
      to?: string;
    };

    const expenses = await prisma.expense.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      select: { category: true, amount: true, vatAmount: true, deductible: true },
    });

    const byCategory: Record<
      string,
      { amount: number; vatAmount: number; count: number }
    > = {};
    let total = 0;
    let totalVat = 0;
    let deductibleTotal = 0;

    for (const e of expenses) {
      const amount = Number(e.amount);
      const vat = Number(e.vatAmount);
      total += amount;
      totalVat += vat;
      if (e.deductible) deductibleTotal += amount;

      const entry = byCategory[e.category] ?? {
        amount: 0,
        vatAmount: 0,
        count: 0,
      };
      entry.amount += amount;
      entry.vatAmount += vat;
      entry.count += 1;
      byCategory[e.category] = entry;
    }

    return reply.send({
      data: {
        total: Math.round(total * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        deductibleTotal: Math.round(deductibleTotal * 100) / 100,
        count: expenses.length,
        byCategory,
      },
    });
  });

  /** Tek gider getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const expense = await prisma.expense.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!expense) {
      throw new AppError("EXPENSE_NOT_FOUND", "Gider bulunamadı", 404);
    }
    return reply.send({ data: expense });
  });

  /** Gider oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = expenseSchema.parse(body);

    if (!body.companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }

    const company = await prisma.company.findFirst({
      where: { id: body.companyId, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: body.companyId,
        date: new Date(input.date),
        description: input.description,
        category: input.category,
        amount: input.amount,
        vatAmount: input.vatAmount,
        currency: input.currency,
        vendor: input.vendor ?? null,
        reference: input.reference ?? null,
        deductible: input.deductible,
        notes: input.notes ?? null,
      },
    });

    return reply.code(201).send({ data: expense });
  });

  /** Gider güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = expenseSchema.partial().parse(request.body);

    const existing = await prisma.expense.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("EXPENSE_NOT_FOUND", "Gider bulunamadı", 404);
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(input.date ? { date: new Date(input.date) } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.vatAmount !== undefined ? { vatAmount: input.vatAmount } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.vendor !== undefined ? { vendor: input.vendor } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.deductible !== undefined
          ? { deductible: input.deductible }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    return reply.send({ data: expense });
  });

  /** Gider sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expense.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("EXPENSE_NOT_FOUND", "Gider bulunamadı", 404);
    }
    await prisma.expense.delete({ where: { id } });
    return reply.code(204).send();
  });
}
