import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Accessible FAQ accordion.
 *
 * Each item is a real `<button>` controlling a region via `aria-expanded` /
 * `aria-controls`, so it is keyboard- and screen-reader-friendly. The panel
 * animates with a grid-rows trick (`0fr` → `1fr`) which transitions smoothly
 * without needing a measured height.
 */
const FAQ_KEYS = ["qr", "swiss", "languages", "data", "cancel", "support"] as const;

export function FaqAccordion() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(FAQ_KEYS[0]);

  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-surface-200 overflow-hidden rounded-2xl border border-surface-200 bg-white dark:divide-surface-700 dark:border-surface-700 dark:bg-surface-800">
      {FAQ_KEYS.map((key) => {
        const isOpen = open === key;
        return (
          <div key={key}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${key}`}
                id={`faq-trigger-${key}`}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-surface-50 dark:hover:bg-surface-900/50"
              >
                <span className="text-base font-semibold text-surface-900 dark:text-white">
                  {t(`landing.faq.${key}.q`)}
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-surface-300 text-surface-500 transition-transform duration-300 ease-smooth dark:border-surface-600 dark:text-surface-400 ${
                    isOpen ? "rotate-45 border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${key}`}
              role="region"
              aria-labelledby={`faq-trigger-${key}`}
              className={`grid transition-all duration-300 ease-smooth ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
                  {t(`landing.faq.${key}.a`)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
