/**
 * Zamanlanmış görev (cron) rotaları.
 *
 * Bu rotalar JWT yerine `X-Cron-Secret` başlığı ile korunur ve harici
 * zamanlayıcılar (Railway/Vercel Cron, GitHub Actions vb.) tarafından
 * çağrılmak üzere tasarlanmıştır.
 *
 * Örnek çağrı:
 *   curl -X POST https://api.example.com/api/cron/recurring \
 *     -H "X-Cron-Secret: $CRON_SECRET"
 */
import type { FastifyInstance } from "fastify";
import { runDueRecurringInvoices } from "../services/recurring.service.js";
import { sendDueReminders } from "../services/reminder.service.js";

export async function cronRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.verifyCronSecret);

  /**
   * Vadesi gelen tüm tekrarlayan fatura şablonlarını çalıştırır.
   * Günlük olarak çağrılmalıdır.
   */
  app.post("/recurring", async (_request, reply) => {
    const startedAt = Date.now();
    const result = await runDueRecurringInvoices();
    const durationMs = Date.now() - startedAt;

    app.log.info(
      {
        job: "recurring",
        processed: result.processed,
        generated: result.generated,
        failed: result.failed,
        durationMs,
      },
      "Cron: tekrarlayan faturalar işlendi",
    );

    if (result.errors.length > 0) {
      app.log.warn({ job: "recurring", errors: result.errors }, "Cron: bazı şablonlar başarısız");
    }

    return reply.send({ data: { ...result, durationMs } });
  });

  /**
   * Vadesi geçmiş tüm faturalar için ödeme hatırlatması gönderir.
   * Günlük olarak çağrılmalıdır.
   */
  app.post("/reminders", async (_request, reply) => {
    const startedAt = Date.now();
    const result = await sendDueReminders({ attachPdf: false });
    const durationMs = Date.now() - startedAt;

    app.log.info(
      {
        job: "reminders",
        processed: result.processed,
        sent: result.sent,
        skipped: result.skipped,
        durationMs,
      },
      "Cron: ödeme hatırlatmaları işlendi",
    );

    return reply.send({ data: { ...result, durationMs } });
  });

  /**
   * Tüm zamanlanmış görevleri tek çağrıda çalıştırır.
   * Harici cron için tek endpoint tercih ediliyorsa kullanılır.
   */
  app.post("/run-all", async (_request, reply) => {
    const startedAt = Date.now();

    const recurring = await runDueRecurringInvoices();
    const reminders = await sendDueReminders({ attachPdf: false });

    const durationMs = Date.now() - startedAt;

    app.log.info(
      {
        job: "run-all",
        recurring: {
          processed: recurring.processed,
          generated: recurring.generated,
          failed: recurring.failed,
        },
        reminders: {
          processed: reminders.processed,
          sent: reminders.sent,
          skipped: reminders.skipped,
        },
        durationMs,
      },
      "Cron: tüm görevler işlendi",
    );

    return reply.send({ data: { recurring, reminders, durationMs } });
  });
}
