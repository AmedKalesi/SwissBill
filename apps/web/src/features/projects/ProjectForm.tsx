import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Customer, Project } from "@swissbill/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCompany } from "@/features/company/CompanyContext";

interface ProjectFormProps {
  project: Project | null;
  onSuccess: (project: Project) => void;
  onCancel: () => void;
}

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companies, activeCompanyId } = useCompany();

  const [companyId, setCompanyId] = useState(
    project?.companyId ?? activeCompanyId ?? "",
  );
  const [customerId, setCustomerId] = useState(project?.customerId ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    project?.hourlyRate != null ? String(project.hourlyRate) : "",
  );
  const [budget, setBudget] = useState(
    project?.budget != null ? String(project.budget) : "",
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
      project
        ? api.patch<Project>(`/projects/${project.id}`, payload)
        : api.post<Project>("/projects", payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onSuccess(saved);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!companyId || !customerId || !name.trim()) {
      setError(t("errors.validation"));
      return;
    }

    mutation.mutate({
      companyId,
      customerId,
      name: name.trim(),
      description: description.trim() || null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      budget: budget ? Number(budget) : null,
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
        label={t("projects.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700">
          {t("projects.description")}
        </label>
        <textarea
          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("projects.hourlyRate")}
          type="number"
          step="0.05"
          min="0"
          value={hourlyRate}
          onChange={(event) => setHourlyRate(event.target.value)}
        />
        <Input
          label={t("projects.budget")}
          type="number"
          step="0.05"
          min="0"
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
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
