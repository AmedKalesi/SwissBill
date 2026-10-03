import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/Logo";

/**
 * Hero ürün mockup'ı.
 *
 * Harici görsel gerektirmeyen, tamamen CSS/SVG ile çizilmiş bir tarayıcı
 * penceresi içinde flinkli dashboard'unu ve bir QR-fatura kartını gösterir.
 * Amaç: landing hero'suna "gerçek ürün" hissi katmak ve dönüşümü artırmak.
 *
 * Tüm metinler i18n üzerinden gelir (`landing.mockup.*`), böylece 6 dilde
 * de doğru görünür. Renkler marka paletiyle (`brand` / `surface`) uyumludur.
 */
export function ProductMockup() {
  const { t } = useTranslation();

  const bars = [42, 68, 55, 82, 61, 74];

  // Bars grow in once the mockup is on screen; respects reduced-motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMounted(true);
      return;
    }
    const id = window.setTimeout(() => setMounted(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative mx-auto mt-14 max-w-5xl px-4">
      {/* Marka renginde yumuşak zemin parıltısı */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-8 h-64 rounded-[2rem] bg-brand-200/40 blur-3xl"
      />

      {/* Tarayıcı penceresi */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-2xl shadow-surface-900/10 ring-1 ring-surface-900/5">
        {/* Pencere çubuğu */}
        <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-700/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white dark:bg-surface-800 px-3 py-1 text-xs text-surface-400 dark:text-surface-500 ring-1 ring-surface-200 dark:ring-surface-700">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
            app.flinkli.ch
          </div>
        </div>

        {/* Uygulama gövdesi */}
        <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
          {/* Mini sidebar */}
          <aside className="hidden border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/60 p-4 sm:block">
            <div className="mb-4 flex items-center gap-2">
              <LogoMark size={28} />
              <span className="text-sm font-semibold text-surface-800 dark:text-surface-100">flinkli</span>
            </div>
            <div className="space-y-1.5">
              {["dashboard", "invoices", "customers", "reports"].map((key, i) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
                    i === 0
                      ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                      : "text-surface-500 dark:text-surface-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === 0 ? "bg-brand-600" : "bg-surface-300"
                    }`}
                    aria-hidden="true"
                  />
                  {t(`landing.mockup.nav.${key}`)}
                </div>
              ))}
            </div>
          </aside>

          {/* Ana içerik */}
          <div className="p-5 sm:p-6">
            {/* Başlık satırı */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">
                  {t("landing.mockup.title")}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {t("landing.mockup.subtitle")}
                </p>
              </div>
              <span className="hidden rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white sm:inline-block">
                {t("landing.mockup.newInvoice")}
              </span>
            </div>

            {/* Metrik kartları */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { key: "outstanding", value: "12'480", accent: "text-surface-900 dark:text-white" },
                { key: "paid", value: "8'920", accent: "text-emerald-600" },
                { key: "late", value: "1'250", accent: "text-brand-600" },
              ].map((m) => (
                <div
                  key={m.key}
                  className="group/metric rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-3 transition duration-300 ease-smooth hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover dark:hover:border-brand-700/60"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-surface-400 dark:text-surface-500">
                    {t(`landing.mockup.metrics.${m.key}`)}
                  </p>
                  <p className={`mt-1 text-base font-bold tabular-nums ${m.accent}`}>
                    {m.value}
                    <span className="ml-1 text-[10px] font-medium text-surface-400 dark:text-surface-500">CHF</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Grafik + QR kartı */}
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
              {/* Basit bar grafik */}
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                  {t("landing.mockup.chartLabel")}
                </p>
                <div className="mt-3 flex h-24 items-end gap-2">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-md transition-[height,background-color] duration-700 ease-smooth ${
                        i === bars.length - 2
                          ? "bg-brand-600"
                          : "bg-brand-200 hover:bg-brand-400 dark:bg-brand-900/70 dark:hover:bg-brand-700"
                      }`}
                      style={{
                        height: mounted ? `${h}%` : "6%",
                        transitionDelay: `${i * 70}ms`,
                      }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              {/* QR-fatura mini kart */}
              <div className="group/qr flex w-full flex-col items-center justify-center rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-4 transition duration-300 ease-smooth hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover sm:w-40 dark:hover:border-brand-700/60">
                <svg
                  viewBox="0 0 29 29"
                  className="h-20 w-20 text-surface-900 dark:text-white"
                  aria-hidden="true"
                  shapeRendering="crispEdges"
                >
                  {/* Sadeleştirilmiş QR deseni */}
                  <rect width="29" height="29" fill="white" />
                  <g fill="currentColor">
                    <rect x="0" y="0" width="7" height="7" />
                    <rect x="1" y="1" width="5" height="5" fill="white" />
                    <rect x="2" y="2" width="3" height="3" />
                    <rect x="22" y="0" width="7" height="7" />
                    <rect x="23" y="1" width="5" height="5" fill="white" />
                    <rect x="24" y="2" width="3" height="3" />
                    <rect x="0" y="22" width="7" height="7" />
                    <rect x="1" y="23" width="5" height="5" fill="white" />
                    <rect x="2" y="24" width="3" height="3" />
                    <rect x="10" y="2" width="2" height="2" />
                    <rect x="14" y="2" width="2" height="2" />
                    <rect x="10" y="6" width="2" height="2" />
                    <rect x="16" y="6" width="2" height="2" />
                    <rect x="12" y="10" width="2" height="2" />
                    <rect x="18" y="10" width="2" height="2" />
                    <rect x="10" y="14" width="2" height="2" />
                    <rect x="14" y="14" width="2" height="2" />
                    <rect x="20" y="14" width="2" height="2" />
                    <rect x="12" y="18" width="2" height="2" />
                    <rect x="16" y="18" width="2" height="2" />
                    <rect x="22" y="18" width="2" height="2" />
                    <rect x="10" y="22" width="2" height="2" />
                    <rect x="14" y="22" width="2" height="2" />
                    <rect x="18" y="22" width="2" height="2" />
                    <rect x="24" y="22" width="2" height="2" />
                    <rect x="12" y="26" width="2" height="2" />
                    <rect x="20" y="26" width="2" height="2" />
                  </g>
                </svg>
                <p className="mt-2 text-center text-[10px] font-medium text-surface-500 dark:text-surface-400">
                  {t("landing.mockup.qrLabel")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
