import type { ReactNode } from "react";
import type { InvoiceStatus } from "@swissbill/shared";

type Tone = "gray" | "blue" | "green" | "red" | "amber";

const toneClasses: Record<Tone, string> = {
  gray: "bg-surface-100 text-surface-700 ring-surface-200 dark:bg-surface-700 dark:ring-surface-600",
  blue: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900",
  green: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-900",
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
  amber: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
}

export function Badge({ children, tone = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const statusTones: Record<InvoiceStatus, Tone> = {
  draft: "gray",
  sent: "blue",
  paid: "green",
  overdue: "red",
  cancelled: "gray",
};

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function InvoiceStatusBadge({
  status,
  label,
}: {
  status: InvoiceStatus;
  label?: string;
}) {
  return (
    <Badge tone={statusTones[status] ?? "gray"}>
      {label ?? statusLabels[status] ?? status}
    </Badge>
  );
}
