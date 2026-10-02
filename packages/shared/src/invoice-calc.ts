/**
 * Fatura hesaplama yardımcıları (KDV, toplamlar).
 * Hem frontend hem backend tarafından kullanılır.
 */
import type { InvoiceItemInput } from "./schemas.js";

export interface CalculatedLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface InvoiceTotals {
  lines: CalculatedLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  /** KDV oranına göre gruplanmış toplamlar */
  vatBreakdown: Array<{ rate: number; base: number; vat: number }>;
}

/** Para birimini 2 ondalığa yuvarlar (bankacılık yuvarlaması) */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Fatura kalemlerinden ara toplam, KDV ve genel toplamı hesaplar.
 * İsviçre KDV oranları: 8.1 (standart), 2.6 (indirimli), 3.8 (özel).
 */
export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
): InvoiceTotals {
  const lines: CalculatedLine[] = items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    vatRate: item.vatRate,
    lineTotal: roundMoney(item.quantity * item.unitPrice),
  }));

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineTotal, 0),
  );

  // KDV oranına göre grupla
  const groups = new Map<number, number>();
  for (const line of lines) {
    const base = groups.get(line.vatRate) ?? 0;
    groups.set(line.vatRate, roundMoney(base + line.lineTotal));
  }

  const vatBreakdown = Array.from(groups.entries())
    .map(([rate, base]) => ({
      rate,
      base,
      vat: roundMoney((base * rate) / 100),
    }))
    .sort((a, b) => a.rate - b.rate);

  const vatAmount = roundMoney(
    vatBreakdown.reduce((sum, group) => sum + group.vat, 0),
  );

  const total = roundMoney(subtotal + vatAmount);

  return { lines, subtotal, vatAmount, total, vatBreakdown };
}

/**
 * İsviçre QR-referans (QRR) için mod-10 özyinelemeli kontrol basamağı üretir.
 * 26 haneli referans numarasına uygulanır.
 */
export function calculateQrrCheckDigit(reference: string): number {
  const digits = reference.replace(/\D/g, "");
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const char of digits) {
    const digit = Number(char);
    carry = table[(carry + digit) % 10];
  }
  return (10 - carry) % 10;
}

/** 26 haneli QRR referansı üretir (kontrol basamağı dahil) */
export function generateQrrReference(base: string): string {
  const padded = base.replace(/\D/g, "").padStart(25, "0").slice(0, 25);
  const check = calculateQrrCheckDigit(padded);
  return `${padded}${check}`;
}

/** QRR referansını okunabilir biçimde gruplar (5'li gruplar) */
export function formatQrrReference(reference: string): string {
  return reference.replace(/(\d{5})(?=\d)/g, "$1 ");
}
