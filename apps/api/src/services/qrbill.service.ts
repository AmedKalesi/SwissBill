/**
 * Swiss QR-Bill (QR-Rechnung) üretim servisi.
 *
 * Swiss Payment Standards 2026'ya uygun QR-fatura verisi ve
 * QR kod (SVG/PNG) üretir.
 *
 * Referans: https://www.paymentstandards.ch/
 */
import QRCode from "qrcode";
import { formatQrrReference } from "@swissbill/shared";

export interface QrBillAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

export interface QrBillData {
  /** Alacaklı (fatura kesen) */
  creditor: QrBillAddress & { iban: string };
  /** Borçlu (müşteri) — opsiyonel */
  debtor?: QrBillAddress | null;
  /** Fatura bilgileri */
  amount: number;
  currency: string;
  /** Referans (QRR/SCOR) veya serbest metin */
  reference?: string | null;
  referenceType: "QRR" | "SCOR" | "NON";
  /** Ek bilgi (unstructured message) */
  message?: string | null;
}

/**
 * QR-Bill verisini Swiss Payment Standards 2026 formatına dönüştürür (SPC).
 *
 * Veri yapısı (satır sırası):
 *  1. SPC / 0200 / 1 (header)
 *  2. Alacaklı hesabı (CH + IBAN)
 *  3. Alacaklı adresi (S tipi)
 *  4. Nihai alacaklı adresi (boş)
 *  5. Tutar / para birimi
 *  6. Nihai borçlu adresi
 *  7. Referans tipi / referans
 *  8. Ek bilgi (unstructured message)
 *  9. EPD (trailer)
 * 10. Faturalama bilgisi (boş)
 * 11. Alternatif prosedürler (boş)
 */
export function buildQrBillPayload(data: QrBillData): string {
  const lines: string[] = [];

  // Header
  lines.push("SPC");
  lines.push("0200"); // Versiyon
  lines.push("1"); // Kodlama: UTF-8

  // Alacaklı hesabı (IBAN veya QR-IBAN)
  lines.push("CH"); // Hesap tipi: IBAN
  lines.push(data.creditor.iban.replace(/\s/g, ""));

  // Alacaklı (S)
  lines.push(...addressBlock(data.creditor));

  // Nihai alacaklı (opsiyonel) — boş bırakılıyor
  lines.push(...emptyAddressBlock());

  // Tutar ve para birimi
  lines.push(data.amount.toFixed(2));
  lines.push(data.currency);

  // Nihai borçlu (S)
  if (data.debtor) {
    lines.push(...addressBlock(data.debtor));
  } else {
    lines.push(...emptyAddressBlock());
  }

  // Referans
  lines.push(data.referenceType);
  lines.push(
    data.referenceType === "QRR" && data.reference
      ? data.reference.replace(/\s/g, "")
      : (data.reference ?? ""),
  );

  // Ek bilgi (unstructured message)
  lines.push(data.message ?? "");

  // Trailer
  lines.push("EPD"); // End of Payment Data
  lines.push(""); // Faturalama bilgisi (billing information) — boş
  lines.push(""); // Alternatif prosedürler (alternative procedures) — boş

  return lines.join("\n");
}

/**
 * QR-Bill verisini Swiss Payment Standards kurallarına göre doğrular.
 * Geçersiz alanların listesini döner (boş dizi = geçerli).
 */
export function validateQrBillData(data: QrBillData): string[] {
  const errors: string[] = [];
  const iban = data.creditor.iban.replace(/\s/g, "");

  // IBAN: CH + 2 kontrol + 17 karakter = 21
  if (!/^CH\d{2}[A-Z0-9]{17}$/.test(iban)) {
    errors.push("Alacaklı IBAN geçersiz (CH + 19 karakter olmalı).");
  }

  // Tutar: 0.01 – 999999999.99 arası
  if (!(data.amount > 0 && data.amount <= 999999999.99)) {
    errors.push("Tutar 0.01 ile 999'999'999.99 arasında olmalı.");
  }

  // Para birimi: yalnızca CHF veya EUR
  if (data.currency !== "CHF" && data.currency !== "EUR") {
    errors.push("Para birimi yalnızca CHF veya EUR olabilir.");
  }

  // QRR referansı: 27 hane (26 + kontrol basamağı) ve QR-IBAN gerekir
  if (data.referenceType === "QRR") {
    const ref = (data.reference ?? "").replace(/\s/g, "");
    if (!/^\d{27}$/.test(ref)) {
      errors.push("QRR referansı 27 haneli olmalı.");
    }
    if (!isQrIban(iban)) {
      errors.push("QRR referansı için QR-IBAN (IID 30000–31999) gerekir.");
    }
  }

  // SCOR referansı: 5–25 karakter alfanumerik
  if (data.referenceType === "SCOR") {
    const ref = (data.reference ?? "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9]{5,25}$/.test(ref)) {
      errors.push("SCOR referansı 5–25 alfanumerik karakter olmalı.");
    }
  }

  // Alacaklı adı zorunlu
  if (!data.creditor.name.trim()) {
    errors.push("Alacaklı adı zorunlu.");
  }

  return errors;
}

/**
 * IBAN'ın QR-IBAN olup olmadığını kontrol eder.
 * QR-IBAN'lar IID 30000–31999 aralığındadır (5. haneden itibaren 5 hane).
 */
export function isQrIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "");
  if (!/^CH\d{2}[A-Z0-9]{17}$/.test(clean)) return false;
  const iid = Number(clean.slice(4, 9));
  return iid >= 30000 && iid <= 31999;
}

function addressBlock(addr: QrBillAddress): string[] {
  return [
    "S", // Adres tipi: yapılandırılmış
    addr.name,
    addr.addressLine1,
    addr.addressLine2 ?? "",
    addr.postalCode,
    addr.city,
    addr.country,
  ];
}

function emptyAddressBlock(): string[] {
  return ["", "", "", "", "", "", ""];
}

/** QR-Bill payload'ından QR kod (SVG string) üretir. */
export async function generateQrCodeSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
  });
}

/** QR-Bill payload'ından QR kod (PNG data URL) üretir. */
export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
  });
}

/** QR-Bill verisini insan-okunur özet olarak döner (PDF için). */
export function formatQrBillSummary(data: QrBillData): {
  creditor: string;
  iban: string;
  amount: string;
  reference: string;
  referenceType: string;
} {
  return {
    creditor: data.creditor.name,
    iban: data.creditor.iban.replace(/(.{4})/g, "$1 ").trim(),
    amount: `${data.currency} ${data.amount.toFixed(2)}`,
    reference:
      data.referenceType === "QRR" && data.reference
        ? formatQrrReference(data.reference)
        : (data.reference ?? "-"),
    referenceType: data.referenceType,
  };
}
