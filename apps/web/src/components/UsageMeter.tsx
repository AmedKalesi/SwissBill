import { useTranslation } from "react-i18next";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
}

/**
 * Tek bir plan limiti için kullanım göstergesi.
 * Sınırsız limitte (Infinity) yalnızca kullanım sayısı gösterilir.
 */
export function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const { t } = useTranslation();
  const isUnlimited = !Number.isFinite(limit);
  const ratio = isUnlimited ? 0 : Math.min(used / limit, 1);
  const percent = Math.round(ratio * 100);
  const isAtLimit = !isUnlimited && used >= limit;
  const isNearLimit = !isUnlimited && !isAtLimit && ratio >= 0.8;

  const barColor = isAtLimit
    ? "bg-swiss-red"
    : isNearLimit
      ? "bg-amber-500"
      : "bg-brand-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
          {label}
        </span>
        <span
          className={`text-sm tabular-nums ${
            isAtLimit
              ? "font-semibold text-swiss-red"
              : "text-surface-500 dark:text-surface-400"
          }`}
        >
          {used}
          {isUnlimited ? "" : ` / ${limit}`}
        </span>
      </div>
      {isUnlimited ? (
        <p className="text-xs text-surface-400 dark:text-surface-500">
          {t("billing.unlimited")}
        </p>
      ) : (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={label}
        >
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
