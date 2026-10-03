import type { ReactNode } from "react";

/**
 * Reusable empty-state placeholder for lists, tables and dashboards.
 *
 * Keeps the "nothing here yet" presentation consistent across the app and
 * optionally surfaces a call-to-action.
 */
interface EmptyStateProps {
  /** Short headline, e.g. "No invoices yet". */
  title: string;
  /** Optional supporting copy explaining what to do next. */
  description?: string;
  /** Optional icon node (an inline SVG). Defaults to a neutral document icon. */
  icon?: ReactNode;
  /** Optional primary action, typically a button or link. */
  action?: ReactNode;
  /** Extra classes for the wrapper. */
  className?: string;
}

const DEFAULT_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-8 w-8"
    aria-hidden="true"
  >
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40 ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
        {icon ?? DEFAULT_ICON}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
