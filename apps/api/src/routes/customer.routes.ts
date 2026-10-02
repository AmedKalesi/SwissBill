/**
 * Müşteri CRUD rotaları.
 */
import type { FastifyInstance } from "fastify";
import { customerSchema } from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import { enforceCustomerLimit } from "../services/invoice.service.js";

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Kullanıcının tüm müşterilerini listele */
  app.get("/", async (request, reply) => {
    const { companyId } = request.query as { companyId?: string };

    const customers = await prisma.customer.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
      },
      orderBy: { name: "asc" },
    });
    return reply.send({ data: customers });
  });

  /** Tek müşteri getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }
    return reply.send({ data: customer });
  });

  /** Müşteri oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = customerSchema.parse(body);

    if (!body.companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }

    // Şirketin kullanıcıya ait olduğunu doğrula
    const company = await prisma.company.findFirst({
      where: { id: body.companyId, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    // Plan müşteri limitini zorunlu kıl
    await enforceCustomerLimit(request.user.sub, body.companyId);

    const customer = await prisma.customer.create({
      data: { ...input, companyId: body.companyId },
    });
    return reply.code(201).send({ data: customer });
  });

  /** Müşteri güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = customerSchema.partial().parse(request.body);

    const existing = await prisma.customer.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: input,
    });
    return reply.send({ data: customer });
  });

  /** Müşteri sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.customer.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("CUSTOMER_NOT_FOUND", "Müşteri bulunamadı", 404);
    }
    await prisma.customer.delete({ where: { id } });
    return reply.code(204).send();
  });
}
