import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  VAT_RATES,
  type Customer,
  type InvoiceItemInputLike,
  type Quote,
} from "@flinkli/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface QuoteFormProps {
  quote: Quote | null;
  onSuccess: (quote: Quote) => void;
  onCancel: () => void;
}

const emptyItem: InvoiceItemInputLike = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: VAT_RATES.STANDARD,
};

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function QuoteForm({ quote, onSuccess, onCancel }: QuoteFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId } = useCompany();

  const [companyId, setCompanyId] = useState(
    quote?.companyId ?? activeCompanyId ?? "",
  );
  const [customerId, setCustomerId] = useState(quote?.customerId ?? "");
  const [issueDate, setIssueDate] = useState(
    toDateInput(quote?.issueDate) || new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState(toDateInput(quote?.validUntil));
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [items, setItems] = useState<InvoiceItemInputLike[]>(
    quote?.items?.length
      ? quote.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
        }))
      : [{ ...emptyItem }],
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
      quote
        ? api.patch<Quote>(`/quotes/${quote.id}`, payload)
        : api.post<Quote>("/quotes", payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
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

    if (!companyId || !customerId || !issueDate || !validUntil) {
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
      issueDate: new Date(issueDate).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("quotes.issueDate")}
          type="date"
          value={issueDate}
          onChange={(event) => setIssueDate(event.target.value)}
          required
        />
        <Input
          label={t("quotes.validUntil")}
          type="date"
          value={validUntil}
          onChange={(event) => setValidUntil(event.target.value)}
          required
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
