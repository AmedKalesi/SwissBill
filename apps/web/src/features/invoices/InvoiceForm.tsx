import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  VAT_RATES,
  calculateInvoiceTotals,
  type Customer,
  type Invoice,
  type InvoiceItemInput,
} from "@flinkli/shared";
import { businessDate } from "@/lib/invoice-tools";
import { api, ApiRequestError } from "@/lib/api";
import { formatMoney, toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface InvoiceFormProps {
  invoice: Invoice | null;
  seedInvoice?: Invoice;
  onSuccess: (invoice: Invoice) => void;
  onCancel: () => void;
}

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
}

const EMPTY_ITEM: ItemRow = {
  description: "",
  quantity: "1",
  unitPrice: "0",
  vatRate: String(VAT_RATES.STANDARD),
};

function todayIso(): string {
  return businessDate();
}

function addDaysIso(days: number): string {
  const date = new Date(`${businessDate()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function InvoiceForm({ invoice, seedInvoice, onSuccess, onCancel }: InvoiceFormProps) {
  const initial = invoice ?? seedInvoice;
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId } = useCompany();
  const locale = i18n.resolvedLanguage ?? "de-CH";
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState(
    initial?.companyId ?? activeCompanyId ?? "",
  );

  const customersQuery = useQuery({
    queryKey: ["customers", companyId],
    queryFn: () =>
      api.get<Customer[]>(
        companyId ? `/customers?companyId=${encodeURIComponent(companyId)}` : "/customers",
      ),
    enabled: companyId !== "",
  });
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [issueDate, setIssueDate] = useState(
    toDateInputValue(invoice?.issueDate) || todayIso(),
  );
  const [dueDate, setDueDate] = useState(
    toDateInputValue(invoice?.dueDate) || addDaysIso(30),
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "CHF");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    initial?.items && initial.items.length > 0
      ? initial.items.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          vatRate: String(item.vatRate),
        }))
      : [{ ...EMPTY_ITEM }],
  );

  const totals = useMemo(() => {
    const parsedItems: InvoiceItemInput[] = items.map((item) => ({
      description: item.description,
      quantity: Number.parseFloat(item.quantity) || 0,
      unitPrice: Number.parseFloat(item.unitPrice) || 0,
      vatRate: Number.parseFloat(item.vatRate) || 0,
    }));
    return calculateInvoiceTotals(parsedItems);
  }, [items]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        companyId,
        customerId,
        currency,
        status: invoice?.status ?? "draft",
        qrReferenceType: invoice?.qrReferenceType ?? (seedInvoice?.qrReferenceType === "QRR" ? "QRR" : "NON"),
        ...(invoice ? {qrReference: invoice.qrReference} : {}),
        issueDate,
        dueDate,
        notes: notes || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number.parseFloat(item.quantity) || 0,
          unitPrice: Number.parseFloat(item.unitPrice) || 0,
          vatRate: Number.parseFloat(item.vatRate) || 0,
        })),
      };
      return invoice
        ? api.put<Invoice>(`/invoices/${invoice.id}`, payload)
        : api.post<Invoice>("/invoices", payload);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess(result);
    },
    onError: (err) => {
      setError(
        err instanceof ApiRequestError ? err.message : t("common.error"),
      );
    },
  });

  const updateItem = (index: number, key: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (dueDate < issueDate) { setError(t("workspace.invalidDates")); return; }
    mutation.mutate();
  };

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  const customerOptions = (customersQuery.data ?? []).filter((customer) => customer.companyId === companyId).map((customer) => ({
    value: customer.id,
    label: customer.name,
  }));

  const vatOptions = [
    { value: String(VAT_RATES.STANDARD), label: `${VAT_RATES.STANDARD}%` },
    { value: String(VAT_RATES.REDUCED), label: `${VAT_RATES.REDUCED}%` },
    { value: String(VAT_RATES.SPECIAL), label: `${VAT_RATES.SPECIAL}%` },
    { value: "0", label: "0%" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t("nav.company")}
          name="companyId"
          required
          placeholder={t("nav.company")}
          options={companyOptions}
          value={companyId}
          onChange={(event) => { setCompanyId(event.target.value); setCustomerId(""); }}
          disabled={Boolean(invoice)}
        />
        <Select
          label={t("invoices.customer")}
          name="customerId"
          required
          placeholder={t("invoices.customer")}
          options={customerOptions}
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("invoices.issueDate")}
          name="issueDate"
          type="date"
          required
          value={issueDate}
          onChange={(event) => setIssueDate(event.target.value)}
        />
        <Input
          label={t("invoices.dueDate")}
          name="dueDate"
          type="date"
          required
          min={issueDate}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <Select name="currency" label={t("workspace.currency")} value={currency} onChange={(event) => setCurrency(event.target.value)} options={[...new Set(["CHF", "EUR", initial?.currency].filter((value): value is string => Boolean(value)))].map((value) => ({value, label: value}))} />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-surface-700">
            {t("invoices.items")}
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            {t("invoices.addItem")}
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-surface-200 p-3"
            >
              <Input
                label={t("invoices.description")}
                name={`description-${index}`}
                required
                value={item.description}
                onChange={(event) =>
                  updateItem(index, "description", event.target.value)
                }
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Input
                  label={t("invoices.quantity")}
                  name={`quantity-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, "quantity", event.target.value)
                  }
                />
                <Input
                  label={t("invoices.unitPrice")}
                  name={`unitPrice-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(index, "unitPrice", event.target.value)
                  }
                />
                <Select
                  label={t("invoices.vatRate")}
                  name={`vatRate-${index}`}
                  options={vatOptions}
                  value={item.vatRate}
                  onChange={(event) =>
                    updateItem(index, "vatRate", event.target.value)
                  }
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-swiss-red hover:bg-red-50"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    {t("invoices.removeItem")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Input
        label={t("invoices.notes")}
        name="notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="rounded-lg bg-surface-50 p-4">
        <div className="flex justify-between text-sm text-surface-600">
          <span>{t("invoices.subtotal")}</span>
          <span>{formatMoney(totals.subtotal, currency, locale)}</span>
        </div>
        {totals.vatBreakdown.map((entry) => (
          <div
            key={entry.rate}
            className="mt-1 flex justify-between text-sm text-surface-600"
          >
            <span>
              {t("invoices.vat")} {entry.rate}%
            </span>
            <span>{formatMoney(entry.vat, currency, locale)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-surface-200 pt-2 text-base font-semibold text-surface-900">
          <span>{t("common.total")}</span>
          <span>{formatMoney(totals.total, currency, locale)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-swiss-red">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
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
