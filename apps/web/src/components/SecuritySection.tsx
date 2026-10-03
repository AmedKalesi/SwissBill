import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Security & data-residency section.
 *
 * For a Swiss invoicing product, "where does my data live?" is a purchase
 * blocker. This section answers it head-on with concrete, verifiable facts
 * (Swiss hosting, TLS in transit, encryption at rest, exportable data, no
 * resale) rather than vague "bank-grade security" language.
 */
const POINTS = [
  { key: "hosting", icon: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" },
  { key: "transit", icon: "M5 12h14M12 5l7 7-7 7" },
  { key: "rest", icon: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4" },
  { key: "export", icon: "M12 3v12M7 10l5 5 5-5M5 21h14" },
  { key: "ownership", icon: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" },
  { key: "noResale", icon: "M18 6L6 18M6 6l12 12" },
] as const;

export function SecuritySection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-100/40 blur-3xl dark:bg-brand-950/30"
      />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <RevealOnScroll>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
              </svg>
              {t("landing.security.badge")}
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
              {t("landing.security.title")}
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-300">
              {t("landing.security.body")}
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
                {t("landing.security.highlight")}
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid gap-4 sm:grid-cols-2">
            {POINTS.map((p, i) => (
              <RevealOnScroll key={p.key} delay={i * 70}>
                <div className="card-lift h-full rounded-2xl border border-surface-200 bg-surface-50/60 p-5 shadow-card hover:border-brand-200 hover:bg-white hover:shadow-card-hover dark:border-surface-700 dark:bg-surface-900/40 dark:hover:border-brand-800 dark:hover:bg-surface-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={p.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-surface-900 dark:text-white">
                    {t(`landing.security.points.${p.key}.title`)}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">
                    {t(`landing.security.points.${p.key}.desc`)}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
