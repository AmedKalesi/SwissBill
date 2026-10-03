import { useTranslation } from "react-i18next";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Honest positioning table: flinkli vs. Excel templates vs. a traditional
 * accountant. Every row is a factual capability difference, not a marketing
 * claim — which is what makes it credible to a Swiss freelancer comparing
 * options.
 *
 * `state` drives the cell rendering: "yes" (brand check), "no" (muted cross)
 * or "partial" (amber dash with a short qualifier).
 */
type CellState = "yes" | "no" | "partial";

const ROWS: { key: string; flinkli: CellState; excel: CellState; accountant: CellState }[] = [
  { key: "qr", flinkli: "yes", excel: "no", accountant: "yes" },
  { key: "speed", flinkli: "yes", excel: "partial", accountant: "no" },
  { key: "cost", flinkli: "yes", excel: "yes", accountant: "no" },
  { key: "reminders", flinkli: "yes", excel: "no", accountant: "partial" },
  { key: "languages", flinkli: "yes", excel: "partial", accountant: "partial" },
  { key: "vat", flinkli: "yes", excel: "partial", accountant: "yes" },
  { key: "control", flinkli: "yes", excel: "yes", accountant: "partial" },
];

function Cell({ state }: { state: CellState }) {
  if (state === "yes") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-100 text-surface-400 ring-1 ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </span>
  );
}

export function ComparisonSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
      <div className="mx-auto max-w-5xl px-4">
        <RevealOnScroll className="text-center">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.compare.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
            {t("landing.compare.subtitle")}
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={100} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card dark:border-surface-700 dark:bg-surface-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th scope="col" className="px-5 py-4 text-left font-medium text-surface-500 dark:text-surface-400">
                      {t("landing.compare.feature")}
                    </th>
                    <th scope="col" className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-400">
                        flinkli
                      </span>
                    </th>
                    <th scope="col" className="px-5 py-4 text-center font-medium text-surface-500 dark:text-surface-400">
                      {t("landing.compare.excel")}
                    </th>
                    <th scope="col" className="px-5 py-4 text-center font-medium text-surface-500 dark:text-surface-400">
                      {t("landing.compare.accountant")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-surface-100 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-700/60 dark:hover:bg-surface-900/40"
                    >
                      <th scope="row" className="px-5 py-4 text-left font-medium text-surface-700 dark:text-surface-200">
                        {t(`landing.compare.rows.${row.key}`)}
                      </th>
                      <td className="bg-brand-50/40 px-5 py-4 text-center dark:bg-brand-950/20">
                        <Cell state={row.flinkli} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Cell state={row.excel} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Cell state={row.accountant} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-surface-400 dark:text-surface-500">
            {t("landing.compare.note")}
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
