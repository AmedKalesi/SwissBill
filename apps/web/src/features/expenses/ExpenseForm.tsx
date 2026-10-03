import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EXPENSE_CATEGORIES, type Expense } from "@flinkli/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useCompany } from "@/features/company/CompanyContext";

interface ExpenseFormProps {
  expense: Expense | null;
  onSuccess: (expense: Expense) => void;
  onCancel: () => void;
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { companies, activeCompanyId } = useCompany();

  const [companyId, setCompanyId] = useState(
    expense?.companyId ?? activeCompanyId ?? "",
  );
  const [date, setDate] = useState(
    toDateInput(expense?.date) || new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState<string>(expense?.category ?? "other");
  const [amount, setAmount] = useState(
    expense?.amount != null ? String(expense.amount) : "",
  );
  const [vatAmount, setVatAmount] = useState(
    expense?.vatAmount != null ? String(expense.vatAmount) : "0",
  );
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [reference, setReference] = useState(expense?.reference ?? "");
  const [deductible, setDeductible] = useState(expense?.deductible ?? true);
  const [notes, setNotes] = useState(expense?.notes ?? "");

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      expense
        ? api.patch<Expense>(`/expenses/${expense.id}`, payload)
        : api.post<Expense>("/expenses", payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success(t("common.saved"));
      onSuccess(saved);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyId || !date || !description.trim() || !amount) {
      toast.error(t("errors.validation"));
      return;
    }

    mutation.mutate({
      companyId,
      date: new Date(date).toISOString(),
      description: description.trim(),
      category,
      amount: Number.parseFloat(amount) || 0,
      vatAmount: Number.parseFloat(vatAmount) || 0,
      vendor: vendor.trim() || null,
      reference: reference.trim() || null,
      deductible,
      notes: notes.trim() || null,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Select
        label={t("invoices.company")}
        value={companyId}
        onChange={(event) => setCompanyId(event.target.value)}
        placeholder={t("common.selectPlaceholder")}
        options={companies.map((company) => ({
          value: company.id,
          label: company.name,
        }))}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("common.date")}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <Select
          label={t("expenses.category")}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={EXPENSE_CATEGORIES.map((value) => ({
            value,
            label: t(`expenses.categories.${value}`),
          }))}
        />
      </div>

      <Input
        label={t("expenses.description")}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("common.amount")}
          type="number"
          step="0.05"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Input
          label={t("expenses.vatAmount")}
          type="number"
          step="0.05"
          min="0"
          value={vatAmount}
          onChange={(event) => setVatAmount(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("expenses.vendor")}
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
        />
        <Input
          label={t("expenses.reference")}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-surface-700">
        <input
          type="checkbox"
          checked={deductible}
          onChange={(event) => setDeductible(event.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
        />
        {t("expenses.deductible")}
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">
          {t("invoices.notes")}
        </label>
        <textarea
          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
