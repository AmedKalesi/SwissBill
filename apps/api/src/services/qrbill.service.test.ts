/**
 * QR-Bill servisi doğrulama testleri.
 *
 * Swiss Payment Standards 2026 kurallarına uygunluğu test faturalarıyla doğrular.
 * Çalıştırma: pnpm --filter api test
 */
import { describe, expect, it } from "vitest";
import {
  buildQrBillPayload,
  formatQrBillSummary,
  isQrIban,
  validateQrBillData,
  type QrBillData,
} from "./qrbill.service.js";

/** Geçerli bir QR-IBAN (IID 30000 aralığında). */
const QR_IBAN = "CH4431999123000889012";
/** Geçerli normal IBAN (IID 30000 dışında). */
const NORMAL_IBAN = "CH9300762011623852957";

function baseData(overrides: Partial<QrBillData> = {}): QrBillData {
  return {
    creditor: {
      name: "Muster GmbH",
      addressLine1: "Bahnhofstrasse 1",
      addressLine2: null,
      postalCode: "8001",
      city: "Zürich",
      country: "CH",
      iban: QR_IBAN,
    },
    debtor: {
      name: "Kunde AG",
      addressLine1: "Hauptstrasse 2",
      addressLine2: null,
      postalCode: "3000",
      city: "Bern",
      country: "CH",
    },
    amount: 1250.5,
    currency: "CHF",
    reference: "210000000003139471430009017",
    referenceType: "QRR",
    message: "Rechnung 2026-0001",
    ...overrides,
  };
}

describe("isQrIban", () => {
  it("QR-IBAN'ı tanır (IID 30000–31999)", () => {
    expect(isQrIban(QR_IBAN)).toBe(true);
  });

  it("normal IBAN'ı reddeder", () => {
    expect(isQrIban(NORMAL_IBAN)).toBe(false);
  });

  it("geçersiz formatı reddeder", () => {
    expect(isQrIban("DE89370400440532013000")).toBe(false);
    expect(isQrIban("CH123")).toBe(false);
  });
});

describe("validateQrBillData", () => {
  it("geçerli QRR faturasını onaylar", () => {
    expect(validateQrBillData(baseData())).toEqual([]);
  });

  it("geçersiz IBAN'ı yakalar", () => {
    const errors = validateQrBillData(
      baseData({
        creditor: { ...baseData().creditor, iban: "CH123" },
      }),
    );
    expect(errors.some((e) => e.includes("IBAN"))).toBe(true);
  });

  it("sıfır/negatif tutarı yakalar", () => {
    expect(validateQrBillData(baseData({ amount: 0 })).length).toBeGreaterThan(0);
    expect(validateQrBillData(baseData({ amount: -5 })).length).toBeGreaterThan(0);
  });

  it("geçersiz para birimini yakalar", () => {
    const errors = validateQrBillData(baseData({ currency: "USD" }));
    expect(errors.some((e) => e.includes("CHF") || e.includes("EUR"))).toBe(true);
  });

  it("QRR için 27 haneli referans zorunlu kılar", () => {
    const errors = validateQrBillData(baseData({ reference: "123" }));
    expect(errors.some((e) => e.includes("27"))).toBe(true);
  });

  it("QRR için QR-IBAN zorunlu kılar", () => {
    const errors = validateQrBillData(
      baseData({
        creditor: { ...baseData().creditor, iban: NORMAL_IBAN },
      }),
    );
    expect(errors.some((e) => e.includes("QR-IBAN"))).toBe(true);
  });

  it("SCOR referansını doğrular", () => {
    const ok = validateQrBillData(
      baseData({
        referenceType: "SCOR",
        reference: "RF18539007547034",
        creditor: { ...baseData().creditor, iban: NORMAL_IBAN },
      }),
    );
    expect(ok).toEqual([]);

    const bad = validateQrBillData(
      baseData({
        referenceType: "SCOR",
        reference: "AB",
        creditor: { ...baseData().creditor, iban: NORMAL_IBAN },
      }),
    );
    expect(bad.some((e) => e.includes("SCOR"))).toBe(true);
  });

  it("alacaklı adı zorunlu kılar", () => {
    const errors = validateQrBillData(
      baseData({ creditor: { ...baseData().creditor, name: "  " } }),
    );
    expect(errors.some((e) => e.includes("adı"))).toBe(true);
  });
});

describe("buildQrBillPayload", () => {
  it("SPC başlığı ve trailer alanlarını içerir", () => {
    const payload = buildQrBillPayload(baseData());
    const lines = payload.split("\n");

    expect(lines[0]).toBe("SPC");
    expect(lines[1]).toBe("0200");
    expect(lines[2]).toBe("1");
    expect(lines[3]).toBe("CH");
    expect(lines[4]).toBe(QR_IBAN);

    // Trailer: EPD + iki boş satır (billing info, alternative procedures)
    const epdIndex = lines.indexOf("EPD");
    expect(epdIndex).toBeGreaterThan(0);
    expect(lines[epdIndex + 1]).toBe("");
    expect(lines[epdIndex + 2]).toBe("");
  });

  it("tutarı iki ondalıkla biçimlendirir", () => {
    const payload = buildQrBillPayload(baseData({ amount: 99.9 }));
    expect(payload).toContain("99.90");
  });

  it("QRR referansındaki boşlukları temizler", () => {
    const payload = buildQrBillPayload(
      baseData({ reference: "21 00000 00003 13947 14300 09017" }),
    );
    expect(payload).toContain("210000000003139471430009017");
  });
});

describe("formatQrBillSummary", () => {
  it("insan-okunur özet üretir", () => {
    const summary = formatQrBillSummary(baseData());
    expect(summary.creditor).toBe("Muster GmbH");
    expect(summary.amount).toBe("CHF 1250.50");
    expect(summary.referenceType).toBe("QRR");
    expect(summary.iban).toContain(" ");
  });
});
