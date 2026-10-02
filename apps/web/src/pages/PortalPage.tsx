import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SignaturePad } from "@/components/SignaturePad";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  currency: string;
  status: string;
  signedAt: string | null;
  signedByName: string | null;
  twintPaymentLink: string | null;
  twintStatus: string | null;
}

interface PortalQuote {
  id: string;
  quoteNumber: string;
  issueDate: string;
  validUntil: string | null;
  total: number;
  currency: string;
  status: string;
  signedAt: string | null;
  signedByName: string | null;
}

type SignTarget =
  | { kind: "quote"; id: string; number: string }
  | { kind: "invoice"; id: string; number: string };

interface PortalData {
  customer: { name: string; email: string | null };
  company: {
    name: string;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    iban: string | null;
    logoUrl: string | null;
  };
  invoices: PortalInvoice[];
  quotes: PortalQuote[];
}

const INVOICE_STATUS_CLASSES: Record<string, string> = {
  draft: "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400",
};

const QUOTE_STATUS_CLASSES: Record<string, string> = {
  draft: "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-purple-100 text-purple-700",
};

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [twintTarget, setTwintTarget] = useState<PortalInvoice | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["portal", token],
    queryFn: () => api.get<PortalData>(`/public/portal/${token}`),
    enabled: Boolean(token),
    retry: false,
  });

  const signMutation = useMutation({
    mutationFn: (payload: {
      target: SignTarget;
      signatureData: string;
      signedByName: string;
    }) => {
      const path =
        payload.target.kind === "quote"
          ? `/public/portal/${token}/sign/quote/${payload.target.id}`
          : `/public/portal/${token}/sign/invoice/${payload.target.id}`;
      return api.post(path, {
        signatureData: payload.signatureData,
        signedByName: payload.signedByName,
      });
    },
    onSuccess: () => {
      setSignError(null);
      setSignTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["portal", token] });
    },
    onError: (err: unknown) => {
      setSignError(err instanceof Error ? err.message : t("common.error"));
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 dark:bg-surface-900 px-4 text-center">
        <Logo size={40} />
        <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
          {t("portal.notFoundTitle")}
        </h1>
        <p className="max-w-md text-sm text-surface-600 dark:text-surface-300">
          {(error as Error)?.message ?? t("portal.notFoundDescription")}
        </p>
      </div>
    );
  }

  const { customer, company, invoices, quotes } = data;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-6">
          <Logo size={32} />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            {t("portal.welcome", { name: customer.name })}
          </h1>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
            {t("portal.subtitle", { company: company.name })}
          </p>
        </div>

        <Card>
          <CardHeader title={t("portal.companyInfo")} />
          <div className="space-y-1 text-sm text-surface-700 dark:text-surface-200">
            <p className="font-medium text-surface-900 dark:text-white">{company.name}</p>
            {company.addressLine1 && <p>{company.addressLine1}</p>}
            {(company.postalCode || company.city) && (
              <p>
                {[company.postalCode, company.city].filter(Boolean).join(" ")}
              </p>
            )}
            {company.country && <p>{company.country}</p>}
            {company.iban && (
              <p className="pt-2 text-surface-500 dark:text-surface-400">
                {t("portal.iban")}: {company.iban}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("portal.invoices")}
            description={t("portal.invoicesDescription")}
          />
          {invoices.length === 0 ? (
            <p className="text-sm text-surface-500 dark:text-surface-400">{t("portal.noInvoices")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.number")}
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.issueDate")}
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.dueDate")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("portal.table.total")}
                    </th>
                    <th className="py-2 font-medium">
                      {t("portal.table.status")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("signature.title")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("twint.title")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4 font-medium text-surface-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-surface-900 dark:text-white">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            INVOICE_STATUS_CLASSES[invoice.status] ??
                            "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
                          }`}
                        >
                          {t(`invoices.status.${invoice.status}`, invoice.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {invoice.signedAt ? (
                          <span className="text-xs font-medium text-green-600">
                            {t("signature.signed")}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setSignTarget({
                                kind: "invoice",
                                id: invoice.id,
                                number: invoice.invoiceNumber,
                              })
                            }
                          >
                            {t("signature.save")}
                          </Button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {invoice.twintStatus === "paid" ? (
                          <span className="text-xs font-medium text-green-600">
                            {t("twint.paid")}
                          </span>
                        ) : invoice.twintPaymentLink ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setTwintTarget(invoice)}
                          >
                            {t("twint.title")}
                          </Button>
                        ) : (
                          <span className="text-xs text-surface-400 dark:text-surface-500">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("portal.quotes")}
            description={t("portal.quotesDescription")}
          />
          {quotes.length === 0 ? (
            <p className="text-sm text-surface-500 dark:text-surface-400">{t("portal.noQuotes")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.number")}
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.issueDate")}
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      {t("portal.table.validUntil")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      {t("portal.table.total")}
                    </th>
                    <th className="py-2 font-medium">
                      {t("portal.table.status")}
                    </th>
                    <th className="py-2 text-right font-medium">
                      {t("signature.title")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="py-3 pr-4 font-medium text-surface-900 dark:text-white">
                        {quote.quoteNumber}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {formatDate(quote.issueDate)}
                      </td>
                      <td className="py-3 pr-4 text-surface-600 dark:text-surface-300">
                        {quote.validUntil ? formatDate(quote.validUntil) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-surface-900 dark:text-white">
                        {formatMoney(quote.total, quote.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            QUOTE_STATUS_CLASSES[quote.status] ??
                            "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
                          }`}
                        >
                          {t(`quotes.status.${quote.status}`, quote.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {quote.signedAt ? (
                          <span className="text-xs font-medium text-green-600">
                            {t("signature.signed")}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setSignTarget({
                                kind: "quote",
                                id: quote.id,
                                number: quote.quoteNumber,
                              })
                            }
                          >
                            {t("signature.save")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="pb-4 text-center text-xs text-surface-400 dark:text-surface-500">
          {t("portal.poweredBy")}
        </p>
      </main>

      <Modal
        isOpen={Boolean(signTarget)}
        onClose={() => {
          setSignTarget(null);
          setSignError(null);
        }}
        title={t("signature.title")}
      >
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            {t("signature.description")}
          </p>
          <SignaturePad
            isSubmitting={signMutation.isPending}
            onCancel={() => {
              setSignTarget(null);
              setSignError(null);
            }}
            onSubmit={(payload) => {
              if (!signTarget) return;
              signMutation.mutate({ target: signTarget, ...payload });
            }}
          />
          {signError && <p className="text-sm text-swiss-red">{signError}</p>}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(twintTarget)}
        onClose={() => setTwintTarget(null)}
        title={t("twint.title")}
      >
        {twintTarget && (
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {t("twint.description")}
            </p>
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              {twintTarget.invoiceNumber} ·{" "}
              {formatMoney(twintTarget.total, twintTarget.currency)}
            </p>
            {twintTarget.twintPaymentLink && (
              <a
                href={twintTarget.twintPaymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {t("twint.paymentLink")}
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
