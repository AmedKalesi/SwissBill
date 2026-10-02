import type { Invoice } from "@flinkli/shared";

export type InvoiceRecord = Pick<Invoice, "id" | "invoiceNumber" | "number" | "customer" | "issueDate" | "dueDate" | "status" | "total" | "currency" | "createdAt">;
export const invoiceNumber = (invoice: Pick<Invoice, "number" | "invoiceNumber">) => invoice.number || invoice.invoiceNumber;

/** Calendar days in the business's time zone; a bill is not late on its due date. */
export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function daysUntilDue(invoice: Pick<Invoice, "dueDate">, today = businessDate()): number {
  const due = Date.parse(`${invoice.dueDate.slice(0, 10)}T00:00:00Z`);
  return Math.round((due - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}
export function isReceivable(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status === "sent" || invoice.status === "overdue";
}
export function isLate(invoice: Pick<Invoice, "status" | "dueDate">, today = businessDate()): boolean {
  return isReceivable(invoice) && daysUntilDue(invoice, today) < 0;
}
export function currencyTotals(invoices: Pick<Invoice, "total" | "currency">[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    const amount = Number(invoice.total);
    if (Number.isFinite(amount)) totals.set(invoice.currency, (totals.get(invoice.currency) ?? 0) + Math.round(amount * 100));
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cents]) => [currency, cents / 100]);
}
export function filterInvoices<T extends InvoiceRecord>(invoices: T[], options: { search: string; status: string; currency: string; sort: string }, today = businessDate()): T[] {
  const query = options.search.trim().normalize("NFKC").toLocaleLowerCase();
  const filtered = invoices.filter((invoice) => {
    const text = `${invoiceNumber(invoice)} ${invoice.customer?.name ?? ""}`.normalize("NFKC").toLocaleLowerCase();
    return (!query || text.includes(query)) && (!options.currency || invoice.currency === options.currency) && (!options.status || (options.status === "late" ? isLate(invoice, today) : options.status === "receivable" ? isReceivable(invoice) : invoice.status === options.status));
  });
  return filtered.sort((a, b) => {
    if (options.sort === "due") return a.dueDate.localeCompare(b.dueDate);
    return options.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
  });
}
/** Quote all cells and neutralize spreadsheet formulas in untrusted text. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function invoiceCsv(invoices: InvoiceRecord[], headers: string[], statusLabel: (status: string) => string): string {
  const rows = invoices.map((invoice) => [invoiceNumber(invoice), invoice.customer?.name ?? "", invoice.issueDate.slice(0, 10), invoice.dueDate.slice(0, 10), statusLabel(invoice.status), Number(invoice.total), invoice.currency]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
