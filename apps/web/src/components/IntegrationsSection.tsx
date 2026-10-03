import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * "Fits your workflow" section.
 *
 * Shows the concrete touch-points flinkli has with the tools a Swiss
 * freelancer already uses (banking apps, e-mail, accounting exports, card
 * payments). Presented as a connected flow rather than a logo wall, because
 * the product does not claim formal partnerships it cannot back up.
 */
const STEPS = [
  { key: "create", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" },
  { key: "send", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4z" },
  { key: "pay", icon: "M3 10h18M7 15h3M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" },
  { key: "reconcile", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
] as const;

export function IntegrationsSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
      <div className="mx-auto max-w-6xl px-4">
        <RevealOnScroll className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.workflow.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
            {t("landing.workflow.subtitle")}
          </p>
        </RevealOnScroll>

        <div className="relative mt-14">
          {/* Connecting line behind the step cards (desktop only). */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-surface-300 to-transparent lg:block dark:via-surface-600"
          />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <RevealOnScroll key={s.key} delay={i * 90} as="li">
                <div className="group flex h-full flex-col items-center text-center">
                  <span className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-surface-200 bg-white text-brand-600 shadow-card transition-transform duration-300 ease-smooth group-hover:-translate-y-1 group-hover:shadow-card-hover dark:border-surface-700 dark:bg-surface-900 dark:text-brand-400">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={s.icon} />
                    </svg>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white dark:ring-surface-800">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-surface-900 dark:text-white">
                    {t(`landing.workflow.steps.${s.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
                    {t(`landing.workflow.steps.${s.key}.desc`)}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
