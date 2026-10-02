/**
 * Sunucu içi zamanlayıcı servisi (node-cron).
 *
 * Tekrarlayan fatura üretimi ve ödeme hatırlatmalarını periyodik olarak
 * çalıştırır. `CRON_ENABLED=false` ise devre dışı kalır (harici cron
 * kullanılıyorsa veya çok instance'lı deploy'da çift çalışmayı önlemek için).
 *
 * Not: Çok instance'lı (yatay ölçekli) deploy'larda her instance kendi
 * zamanlayıcısını çalıştırır ve işler birden fazla kez tetiklenebilir.
 * Bu durumda `CRON_ENABLED=false` yapıp harici cron + `/api/cron/*`
 * endpoint'lerini kullanın.
 */
import cron, { type ScheduledTask } from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../config/env.js";
import { runDueRecurringInvoices } from "./recurring.service.js";
import { sendDueReminders } from "./reminder.service.js";

const tasks: ScheduledTask[] = [];

/** Aynı görevin üst üste çalışmasını önleyen basit kilit. */
const running = new Set<string>();

async function guarded(
  name: string,
  log: FastifyBaseLogger,
  fn: () => Promise<unknown>,
): Promise<void> {
  if (running.has(name)) {
    log.warn({ job: name }, "Zamanlanmış görev zaten çalışıyor, atlanıyor");
    return;
  }
  running.add(name);
  const startedAt = Date.now();
  try {
    const result = await fn();
    log.info(
      { job: name, durationMs: Date.now() - startedAt, result },
      "Zamanlanmış görev tamamlandı",
    );
  } catch (err) {
    log.error(
      { job: name, durationMs: Date.now() - startedAt, err },
      "Zamanlanmış görev başarısız",
    );
  } finally {
    running.delete(name);
  }
}

/**
 * Zamanlanmış görevleri başlatır.
 * `CRON_ENABLED=false` ise hiçbir görev kaydedilmez.
 */
export function startScheduler(log: FastifyBaseLogger): void {
  if (!env.CRON_ENABLED) {
    log.info("Zamanlayıcı devre dışı (CRON_ENABLED=false)");
    return;
  }

  if (!cron.validate(env.CRON_RECURRING_SCHEDULE)) {
    log.error(
      { schedule: env.CRON_RECURRING_SCHEDULE },
      "Geçersiz CRON_RECURRING_SCHEDULE ifadesi, görev kaydedilmedi",
    );
  } else {
    tasks.push(
      cron.schedule(env.CRON_RECURRING_SCHEDULE, () => {
        void guarded("recurring", log, () => runDueRecurringInvoices());
      }),
    );
    log.info(
      { schedule: env.CRON_RECURRING_SCHEDULE },
      "Tekrarlayan fatura görevi zamanlandı",
    );
  }

  if (!cron.validate(env.CRON_REMINDER_SCHEDULE)) {
    log.error(
      { schedule: env.CRON_REMINDER_SCHEDULE },
      "Geçersiz CRON_REMINDER_SCHEDULE ifadesi, görev kaydedilmedi",
    );
  } else {
    tasks.push(
      cron.schedule(env.CRON_REMINDER_SCHEDULE, () => {
        void guarded("reminders", log, () =>
          sendDueReminders({ attachPdf: false }),
        );
      }),
    );
    log.info(
      { schedule: env.CRON_REMINDER_SCHEDULE },
      "Ödeme hatırlatma görevi zamanlandı",
    );
  }
}

/** Zamanlanmış görevleri durdurur (graceful shutdown). */
export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
}
