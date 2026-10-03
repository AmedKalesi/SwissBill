import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Quote } from "@flinkli/shared";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { SignaturePad } from "@/components/SignaturePad";
import { QuoteForm } from "@/features/quotes/QuoteForm";
import { useCompany } from "@/features/company/CompanyContext";

const statusClasses: Record<string, string> = {
  draft: "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-purple-100 text-purple-700",
};

export function QuotesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState<Quote | null>(null);
  const [signing, setSigning] = useState<Quote | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const quotesQuery = useQuery({
    queryKey: ["quotes", activeCompanyId],
    queryFn: () =>
      api.get<Quote[]>(
        activeCompanyId
          ? `/quotes?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/quotes",
      ),
    enabled: activeCompanyId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/quotes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDeleting(null);
      toast.success(t("toasts.deleted"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Quote>(`/quotes/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success(t("toasts.saved"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const signMutation = useMutation({
    mutationFn: (payload: { signatureData: string; signedByName: string }) =>
      api.post<Quote>(`/quotes/${signing?.id}/sign`, payload),
    onSuccess: () => {
      setSignError(null);
      setSigning(null);
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (error: unknown) => {
      setSignError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ invoiceId: string }>(`/quotes/${id}/convert`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("toasts.saved"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (quote: Quote) => {
    setEditing(quote);
    setIsFormOpen(true);
  };

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("quotes.title")}
        </h1>
        <Button onClick={openCreate}>{t("quotes.new")}</Button>
      </div>

      <Card>
        <CardHeader title={t("quotes.title")} />
        {quotesQuery.isLoading ? (
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
        ) : quotes.length === 0 ? (
          <EmptyState
            title={t("quotes.empty")}
            description={t("toasts.emptyDescription")}
            action={<Button onClick={openCreate}>{t("quotes.new")}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4">{t("quotes.number")}</th>
                  <th className="py-2 pr-4">{t("invoices.customer")}</th>
                  <th className="py-2 pr-4">{t("quotes.validUntil")}</th>
                  <th className="py-2 pr-4 text-right">{t("common.total")}</th>
                  <th className="py-2 pr-4">{t("common.status")}</th>
                  <th className="py-2 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="py-2 pr-4 text-surface-900 dark:text-white">
                      {quote.quoteNumber}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {quote.customer?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {formatDate(quote.validUntil)}
                    </td>
                    <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                      {formatMoney(quote.total, quote.currency)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusClasses[quote.status] ?? "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
                        }`}
                      >
                        {t(`quotes.statuses.${quote.status}`)}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {quote.status === "draft" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              statusMutation.mutate({
                                id: quote.id,
                                status: "sent",
                              })
                            }
                          >
                            {t("quotes.markSent")}
                          </Button>
                        )}
                        {quote.status === "sent" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                statusMutation.mutate({
                                  id: quote.id,
                                  status: "accepted",
                                })
                              }
                            >
                              {t("quotes.accept")}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                statusMutation.mutate({
                                  id: quote.id,
                                  status: "rejected",
                                })
                              }
                            >
                              {t("quotes.reject")}
                            </Button>
                          </>
                        )}
                        {quote.status === "accepted" && (
                          <Button
                            size="sm"
                            isLoading={
                              convertMutation.isPending &&
                              convertMutation.variables === quote.id
                            }
                            onClick={() => convertMutation.mutate(quote.id)}
                          >
                            {t("quotes.convert")}
                          </Button>
                        )}
                        {quote.signedAt ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {t("signature.signed")}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSignError(null);
                              setSigning(quote);
                            }}
                          >
                            {t("signature.save")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(quote)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(quote)}
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

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? t("quotes.edit") : t("quotes.new")}
      >
        <QuoteForm
          quote={editing}
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(signing)}
        onClose={() => {
          setSigning(null);
          setSignError(null);
        }}
        title={t("signature.title")}
      >
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            {t("signature.description")}
          </p>
          <SignaturePad
            isSubmitting={signMutation.isPending}
            onCancel={() => {
              setSigning(null);
              setSignError(null);
            }}
            onSubmit={(payload) => signMutation.mutate(payload)}
          />
          {signError && <p className="text-sm text-swiss-red">{signError}</p>}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("quotes.deleteConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-surface-600 dark:text-surface-300">
          {t("quotes.deleteConfirmMessage", {
            number: deleting?.quoteNumber ?? "",
          })}
        </p>
      </Modal>
    </div>
  );
}
