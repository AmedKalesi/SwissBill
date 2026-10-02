import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Project } from "@flinkli/shared";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { useCompany } from "@/features/company/CompanyContext";

export function ProjectsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: () =>
      api.get<Project[]>(
        activeCompanyId
          ? `/projects?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/projects",
      ),
    enabled: activeCompanyId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/projects/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setIsFormOpen(true);
  };

  const projects = projectsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          {t("projects.title")}
        </h1>
        <Button onClick={openCreate}>{t("projects.new")}</Button>
      </div>

      <Card>
        <CardHeader title={t("projects.title")} />
        {projectsQuery.isLoading ? (
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("projects.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-500 dark:text-surface-400">
                  <th className="py-2 pr-4">{t("projects.name")}</th>
                  <th className="py-2 pr-4">{t("invoices.customer")}</th>
                  <th className="py-2 pr-4 text-right">
                    {t("projects.hourlyRate")}
                  </th>
                  <th className="py-2 pr-4 text-right">{t("projects.budget")}</th>
                  <th className="py-2 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="py-2 pr-4 text-surface-900 dark:text-white">{project.name}</td>
                    <td className="py-2 pr-4 text-surface-700 dark:text-surface-200">
                      {project.customer?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                      {project.hourlyRate != null
                        ? formatMoney(project.hourlyRate)
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                      {project.budget != null
                        ? formatMoney(project.budget)
                        : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(project)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleting(project)}
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
        title={editing ? t("projects.edit") : t("projects.new")}
      >
        <ProjectForm
          project={editing}
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("projects.deleteConfirmTitle")}
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
          {t("projects.deleteConfirmMessage", { name: deleting?.name ?? "" })}
        </p>
      </Modal>
    </div>
  );
}
