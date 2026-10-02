import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface MonthlyBucket {
  month: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  count: number;
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  count: number;
}

interface RevenueReport {
  currency: string;
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
    invoiceCount: number;
    paidCount: number;
    overdueCount: number;
  };
  monthly: MonthlyBucket[];
  byCustomer: CustomerRevenue[];
}

const RANGE_OPTIONS = [
  { value: "6", label: "6" },
  { value: "12", label: "12" },
  { value: "24", label: "24" },
];

interface StatCardProps {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}

function StatCard({ label, value, tone = "default" }: StatCardProps) {
  const toneClass =
    tone === "danger"
      ? "text-swiss-red"
      : tone === "success"
        ? "text-green-600"
        : "text-surface-900 dark:text-white";
  return (
    <Card>
      <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { activeCompanyId } = useCompany();
  const locale = i18n.resolvedLanguage ?? "de-CH";
  const [months, setMonths] = useState("12");

  const reportQuery = useQuery({
    queryKey: ["reports", "revenue", months, activeCompanyId],
    queryFn: () =>
      api.get<RevenueReport>(
        `/reports/revenue?months=${months}${
          activeCompanyId
            ? `&companyId=${encodeURIComponent(activeCompanyId)}`
            : ""
        }`,
      ),
    enabled: activeCompanyId !== null,
  });

  const report = reportQuery.data;
  const currency = report?.currency ?? "CHF";
  const maxInvoiced = Math.max(
    1,
    ...(report?.monthly.map((bucket) => bucket.invoiced) ?? [1]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("reports.title")}
        </h1>
        <div className="w-40">
          <Select
            label={t("reports.range")}
            name="months"
            value={months}
            onChange={(event) => setMonths(event.target.value)}
            options={RANGE_OPTIONS}
          />
        </div>
      </div>

      {reportQuery.isLoading ? (
        <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
      ) : reportQuery.isError || !report ? (
        <p className="text-sm text-red-600">{t("common.error")}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("reports.totalInvoiced")}
              value={formatMoney(report.summary.totalInvoiced, currency, locale)}
            />
            <StatCard
              label={t("reports.totalPaid")}
              value={formatMoney(report.summary.totalPaid, currency, locale)}
              tone="success"
            />
            <StatCard
              label={t("reports.totalOutstanding")}
              value={formatMoney(
                report.summary.totalOutstanding,
                currency,
                locale,
              )}
            />
            <StatCard
              label={t("reports.totalOverdue")}
              value={formatMoney(report.summary.totalOverdue, currency, locale)}
              tone={report.summary.totalOverdue > 0 ? "danger" : "default"}
            />
          </div>

          <Card>
            <CardHeader title={t("reports.monthly")} />
            {report.monthly.length === 0 ? (
              <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                {t("reports.empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {report.monthly.map((bucket) => (
                  <div key={bucket.month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-surface-700 dark:text-surface-200">
                        {bucket.month}
                      </span>
                      <span className="text-surface-900 dark:text-white">
                        {formatMoney(bucket.invoiced, currency, locale)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.round(
                            (bucket.invoiced / maxInvoiced) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-surface-500 dark:text-surface-400">
                      <span>
                        {t("reports.paid")}:{" "}
                        {formatMoney(bucket.paid, currency, locale)}
                      </span>
                      <span>
                        {t("reports.outstanding")}:{" "}
                        {formatMoney(bucket.outstanding, currency, locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={t("reports.byCustomer")} />
            {report.byCustomer.length === 0 ? (
              <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                {t("reports.empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                      <th className="py-2 pr-4 font-medium">
                        {t("invoices.customer")}
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">
                        {t("reports.totalInvoiced")}
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">
                        {t("reports.totalPaid")}
                      </th>
                      <th className="py-2 pr-4 text-right font-medium">
                        {t("reports.totalOutstanding")}
                      </th>
                      <th className="py-2 text-right font-medium">
                        {t("reports.invoiceCount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                    {report.byCustomer.map((entry) => (
                      <tr key={entry.customerId}>
                        <td className="py-2 pr-4 text-surface-900 dark:text-white">
                          {entry.customerName}
                        </td>
                        <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                          {formatMoney(entry.invoiced, currency, locale)}
                        </td>
                        <td className="py-2 pr-4 text-right text-green-600">
                          {formatMoney(entry.paid, currency, locale)}
                        </td>
                        <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                          {formatMoney(entry.outstanding, currency, locale)}
                        </td>
                        <td className="py-2 text-right text-surface-500 dark:text-surface-400">
                          {entry.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
