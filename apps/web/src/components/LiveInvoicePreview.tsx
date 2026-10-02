import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateQrSvgPath } from "@/lib/qr";

/**
 * Landing page için canlı QR-fatura önizlemesi.
 *
 * Kullanıcı tutar, KDV oranı ve para birimini girer; QR kod ve fatura özeti
 * anında güncellenir. QR içeriği Swiss Payment Standards 2026 (SPC) formatına
 * uygun gerçek bir QR-fatura payload'ıdır — yani üretilen kod gerçekten
 * taranabilir ve bir örnek alacaklı IBAN'ına ödeme başlatır.
 */

const VAT_RATES = [
  { value: 8.1, key: "standard" },
  { value: 2.6, key: "reduced" },
  { value: 3.8, key: "special" },
  { value: 0, key: "zero" },
] as const;

const CURRENCIES = ["CHF", "EUR"] as const;

// Örnek alacaklı (demo) — gerçek bir QR-IBAN (IID 30000–31999 aralığında).
const DEMO_CREDITOR = {
  name: "flinkli Demo GmbH",
  street: "Bahnhofstrasse 1",
  zip: "8001",
  city: "Zürich",
  country: "CH",
  iban: "CH4431999123000889012",
};

const DEMO_DEBTOR = {
  name: "Muster Kunde AG",
  street: "Hauptstrasse 5",
  zip: "3000",
  city: "Bern",
  country: "CH",
};

/** Swiss Payment Standards 2026 QR-fatura payload'ı (SPC) üretir. */
function buildSwissQrPayload(params: {
  amount: number;
  currency: string;
  vatRate: number;
  message: string;
}): string {
  const { amount, currency, vatRate, message } = params;
  const lines: string[] = [];

  // Header
  lines.push("SPC");
  lines.push("0200");
  lines.push("1");

  // Alacaklı hesabı
  lines.push("CH");
  lines.push(DEMO_CREDITOR.iban);

  // Alacaklı adresi (S tipi)
  lines.push("S");
  lines.push(DEMO_CREDITOR.name);
  lines.push(DEMO_CREDITOR.street);
  lines.push("");
  lines.push(DEMO_CREDITOR.zip);
  lines.push(DEMO_CREDITOR.city);
  lines.push(DEMO_CREDITOR.country);

  // Nihai alacaklı (boş)
  lines.push("", "", "", "", "", "", "");

  // Tutar / para birimi
  lines.push(amount.toFixed(2));
  lines.push(currency);

  // Nihai borçlu (S tipi)
  lines.push("S");
  lines.push(DEMO_DEBTOR.name);
  lines.push(DEMO_DEBTOR.street);
  lines.push("");
  lines.push(DEMO_DEBTOR.zip);
  lines.push(DEMO_DEBTOR.city);
  lines.push(DEMO_DEBTOR.country);

  // Referans (NON) + ek bilgi
  lines.push("NON");
  lines.push("");
  lines.push(message ? `${message} (KDV ${vatRate}%)` : `KDV ${vatRate}%`);

  // Trailer
  lines.push("EPD");
  lines.push("");
  lines.push("");

  return lines.join("\n");
}

function formatMoney(value: number, currency: string): string {
  return `${value.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function LiveInvoicePreview() {
  const { t } = useTranslation();
  const [amountInput, setAmountInput] = useState("1250");
  const [vatRate, setVatRate] = useState<number>(8.1);
  const [currency, setCurrency] = useState<string>("CHF");

  const amount = Number.parseFloat(amountInput.replace(",", "."));
  const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  const vatAmount = useMemo(
    () => Math.round(validAmount * vatRate) / 100,
    [validAmount, vatRate],
  );
  const total = useMemo(
    () => Math.round((validAmount + vatAmount) * 100) / 100,
    [validAmount, vatAmount],
  );

  const qr = useMemo(() => {
    const payload = buildSwissQrPayload({
      amount: total,
      currency,
      vatRate,
      message: t("landing.preview.qrMessage"),
    });
    return generateQrSvgPath(payload);
  }, [total, currency, vatRate, t]);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      {/* Sol: giriş alanları */}
      <div>
        <h3 className="text-xl font-semibold text-surface-900 dark:text-white">
          {t("landing.preview.formTitle")}
        </h3>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
          {t("landing.preview.formSubtitle")}
        </p>

        <div className="mt-6 space-y-5">
          {/* Tutar */}
          <div>
            <label
              htmlFor="preview-amount"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300"
            >
              {t("landing.preview.amountLabel")}
            </label>
            <div className="mt-1.5 flex rounded-lg shadow-sm">
              <input
                id="preview-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="block w-full rounded-l-lg border border-surface-300 bg-white px-3 py-2.5 text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500"
                placeholder="1250.00"
              />
              <span className="inline-flex items-center rounded-r-lg border border-l-0 border-surface-300 bg-surface-100 px-3 text-sm font-medium text-surface-600 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
                {currency}
              </span>
            </div>
          </div>

          {/* Para birimi */}
          <div>
            <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              {t("landing.preview.currencyLabel")}
            </span>
            <div className="mt-1.5 inline-flex rounded-lg border border-surface-300 p-0.5 dark:border-surface-600">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    currency === c
                      ? "bg-brand-600 text-white"
                      : "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* KDV oranı */}
          <div>
            <span className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              {t("landing.preview.vatLabel")}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {VAT_RATES.map((rate) => (
                <button
                  key={rate.key}
                  type="button"
                  onClick={() => setVatRate(rate.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    vatRate === rate.value
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                      : "border-surface-300 text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                >
                  {rate.value}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sağ: canlı önizleme */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-surface-900 dark:text-white">
            {t("landing.preview.invoiceTitle")}
          </span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            {t("landing.preview.qrReady")}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* QR kod */}
          <div className="shrink-0 rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-600">
            <svg
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              className="h-40 w-40"
              role="img"
              aria-label={t("landing.preview.qrAlt")}
            >
              <rect width={qr.size} height={qr.size} fill="#ffffff" />
              <path d={qr.path} fill="#101828" />
            </svg>
          </div>

          {/* Özet */}
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between text-surface-600 dark:text-surface-300">
              <span>{t("landing.preview.subtotal")}</span>
              <span className="font-medium text-surface-900 dark:text-white">
                {formatMoney(validAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-surface-600 dark:text-surface-300">
              <span>
                {t("landing.preview.vat")} ({vatRate}%)
              </span>
              <span className="font-medium text-surface-900 dark:text-white">
                {formatMoney(vatAmount, currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-surface-200 pt-2 text-base dark:border-surface-700">
              <span className="font-semibold text-surface-900 dark:text-white">
                {t("landing.preview.total")}
              </span>
              <span className="font-bold text-brand-700 dark:text-brand-400">
                {formatMoney(total, currency)}
              </span>
            </div>
            <p className="pt-2 text-xs text-surface-500 dark:text-surface-400">
              {t("landing.preview.ibanHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
