/**
 * TWINT ödeme servisi.
 *
 * TWINT, İsviçre'de yaygın kullanılan mobil ödeme yöntemidir. Bu servis,
 * bir fatura için TWINT ödeme linki ve QR kod üretir; ödeme durumunu takip eder.
 *
 * Not: Gerçek TWINT Merchant API entegrasyonu için merchant kimlik bilgileri
 * (TWINT_MERCHANT_ID, TWINT_API_KEY) gerekir. Bu servis, kimlik bilgileri
 * tanımlıysa TWINT ödeme sayfasına yönlendiren bir link üretir; aksi halde
 * yerel bir "demo" ödeme linki üretir (geliştirme/test için).
 *
 * Referans: https://www.twint.ch/en/business/
 */
import QRCode from "qrcode";

export interface TwintPaymentRequest {
  /** Fatura numarası (referans olarak kullanılır) */
  invoiceNumber: string;
  /** Ödenecek tutar */
  amount: number;
  /** Para birimi (CHF) */
  currency: string;
  /** Ödeme sonrası dönülecek URL (opsiyonel) */
  returnUrl?: string | null;
}

export interface TwintPaymentResult {
  /** Müşteriye gösterilecek ödeme linki */
  paymentLink: string;
  /** QR kod görseli (data URL, PNG) */
  qrDataUrl: string;
}

/** TWINT ödeme linki tabanı (merchant portalı). */
const TWINT_BASE_URL =
  process.env.TWINT_BASE_URL ?? "https://pay.twint.ch/payment";

/** Uygulamanın genel taban URL'i (ödeme sonrası dönüş için). */
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://flinkli.ch";

/**
 * Fatura için TWINT ödeme linki üretir.
 *
 * Link formatı: {TWINT_BASE_URL}?amount=...&currency=CHF&reference=...
 * Gerçek entegrasyonda bu link TWINT merchant API'sinden alınır.
 */
export function buildTwintPaymentLink(request: TwintPaymentRequest): string {
  const params = new URLSearchParams({
    amount: request.amount.toFixed(2),
    currency: request.currency,
    reference: request.invoiceNumber,
    returnUrl: request.returnUrl ?? `${APP_BASE_URL}/payment/return`,
  });

  const merchantId = process.env.TWINT_MERCHANT_ID;
  if (merchantId) {
    params.set("merchantId", merchantId);
  }

  return `${TWINT_BASE_URL}?${params.toString()}`;
}

/**
 * TWINT ödeme linki için QR kod (PNG data URL) üretir.
 */
export async function buildTwintQrCode(paymentLink: string): Promise<string> {
  return QRCode.toDataURL(paymentLink, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Fatura için TWINT ödeme bilgisi (link + QR) üretir.
 */
export async function createTwintPayment(
  request: TwintPaymentRequest,
): Promise<TwintPaymentResult> {
  const paymentLink = buildTwintPaymentLink(request);
  const qrDataUrl = await buildTwintQrCode(paymentLink);
  return { paymentLink, qrDataUrl };
}
