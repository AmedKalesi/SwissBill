import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface QrFormState {
  creditorName: string;
  creditorStreet: string;
  creditorZip: string;
  creditorCity: string;
  creditorIban: string;
  debtorName: string;
  debtorStreet: string;
  debtorZip: string;
  debtorCity: string;
  amount: string;
  currency: string;
  referenceType: string;
  reference: string;
  message: string;
}

const INITIAL_STATE: QrFormState = {
  creditorName: "",
  creditorStreet: "",
  creditorZip: "",
  creditorCity: "",
  creditorIban: "",
  debtorName: "",
  debtorStreet: "",
  debtorZip: "",
  debtorCity: "",
  amount: "",
  currency: "CHF",
  referenceType: "NON",
  reference: "",
  message: "",
};

const CURRENCIES = [
  { value: "CHF", label: "CHF" },
  { value: "EUR", label: "EUR" },
];

const REFERENCE_TYPES = [
  { value: "NON", label: "NON (ohne Referenz)" },
  { value: "QRR", label: "QRR (QR-Referenz)" },
  { value: "SCOR", label: "SCOR (Gläubigerreferenz)" },
];

export function QrGeneratorPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<QrFormState>(INITIAL_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof QrFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    creditor: {
      name: form.creditorName,
      addressLine1: form.creditorStreet,
      postalCode: form.creditorZip,
      city: form.creditorCity,
      country: "CH",
      iban: form.creditorIban,
    },
    debtor: form.debtorName
      ? {
          name: form.debtorName,
          addressLine1: form.debtorStreet,
          postalCode: form.debtorZip,
          city: form.debtorCity,
          country: "CH",
        }
      : null,
    amount: Number(form.amount),
    currency: form.currency,
    referenceType: form.referenceType,
    reference: form.reference || null,
    message: form.message || null,
  });

  const generate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/public/qr-generator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? t("common.error"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "QR-Rechnung.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-brand-700">
            {t("common.appName")}
          </Link>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="secondary" size="sm">
                {t("auth.login")}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t("auth.register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-surface-900 dark:text-white">
            {t("qrGenerator.title")}
          </h1>
          <p className="mt-2 text-surface-600 dark:text-surface-300">{t("qrGenerator.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t("qrGenerator.creditor")} />
            <div className="space-y-3">
              <Input
                label={t("qrGenerator.name")}
                name="creditorName"
                value={form.creditorName}
                onChange={(e) => update("creditorName", e.target.value)}
              />
              <Input
                label={t("qrGenerator.street")}
                name="creditorStreet"
                value={form.creditorStreet}
                onChange={(e) => update("creditorStreet", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label={t("qrGenerator.zip")}
                  name="creditorZip"
                  value={form.creditorZip}
                  onChange={(e) => update("creditorZip", e.target.value)}
                />
                <div className="col-span-2">
                  <Input
                    label={t("qrGenerator.city")}
                    name="creditorCity"
                    value={form.creditorCity}
                    onChange={(e) => update("creditorCity", e.target.value)}
                  />
                </div>
              </div>
              <Input
                label={t("qrGenerator.iban")}
                name="creditorIban"
                value={form.creditorIban}
                onChange={(e) => update("creditorIban", e.target.value)}
                hint={t("qrGenerator.ibanHint")}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={t("qrGenerator.debtor")} />
            <div className="space-y-3">
              <Input
                label={t("qrGenerator.name")}
                name="debtorName"
                value={form.debtorName}
                onChange={(e) => update("debtorName", e.target.value)}
              />
              <Input
                label={t("qrGenerator.street")}
                name="debtorStreet"
                value={form.debtorStreet}
                onChange={(e) => update("debtorStreet", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label={t("qrGenerator.zip")}
                  name="debtorZip"
                  value={form.debtorZip}
                  onChange={(e) => update("debtorZip", e.target.value)}
                />
                <div className="col-span-2">
                  <Input
                    label={t("qrGenerator.city")}
                    name="debtorCity"
                    value={form.debtorCity}
                    onChange={(e) => update("debtorCity", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title={t("qrGenerator.payment")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label={t("qrGenerator.amount")}
              name="amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
            <Select
              label={t("qrGenerator.currency")}
              name="currency"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              options={CURRENCIES}
            />
            <Select
              label={t("qrGenerator.referenceType")}
              name="referenceType"
              value={form.referenceType}
              onChange={(e) => update("referenceType", e.target.value)}
              options={REFERENCE_TYPES}
            />
          </div>
          <div className="mt-3 space-y-3">
            <Input
              label={t("qrGenerator.reference")}
              name="reference"
              value={form.reference}
              onChange={(e) => update("reference", e.target.value)}
              hint={t("qrGenerator.referenceHint")}
            />
            <Input
              label={t("qrGenerator.message")}
              name="message"
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
            />
          </div>
        </Card>

        {error && <p className="text-sm text-swiss-red">{error}</p>}

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            isLoading={isGenerating}
            disabled={
              !form.creditorName ||
              !form.creditorIban ||
              !form.amount ||
              Number(form.amount) <= 0
            }
            onClick={() => void generate()}
          >
            {t("qrGenerator.download")}
          </Button>
          <p className="text-sm text-surface-500 dark:text-surface-400">{t("qrGenerator.cta")}</p>
          <Link to="/register" className="text-sm font-medium text-brand-600">
            {t("qrGenerator.ctaLink")}
          </Link>
        </div>
      </main>
    </div>
  );
}
