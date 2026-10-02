/**
 * E-posta gönderim servisi (Resend).
 * Fatura PDF'ini ek olarak gönderir ve çok dilli HTML şablonu üretir.
 * Ayrıca ödeme hatırlatma e-postalarını gönderir.
 */
import { Resend } from "resend";
import { env } from "../config/env.js";

export type EmailLocale = "de" | "fr" | "it" | "en";

export interface SendInvoiceEmailInput {
  to: string;
  locale?: EmailLocale;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  currency: string;
  companyName: string;
  customerName: string;
  iban: string;
  reference?: string | null;
  pdf: Buffer;
}

interface EmailStrings {
  subject: string;
  greeting: string;
  intro: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  reference: string;
  payTo: string;
  outro: string;
  signature: string;
}

const STRINGS: Record<EmailLocale, EmailStrings> = {
  de: {
    subject: "Rechnung {number} von {company}",
    greeting: "Guten Tag {customer}",
    intro: "Vielen Dank für Ihr Vertrauen. Anbei erhalten Sie Ihre Rechnung.",
    invoiceNumber: "Rechnungsnummer",
    issueDate: "Rechnungsdatum",
    dueDate: "Fälligkeitsdatum",
    amount: "Betrag",
    reference: "Referenz",
    payTo: "Zahlbar an IBAN",
    outro:
      "Bitte überweisen Sie den Betrag bis zum Fälligkeitsdatum. Bei Fragen antworten Sie einfach auf diese E-Mail.",
    signature: "Freundliche Grüsse",
  },
  fr: {
    subject: "Facture {number} de {company}",
    greeting: "Bonjour {customer}",
    intro: "Merci pour votre confiance. Veuillez trouver votre facture en pièce jointe.",
    invoiceNumber: "Numéro de facture",
    issueDate: "Date de facture",
    dueDate: "Date d'échéance",
    amount: "Montant",
    reference: "Référence",
    payTo: "Payable à l'IBAN",
    outro:
      "Merci de régler le montant avant la date d'échéance. Pour toute question, répondez simplement à cet e-mail.",
    signature: "Cordialement",
  },
  it: {
    subject: "Fattura {number} di {company}",
    greeting: "Buongiorno {customer}",
    intro: "Grazie per la fiducia. In allegato trova la sua fattura.",
    invoiceNumber: "Numero fattura",
    issueDate: "Data fattura",
    dueDate: "Data di scadenza",
    amount: "Importo",
    reference: "Riferimento",
    payTo: "Pagabile all'IBAN",
    outro:
      "La preghiamo di versare l'importo entro la data di scadenza. Per domande risponda a questa e-mail.",
    signature: "Cordiali saluti",
  },
  en: {
    subject: "Invoice {number} from {company}",
    greeting: "Hello {customer}",
    intro: "Thank you for your business. Please find your invoice attached.",
    invoiceNumber: "Invoice number",
    issueDate: "Issue date",
    dueDate: "Due date",
    amount: "Amount",
    reference: "Reference",
    payTo: "Payable to IBAN",
    outro:
      "Please transfer the amount by the due date. If you have any questions, simply reply to this email.",
    signature: "Kind regards",
  },
};

let client: Resend | null = null;

function getClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY tanımlı değil. E-posta gönderimi için .env dosyasına ekleyin.",
    );
  }
  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function formatDate(iso: string, locale: EmailLocale): string {
  const localeMap: Record<EmailLocale, string> = {
    de: "de-CH",
    fr: "fr-CH",
    it: "it-CH",
    en: "en-CH",
  };
  return new Date(iso).toLocaleDateString(localeMap[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function escapeHtml(value: string): string {
  const amp = String.fromCharCode(38) + "amp;";
  const lt = String.fromCharCode(38) + "lt;";
  const gt = String.fromCharCode(38) + "gt;";
  const quot = String.fromCharCode(38) + "quot;";
  return value
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot);
}

function buildHtml(input: SendInvoiceEmailInput, s: EmailStrings): string {
  const locale = input.locale ?? "de";
  const rows: Array<[string, string]> = [
    [s.invoiceNumber, input.invoiceNumber],
    [s.issueDate, formatDate(input.issueDate, locale)],
    [s.dueDate, formatDate(input.dueDate, locale)],
    [s.amount, formatMoney(input.total, input.currency)],
  ];
  if (input.reference) {
    rows.push([s.reference, input.reference]);
  }
  rows.push([s.payTo, input.iban]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;text-align:right;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#dc2626;padding:20px 24px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(input.companyName)}</span>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;color:#111827;font-size:15px;">${escapeHtml(
            interpolate(s.greeting, { customer: input.customerName }),
          )}</p>
          <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(
            s.intro,
          )}</p>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
            ${rowsHtml}
          </table>
          <p style="margin:20px 0 0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(
            s.outro,
          )}</p>
          <p style="margin:20px 0 0;color:#374151;font-size:14px;">${escapeHtml(
            s.signature,
          )}<br /><strong>${escapeHtml(input.companyName)}</strong></p>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;color:#9ca3af;font-size:12px;">
        ${escapeHtml(input.invoiceNumber)} · ${escapeHtml(input.companyName)}
      </p>
    </div>
  </body>
</html>`;
}

/** Fatura e-postasını PDF ekiyle gönderir. */
export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? "de";
  const s = STRINGS[locale] ?? STRINGS.de;
  const vars = {
    number: input.invoiceNumber,
    company: input.companyName,
    customer: input.customerName,
  };

  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: interpolate(s.subject, vars),
    html: buildHtml(input, s),
    attachments: [
      {
        filename: `Rechnung-${input.invoiceNumber}.pdf`,
        content: input.pdf.toString("base64"),
      },
    ],
  });

  if (error) {
    throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }

  return { id: data?.id ?? "" };
}

// ============================================
// Ödeme hatırlatma e-postası
// ============================================

export interface SendReminderEmailInput {
  to: string;
  locale?: EmailLocale;
  invoiceNumber: string;
  dueDate: string;
  total: number;
  currency: string;
  companyName: string;
  customerName: string;
  iban: string;
  reference?: string | null;
  daysOverdue: number;
  reminderNumber: number;
  pdf?: Buffer;
}

interface ReminderStrings {
  subject: string;
  greeting: string;
  intro: string;
  overdue: string;
  invoiceNumber: string;
  dueDate: string;
  amount: string;
  reference: string;
  payTo: string;
  outro: string;
  signature: string;
}

const REMINDER_STRINGS: Record<EmailLocale, ReminderStrings> = {
  de: {
    subject: "Zahlungserinnerung: Rechnung {number}",
    greeting: "Guten Tag {customer}",
    intro:
      "Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist.",
    overdue: "Überfällig seit {days} Tag(en)",
    invoiceNumber: "Rechnungsnummer",
    dueDate: "Fälligkeitsdatum",
    amount: "Offener Betrag",
    reference: "Referenz",
    payTo: "Zahlbar an IBAN",
    outro:
      "Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie diese E-Mail bitte als gegenstandslos. Bei Fragen antworten Sie einfach auf diese E-Mail.",
    signature: "Freundliche Grüsse",
  },
  fr: {
    subject: "Rappel de paiement : facture {number}",
    greeting: "Bonjour {customer}",
    intro:
      "Nous vous rappelons aimablement que la facture suivante est encore en suspens.",
    overdue: "En retard depuis {days} jour(s)",
    invoiceNumber: "Numéro de facture",
    dueDate: "Date d'échéance",
    amount: "Montant dû",
    reference: "Référence",
    payTo: "Payable à l'IBAN",
    outro:
      "Si vous avez déjà effectué le paiement, veuillez ignorer cet e-mail. Pour toute question, répondez simplement à ce message.",
    signature: "Cordialement",
  },
  it: {
    subject: "Sollecito di pagamento: fattura {number}",
    greeting: "Buongiorno {customer}",
    intro:
      "Le ricordiamo gentilmente che la seguente fattura è ancora in sospeso.",
    overdue: "Scaduta da {days} giorno/i",
    invoiceNumber: "Numero fattura",
    dueDate: "Data di scadenza",
    amount: "Importo dovuto",
    reference: "Riferimento",
    payTo: "Pagabile all'IBAN",
    outro:
      "Se ha già effettuato il pagamento, ignori questa e-mail. Per domande risponda a questo messaggio.",
    signature: "Cordiali saluti",
  },
  en: {
    subject: "Payment reminder: invoice {number}",
    greeting: "Hello {customer}",
    intro:
      "This is a friendly reminder that the following invoice is still outstanding.",
    overdue: "Overdue by {days} day(s)",
    invoiceNumber: "Invoice number",
    dueDate: "Due date",
    amount: "Amount due",
    reference: "Reference",
    payTo: "Payable to IBAN",
    outro:
      "If you have already made the payment, please disregard this email. If you have any questions, simply reply to this message.",
    signature: "Kind regards",
  },
};

function buildReminderHtml(
  input: SendReminderEmailInput,
  s: ReminderStrings,
): string {
  const locale = input.locale ?? "de";
  const rows: Array<[string, string]> = [
    [s.invoiceNumber, input.invoiceNumber],
    [s.dueDate, formatDate(input.dueDate, locale)],
    [s.amount, formatMoney(input.total, input.currency)],
  ];
  if (input.reference) {
    rows.push([s.reference, input.reference]);
  }
  rows.push([s.payTo, input.iban]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;text-align:right;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#f59e0b;padding:20px 24px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(input.companyName)}</span>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;color:#111827;font-size:15px;">${escapeHtml(
            interpolate(s.greeting, { customer: input.customerName }),
          )}</p>
          <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(
            s.intro,
          )}</p>
          <p style="margin:0 0 20px;color:#b45309;font-size:13px;font-weight:600;">${escapeHtml(
            interpolate(s.overdue, { days: String(input.daysOverdue) }),
          )}</p>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
            ${rowsHtml}
          </table>
          <p style="margin:20px 0 0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(
            s.outro,
          )}</p>
          <p style="margin:20px 0 0;color:#374151;font-size:14px;">${escapeHtml(
            s.signature,
          )}<br /><strong>${escapeHtml(input.companyName)}</strong></p>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;color:#9ca3af;font-size:12px;">
        ${escapeHtml(input.invoiceNumber)} · ${escapeHtml(input.companyName)}
      </p>
    </div>
  </body>
</html>`;
}

/** Ödeme hatırlatma e-postasını gönderir. */
export async function sendReminderEmail(
  input: SendReminderEmailInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? "de";
  const s = REMINDER_STRINGS[locale] ?? REMINDER_STRINGS.de;
  const vars = {
    number: input.invoiceNumber,
    company: input.companyName,
    customer: input.customerName,
  };

  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: interpolate(s.subject, vars),
    html: buildReminderHtml(input, s),
    ...(input.pdf
      ? {
          attachments: [
            {
              filename: `Rechnung-${input.invoiceNumber}.pdf`,
              content: input.pdf.toString("base64"),
            },
          ],
        }
      : {}),
  });

  if (error) {
    throw new Error(`Hatırlatma e-postası gönderilemedi: ${error.message}`);
  }

  return { id: data?.id ?? "" };
}
