import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@flinkli/shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { businessDate, currencyTotals, daysUntilDue, invoiceNumber, isLate, isReceivable } from "@/lib/invoice-tools";
import { formatMoney, formatDate } from "@/lib/format";

export function CollectionOverview({ invoices }: { invoices: Invoice[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de-CH";
  const today = businessDate();
  const outstanding = invoices.filter(isReceivable);
  const late = outstanding.filter((invoice) => isLate(invoice, today));
  const upcoming = outstanding.filter((invoice) => daysUntilDue(invoice, today) >= 0 && daysUntilDue(invoice, today) <= 7);
  const priorities = [...late, ...upcoming].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const metrics = [
    { key: "outstanding", invoices: outstanding, tone: "text-surface-900 dark:text-white" },
    { key: "late", invoices: late, tone: "text-brand-700" },
    { key: "upcoming", invoices: upcoming, tone: "text-surface-900 dark:text-white" },
  ];
  return (
    <Card>
      <CardHeader title={t("workspace.collections")} description={t("workspace.collectionsHint")} action={<Link to="/invoices?sort=due" className="text-sm font-semibold text-brand-600">{t("workspace.review")} →</Link>} />
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => <div key={metric.key} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">{t(`workspace.${metric.key}`)}</p>
          <div className={`mt-2 space-y-1 text-xl font-semibold tabular-nums ${metric.tone}`}>
            {currencyTotals(metric.invoices).length ? currencyTotals(metric.invoices).map(([currency, total]) => <p key={currency}>{formatMoney(total, currency, locale)}</p>) : <p>—</p>}
          </div>
          <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{t("workspace.invoiceCount", { count: metric.invoices.length })}</p>
        </div>)}
      </div>
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-surface-800 dark:text-surface-100">{t("workspace.priorities")}</h3>
        {priorities.length ? <ul className="divide-y divide-surface-100 dark:divide-surface-700">{priorities.map((invoice) => {
          const days = daysUntilDue(invoice, today);
          return <li key={invoice.id}><Link to={`/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-surface-50 dark:hover:bg-surface-800">
            <div><p className="text-sm font-semibold text-surface-900 dark:text-white">{invoice.customer?.name ?? "—"}</p><p className="text-xs text-surface-500 dark:text-surface-400">{invoiceNumber(invoice)} · {formatDate(invoice.dueDate, locale)}</p></div>
            <div className="text-right"><p className="text-sm font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency, locale)}</p><p className={`text-xs ${days < 0 ? "text-brand-600" : "text-surface-500 dark:text-surface-400"}`}>{days < 0 ? t("workspace.daysLate", { count: Math.abs(days) }) : days === 0 ? t("workspace.today") : t("workspace.daysLeft", { count: days })}</p></div>
          </Link></li>;
        })}</ul> : <p className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 p-5 text-sm text-surface-500 dark:text-surface-400">{t("workspace.noPriorities")}</p>}
      </div>
    </Card>
  );
}
