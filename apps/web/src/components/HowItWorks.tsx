import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * "How it works" — a three-step walkthrough that reduces perceived complexity
 * for first-time visitors. Each step is numbered, icon-led and revealed on
 * scroll with a staggered delay.
 *
 * Copy lives under `landing.how.*` so all six locales stay in sync.
 */
const STEPS = [
  {
    key: "profile",
    icon: "M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M9 7h2M9 11h2M9 15h2",
  },
  {
    key: "invoice",
    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h4",
  },
  {
    key: "getPaid",
    icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section
      id="how-it-works"
      className="scroll-smooth border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900"
    >
      <div className="mx-auto max-w-6xl px-4">
        <RevealOnScroll className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            {t("landing.how.badge")}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.how.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
            {t("landing.how.subtitle")}
          </p>
        </RevealOnScroll>

        <ol className="relative mt-14 grid gap-8 sm:grid-cols-3">
          {/* Connecting line behind the steps on wide screens. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent sm:block dark:via-brand-900"
          />
          {STEPS.map((step, index) => (
            <RevealOnScroll
              key={step.key}
              delay={index * 110}
              as="li"
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card ring-1 ring-surface-200 transition-transform duration-300 ease-smooth hover:scale-105 dark:bg-surface-800 dark:text-brand-400 dark:ring-surface-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={step.icon} />
                </svg>
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-brand">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-surface-900 dark:text-white">
                {t(`landing.how.steps.${step.key}.title`)}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-surface-600 dark:text-surface-300">
                {t(`landing.how.steps.${step.key}.desc`)}
              </p>
            </RevealOnScroll>
          ))}
        </ol>
      </div>
    </section>
  );
}
