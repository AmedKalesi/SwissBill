/**
 * Kimlik doğrulama rotaları: kayıt, giriş, profil.
 */
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@flinkli/shared";
import { prisma } from "../db/prisma.js";
import { AppError } from "../plugins/error-handler.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /** Kayıt */
  app.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError("EMAIL_EXISTS", "Bu e-posta zaten kayıtlı", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        locale: input.locale,
        subscription: {
          create: { plan: "free", status: "active" },
        },
      },
      select: { id: true, email: true, locale: true, createdAt: true },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.code(201).send({ data: { user, token } });
  });

  /** Giriş */
  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", "E-posta veya şifre hatalı", 401);
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError("INVALID_CREDENTIALS", "E-posta veya şifre hatalı", 401);
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          locale: user.locale,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  });

  /** Mevcut kullanıcı profili */
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        select: {
          id: true,
          email: true,
          locale: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      });
      if (!user) {
        throw new AppError("USER_NOT_FOUND", "Kullanıcı bulunamadı", 404);
      }
      return reply.send({ data: user });
    },
  );
}
