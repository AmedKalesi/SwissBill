import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Pricing with a monthly / yearly billing toggle.
 *
 * Yearly billing applies a two-month discount (i.e. pay for 10 months), which
 * is the standard Swiss SaaS convention. Prices are rendered from a single
 * source of truth so the toggle can never drift out of sync with the copy.
 */
const PLANS = [
  { key: "free", monthly: 0, highlight: false },
  { key: "pro", monthly: 29, highlight: true },
  { key: "business", monthly: 59, highlight: false },
] as const;

/** Yearly price = 10 × monthly (two months free). */
const YEARLY_MONTHS_CHARGED = 10;

export function PricingSection() {
  const { t } = useTranslation();
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <RevealOnScroll className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.pricingTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
            {t("landing.pricingSubtitle")}
          </p>
        </RevealOnScroll>

        {/* Billing period toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium transition ${
              yearly ? "text-surface-500 dark:text-surface-400" : "text-surface-900 dark:text-white"
            }`}
          >
            {t("landing.billing.monthly")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label={t("landing.billing.toggleLabel")}
            onClick={() => setYearly((v) => !v)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 ease-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
              yearly ? "bg-brand-600" : "bg-surface-300 dark:bg-surface-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ease-smooth ${
                yearly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium transition ${
              yearly ? "text-surface-900 dark:text-white" : "text-surface-500 dark:text-surface-400"
            }`}
          >
            {t("landing.billing.yearly")}
          </span>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            {t("landing.billing.save")}
          </span>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = yearly ? p.monthly * YEARLY_MONTHS_CHARGED : p.monthly;
            return (
              <RevealOnScroll key={p.key} delay={i * 90} className="flex">
                <div
                  className={`card-lift flex w-full flex-col rounded-2xl border bg-white p-8 dark:bg-surface-800 ${
                    p.highlight
                      ? "border-brand-600 shadow-brand ring-1 ring-brand-600"
                      : "border-surface-200 shadow-card hover:shadow-card-hover dark:border-surface-700"
                  }`}
                >
                  {p.highlight && (
                    <span className="mb-3 inline-block self-start rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      {t("landing.popular")}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                    {t(`landing.plans.${p.key}.name`)}
                  </h3>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums text-surface-900 dark:text-white">
                      {price}
                    </span>
                    <span className="text-surface-500 dark:text-surface-400">
                      CHF{t("landing.perMonth")}
                    </span>
                  </p>
                  <p className="mt-1 h-4 text-xs text-surface-500 dark:text-surface-400">
                    {yearly && p.monthly > 0 ? t("landing.billing.billedYearly") : ""}
                  </p>
                  <ul className="mb-8 mt-6 flex-1 space-y-3 text-sm text-surface-600 dark:text-surface-300">
                    {[1, 2, 3, 4].map((n) => {
                      const line = t(`landing.plans.${p.key}.f${n}`, { defaultValue: "" });
                      if (!line) return null;
                      return (
                        <li key={n} className="flex items-start gap-2">
                          <span className="text-brand-600 dark:text-brand-400">✓</span>
                          <span>{line}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-auto block rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                      p.highlight
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "border border-surface-300 text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:hover:bg-surface-700"
                    }`}
                  >
                    {t("landing.choosePlan")}
                  </Link>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
