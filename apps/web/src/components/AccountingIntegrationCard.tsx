import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  AccountingIntegration,
  AccountingProvider,
  AccountingSyncResult,
} from "@flinkli/shared";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useCompany } from "@/features/company/CompanyContext";

/** Desteklenen sağlayıcılar ve görünen adları */
const PROVIDERS: { id: AccountingProvider; label: string }[] = [
  { id: "bexio", label: "Bexio" },
  { id: "abacus", label: "Abacus" },
  { id: "banana", label: "Banana" },
];

interface ConnectResponse {
  integration: AccountingIntegration;
  authorizationUrl: string;
  state: string;
}

interface SyncResponse extends AccountingSyncResult {
  integration: AccountingIntegration;
}

export function AccountingIntegrationCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryKey: ["accounting", activeCompanyId],
    queryFn: () =>
      api.get<AccountingIntegration[]>(
        `/accounting?companyId=${activeCompanyId}`,
      ),
    enabled: Boolean(activeCompanyId),
  });

  const integrations = integrationsQuery.data ?? [];

  const findIntegration = (
    provider: AccountingProvider,
  ): AccountingIntegration | undefined =>
    integrations.find((item) => item.provider === provider);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["accounting", activeCompanyId],
    });
  };

  const connectMutation = useMutation({
    mutationFn: (provider: AccountingProvider) =>
      api.post<ConnectResponse>("/accounting/connect", {
        companyId: activeCompanyId,
        provider,
      }),
    onSuccess: (data) => {
      setError(null);
      setMessage(t("accounting.connectStarted"));
      invalidate();
      // OAuth akışını yeni sekmede başlat
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      }
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiRequestError ? err.message : t("errors.generic"),
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: AccountingProvider) =>
      api.delete<void>(`/accounting/${activeCompanyId}/${provider}`),
    onSuccess: () => {
      setError(null);
      setMessage(t("accounting.disconnected"));
      invalidate();
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiRequestError ? err.message : t("errors.generic"),
      );
    },
  });

  const syncMutation = useMutation({
    mutationFn: (provider: AccountingProvider) =>
      api.post<SyncResponse>("/accounting/sync", {
        companyId: activeCompanyId,
        provider,
        syncInvoices: true,
        syncExpenses: true,
      }),
    onSuccess: (data) => {
      setError(null);
      setMessage(
        t("accounting.syncSuccess", {
          invoices: data.syncedInvoices,
          expenses: data.syncedExpenses,
        }),
      );
      invalidate();
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(
        err instanceof ApiRequestError ? err.message : t("errors.generic"),
      );
    },
  });

  const isBusy =
    connectMutation.isPending ||
    disconnectMutation.isPending ||
    syncMutation.isPending;

  const statusBadge = (status: AccountingIntegration["status"]) => {
    const styles: Record<AccountingIntegration["status"], string> = {
      connected:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
      disconnected:
        "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
      error: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    };
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {t(`accounting.status.${status}`)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader
        title={t("accounting.title")}
        description={t("accounting.description")}
      />

      {!activeCompanyId ? (
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {t("accounting.noCompany")}
        </p>
      ) : (
        <div className="space-y-4">
          {integrationsQuery.isLoading && (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {t("common.loading")}
            </p>
          )}

          <ul className="divide-y divide-surface-100 dark:divide-surface-700">
            {PROVIDERS.map((provider) => {
              const integration = findIntegration(provider.id);
              const isConnected = integration?.status === "connected";
              return (
                <li
                  key={provider.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-surface-900 dark:text-white">
                      {provider.label}
                      {integration && statusBadge(integration.status)}
                    </p>
                    {integration?.lastSyncAt && (
                      <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                        {t("accounting.lastSync", {
                          date: formatDate(integration.lastSyncAt),
                        })}
                        {" · "}
                        {t("accounting.syncedCounts", {
                          invoices: integration.syncedInvoices,
                          expenses: integration.syncedExpenses,
                        })}
                      </p>
                    )}
                    {integration?.syncError && (
                      <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                        {integration.syncError}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {isConnected ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          isLoading={
                            syncMutation.isPending &&
                            syncMutation.variables === provider.id
                          }
                          onClick={() => syncMutation.mutate(provider.id)}
                        >
                          {t("accounting.syncNow")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-swiss-red hover:bg-red-50"
                          disabled={isBusy}
                          onClick={() => disconnectMutation.mutate(provider.id)}
                        >
                          {t("accounting.disconnect")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        isLoading={
                          connectMutation.isPending &&
                          connectMutation.variables === provider.id
                        }
                        onClick={() => connectMutation.mutate(provider.id)}
                      >
                        {t("accounting.connect")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </Card>
  );
}
