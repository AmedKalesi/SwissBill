/**
 * Proje CRUD rotaları.
 */
import type { FastifyInstance } from "fastify";
import { projectSchema } from "@swissbill/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  /** Projeleri listele */
  app.get("/", async (request, reply) => {
    const { companyId, customerId } = request.query as {
      companyId?: string;
      customerId?: string;
    };

    const projects = await prisma.project.findMany({
      where: {
        company: { userId: request.user.sub },
        ...(companyId ? { companyId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: projects });
  });

  /** Tek proje getir */
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await prisma.project.findFirst({
      where: { id, company: { userId: request.user.sub } },
      include: { customer: true },
    });
    if (!project) {
      throw new AppError("PROJECT_NOT_FOUND", "Proje bulunamadı", 404);
    }
    return reply.send({ data: project });
  });

  /** Proje oluştur */
  app.post("/", async (request, reply) => {
    const body = request.body as { companyId?: string } & Record<
      string,
      unknown
    >;
    const input = projectSchema.parse(body);

    if (!body.companyId) {
      throw new AppError("COMPANY_REQUIRED", "companyId gerekli", 400);
    }

    const company = await prisma.company.findFirst({
      where: { id: body.companyId, userId: request.user.sub },
    });
    if (!company) {
      throw new AppError("COMPANY_NOT_FOUND", "Şirket bulunamadı", 404);
    }

    const project = await prisma.project.create({
      data: { ...input, companyId: body.companyId },
    });
    return reply.code(201).send({ data: project });
  });

  /** Proje güncelle */
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = projectSchema.partial().parse(request.body);

    const existing = await prisma.project.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("PROJECT_NOT_FOUND", "Proje bulunamadı", 404);
    }

    const project = await prisma.project.update({
      where: { id },
      data: input,
    });
    return reply.send({ data: project });
  });

  /** Proje sil */
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({
      where: { id, company: { userId: request.user.sub } },
    });
    if (!existing) {
      throw new AppError("PROJECT_NOT_FOUND", "Proje bulunamadı", 404);
    }
    await prisma.project.delete({ where: { id } });
    return reply.code(204).send();
  });
}
