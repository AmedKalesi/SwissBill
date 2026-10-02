import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Plan, PlanUsage, Subscription } from "@swissbill/shared";
import { PLAN_PRICES } from "@swissbill/shared";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UsageMeter } from "@/components/UsageMeter";

const PLANS: Plan[] = ["free", "pro", "business"];

export function BillingPage() {
  const { t } = useTranslation();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<Subscription>("/billing/subscription"),
  });

  const usageQuery = useQuery({
    queryKey: ["plan-usage"],
    queryFn: () => api.get<PlanUsage>("/billing/usage"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: Plan) =>
      api.post<{ url: string }>("/billing/checkout", { plan }),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.post<{ url: string }>("/billing/portal", {}),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });

  const currentPlan = subscriptionQuery.data?.plan ?? "free";
  const usage = usageQuery.data;

  const isAtAnyLimit =
    usage !== undefined &&
    (usage.customers.used >= usage.customers.limit ||
      usage.invoicesThisMonth.used >= usage.invoicesThisMonth.limit ||
      usage.companies.used >= usage.companies.limit);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
        {t("billing.title")}
      </h1>

      {isAtAnyLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t("billing.limitReachedBanner")}
          </p>
        </div>
      )}

      <Card>
        <CardHeader
          title={t("billing.currentPlan")}
          action={
            <Badge tone="blue">{t(`billing.plans.${currentPlan}.name`)}</Badge>
          }
        />
        <p className="text-sm text-surface-600 dark:text-surface-300">
          {t("billing.currentPlanHint")}
        </p>
        {currentPlan !== "free" && (
          <div className="mt-4">
            <Button
              variant="secondary"
              isLoading={portalMutation.isPending}
              onClick={() => portalMutation.mutate()}
            >
              {t("billing.manageSubscription")}
            </Button>
          </div>
        )}
      </Card>

      {usage && (
        <Card>
          <CardHeader
            title={t("billing.usageTitle")}
            description={t("billing.usageHint")}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <UsageMeter
              label={t("billing.usage.customers")}
              used={usage.customers.used}
              limit={usage.customers.limit}
            />
            <UsageMeter
              label={t("billing.usage.invoicesThisMonth")}
              used={usage.invoicesThisMonth.used}
              limit={usage.invoicesThisMonth.limit}
            />
            <UsageMeter
              label={t("billing.usage.companies")}
              used={usage.companies.used}
              limit={usage.companies.limit}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan === currentPlan;
          return (
            <Card key={plan}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                    {t(`billing.plans.${plan}.name`)}
                  </h2>
                  {isCurrent && <Badge tone="green">{t("billing.active")}</Badge>}
                </div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {PLAN_PRICES[plan] === 0
                    ? t("billing.free")
                    : `${formatMoney(PLAN_PRICES[plan])} / ${t("billing.month")}`}
                </p>
                <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-300">
                  <li>{t(`billing.plans.${plan}.feature1`)}</li>
                  <li>{t(`billing.plans.${plan}.feature2`)}</li>
                  <li>{t(`billing.plans.${plan}.feature3`)}</li>
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "secondary" : "primary"}
                  disabled={isCurrent || plan === "free"}
                  isLoading={
                    checkoutMutation.isPending &&
                    checkoutMutation.variables === plan
                  }
                  onClick={() => checkoutMutation.mutate(plan)}
                >
                  {isCurrent
                    ? t("billing.current")
                    : plan === "free"
                      ? t("billing.free")
                      : t("billing.upgrade")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
