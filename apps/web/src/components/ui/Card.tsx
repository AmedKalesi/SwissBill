import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-surface-200 bg-white p-6 shadow-[0_2px_8px_-4px_rgba(16,24,40,0.12)] dark:border-surface-700 dark:bg-surface-800 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
