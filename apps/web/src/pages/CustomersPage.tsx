import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Customer } from "@flinkli/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm } from "@/features/customers/CustomerForm";
import { useCompany } from "@/features/company/CompanyContext";

export function CustomersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/customers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const customers = customersQuery.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setIsModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    if (window.confirm(t("common.confirmDelete"))) {
      deleteMutation.mutate(customer.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("customers.title")}
        </h1>
        <Button onClick={openCreate}>{t("customers.new")}</Button>
      </div>

      <Card>
        {customersQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("common.loading")}
          </p>
        ) : customers.length === 0 ? (
          <p className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("customers.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4 font-medium">
                    {t("customers.name")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("customers.email")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("customers.city")}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t("customers.vatNumber")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-2 pr-4 font-medium text-surface-900 dark:text-white">
                      {customer.name}
                    </td>
                    <td className="py-2 pr-4 text-surface-600 dark:text-surface-300">
                      {customer.email ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-surface-600 dark:text-surface-300">
                      {customer.city ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-surface-600 dark:text-surface-300">
                      {customer.vatNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(customer)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-swiss-red hover:bg-red-50"
                          onClick={() => handleDelete(customer)}
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t("customers.edit") : t("customers.new")}
      >
        <CustomerForm
          customer={editing}
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
