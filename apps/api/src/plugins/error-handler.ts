/**
 * Merkezi hata işleyici.
 * Tüm hataları tutarlı bir zarf formatında döner.
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

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
