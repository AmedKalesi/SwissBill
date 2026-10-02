import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Company } from "@flinkli/shared";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AccountingIntegrationCard } from "@/components/AccountingIntegrationCard";
import { useCompany } from "@/features/company/CompanyContext";

interface CompanyFormState {
  name: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber: string;
  iban: string;
}

const emptyForm: CompanyFormState = {
  name: "",
  email: "",
  phone: "",
  street: "",
  postalCode: "",
  city: "",
  country: "CH",
  vatNumber: "",
  iban: "",
};

function toFormState(company: Company | null): CompanyFormState {
  if (!company) return { ...emptyForm };
  return {
    name: company.name ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    street: company.street ?? "",
    postalCode: company.postalCode ?? "",
    city: company.city ?? "",
    country: company.country ?? "CH",
    vatNumber: company.vatNumber ?? "",
    iban: company.iban ?? "",
  };
}

export function CompanyPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    companies,
    activeCompany,
    activeCompanyId,
    setActiveCompany,
    refreshCompanies,
  } = useCompany();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCreating = editingId === null;

  // Düzenlenen şirket değiştiğinde formu doldur
  useEffect(() => {
    const editing = companies.find((c) => c.id === editingId) ?? null;
    setForm(toFormState(editing));
  }, [editingId, companies]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["companies"] });
    void queryClient.invalidateQueries({ queryKey: ["company"] });
  };

  const mutation = useMutation({
    mutationFn: (payload: CompanyFormState) =>
      editingId
        ? api.put<Company>(`/company/${editingId}`, payload)
        : api.post<Company>("/company", payload),
    onSuccess: async (saved) => {
      invalidate();
      await refreshCompanies();
      setMessage(t("company.saved"));
      setError(null);
      if (isCreating) {
        setEditingId(saved.id);
        setActiveCompany(saved.id);
      }
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiRequestError ? err.message : t("errors.generic"),
      );
      setMessage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/company/${id}`),
    onSuccess: async () => {
      invalidate();
      await refreshCompanies();
      setEditingId(null);
      setMessage(null);
      setError(null);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiRequestError ? err.message : t("errors.generic"),
      );
    },
  });

  const update = (key: keyof CompanyFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!form.name.trim()) {
      setError(t("errors.validation"));
      return;
    }
    mutation.mutate(form);
  };

  const handleDelete = (company: Company) => {
    if (window.confirm(t("company.confirmDelete"))) {
      deleteMutation.mutate(company.id);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("company.title")}
        </h1>
        <Button onClick={startCreate}>{t("company.new")}</Button>
      </div>

      {companies.length > 0 && (
        <Card>
          <CardHeader
            title={t("company.listTitle")}
            description={t("company.listHint")}
          />
          <ul className="divide-y divide-surface-100 dark:divide-surface-700">
            {companies.map((company) => {
              const isActive = company.id === activeCompanyId;
              const isEditing = company.id === editingId;
              return (
                <li
                  key={company.id}
                  className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                    isEditing ? "bg-brand-50/50 dark:bg-brand-950/30" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-surface-900 dark:text-white">
                      {company.name}
                      {isActive && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                          {t("company.activeBadge")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                      {[company.city, company.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveCompany(company.id)}
                      >
                        {t("company.setActive")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(company.id);
                        setMessage(null);
                        setError(null);
                      }}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-swiss-red hover:bg-red-50"
                      onClick={() => handleDelete(company)}
                      disabled={deleteMutation.isPending}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          title={
            isCreating
              ? t("company.new")
              : t("company.editing", { name: activeCompany?.name ?? "" })
          }
          description={t("company.profileHint")}
        />
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label={t("company.name")}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t("company.email")}
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
            <Input
              label={t("company.phone")}
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </div>

          <Input
            label={t("company.street")}
            value={form.street}
            onChange={(event) => update("street", event.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t("company.postalCode")}
              value={form.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
            <Input
              label={t("company.city")}
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
            />
            <Input
              label={t("company.country")}
              value={form.country}
              onChange={(event) => update("country", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t("company.vatNumber")}
              placeholder="CHE-123.456.789 MWST"
              value={form.vatNumber}
              onChange={(event) => update("vatNumber", event.target.value)}
            />
            <Input
              label={t("company.iban")}
              placeholder="CH93 0076 2011 6238 5295 7"
              value={form.iban}
              onChange={(event) => update("iban", event.target.value)}
            />
          </div>

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            {!isCreating && (
              <Button type="button" variant="ghost" onClick={startCreate}>
                {t("company.new")}
              </Button>
            )}
            <Button type="submit" isLoading={mutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <AccountingIntegrationCard />
    </div>
  );
}
