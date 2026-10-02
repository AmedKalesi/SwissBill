# SwissBill — Yeni Özellikler

Bu belge, SwissBill'e eklenen iş değeri yüksek özellikleri açıklar: **çoklu şirket**,
**plan limitleri**, **e-imza**, **TWINT ödeme** ve **muhasebe entegrasyonu (Bexio)**.

---

## 1. Çoklu Şirket

Tek bir kullanıcı hesabı altında birden fazla şirket yönetilebilir.

- **Veri modeli:** [`Company`](apps/api/prisma/schema.prisma) modeli `userId` ile
  kullanıcıya bağlıdır; tüm kaynaklar (müşteri, fatura, gider, proje vb.) `companyId`
  taşır.
- **Aktif şirket:** Web tarafında [`CompanyContext`](apps/web/src/features/company/CompanyContext.tsx)
  aktif şirketi yönetir ve `localStorage`'da saklar.
- **Değiştirici:** [`CompanySwitcher`](apps/web/src/components/CompanySwitcher.tsx)
  üst çubukta hızlı geçiş sağlar.
- **Filtreleme:** Liste rotaları `?companyId=` parametresini destekler; şirket
  değiştiğinde ilgili React Query anahtarları geçersiz kılınır.

---

## 2. Plan Limitleri

Free / Pro / Business planları için müşteri ve aylık fatura limitleri uygulanır.

- **Tanım:** Limitler [`packages/shared`](packages/shared/src/constants.ts) içinde
  plan başına tanımlıdır.
- **Zorunlu kılma (enforcement):** API, müşteri oluşturma ve fatura oluşturma
  sırasında limiti kontrol eder; aşımda anlamlı bir hata döndürür.
- **Kullanım göstergesi:** [`UsageMeter`](apps/web/src/components/UsageMeter.tsx)
  bileşeni [`BillingPage`](apps/web/src/pages/BillingPage.tsx) üzerinde kullanımı
  gösterir.
- **Yükseltme çağrısı:** Limit dolduğunda kullanıcıya plan yükseltme çağrısı gösterilir.

---

## 3. E-imza

Teklif ve faturalar için dijital imza alanı.

- **Bileşen:** [`SignaturePad`](apps/web/src/components/SignaturePad.tsx) canvas
  üzerinde imza alır ve PNG data URL üretir.
- **Saklama:** İmza verisi (`signatureData`) ve imzalayan bilgisi (`signedByName`,
  `signedAt`) fatura/teklif kaydında saklanır.
- **PDF:** İmza görseli PDFKit ile üretilen PDF'e gömülür.

---

## 4. TWINT Ödeme

İsviçre mobil ödeme yöntemi TWINT ile fatura ödemesi.

- **Servis:** [`twint.service.ts`](apps/api/src/services/twint.service.ts) ödeme
  linki ve QR data URL üretir.
- **API uçları:**
  - `POST /invoices/:id/twint` — TWINT linki/QR üretir.
  - `POST /invoices/:id/twint/paid` — ödemeyi "ödendi" olarak işaretler.
  - `DELETE /invoices/:id/twint` — TWINT ödemesini kaldırır.
- **UI:** [`InvoiceDetailPage`](apps/web/src/pages/InvoiceDetailPage.tsx) üzerinde
  TWINT kartı; müşteri portalında ([`PortalPage`](apps/web/src/pages/PortalPage.tsx))
  ödeme sütunu ve modal.
- **Ortam değişkenleri:** `TWINT_BASE_URL`, `TWINT_MERCHANT_ID`, `APP_BASE_URL`.
  Tanımlı değilse demo modda çalışır.

---

## 5. Muhasebe Entegrasyonu (Bexio)

SwissBill faturalarını ve giderlerini Bexio muhasebe yazılımına senkronize eder.

### Veri modeli

[`AccountingIntegration`](apps/api/prisma/schema.prisma) modeli; `companyId` +
`provider` üzerinde benzersizdir. Alanlar: `accessToken`, `refreshToken`,
`expiresAt`, `externalTenantId`, `status`, `lastSyncAt`, `syncError`,
`syncedInvoices`, `syncedExpenses`.

### Servis katmanı

[`bexio.service.ts`](apps/api/src/services/bexio.service.ts):

| Fonksiyon | Açıklama |
| --- | --- |
| `isBexioConfigured()` | Kimlik bilgileri tanımlı mı |
| `buildAuthorizationUrl(state, redirectUri?)` | OAuth yetkilendirme URL'i üretir |
| `exchangeCodeForToken(code, redirectUri?)` | Kodu token'a çevirir |
| `refreshAccessToken(refreshToken)` | Erişim token'ını yeniler |
| `syncInvoices(accessToken, invoices)` | Faturaları senkronize eder |
| `syncExpenses(accessToken, expenses)` | Giderleri senkronize eder |
| `normalizeProvider(provider)` | Sağlayıcı adını doğrular/normalize eder |

### API uçları

[`accounting.routes.ts`](apps/api/src/routes/accounting.routes.ts) — tümü kimlik
doğrulama gerektirir:

| Metot | Yol | Açıklama |
| --- | --- | --- |
| `GET` | `/accounting?companyId=` | Şirketin entegrasyonlarını listeler |
| `POST` | `/accounting/connect` | OAuth akışını başlatır, yetkilendirme URL'i döndürür |
| `GET` | `/accounting/callback` | OAuth dönüşü; kodu token'a çevirir |
| `DELETE` | `/accounting/:companyId/:provider` | Bağlantıyı kaldırır |
| `POST` | `/accounting/sync` | Fatura/gider senkronizasyonu |

### UI

[`AccountingIntegrationCard`](apps/web/src/components/AccountingIntegrationCard.tsx)
bileşeni [`CompanyPage`](apps/web/src/pages/CompanyPage.tsx) üzerinde gösterilir:
sağlayıcı başına bağla/kaldır, "şimdi senkronize et" ve durum göstergesi
(bağlı / bağlı değil / hata), son senkronizasyon tarihi ve sayıları.

### Ortam değişkenleri

`BEXIO_CLIENT_ID`, `BEXIO_CLIENT_SECRET`, `APP_BASE_URL`. Kimlik bilgileri tanımlı
değilse entegrasyon demo modda çalışır (bağlantı ve senkronizasyon simüle edilir).

---

## Çeviriler

Tüm yeni özellikler 6 dilde desteklenir: **DE, FR, IT, EN, TR, KU**. Çeviri
anahtarları `apps/web/src/locales/*.json` içinde `signature`, `twint` ve
`accounting` blokları altında tanımlıdır.

---

## Testler

```bash
# API testleri (Vitest)
cd apps/api && pnpm test
```

İlgili test dosyaları:

- [`bexio.service.test.ts`](apps/api/src/services/bexio.service.test.ts) — muhasebe
  entegrasyonu servisi (demo modu, OAuth URL, senkronizasyon).
- [`qrbill.service.test.ts`](apps/api/src/services/qrbill.service.test.ts)
- [`invoice.service.test.ts`](apps/api/src/services/invoice.service.test.ts)
- [`recurring.service.test.ts`](apps/api/src/services/recurring.service.test.ts)
