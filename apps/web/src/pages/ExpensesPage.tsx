import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Expense } from "@flinkli/shared";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ExpenseForm } from "@/features/expenses/ExpenseForm";
import { useCompany } from "@/features/company/CompanyContext";

interface ExpenseSummary {
  total: number;
  totalVat: number;
  deductibleTotal: number;
  byCategory: { category: string; total: number }[];
}

export function ExpensesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const companyQuery = activeCompanyId
    ? `?companyId=${encodeURIComponent(activeCompanyId)}`
    : "";

  const expensesQuery = useQuery({
    queryKey: ["expenses", activeCompanyId],
    queryFn: () => api.get<Expense[]>(`/expenses${companyQuery}`),
    enabled: activeCompanyId !== null,
  });

  const summaryQuery = useQuery({
    queryKey: ["expenses-summary", activeCompanyId],
    queryFn: () => api.get<ExpenseSummary>(`/expenses/summary${companyQuery}`),
    enabled: activeCompanyId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/expenses/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      setDeleting(null);
      toast.success(t("toasts.deleted"));
    },
    onError: () => {
      toast.error(t("toasts.genericError"));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setIsFormOpen(true);
  };

  const expenses = expensesQuery.data ?? [];
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("expenses.title")}
        </h1>
        <Button onClick={openCreate}>{t("expenses.new")}</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("expenses.total")}</p>
          <p className="mt-1 text-2xl font-semibold text-surface-900 dark:text-white">
            {formatMoney(summary?.total ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("expenses.totalVat")}</p>
          <p className="mt-1 text-2xl font-semibold text-surface-900 dark:text-white">
            {formatMoney(summary?.totalVat ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("expenses.deductibleTotal")}</p>
          <p className="mt-1 text-2xl font-semibold text-surface-900 dark:text-white">
            {formatMoney(summary?.deductibleTotal ?? 0)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("expenses.title")} />
        {expensesQuery.isLoading ? (
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
        ) : expenses.length === 0 ? (
          <EmptyState
            title={t("expenses.empty")}
            description={t("toasts.emptyDescription")}
            action={<Button onClick={openCreate}>{t("expenses.new")}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4">{t("common.date")}</th>
                  <th className="py-2 pr-4">{t("expenses.description")}</th>
                  <th className="py-2 pr-4">{t("expenses.category")}</th>
                  <th className="py-2 pr-4">{t("expenses.vendor")}</th>
                  <th className="py-2 pr-4 text-right">{t("common.amount")}</th>
                  <th className="py-2 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-2 pr-4 text-surface-900 dark:text-white">
                      {expense.description}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {t(`expenses.categories.${expense.category}`)}
                    </td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {expense.vendor ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                      {formatMoney(expense.amount, expense.currency)}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(expense)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(expense)}
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
        title={editing ? t("expenses.edit") : t("expenses.new")}
      >
        <ExpenseForm
          expense={editing}
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("expenses.deleteConfirmTitle")}
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
          {t("expenses.deleteConfirmMessage", {
            description: deleting?.description ?? "",
          })}
        </p>
      </Modal>
    </div>
  );
}
