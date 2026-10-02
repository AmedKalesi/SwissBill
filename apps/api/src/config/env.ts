/**
 * Ortam değişkenlerini doğrular ve tip güvenli erişim sağlar.
 */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET en az 16 karakter olmalı"),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("flinkli <fatura@flinkli.ch>"),

  APP_URL: z.string().default("http://localhost:5173"),

  // --- Zamanlanmış görevler (cron) ---
  /** Harici cron çağrılarını koruyan paylaşılan sır (X-Cron-Secret başlığı) */
  CRON_SECRET: z.string().min(16).optional(),
  /** Sunucu içi zamanlayıcıyı etkinleştir (varsayılan: production'da açık) */
  CRON_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  /** Tekrarlayan fatura kontrolü için cron ifadesi (varsayılan: her gün 06:00) */
  CRON_RECURRING_SCHEDULE: z.string().default("0 6 * * *"),
  /** Ödeme hatırlatma kontrolü için cron ifadesi (varsayılan: her gün 07:00) */
  CRON_REMINDER_SCHEDULE: z.string().default("0 7 * * *"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Ortam değişkenleri geçersiz:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
