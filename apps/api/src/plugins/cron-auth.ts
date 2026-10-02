/**
 * Cron kimlik doğrulama eklentisi.
 *
 * Harici zamanlayıcıların (Railway/Vercel Cron, GitHub Actions vb.)
 * korumalı cron endpoint'lerini çağırabilmesi için `X-Cron-Secret`
 * başlığını doğrular.
 *
 * `fastify.verifyCronSecret` decorator'ı ile korumalı rotalar tanımlanır.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    verifyCronSecret: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

/** Sabit zamanlı karşılaştırma (timing attack koruması). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function cronAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorate(
    "verifyCronSecret",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!env.CRON_SECRET) {
        reply.code(503).send({
          error: {
            code: "CRON_DISABLED",
            message: "Cron endpoint'leri yapılandırılmamış (CRON_SECRET eksik)",
          },
        });
        return;
      }

      const provided = request.headers["x-cron-secret"];
      const secret = Array.isArray(provided) ? provided[0] : provided;

      if (!secret || !safeEqual(secret, env.CRON_SECRET)) {
        reply.code(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Geçersiz veya eksik cron sırrı",
          },
        });
      }
    },
  );
}

export default fp(cronAuthPlugin, { name: "cron-auth" });
