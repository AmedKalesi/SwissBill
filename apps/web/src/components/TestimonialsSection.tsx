import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Early-stage voices.
 *
 * Deliberately NOT fake five-star reviews: these are framed as "what early
 * users tell us" with role-only attribution (no invented company names or
 * photos). This keeps the section persuasive without fabricating social proof,
 * which matters both legally and for trust with a Swiss audience.
 */
const VOICES = [
  { key: "designer", initials: "MK", accent: "from-brand-500 to-brand-700" },
  { key: "consultant", initials: "AL", accent: "from-surface-600 to-surface-800" },
  { key: "studio", initials: "RS", accent: "from-brand-600 to-brand-800" },
] as const;

export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
      <div className="mx-auto max-w-6xl px-4">
        <RevealOnScroll className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            {t("landing.voices.badge")}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.voices.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
            {t("landing.voices.subtitle")}
          </p>
        </RevealOnScroll>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {VOICES.map((v, i) => (
            <RevealOnScroll key={v.key} delay={i * 100} className="flex">
              <figure className="card-lift flex w-full flex-col rounded-2xl border border-surface-200 bg-white p-7 shadow-card hover:border-brand-200 hover:shadow-card-hover dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-800">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-200 dark:text-brand-900" fill="currentColor" aria-hidden="true">
                  <path d="M9.5 5C6.5 6.5 5 9 5 12v7h6v-7H8c0-2 .8-3.4 2.5-4.3L9.5 5zm9 0C15.5 6.5 14 9 14 12v7h6v-7h-3c0-2 .8-3.4 2.5-4.3L18.5 5z" />
                </svg>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-surface-700 dark:text-surface-200">
                  “{t(`landing.voices.items.${v.key}.quote`)}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-surface-100 pt-5 dark:border-surface-700">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${v.accent} text-sm font-semibold text-white`}
                    aria-hidden="true"
                  >
                    {v.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">
                      {t(`landing.voices.items.${v.key}.role`)}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      {t(`landing.voices.items.${v.key}.place`)}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={120}>
          <p className="mt-8 text-center text-xs text-surface-400 dark:text-surface-500">
            {t("landing.voices.disclaimer")}
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
