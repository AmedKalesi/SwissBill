/**
 * flinkli API — Fastify sunucusu.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import cronAuthPlugin from "./plugins/cron-auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import { registerRoutes } from "./routes/index.js";
import { startScheduler, stopScheduler } from "./services/scheduler.service.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Stripe webhook imza doğrulaması için ham gövdeyi sakla
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      try {
        const raw = body as Buffer;
        (_req as { rawBody?: Buffer }).rawBody = raw;
        done(null, JSON.parse(raw.toString("utf8")));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Eklentiler
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(cronAuthPlugin);

  // Sağlık kontrolü
  app.get("/health", async () => ({
    status: "ok",
    service: "flinkli-api",
    timestamp: new Date().toISOString(),
  }));

  // API rotaları
  await app.register(registerRoutes, { prefix: "/api" });

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    app.log.info(`🚀 flinkli API çalışıyor: http://localhost:${env.API_PORT}`);

    // Sunucu içi zamanlayıcıyı başlat (CRON_ENABLED=false ise atlanır)
    startScheduler(app.log);

    // Graceful shutdown: zamanlanmış görevleri durdur
    const shutdown = async (signal: string) => {
      app.log.info({ signal }, "Kapatma sinyali alındı, zamanlayıcı durduruluyor");
      stopScheduler();
      await app.close();
      process.exit(0);
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Doğrudan çalıştırıldığında başlat
start();
