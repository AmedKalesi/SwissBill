/**
 * Bexio muhasebe entegrasyonu servisi.
 *
 * Bexio, İsviçre'de yaygın kullanılan bir muhasebe/ERP yazılımıdır. Bu servis,
 * Bexio OAuth 2.0 akışını yönetir ve flinkli faturalarını/giderlerini Bexio'ya
 * senkronize eder.
 *
 * Not: Gerçek Bexio API entegrasyonu için OAuth istemci kimlik bilgileri
 * (BEXIO_CLIENT_ID, BEXIO_CLIENT_SECRET) gerekir. Bu servis, kimlik bilgileri
 * tanımlıysa gerçek Bexio API'sine istek atar; aksi halde yerel bir "demo"
 * senkronizasyon simülasyonu çalıştırır (geliştirme/test için).
 *
 * Referans: https://docs.bexio.com/
 */
import type { AccountingProvider } from "@swissbill/shared";

/** Bexio OAuth yetkilendirme tabanı. */
const BEXIO_AUTH_URL = "https://auth.bexio.com/realms/bexio/protocol/openid-connect/auth";
/** Bexio token uç noktası. */
const BEXIO_TOKEN_URL = "https://auth.bexio.com/realms/bexio/protocol/openid-connect/token";
/** Bexio API tabanı. */
const BEXIO_API_URL = "https://api.bexio.com/2.0";

/** Uygulamanın genel taban URL'i (OAuth dönüşü için). */
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://flinkli.ch";

/** OAuth istemci kimlik bilgileri. */
const CLIENT_ID = process.env.BEXIO_CLIENT_ID;
const CLIENT_SECRET = process.env.BEXIO_CLIENT_SECRET;

/** Kimlik bilgileri tanımlı mı (gerçek API kullanılabilir mi). */
export function isBexioConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  externalTenantId: string | null;
}

export interface SyncableInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  currency: string;
  status: string;
  customerName: string;
}

export interface SyncableExpense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  vatAmount: number;
  currency: string;
  category: string;
  vendor: string | null;
}

export interface SyncResult {
  syncedInvoices: number;
  syncedExpenses: number;
}

/**
 * Bexio OAuth yetkilendirme URL'i üretir.
 *
 * Kullanıcı bu URL'e yönlendirilir; Bexio onay sonrası `redirectUri`'ye
 * `code` parametresiyle geri döner.
 */
export function buildAuthorizationUrl(
  state: string,
  redirectUri?: string | null,
): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? "demo-client",
    response_type: "code",
    scope: "openid profile email accounting",
    redirect_uri: redirectUri ?? `${APP_BASE_URL}/api/accounting/callback`,
    state,
  });
  return `${BEXIO_AUTH_URL}?${params.toString()}`;
}

/**
 * OAuth yetkilendirme kodunu erişim token'ına çevirir.
 *
 * Kimlik bilgileri tanımlı değilse demo token üretir.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string | null,
): Promise<OAuthTokenResult> {
  if (!isBexioConfigured()) {
    // Demo modu: gerçek API çağrısı yapılmaz.
    return {
      accessToken: `demo-access-${code.slice(0, 8)}`,
      refreshToken: `demo-refresh-${code.slice(0, 8)}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      externalTenantId: "demo-tenant",
    };
  }

  const response = await fetch(BEXIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID as string,
      client_secret: CLIENT_SECRET as string,
      redirect_uri: redirectUri ?? `${APP_BASE_URL}/api/accounting/callback`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bexio token değişimi başarısız: ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    externalTenantId: null,
  };
}

/**
 * Erişim token'ını yeniler.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResult> {
  if (!isBexioConfigured()) {
    return {
      accessToken: `demo-access-refreshed`,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      externalTenantId: "demo-tenant",
    };
  }

  const response = await fetch(BEXIO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID as string,
      client_secret: CLIENT_SECRET as string,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bexio token yenileme başarısız: ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    externalTenantId: null,
  };
}

/**
 * Faturaları Bexio'ya senkronize eder.
 *
 * Gerçek API modunda her fatura için Bexio `/kb_invoice` uç noktasına POST
 * atılır. Demo modunda yalnızca sayı döndürülür.
 */
export async function syncInvoices(
  accessToken: string,
  invoices: SyncableInvoice[],
): Promise<number> {
  if (!isBexioConfigured()) {
    return invoices.length;
  }

  let synced = 0;
  for (const invoice of invoices) {
    const response = await fetch(`${BEXIO_API_URL}/kb_invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        document_nr: invoice.invoiceNumber,
        title: `flinkli ${invoice.invoiceNumber}`,
        contact_id: null,
        total: invoice.total,
        currency: invoice.currency,
        issue_date: invoice.issueDate.toISOString().slice(0, 10),
        due_date: invoice.dueDate.toISOString().slice(0, 10),
      }),
    });
    if (response.ok) {
      synced += 1;
    }
  }
  return synced;
}

/**
 * Giderleri Bexio'ya senkronize eder.
 */
export async function syncExpenses(
  accessToken: string,
  expenses: SyncableExpense[],
): Promise<number> {
  if (!isBexioConfigured()) {
    return expenses.length;
  }

  let synced = 0;
  for (const expense of expenses) {
    const response = await fetch(`${BEXIO_API_URL}/expenses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        document_nr: expense.id,
        title: expense.description,
        total: expense.amount,
        currency: expense.currency,
        date: expense.date.toISOString().slice(0, 10),
        vendor: expense.vendor,
      }),
    });
    if (response.ok) {
      synced += 1;
    }
  }
  return synced;
}

/**
 * Sağlayıcı adını doğrular ve normalize eder.
 */
export function normalizeProvider(provider: string): AccountingProvider {
  if (provider === "abacus" || provider === "banana") {
    return provider;
  }
  return "bexio";
}
