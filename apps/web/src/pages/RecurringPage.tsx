import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { RecurringInvoice } from "@flinkli/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { RecurringForm } from "@/features/recurring/RecurringForm";
import { useCompany } from "@/features/company/CompanyContext";

const statusClasses: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300",
};

export function RecurringPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [deleting, setDeleting] = useState<RecurringInvoice | null>(null);

  const recurringQuery = useQuery({
    queryKey: ["recurring-invoices", activeCompanyId],
    queryFn: () =>
      api.get<RecurringInvoice[]>(
        activeCompanyId
          ? `/recurring-invoices?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/recurring-invoices",
      ),
    enabled: activeCompanyId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/recurring-invoices/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      setDeleting(null);
      toast.success(t("toasts.deleted"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ invoiceId: string }>(`/recurring-invoices/${id}/run`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("toasts.saved"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<RecurringInvoice>(`/recurring-invoices/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
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

  const openEdit = (recurring: RecurringInvoice) => {
    setEditing(recurring);
    setIsFormOpen(true);
  };

  const recurring = recurringQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("recurring.title")}
        </h1>
        <Button onClick={openCreate}>{t("recurring.new")}</Button>
      </div>

      <Card>
        <CardHeader title={t("recurring.title")} />
        {recurringQuery.isLoading ? (
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
        ) : recurring.length === 0 ? (
          <EmptyState
            title={t("recurring.empty")}
            description={t("toasts.emptyDescription")}
            action={<Button onClick={openCreate}>{t("recurring.new")}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4">{t("recurring.name")}</th>
                  <th className="py-2 pr-4">{t("invoices.customer")}</th>
                  <th className="py-2 pr-4">{t("recurring.frequency")}</th>
                  <th className="py-2 pr-4">{t("recurring.nextRun")}</th>
                  <th className="py-2 pr-4">{t("common.status")}</th>
                  <th className="py-2 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {recurring.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-4 text-surface-900 dark:text-white">{item.name}</td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {item.customer?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {t(`recurring.frequencies.${item.frequency}`)}
                      {item.intervalCount > 1 ? ` ×${item.intervalCount}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {formatDate(item.nextRunAt)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusClasses[item.status] ?? "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
                        }`}
                      >
                        {t(`recurring.statuses.${item.status}`)}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={
                            runMutation.isPending &&
                            runMutation.variables === item.id
                          }
                          onClick={() => runMutation.mutate(item.id)}
                        >
                          {t("recurring.runNow")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            statusMutation.mutate({
                              id: item.id,
                              status: item.status === "active" ? "paused" : "active",
                            })
                          }
                        >
                          {item.status === "active"
                            ? t("recurring.pause")
                            : t("recurring.resume")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(item)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(item)}
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
        title={editing ? t("recurring.edit") : t("recurring.new")}
      >
        <RecurringForm
          recurring={editing}
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("recurring.deleteConfirmTitle")}
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
          {t("recurring.deleteConfirmMessage", { name: deleting?.name ?? "" })}
        </p>
      </Modal>
    </div>
  );
}
