/**
 * Şirket profili rotaları (fatura kesen taraf).
 */
import type { FastifyInstance } from "fastify";
import { companySchema } from "@swissbill/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";
import { enforceCompanyLimit } from "../services/invoice.service.js";

export async function companyRoutes(app: FastifyInstance): Promise<void> {
  // Tüm rotalar kimlik doğrulama gerektirir
  app.addHook("preHandler", app.authenticate);

  /** Kullanıcının şirketlerini listele */
  app.get("/", async (request, reply) => {
    const companies = await prisma.company.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ data: companies });
  });

  /** Tek şirket getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const company = await prisma.company.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }
    return reply.send({ data: company });
  });

  /** Şirket oluştur */
  app.post("/", async (request, reply) => {
    const input = companySchema.parse(request.body);

    // Plan şirket limitini zorunlu kıl
    await enforceCompanyLimit(request.user.sub);

    const company = await prisma.company.create({
      data: { ...input, userId: request.user.sub },
    });
    return reply.code(201).send({ data: company });
  });

  /** Şirket güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = companySchema.partial().parse(request.body);

    const existing = await prisma.company.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!existing) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    const company = await prisma.company.update({
      where: { id },
      data: input,
    });
    return reply.send({ data: company });
  });

  /** Şirket sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.company.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!existing) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }
    await prisma.company.delete({ where: { id } });
    return reply.code(204).send();
  });
}
