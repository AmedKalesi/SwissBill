/**
 * Fatura PDF üretim servisi.
 * QR-fatura (QR-Rechnung) ile birlikte tam fatura PDF'i oluşturur.
 */
import PDFDocument from "pdfkit";
import { formatQrrReference } from "@swissbill/shared";
import type { QrBillData } from "./qrbill.service.js";
import { generateQrCodeDataUrl } from "./qrbill.service.js";

export interface PdfInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface PdfInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  vatBreakdown: Array<{ rate: number; base: number; vat: number }>;
  items: PdfInvoiceItem[];
  notes?: string | null;
  /** Müşteri e-imzası (data URL, PNG) */
  signatureData?: string | null;
  /** İmzalayan kişinin adı */
  signedByName?: string | null;
  /** İmza zamanı (ISO) */
  signedAt?: string | null;
  company: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
    vatNumber?: string | null;
    iban: string;
  };
  customer: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
  };
  qrBill: QrBillData;
}

const COLORS = {
  primary: "#1a1a2e",
  accent: "#0f3460",
  muted: "#6b7280",
  line: "#e5e7eb",
};

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Fatura PDF'i üretir ve Buffer döner. */
export async function generateInvoicePdf(
  data: PdfInvoiceData,
): Promise<Buffer> {
  const qrDataUrl = await generateQrCodeDataUrl(
    buildQrPayload(data.qrBill),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;

    // --- Başlık ---
    doc
      .fillColor(COLORS.primary)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("RECHNUNG", 50, 50);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(COLORS.muted)
      .text(`Nr. ${data.invoiceNumber}`, 50, 80);

    // --- Şirket bilgileri (sağ üst) ---
    doc
      .fontSize(10)
      .fillColor(COLORS.primary)
      .font("Helvetica-Bold")
      .text(data.company.name, 350, 50, { width: 200, align: "right" });

    doc.font("Helvetica").fillColor(COLORS.muted);
    const companyLines = [
      data.company.addressLine1,
      data.company.addressLine2,
      `${data.company.postalCode} ${data.company.city}`,
      data.company.country,
      data.company.vatNumber ? `MWST: ${data.company.vatNumber}` : null,
    ].filter(Boolean) as string[];

    companyLines.forEach((line) => {
      doc.text(line, 350, doc.y, { width: 200, align: "right" });
    });

    // --- Müşteri adresi ---
    doc.moveDown(3);
    const customerY = 160;
    doc
      .fontSize(10)
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .text("Rechnung an:", 50, customerY);

    doc.fillColor(COLORS.primary).font("Helvetica-Bold");
    doc.text(data.customer.name, 50, customerY + 15);
    doc.font("Helvetica").fillColor(COLORS.muted);
    const customerLines = [
      data.customer.addressLine1,
      data.customer.addressLine2,
      `${data.customer.postalCode} ${data.customer.city}`,
      data.customer.country,
    ].filter(Boolean) as string[];
    customerLines.forEach((line) => doc.text(line, 50, doc.y));

    // --- Tarih bilgileri ---
    doc
      .fillColor(COLORS.primary)
      .font("Helvetica")
      .text(`Rechnungsdatum: ${formatDate(data.issueDate)}`, 350, customerY + 15, {
        width: 200,
        align: "right",
      });
    doc.text(`Fällig am: ${formatDate(data.dueDate)}`, 350, doc.y, {
      width: 200,
      align: "right",
    });

    // --- Kalem tablosu ---
    let tableY = 280;
    doc
      .fillColor(COLORS.accent)
      .rect(50, tableY, pageWidth, 24)
      .fill();

    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    doc.text("Beschreibung", 58, tableY + 8, { width: 240 });
    doc.text("Menge", 300, tableY + 8, { width: 50, align: "right" });
    doc.text("Preis", 360, tableY + 8, { width: 70, align: "right" });
    doc.text("MWST", 435, tableY + 8, { width: 40, align: "right" });
    doc.text("Total", 480, tableY + 8, { width: 65, align: "right" });

    tableY += 24;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.primary);

    data.items.forEach((item, index) => {
      const rowY = tableY + index * 22;
      if (index % 2 === 1) {
        doc.fillColor("#f9fafb").rect(50, rowY, pageWidth, 22).fill();
      }
      doc.fillColor(COLORS.primary);
      doc.text(item.description, 58, rowY + 6, { width: 240 });
      doc.text(item.quantity.toString(), 300, rowY + 6, {
        width: 50,
        align: "right",
      });
      doc.text(item.unitPrice.toFixed(2), 360, rowY + 6, {
        width: 70,
        align: "right",
      });
      doc.text(`${item.vatRate}%`, 435, rowY + 6, {
        width: 40,
        align: "right",
      });
      doc.text(item.lineTotal.toFixed(2), 480, rowY + 6, {
        width: 65,
        align: "right",
      });
    });

    // --- Toplamlar ---
    let totalsY = tableY + data.items.length * 22 + 20;
    const totalsX = 360;

    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
    doc.text("Zwischensumme", totalsX, totalsY, { width: 120 });
    doc.text(formatMoney(data.subtotal, data.currency), 480, totalsY, {
      width: 65,
      align: "right",
    });

    totalsY += 16;
    data.vatBreakdown.forEach((group) => {
      doc.text(`MWST ${group.rate}%`, totalsX, totalsY, { width: 120 });
      doc.text(formatMoney(group.vat, data.currency), 480, totalsY, {
        width: 65,
        align: "right",
      });
      totalsY += 16;
    });

    totalsY += 4;
    doc
      .moveTo(totalsX, totalsY)
      .lineTo(545, totalsY)
      .strokeColor(COLORS.line)
      .stroke();

    totalsY += 8;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.primary)
      .text("Gesamtbetrag", totalsX, totalsY, { width: 120 });
    doc.text(formatMoney(data.total, data.currency), 480, totalsY, {
      width: 65,
      align: "right",
    });

    // --- Notlar ---
    if (data.notes) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(data.notes, 50, totalsY + 40, { width: pageWidth });
    }

    // --- E-imza (müşteri onayı) ---
    if (data.signatureData) {
      const sigY = totalsY + (data.notes ? 90 : 50);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.primary)
        .text("Kundenunterschrift / Müşteri İmzası", 50, sigY);

      try {
        doc.image(data.signatureData, 50, sigY + 14, {
          fit: [180, 60],
        });
      } catch {
        // Geçersiz imza verisi PDF'i bozmasın
      }

      doc
        .moveTo(50, sigY + 78)
        .lineTo(230, sigY + 78)
        .strokeColor(COLORS.line)
        .stroke();

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted);
      if (data.signedByName) {
        doc.text(data.signedByName, 50, sigY + 82);
      }
      if (data.signedAt) {
        doc.text(
          `Datum: ${formatDate(data.signedAt)}`,
          50,
          doc.y,
        );
      }
    }

    // --- QR-Fatura (ödeme kaydı) ---
    const qrSectionY = 620;
    doc
      .moveTo(50, qrSectionY - 10)
      .lineTo(545, qrSectionY - 10)
      .strokeColor(COLORS.line)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text("Zahlteil / QR-Rechnung", 50, qrSectionY);

    // QR kod
    doc.image(qrDataUrl, 50, qrSectionY + 20, { width: 120, height: 120 });

    // QR bilgileri
    const infoX = 190;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.primary);
    doc.text("Zahlbar an:", infoX, qrSectionY + 20);
    doc.font("Helvetica-Bold").text(data.company.name, infoX, doc.y);
    doc.font("Helvetica").fillColor(COLORS.muted);
    doc.text(
      `IBAN: ${data.company.iban.replace(/(.{4})/g, "$1 ").trim()}`,
      infoX,
      doc.y,
    );
    doc.text(
      `Betrag: ${formatMoney(data.total, data.currency)}`,
      infoX,
      doc.y,
    );
    if (data.qrBill.referenceType === "QRR" && data.qrBill.reference) {
      doc.text(
        `Referenz: ${formatQrrReference(data.qrBill.reference)}`,
        infoX,
        doc.y,
      );
    }
    doc.text(`Fällig am: ${formatDate(data.dueDate)}`, infoX, doc.y);

    doc.end();
  });
}

/** QR-Bill payload'ını oluşturur (SPC formatı). */
function buildQrPayload(data: QrBillData): string {
  const lines: string[] = [
    "SPC",
    "0200",
    "1",
    "CH",
    data.creditor.iban.replace(/\s/g, ""),
    "S",
    data.creditor.name,
    data.creditor.addressLine1,
    data.creditor.addressLine2 ?? "",
    data.creditor.postalCode,
    data.creditor.city,
    data.creditor.country,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    data.amount.toFixed(2),
    data.currency,
  ];

  if (data.debtor) {
    lines.push(
      "S",
      data.debtor.name,
      data.debtor.addressLine1,
      data.debtor.addressLine2 ?? "",
      data.debtor.postalCode,
      data.debtor.city,
      data.debtor.country,
    );
  } else {
    lines.push("", "", "", "", "", "", "");
  }

  lines.push(data.referenceType);
  lines.push(
    data.referenceType === "QRR" && data.reference
      ? data.reference.replace(/\s/g, "")
      : (data.reference ?? ""),
  );
  lines.push(data.message ?? "");
  lines.push("EPD");

  return lines.join("\n");
}
