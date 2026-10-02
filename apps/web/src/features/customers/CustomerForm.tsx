import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Customer } from "@swissbill/shared";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface CustomerFormProps {
  customer: Customer | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  vatNumber: string;
}

export function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId } = useCompany();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    companyId: customer?.companyId ?? activeCompanyId ?? "",
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    street: customer?.street ?? "",
    zip: customer?.zip ?? "",
    city: customer?.city ?? "",
    country: customer?.country ?? "CH",
    vatNumber: customer?.vatNumber ?? "",
  });

  const mutation = useMutation({
    mutationFn: (payload: FormState) => {
      const body = {
        ...payload,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        street: payload.street || undefined,
        zip: payload.zip || undefined,
        city: payload.city || undefined,
        vatNumber: payload.vatNumber || undefined,
      };
      return customer
        ? api.patch<Customer>(`/customers/${customer.id}`, body)
        : api.post<Customer>("/customers", body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      onSuccess();
    },
    onError: (err) => {
      setError(
        err instanceof ApiRequestError ? err.message : t("common.error"),
      );
    },
  });

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    mutation.mutate(form);
  };

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label={t("nav.company")}
        name="companyId"
        required
        placeholder={t("nav.company")}
        options={companyOptions}
        value={form.companyId}
        onChange={(event) => update("companyId", event.target.value)}
      />
      <Input
        label={t("customers.name")}
        name="name"
        required
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("customers.email")}
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
        <Input
          label={t("customers.phone")}
          name="phone"
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
        />
      </div>
      <Input
        label={t("customers.street")}
        name="street"
        value={form.street}
        onChange={(event) => update("street", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("customers.zip")}
          name="zip"
          value={form.zip}
          onChange={(event) => update("zip", event.target.value)}
        />
        <Input
          label={t("customers.city")}
          name="city"
          value={form.city}
          onChange={(event) => update("city", event.target.value)}
        />
        <Input
          label={t("customers.country")}
          name="country"
          value={form.country}
          onChange={(event) => update("country", event.target.value)}
        />
      </div>
      <Input
        label={t("customers.vatNumber")}
        name="vatNumber"
        placeholder="CHE-123.456.789 MWST"
        value={form.vatNumber}
        onChange={(event) => update("vatNumber", event.target.value)}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-swiss-red">
          {error}
        </p>
      )}

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
