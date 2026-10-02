import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  RECURRING_FREQUENCIES,
  QR_REFERENCE_TYPES,
  VAT_RATES,
  type Customer,
  type InvoiceItemInputLike,
  type RecurringInvoice,
} from "@flinkli/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface RecurringFormProps {
  recurring: RecurringInvoice | null;
  onSuccess: (recurring: RecurringInvoice) => void;
  onCancel: () => void;
}

const emptyItem: InvoiceItemInputLike = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: VAT_RATES.STANDARD,
};

export function RecurringForm({
  recurring,
  onSuccess,
  onCancel,
}: RecurringFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId } = useCompany();

  const [companyId, setCompanyId] = useState(
    recurring?.companyId ?? activeCompanyId ?? "",
  );
  const [customerId, setCustomerId] = useState(recurring?.customerId ?? "");
  const [name, setName] = useState(recurring?.name ?? "");
  const [frequency, setFrequency] = useState<string>(
    recurring?.frequency ?? "monthly",
  );
  const [intervalCount, setIntervalCount] = useState(
    recurring?.intervalCount != null ? String(recurring.intervalCount) : "1",
  );
  const [startDate, setStartDate] = useState(
    recurring?.startDate ? recurring.startDate.slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    recurring?.endDate ? recurring.endDate.slice(0, 10) : "",
  );
  const [dueDays, setDueDays] = useState(
    recurring?.dueDays != null ? String(recurring.dueDays) : "30",
  );
  const [qrReferenceType, setQrReferenceType] = useState<string>(
    recurring?.qrReferenceType ?? "NON",
  );
  const [autoSend, setAutoSend] = useState(recurring?.autoSend ?? false);
  const [notes, setNotes] = useState(recurring?.notes ?? "");
  const [items, setItems] = useState<InvoiceItemInputLike[]>(
    recurring?.items?.length ? recurring.items : [{ ...emptyItem }],
  );
  const [error, setError] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", companyId],
    queryFn: () =>
      api.get<Customer[]>(
        companyId ? `/customers?companyId=${encodeURIComponent(companyId)}` : "/customers",
      ),
    enabled: companyId !== "",
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      recurring
        ? api.patch<RecurringInvoice>(`/recurring-invoices/${recurring.id}`, payload)
        : api.post<RecurringInvoice>("/recurring-invoices", payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      onSuccess(saved);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    },
  });

  const updateItem = (
    index: number,
    field: keyof InvoiceItemInputLike,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" ? value : Number.parseFloat(value) || 0,
            }
          : item,
      ),
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!companyId || !customerId || !name.trim() || !startDate) {
      setError(t("errors.validation"));
      return;
    }

    const validItems = items.filter((item) => item.description.trim());
    if (validItems.length === 0) {
      setError(t("errors.validation"));
      return;
    }

    mutation.mutate({
      companyId,
      customerId,
      name: name.trim(),
      frequency,
      intervalCount: Number.parseInt(intervalCount, 10) || 1,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      dueDays: Number.parseInt(dueDays, 10) || 30,
      qrReferenceType,
      autoSend,
      notes: notes.trim() || null,
      items: validItems,
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

      <Select
        label={t("invoices.customer")}
        value={customerId}
        onChange={(event) => setCustomerId(event.target.value)}
        placeholder={t("common.selectPlaceholder")}
        options={(customersQuery.data ?? []).map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))}
      />

      <Input
        label={t("recurring.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t("recurring.frequency")}
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
          options={RECURRING_FREQUENCIES.map((value) => ({
            value,
            label: t(`recurring.frequencies.${value}`),
          }))}
        />
        <Input
          label={t("recurring.intervalCount")}
          type="number"
          min="1"
          value={intervalCount}
          onChange={(event) => setIntervalCount(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("recurring.startDate")}
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
        <Input
          label={t("recurring.endDate")}
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("recurring.dueDays")}
          type="number"
          min="0"
          value={dueDays}
          onChange={(event) => setDueDays(event.target.value)}
        />
        <Select
          label={t("invoices.qrReferenceType")}
          value={qrReferenceType}
          onChange={(event) => setQrReferenceType(event.target.value)}
          options={QR_REFERENCE_TYPES.map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-surface-700">
            {t("invoices.items")}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={addItem}>
            {t("invoices.addItem")}
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 rounded-lg bg-surface-50 p-2"
            >
              <div className="col-span-12 sm:col-span-5">
                <Input
                  placeholder={t("invoices.description")}
                  value={item.description}
                  onChange={(event) =>
                    updateItem(index, "description", event.target.value)
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t("invoices.quantity")}
                  value={String(item.quantity)}
                  onChange={(event) =>
                    updateItem(index, "quantity", event.target.value)
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  placeholder={t("invoices.unitPrice")}
                  value={String(item.unitPrice)}
                  onChange={(event) =>
                    updateItem(index, "unitPrice", event.target.value)
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={t("invoices.vatRate")}
                  value={String(item.vatRate)}
                  onChange={(event) =>
                    updateItem(index, "vatRate", event.target.value)
                  }
                />
              </div>
              <div className="col-span-12 flex items-center justify-end sm:col-span-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-surface-700">
        <input
          type="checkbox"
          checked={autoSend}
          onChange={(event) => setAutoSend(event.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
        />
        {t("recurring.autoSend")}
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

      {error && <p className="text-sm text-red-600">{error}</p>}

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
