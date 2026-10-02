import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Invoice, InvoiceStatus } from "@swissbill/shared";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InvoiceStatusBadge } from "@/components/ui/Badge";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { businessDate, filterInvoices, invoiceCsv, invoiceNumber, isLate } from "@/lib/invoice-tools";
import { useCompany } from "@/features/company/CompanyContext";

export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [params, setParams] = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const currency = params.get("currency") ?? "";
  const sort = params.get("sort") ?? "newest";
  const updateFilter = (key: string, value: string) => {
    setParams((previous) => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });
  };
  const onActionError = (error: unknown) => setActionError(error instanceof ApiRequestError ? error.message : t("common.error"));
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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.patch<Invoice>(`/invoices/${id}/status`, { status }),
    onError: onActionError,
    onMutate: () => setActionError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/invoices/${id}`),
    onError: onActionError,
    onMutate: () => setActionError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const invoices = invoicesQuery.data ?? [];

  const visibleInvoices = filterInvoices(invoices, { search, status, currency, sort });
  const exportCsv = () => {
    const contents = invoiceCsv(visibleInvoices, [t("invoices.number"), t("invoices.customer"), t("invoices.issueDate"), t("invoices.dueDate"), t("common.status"), t("common.total"), t("workspace.currency")], (value) => t(`invoices.statuses.${value}`));
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `flinkli-${businessDate()}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDelete = (invoice: Invoice) => {
    if (window.confirm(t("common.confirmDelete"))) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    setActionError(null);
    setDownloading(invoice.id);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}/invoices/${invoice.id}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem("flinkli.token") ?? ""}` } });
      if (!response.ok) throw new Error("PDF download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${invoiceNumber(invoice)}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setActionError(t("workspace.downloadError")); }
    finally { setDownloading(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("invoices.title")}
        </h1>
        <Link to="/invoices/new">
          <Button>{t("invoices.new")}</Button>
        </Link>
      </div>

      <Card>
        <div className="mb-6 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input name="invoice-search" label={t("common.search")} placeholder={t("workspace.searchHint")} value={search} onChange={(event) => updateFilter("q", event.target.value)} />
          <Select name="invoice-status" label={t("common.status")} value={status} onChange={(event) => updateFilter("status", event.target.value)} options={[{value: "", label: t("workspace.all")}, {value: "receivable", label: t("workspace.outstanding")}, {value: "late", label: t("workspace.late")}, ...["draft", "sent", "paid", "overdue", "cancelled"].map((value) => ({value, label: t(`invoices.statuses.${value}`)}))]} />
          <Select name="invoice-currency" label={t("workspace.currency")} value={currency} onChange={(event) => updateFilter("currency", event.target.value)} options={[{value: "", label: t("workspace.all")}, ...[...new Set(invoices.map((invoice) => invoice.currency))].sort().map((value) => ({value, label: value}))]} />
          <Select name="invoice-sort" label={t("workspace.sort")} value={sort} onChange={(event) => updateFilter("sort", event.target.value)} options={[{value: "newest", label: t("workspace.newest")}, {value: "oldest", label: t("workspace.oldest")}, {value: "due", label: t("workspace.dueFirst")}]} />
          <Button variant="secondary" onClick={exportCsv} disabled={!visibleInvoices.length || invoicesQuery.isError || invoicesQuery.isLoading}>{t("workspace.exportCsv")}</Button>
        </div>
        {actionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-swiss-red">{actionError}</p>}
        {!invoicesQuery.isLoading && !invoicesQuery.isError && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-500 dark:text-surface-400"><span role="status">{t("workspace.results", {count: visibleInvoices.length, total: invoices.length})}</span>{(search || status || currency || sort !== "newest") && <button type="button" onClick={() => setParams({})} className="font-semibold text-brand-600">{t("workspace.reset")}</button>}</div>}
        {invoicesQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("common.loading")}
          </p>
        ) : invoicesQuery.isError ? (
          <div role="alert" className="py-8 text-center"><p className="mb-3 text-sm text-swiss-red">{t("common.error")}</p><Button variant="secondary" onClick={() => void invoicesQuery.refetch()}>{t("workspace.retry")}</Button></div>
        ) : visibleInvoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {invoices.length ? t("workspace.noResults") : t("invoices.empty")}
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
                    {t("invoices.dueDate")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("common.status")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("common.total")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {visibleInvoices.map((invoice) => (
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
                    <td className="py-2 pr-4 text-surface-500 dark:text-surface-400">
                      {formatDate(invoice.dueDate, locale)}
                      {isLate(invoice) && <span className="mt-1 block text-xs font-medium text-brand-600">{t("workspace.late")}</span>}
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
                    <td className="py-2 pr-4">
                      <div className="flex justify-end gap-1">
                        {(invoice.status === "sent" || invoice.status === "overdue") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={statusMutation.isPending || deleteMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: invoice.id,
                                status: "paid",
                              })
                            }
                          >
                            {t("invoices.statuses.paid")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={downloading === invoice.id}
                          disabled={downloading !== null}
                          onClick={() => void handleDownloadPdf(invoice)}
                        >
                          PDF
                        </Button>
                        <Link to={`/invoices/new?from=${encodeURIComponent(invoice.id)}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">{t("workspace.duplicate")}</Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteMutation.isPending || statusMutation.isPending}
                          className="text-swiss-red hover:bg-red-50"
                          onClick={() => handleDelete(invoice)}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
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
