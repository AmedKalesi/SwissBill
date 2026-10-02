/**
 * Bexio muhasebe entegrasyonu servisi testleri.
 *
 * Test ortamında BEXIO_CLIENT_ID/SECRET tanımlı olmadığından servis "demo"
 * modunda çalışır; bu testler demo davranışını ve yardımcı fonksiyonları
 * doğrular. Çalıştırma: pnpm --filter api test
 */
import { describe, expect, it } from "vitest";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  isBexioConfigured,
  normalizeProvider,
  refreshAccessToken,
  syncExpenses,
  syncInvoices,
  type SyncableExpense,
  type SyncableInvoice,
} from "./bexio.service.js";

function sampleInvoice(overrides: Partial<SyncableInvoice> = {}): SyncableInvoice {
  return {
    id: "inv-1",
    invoiceNumber: "2026-0001",
    issueDate: new Date("2026-01-15"),
    dueDate: new Date("2026-02-15"),
    total: 1250.5,
    currency: "CHF",
    status: "sent",
    customerName: "Kunde AG",
    ...overrides,
  };
}

function sampleExpense(overrides: Partial<SyncableExpense> = {}): SyncableExpense {
  return {
    id: "exp-1",
    date: new Date("2026-01-20"),
    description: "Büromaterial",
    amount: 89.9,
    vatAmount: 7.2,
    currency: "CHF",
    category: "office",
    vendor: "Papeterie",
    ...overrides,
  };
}

describe("normalizeProvider", () => {
  it("bilinen sağlayıcıları korur", () => {
    expect(normalizeProvider("bexio")).toBe("bexio");
    expect(normalizeProvider("abacus")).toBe("abacus");
    expect(normalizeProvider("banana")).toBe("banana");
  });

  it("bilinmeyen sağlayıcıyı bexio'ya düşürür", () => {
    expect(normalizeProvider("unknown")).toBe("bexio");
    expect(normalizeProvider("")).toBe("bexio");
  });
});

describe("isBexioConfigured", () => {
  it("test ortamında kimlik bilgileri olmadığından false döner", () => {
    expect(isBexioConfigured()).toBe(false);
  });
});

describe("buildAuthorizationUrl", () => {
  it("state ve client_id içeren geçerli bir URL üretir", () => {
    const url = buildAuthorizationUrl("test-state");
    expect(url).toContain("https://auth.bexio.com");
    expect(url).toContain("state=test-state");
    expect(url).toContain("response_type=code");
    expect(url).toContain("client_id=");
  });

  it("özel redirectUri verildiğinde onu kullanır", () => {
    const url = buildAuthorizationUrl("s", "https://example.com/cb");
    expect(url).toContain(
      `redirect_uri=${encodeURIComponent("https://example.com/cb")}`,
    );
  });
});

describe("exchangeCodeForToken (demo modu)", () => {
  it("demo token üretir ve son kullanma tarihini gelecekte ayarlar", async () => {
    const result = await exchangeCodeForToken("abc12345");
    expect(result.accessToken).toContain("demo-access");
    expect(result.refreshToken).toContain("demo-refresh");
    expect(result.externalTenantId).toBe("demo-tenant");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("refreshAccessToken (demo modu)", () => {
  it("refresh token'ı korur ve yeni erişim token'ı döndürür", async () => {
    const result = await refreshAccessToken("my-refresh");
    expect(result.accessToken).toBe("demo-access-refreshed");
    expect(result.refreshToken).toBe("my-refresh");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("syncInvoices (demo modu)", () => {
  it("girilen fatura sayısını döndürür", async () => {
    const count = await syncInvoices("token", [
      sampleInvoice(),
      sampleInvoice({ id: "inv-2", invoiceNumber: "2026-0002" }),
    ]);
    expect(count).toBe(2);
  });

  it("boş liste için 0 döndürür", async () => {
    expect(await syncInvoices("token", [])).toBe(0);
  });
});

describe("syncExpenses (demo modu)", () => {
  it("girilen gider sayısını döndürür", async () => {
    const count = await syncExpenses("token", [
      sampleExpense(),
      sampleExpense({ id: "exp-2" }),
      sampleExpense({ id: "exp-3" }),
    ]);
    expect(count).toBe(3);
  });

  it("boş liste için 0 döndürür", async () => {
    expect(await syncExpenses("token", [])).toBe(0);
  });
});
