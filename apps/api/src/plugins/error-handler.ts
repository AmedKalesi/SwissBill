/**
 * Merkezi hata işleyici.
 * Tüm hataları tutarlı bir zarf formatında döner.
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import Stripe from "stripe";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

interface FastifyValidationError {
  validation?: unknown;
  statusCode?: number;
  message?: string;
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((rawError, _request, reply) => {
    const error = rawError as FastifyValidationError & Error;

    // Zod validasyon hataları
    if (rawError instanceof ZodError) {
      return reply.code(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Girdi doğrulaması başarısız",
          details: rawError.flatten().fieldErrors,
        },
      });
    }

    // Uygulama hataları
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Fastify doğrulama hataları
    if (error.validation) {
      return reply.code(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Girdi doğrulaması başarısız",
          details: error.validation,
        },
      });
    }

    // Stripe hataları — kullanıcıya anlamlı mesaj döner, ham Stripe
    // mesajını sızdırmaz. Kart hataları 402, diğerleri 502 (upstream).
    if (rawError instanceof Stripe.errors.StripeError) {
      app.log.error({ type: rawError.type, code: rawError.code }, rawError.message);

      const isCardError = rawError.type === "StripeCardError";
      const isRateLimit = rawError.type === "StripeRateLimitError";

      return reply.code(isCardError ? 402 : isRateLimit ? 429 : 502).send({
        error: {
          code: isCardError
            ? "PAYMENT_FAILED"
            : isRateLimit
              ? "PAYMENT_RATE_LIMITED"
              : "PAYMENT_PROVIDER_ERROR",
          message: isCardError
            ? "Ödeme reddedildi. Lütfen kart bilgilerinizi kontrol edin."
            : "Ödeme sağlayıcısıyla iletişim kurulamadı. Lütfen tekrar deneyin.",
          details:
            process.env.NODE_ENV === "production"
              ? undefined
              : { type: rawError.type, code: rawError.code },
        },
      });
    }

    // Prisma bilinen hataları — ham hata yerine anlamlı mesaj.
    const prismaCode = (rawError as { code?: string }).code;
    if (typeof prismaCode === "string" && prismaCode.startsWith("P")) {
      app.log.error({ prismaCode }, error.message);

      if (prismaCode === "P2002") {
        return reply.code(409).send({
          error: {
            code: "CONFLICT",
            message: "Bu kayıt zaten mevcut",
          },
        });
      }
      if (prismaCode === "P2025") {
        return reply.code(404).send({
          error: { code: "NOT_FOUND", message: "Kayıt bulunamadı" },
        });
      }
      if (prismaCode === "P2003") {
        return reply.code(409).send({
          error: {
            code: "FOREIGN_KEY_CONFLICT",
            message: "İlişkili kayıtlar nedeniyle işlem tamamlanamadı",
          },
        });
      }
    }

    // Beklenmeyen hatalar
    app.log.error(error);
    return reply.code(error.statusCode ?? 500).send({
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Sunucu hatası"
            : error.message,
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({
      error: { code: "NOT_FOUND", message: "Kaynak bulunamadı" },
    });
  });
}

export default fp(errorHandlerPlugin, { name: "error-handler" });
