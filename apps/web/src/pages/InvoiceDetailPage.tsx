import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Invoice, InvoiceStatus } from "@flinkli/shared";
import { INVOICE_STATUSES } from "@flinkli/shared";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";
import { SignaturePad } from "@/components/SignaturePad";

interface QrBillValidation {
  valid: boolean;
  errors: string[];
  payload: string;
  summary: {
    creditor: string;
    iban: string;
    amount: string;
    reference: string;
    referenceType: string;
  };
}

const EMAIL_LOCALES = [
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
];

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendLocale, setSendLocale] = useState("de");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [showQrValidation, setShowQrValidation] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [twintError, setTwintError] = useState<string | null>(null);
  const [twintQr, setTwintQr] = useState<string | null>(null);

  const qrValidationQuery = useQuery({
    queryKey: ["invoice", id, "qrbill"],
    queryFn: () =>
      api.get<QrBillValidation>(`/invoices/${id}/qrbill/validate`),
    enabled: Boolean(id) && showQrValidation,
  });

  const invoiceQuery = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) =>
      api.patch<Invoice>(`/invoices/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<void>(`/invoices/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate("/invoices");
    },
  });

  const downloadPdf = async () => {
    const token = localStorage.getItem("flinkli.token");
    const base = import.meta.env.VITE_API_URL ?? "/api";
    const response = await fetch(`${base}/invoices/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice?.number ?? "invoice"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = useMutation({
    mutationFn: (payload: { to: string; locale: string }) =>
      api.post<{ id: string; to: string; status: string }>(
        `/invoices/${id}/send`,
        payload,
      ),
    onSuccess: (data) => {
      setSendError(null);
      setSendSuccess(t("invoices.sendSuccess", { email: data.to }));
      setIsSending(false);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: unknown) => {
      setSendSuccess(null);
      setSendError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  const openSendModal = () => {
    setSendTo(invoiceQuery.data?.customer?.email ?? "");
    setSendError(null);
    setSendSuccess(null);
    setIsSending(true);
  };

  const signMutation = useMutation({
    mutationFn: (payload: { signatureData: string; signedByName: string }) =>
      api.post<Invoice>(`/invoices/${id}/sign`, payload),
    onSuccess: () => {
      setSignError(null);
      setIsSigning(false);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: unknown) => {
      setSignError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  const removeSignatureMutation = useMutation({
    mutationFn: () => api.delete<Invoice>(`/invoices/${id}/sign`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const twintMutation = useMutation({
    mutationFn: () =>
      api.post<{
        paymentLink: string;
        qrDataUrl: string;
        status: string;
      }>(`/invoices/${id}/twint`, {}),
    onSuccess: (data) => {
      setTwintError(null);
      setTwintQr(data.qrDataUrl);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: unknown) => {
      setTwintError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  const twintPaidMutation = useMutation({
    mutationFn: () => api.post<Invoice>(`/invoices/${id}/twint/paid`, {}),
    onSuccess: () => {
      setTwintError(null);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: unknown) => {
      setTwintError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  const twintRemoveMutation = useMutation({
    mutationFn: () => api.delete<Invoice>(`/invoices/${id}/twint`),
    onSuccess: () => {
      setTwintError(null);
      setTwintQr(null);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const sendReminder = useMutation({
    mutationFn: () =>
      api.post<{ id: string; to: string; reminderCount: number }>(
        `/invoices/${id}/remind`,
        { locale: sendLocale, attachPdf: true },
      ),
    onSuccess: (data) => {
      setReminderError(null);
      setReminderSuccess(
        t("invoices.reminderSent", { email: data.to }),
      );
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: unknown) => {
      setReminderSuccess(null);
      setReminderError(
        error instanceof Error ? error.message : t("common.error"),
      );
    },
  });

  if (invoiceQuery.isLoading) {
    return <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>;
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{t("errors.notFound")}</p>
        <Button variant="secondary" onClick={() => navigate("/invoices")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const invoice = invoiceQuery.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
            {invoice.number}
          </h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void downloadPdf()}>
            {t("invoices.downloadPdf")}
          </Button>
          <Button variant="secondary" onClick={openSendModal}>
            {t("invoices.sendEmail")}
          </Button>
          <Button
            variant="secondary"
            isLoading={sendReminder.isPending}
            disabled={
              invoice.status === "paid" || invoice.status === "cancelled"
            }
            onClick={() => sendReminder.mutate()}
          >
            {t("invoices.sendReminder")}
          </Button>
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            {t("common.edit")}
          </Button>
          <Button variant="danger" onClick={() => setIsDeleting(true)}>
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title={t("invoices.details")} />
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
              {t("invoices.customer")}
            </dt>
            <dd className="text-sm text-surface-900 dark:text-white">
              {invoice.customer?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
              {t("invoices.issueDate")}
            </dt>
            <dd className="text-sm text-surface-900 dark:text-white">
              {formatDate(invoice.issueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
              {t("invoices.dueDate")}
            </dt>
            <dd className="text-sm text-surface-900 dark:text-white">
              {formatDate(invoice.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
              {t("invoices.reference")}
            </dt>
            <dd className="font-mono text-sm text-surface-900 dark:text-white">
              {invoice.reference ?? "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title={t("invoices.items")} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-500 dark:text-surface-400">
                <th className="py-2 pr-4">{t("invoices.description")}</th>
                <th className="py-2 pr-4 text-right">{t("invoices.quantity")}</th>
                <th className="py-2 pr-4 text-right">{t("invoices.unitPrice")}</th>
                <th className="py-2 pr-4 text-right">{t("invoices.vatRate")}</th>
                <th className="py-2 text-right">{t("invoices.lineTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4 text-surface-900 dark:text-white">{item.description}</td>
                  <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                    {item.quantity}
                  </td>
                  <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="py-2 pr-4 text-right text-surface-700 dark:text-surface-200">
                    {item.vatRate}%
                  </td>
                  <td className="py-2 text-right text-surface-900 dark:text-white">
                    {formatMoney(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-500 dark:text-surface-400">{t("invoices.subtotal")}</span>
            <span className="text-surface-900 dark:text-white">{formatMoney(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500 dark:text-surface-400">{t("invoices.vat")}</span>
            <span className="text-surface-900 dark:text-white">{formatMoney(invoice.vatAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-1 font-semibold">
            <span>{t("invoices.total")}</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("invoices.changeStatus")} />
        <div className="flex flex-wrap gap-2">
          {INVOICE_STATUSES.map((status) => (
            <Button
              key={status}
              variant={invoice.status === status ? "primary" : "secondary"}
              size="sm"
              disabled={invoice.status === status || statusMutation.isPending}
              onClick={() => statusMutation.mutate(status)}
            >
              {t(`invoices.statuses.${status}`)}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t("signature.title")}
          action={
            invoice.signedAt ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={removeSignatureMutation.isPending}
                onClick={() => removeSignatureMutation.mutate()}
              >
                {t("signature.remove")}
              </Button>
            ) : undefined
          }
        />
        {invoice.signedAt ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-600">
              {t("signature.signed")}
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {t("signature.signedBy", {
                name: invoice.signedByName ?? "—",
              })}
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {t("signature.signedOn", {
                date: formatDate(invoice.signedAt),
              })}
            </p>
            {invoice.signatureData && (
              <img
                src={invoice.signatureData}
                alt={t("signature.title")}
                className="h-24 rounded-lg border border-surface-200 bg-white dark:border-surface-700"
              />
            )}
          </div>
        ) : isSigning ? (
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {t("signature.description")}
            </p>
            <SignaturePad
              isSubmitting={signMutation.isPending}
              onCancel={() => {
                setIsSigning(false);
                setSignError(null);
              }}
              onSubmit={(payload) => signMutation.mutate(payload)}
            />
            {signError && (
              <p className="text-sm text-swiss-red">{signError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {t("signature.description")}
            </p>
            <Button variant="secondary" onClick={() => setIsSigning(true)}>
              {t("signature.save")}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("twint.title")}
          action={
            invoice.twintStatus && invoice.twintStatus !== "none" ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={twintRemoveMutation.isPending}
                onClick={() => twintRemoveMutation.mutate()}
              >
                {t("twint.remove")}
              </Button>
            ) : undefined
          }
        />
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            {t("twint.description")}
          </p>

          {invoice.twintStatus === "paid" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">
                {t("twint.paid")}
              </p>
              {invoice.twintPaidAt && (
                <p className="text-sm text-surface-600 dark:text-surface-300">
                  {t("twint.paidOn", {
                    date: formatDate(invoice.twintPaidAt),
                  })}
                </p>
              )}
            </div>
          ) : invoice.twintPaymentLink ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-600">
                {t("twint.pending")}
              </p>
              {twintQr && (
                <img
                  src={twintQr}
                  alt={t("twint.title")}
                  className="h-48 w-48 rounded-lg border border-surface-200 bg-white dark:border-surface-700"
                />
              )}
              <div className="space-y-1">
                <p className="text-xs uppercase text-surface-500 dark:text-surface-400">
                  {t("twint.paymentLink")}
                </p>
                <a
                  href={invoice.twintPaymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-brand-600 underline dark:text-brand-400"
                >
                  {invoice.twintPaymentLink}
                </a>
              </div>
              <Button
                variant="secondary"
                isLoading={twintPaidMutation.isPending}
                onClick={() => twintPaidMutation.mutate()}
              >
                {t("twint.markPaid")}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              isLoading={twintMutation.isPending}
              disabled={
                invoice.status === "paid" || invoice.status === "cancelled"
              }
              onClick={() => twintMutation.mutate()}
            >
              {t("twint.generate")}
            </Button>
          )}

          {twintError && <p className="text-sm text-swiss-red">{twintError}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("invoices.sendReminder")} />
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-300">
            {t("invoices.reminderCount", {
              count: invoice.reminderCount ?? 0,
            })}
          </p>
          {reminderError && (
            <p className="text-sm text-swiss-red">{reminderError}</p>
          )}
          {reminderSuccess && (
            <p className="text-sm text-green-600">{reminderSuccess}</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t("invoices.qrValidation")}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQrValidation((prev) => !prev)}
            >
              {showQrValidation ? t("common.hide") : t("invoices.qrValidate")}
            </Button>
          }
        />
        {showQrValidation && (
          <div className="space-y-3">
            {qrValidationQuery.isLoading && (
              <p className="text-sm text-surface-500 dark:text-surface-400">{t("common.loading")}</p>
            )}
            {qrValidationQuery.isError && (
              <p className="text-sm text-swiss-red">{t("common.error")}</p>
            )}
            {qrValidationQuery.data && (
              <>
                <p
                  className={
                    qrValidationQuery.data.valid
                      ? "text-sm font-medium text-green-600"
                      : "text-sm font-medium text-swiss-red"
                  }
                >
                  {qrValidationQuery.data.valid
                    ? t("invoices.qrValid")
                    : t("invoices.qrInvalid")}
                </p>
                {qrValidationQuery.data.errors.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-swiss-red">
                    {qrValidationQuery.data.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
                      {t("invoices.creditor")}
                    </dt>
                    <dd className="text-sm text-surface-900 dark:text-white">
                      {qrValidationQuery.data.summary.creditor}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
                      {t("invoices.iban")}
                    </dt>
                    <dd className="font-mono text-sm text-surface-900 dark:text-white">
                      {qrValidationQuery.data.summary.iban}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
                      {t("invoices.amount")}
                    </dt>
                    <dd className="text-sm text-surface-900 dark:text-white">
                      {qrValidationQuery.data.summary.amount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-surface-500 dark:text-surface-400">
                      {t("invoices.reference")}
                    </dt>
                    <dd className="font-mono text-sm text-surface-900 dark:text-white">
                      {qrValidationQuery.data.summary.reference}
                    </dd>
                  </div>
                </dl>
                <details className="text-sm">
                  <summary className="cursor-pointer text-surface-600 dark:text-surface-300">
                    {t("invoices.qrPayload")}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-surface-50 dark:bg-surface-900 p-3 text-xs text-surface-700 dark:text-surface-200">
                    {qrValidationQuery.data.payload}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={t("invoices.edit")}
      >
        <InvoiceForm
          invoice={invoice}
          onSuccess={() => {
            setIsEditing(false);
            void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
          }}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>

      <Modal
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        title={t("invoices.deleteConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleting(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-surface-600 dark:text-surface-300">
          {t("invoices.deleteConfirmMessage", { number: invoice.number })}
        </p>
      </Modal>

      <Modal
        isOpen={isSending}
        onClose={() => setIsSending(false)}
        title={t("invoices.sendTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSending(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              isLoading={sendEmail.isPending}
              disabled={!sendTo}
              onClick={() =>
                sendEmail.mutate({ to: sendTo, locale: sendLocale })
              }
            >
              {t("invoices.sendConfirm")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("invoices.sendTo")}
            name="sendTo"
            type="email"
            value={sendTo}
            onChange={(event) => setSendTo(event.target.value)}
            hint={!sendTo ? t("invoices.sendNoEmail") : undefined}
          />
          <Select
            label={t("invoices.sendLocale")}
            name="sendLocale"
            value={sendLocale}
            onChange={(event) => setSendLocale(event.target.value)}
            options={EMAIL_LOCALES}
          />
          {sendError && (
            <p className="text-sm text-swiss-red">{sendError}</p>
          )}
          {sendSuccess && (
            <p className="text-sm text-green-600">{sendSuccess}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
