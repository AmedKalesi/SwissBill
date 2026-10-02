import { CollectionOverview } from "@/components/CollectionOverview";
import { currencyTotals, invoiceNumber, isLate, isReceivable } from "@/lib/invoice-tools";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Customer, Invoice } from "@swissbill/shared";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/AuthContext";
import { useCompany } from "@/features/company/CompanyContext";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "default" | "danger";
}

function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-tight tabular-nums ${
          tone === "danger" ? "text-swiss-red" : "text-surface-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const locale = i18n.resolvedLanguage ?? "de-CH";

  const invoicesQuery = useQuery({
    queryKey: ["invoices", activeCompanyId],
    queryFn: () =>
      api.get<Invoice[]>(
        activeCompanyId
          ? `/invoices?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/invoices",
      ),
    enabled: activeCompanyId !== null,
  });

  const customersQuery = useQuery({
    queryKey: ["customers", activeCompanyId],
    queryFn: () =>
      api.get<Customer[]>(
        activeCompanyId
          ? `/customers?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/customers",
      ),
    enabled: activeCompanyId !== null,
  });

  const invoices = invoicesQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const openInvoices = invoices.filter(isReceivable);
  const overdueInvoices = invoices.filter(
    (invoice) => isLate(invoice),
  );

  const now = new Date();
  const paidThisMonth = invoices
    .filter((invoice) => {
      if (invoice.status !== "paid") return false;
      const paidAt = (invoice as Invoice & { paidAt?: string | null }).paidAt;
      if (!paidAt) return false;
      const paidDate = new Date(paidAt);
      return (
        paidDate.getMonth() === now.getMonth() &&
        paidDate.getFullYear() === now.getFullYear()
      );
    });

  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-surface-900 dark:text-white">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {t("dashboard.welcome", { name: user?.name ?? "" })}
          </p>
        </div>
        <Link to="/invoices/new">
          <Button>{t("dashboard.newInvoice")}</Button>
        </Link>
      </div>

      {(invoicesQuery.isError || customersQuery.isError) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-swiss-red">{t("workspace.dataError")}</p>}
      {invoicesQuery.isLoading || customersQuery.isLoading ? <p role="status" className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.openInvoices")}
          value={invoicesQuery.isError ? "—" : String(openInvoices.length)}
        />
        <StatCard
          label={t("dashboard.paidThisMonth")}
          value={invoicesQuery.isError ? "—" : currencyTotals(paidThisMonth).map(([currency, total]) => formatMoney(total, currency, locale)).join(" · ") || "—"}
        />
        <StatCard
          label={t("dashboard.overdue")}
          value={invoicesQuery.isError ? "—" : String(overdueInvoices.length)}
          tone={overdueInvoices.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label={t("dashboard.totalCustomers")}
          value={customersQuery.isError ? "—" : String(customers.length)}
        />
      </div>}

      {!invoicesQuery.isLoading && !invoicesQuery.isError && <CollectionOverview invoices={invoices} />}
      <Card>
        <CardHeader
          title={t("dashboard.recentInvoices")}
          action={
            <Link
              to="/invoices"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {t("nav.invoices")}
            </Link>
          }
        />
        {invoicesQuery.isLoading ? (
          <p className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 py-12 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("common.loading")}
          </p>
        ) : invoicesQuery.isError ? (
          <p role="alert" className="py-6 text-center text-sm text-swiss-red">{t("workspace.dataError")}</p>
        ) : recentInvoices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 py-12 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("dashboard.noInvoices")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4 font-medium">
                    {t("invoices.number")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("invoices.customer")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("invoices.issueDate")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("common.status")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("common.total")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-2 pr-4">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {invoiceNumber(invoice)}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {invoice.customer?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-surface-500 dark:text-surface-400">
                      {formatDate(invoice.issueDate, locale)}
                    </td>
                    <td className="py-2 pr-4">
                      <InvoiceStatusBadge
                        status={invoice.status}
                        label={t(`invoices.statuses.${invoice.status}`)}
                      />
                    </td>
                    <td className="py-2 pr-4 text-right font-medium text-surface-900 dark:text-white">
                      {formatMoney(invoice.total, invoice.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
