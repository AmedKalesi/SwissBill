import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@swissbill/shared";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";

export function InvoiceNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sourceId = params.get("from");
  const source = useQuery({ queryKey: ["invoice-copy", sourceId], queryFn: () => api.get<Invoice>(`/invoices/${encodeURIComponent(sourceId!)}`), enabled: Boolean(sourceId) });
  return <div className="mx-auto max-w-3xl space-y-6">
    <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">{t(sourceId ? "workspace.duplicate" : "invoices.new")}</h1>
    <Card><CardHeader title={t("invoices.new")} description={sourceId ? t("workspace.copyHint") : undefined} />
      {sourceId && source.isLoading ? <p role="status">{t("common.loading")}</p> : sourceId && source.isError ? <div role="alert"><p className="mb-3 text-swiss-red">{t("common.error")}</p><Button variant="secondary" onClick={() => void source.refetch()}>{t("workspace.retry")}</Button></div> :
        <InvoiceForm key={sourceId ?? "new"} invoice={null} seedInvoice={source.data} onSuccess={(invoice) => navigate(`/invoices/${invoice.id}`)} onCancel={() => navigate("/invoices")} />}
    </Card>
  </div>;
}
