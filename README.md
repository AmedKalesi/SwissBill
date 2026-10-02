# SwissBill 🇨🇭

**QR-fatura + müşteri yönetim aracı — İsviçreli serbest çalışanlar için.**

SwissBill, İsviçre pazarına ve **Swiss Payment Standards 2026**'ya uygun QR-faturalar
oluşturmanızı, müşterilerinizi yönetmenizi, ödemeleri takip etmenizi ve tekrarlayan
faturaları otomatikleştirmenizi sağlar. Muhasebe bilgisi gerekmez.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Dizin Yapısı](#dizin-yapısı)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Komutlar](#komutlar)
- [Veritabanı](#veritabanı)
- [API Rotaları](#api-rotaları)
- [Test](#test)
- [Dağıtım](#dağıtım)
- [İsviçre KDV Oranları](#i̇sviçre-kdv-oranları)
- [QR-Fatura Standartları](#qr-fatura-standartları)
- [Diller](#diller)
- [Dokümantasyon](#dokümantasyon)
- [Lisans](#lisans)

---

## Özellikler

| Özellik | Açıklama |
| --- | --- |
| 🧾 **QR-fatura oluşturma** | QRR / SCOR / NON referans tipleri, SPC/0200/1 formatı |
| 🇨🇭 **Swiss QR standartları** | Swiss Payment Standards 2026 uyumlu, otomatik doğrulama |
| 💳 **Stripe abonelikleri** | Free / Pro / Business planları (CHF) |
| 🏢 **Çoklu şirket** | Tek hesapta birden fazla şirket, hızlı şirket değiştirici |
| 📈 **Plan limitleri** | Müşteri ve aylık fatura limitleri, kullanım göstergesi ve yükseltme çağrısı |
| ✍️ **E-imza** | Teklif/fatura için dijital imza alanı, PDF'e gömülü imza görseli |
| 📱 **TWINT ödeme** | TWINT ödeme linki + QR üretimi, ödeme durumu takibi |
| 🧮 **Muhasebe entegrasyonu** | Bexio OAuth bağlantısı, fatura/gider senkronizasyonu |
| 👥 **Müşteri & şirket yönetimi** | Müşteri kaydı, tek tıkla yeniden kullanım |
| 📄 **PDF fatura üretimi** | PDFKit ile sunucu tarafı PDF, QR kod gömülü |
| 📧 **E-posta & hatırlatmalar** | Resend ile otomatik gönderim ve ödeme hatırlatmaları |
| 🔁 **Tekrarlayan faturalar** | Cron ile otomatik oluşturma (aylık/yıllık vb.) |
| 📊 **Raporlar & giderler** | Ciro, KDV, tahsilat özetleri; gider takibi |
| 🔐 **Kimlik doğrulama** | JWT tabanlı kayıt/giriş, bcrypt şifre hash'leme |
| 🌍 **6 dil** | DE, FR, IT, EN, TR, KU |
| 🚀 **Deployment hazır** | Vercel (web) + Railway (API) + Supabase (DB) |

---

## Teknoloji Yığını

### Backend (`apps/api`)

- **Node.js ≥ 20** + **Fastify 5** + **TypeScript** (ESM)
- **Prisma ORM** + **PostgreSQL** (Supabase)
- **Zod** ile ortam değişkeni ve istek doğrulama
- **@fastify/jwt** + **bcryptjs** ile kimlik doğrulama
- **Stripe** (abonelikler), **Resend** (e-posta), **PDFKit** (PDF), **qrcode** (QR)
- **node-cron** ile zamanlanmış görevler
- **Vitest** ile test

### Frontend (`apps/web`)

- **React 18** + **Vite 6** + **TypeScript**
- **TanStack React Query** (veri çekme/önbellek)
- **react-router-dom 7** (yönlendirme)
- **react-i18next** (çoklu dil)
- **react-hook-form** + **Zod** (formlar)
- **Tailwind CSS 3.4** (özel `brand` ve `surface` paletleri)
- Node yerleşik test çalıştırıcısı (`node --test`)

### Paylaşılan (`packages/shared`)

- Ortak tipler, Zod şemaları, sabitler ve fatura hesaplama mantığı
- Hem API hem web tarafından `workspace:*` olarak tüketilir

---

## Mimari

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────┐
│   apps/web      │  ───────────────────────▶ │    apps/api      │
│  React + Vite   │  ◀─────────────────────── │  Fastify + TS    │
│  (Vercel)       │                           │  (Railway)       │
└─────────────────┘                           └────────┬─────────┘
        │                                              │
        │  @swissbill/shared (tipler, şemalar)         │ Prisma
        └──────────────────┬───────────────────────────┘
                           ▼
                  ┌──────────────────┐
                  │  PostgreSQL      │
                  │  (Supabase)      │
                  └──────────────────┘

Harici servisler: Stripe (ödeme) · Resend (e-posta)
```

- **Monorepo**: pnpm workspaces ile üç paket (`apps/api`, `apps/web`, `packages/shared`).
- **API**: Fastify eklentileri (`auth`, `cors`, `multipart`) + modüler rota kaydı
  ([`registerRoutes()`](apps/api/src/routes/index.ts:19)).
- **Servis katmanı**: İş mantığı [`apps/api/src/services`](apps/api/src/services) altında
  (fatura, QR-fatura, PDF, e-posta, hatırlatma, tekrarlayan, Stripe, zamanlayıcı).
- **Web**: Sayfa bazlı yönlendirme + `features/` altında form ve veri mantığı,
  `components/ui/` altında yeniden kullanılabilir bileşenler.
- **Paylaşılan mantık**: Fatura hesaplamaları ve şemalar tek yerde tutulur, iki taraf da
  aynı doğrulamayı kullanır.

---

## Dizin Yapısı

```
swissbill/
├── apps/
│   ├── api/                     # Fastify backend
│   │   ├── prisma/              # Şema + migration'lar
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── config/          # env doğrulama (Zod)
│   │   │   ├── db/              # Prisma client
│   │   │   ├── plugins/         # Fastify eklentileri (auth)
│   │   │   ├── routes/          # HTTP rotaları
│   │   │   ├── services/        # İş mantığı
│   │   │   └── server.ts        # Giriş noktası
│   │   ├── Dockerfile
│   │   └── railway.json
│   └── web/                     # React frontend
│       ├── public/
│       ├── src/
│       │   ├── components/      # Ortak bileşenler (+ ui/)
│       │   ├── features/        # auth, invoices, customers, ...
│       │   ├── lib/             # api, format, invoice-tools
│       │   ├── locales/         # tr, de, fr, it, en, ku
│       │   └── pages/           # Sayfa bileşenleri
│       ├── tests/               # Node test dosyaları
│       └── vercel.json
├── packages/
│   └── shared/                  # Ortak tipler, şemalar, hesaplamalar
│       └── src/
│           ├── constants.ts
│           ├── invoice-calc.ts
│           ├── schemas.ts
│           └── types.ts
├── docs/                        # Deployment, marketing, launch kit
├── .env.example                 # Ortam değişkeni şablonu
├── package.json                 # Kök script'ler
└── pnpm-workspace.yaml
```

---

## Kurulum

### Gereksinimler

- **Node.js ≥ 20**
- **pnpm 12.8.1** (`corepack enable` ile etkinleştirilebilir)
- **PostgreSQL** veritabanı (yerel veya Supabase)

### Adımlar

```bash
# 1. Bağımlılıkları kur
pnpm install

# 2. Ortam değişkenlerini hazırla
cp .env.example .env
# .env dosyasını doldurun (bkz. Ortam Değişkenleri)

# 3. Prisma client üret ve migration'ları uygula
pnpm db:generate
pnpm db:migrate

# 4. Geliştirme sunucularını başlat (web + api birlikte)
pnpm dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:4000>

> **Not:** `pnpm` PATH'te yoksa `corepack enable pnpm` komutunu çalıştırın veya
> `npx pnpm@12.8.1 <komut>` kullanın.

---

## Ortam Değişkenleri

Tüm değişkenler [`apps/api/src/config/env.ts`](apps/api/src/config/env.ts:7) içinde Zod ile
doğrulanır; geçersiz bir değer sunucunun başlamasını engeller. Şablon için
[`.env.example`](.env.example) dosyasına bakın.

### Zorunlu

| Değişken | Açıklama |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantı dizesi (Prisma için, `?schema=public` ile) |
| `JWT_SECRET` | JWT imzalama sırrı — **en az 16 karakter** |

### Opsiyonel (varsayılanları vardır)

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `API_PORT` | `4000` | API portu |
| `API_HOST` | `0.0.0.0` | API host |
| `CORS_ORIGIN` | `http://localhost:5173` | İzin verilen web kaynağı |
| `DIRECT_URL` | — | Migration'lar için doğrudan DB bağlantısı (Supabase pooler için) |
| `APP_URL` | `http://localhost:5173` | Uygulama genel URL'i (e-posta linkleri) |
| `EMAIL_FROM` | `SwissBill <fatura@swissbill.ch>` | Gönderen e-posta adresi |

### Stripe (abonelikler)

| Değişken | Açıklama |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe gizli anahtarı |
| `STRIPE_WEBHOOK_SECRET` | Webhook imza sırrı |
| `STRIPE_PRICE_PRO` | Pro plan fiyat ID'si |
| `STRIPE_PRICE_BUSINESS` | Business plan fiyat ID'si |

### E-posta (Resend)

| Değişken | Açıklama |
| --- | --- |
| `RESEND_API_KEY` | Resend API anahtarı |

### TWINT ödeme

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `TWINT_BASE_URL` | `https://pay.twint.ch` | TWINT ödeme taban URL'i |
| `TWINT_MERCHANT_ID` | — | TWINT satıcı kimliği |
| `APP_BASE_URL` | `https://swissbill.app` | Ödeme linklerinde kullanılan genel taban URL |

> Kimlik bilgileri tanımlı değilse TWINT servisi demo modda çalışır (yerel link/QR üretir).

### Muhasebe entegrasyonu (Bexio)

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `BEXIO_CLIENT_ID` | — | Bexio OAuth istemci kimliği |
| `BEXIO_CLIENT_SECRET` | — | Bexio OAuth istemci sırrı |
| `APP_BASE_URL` | `https://swissbill.app` | OAuth dönüş adresinde kullanılan genel taban URL |

> `BEXIO_CLIENT_ID`/`BEXIO_CLIENT_SECRET` tanımlı değilse entegrasyon demo modda
> çalışır; bağlantı ve senkronizasyon simüle edilir (geliştirme/test için).

### Zamanlanmış görevler (Cron)

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `CRON_SECRET` | — | Harici cron çağrılarını koruyan sır (`X-Cron-Secret` başlığı, ≥ 16 karakter) |
| `CRON_ENABLED` | `true` | Sunucu içi zamanlayıcıyı etkinleştir |
| `CRON_RECURRING_SCHEDULE` | `0 6 * * *` | Tekrarlayan fatura kontrolü (her gün 06:00) |
| `CRON_REMINDER_SCHEDULE` | `0 7 * * *` | Ödeme hatırlatma kontrolü (her gün 07:00) |

### Frontend (`apps/web/.env`)

| Değişken | Açıklama |
| --- | --- |
| `VITE_API_URL` | API taban URL'i (örn. `http://localhost:4000`) |

> Çok instance'lı dağıtımlarda çift çalışmayı önlemek için `CRON_ENABLED=false` yapıp
> harici bir cron servisi kullanın.

---

## Komutlar

### Kök (tüm workspace)

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | Web + API'yi paralel başlatır |
| `pnpm dev:web` | Sadece web |
| `pnpm dev:api` | Sadece API |
| `pnpm build` | Paylaşılan paket + tüm uygulamaları derler |
| `pnpm typecheck` | Tüm paketlerde tip kontrolü |
| `pnpm lint` | Tüm paketlerde lint |
| `pnpm db:generate` | Prisma client üretir |
| `pnpm db:migrate` | Migration'ları uygular (dev) |
| `pnpm db:studio` | Prisma Studio'yu açar |

### API (`apps/api`)

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | `tsx watch` ile geliştirme |
| `pnpm build` | TypeScript derlemesi → `dist/` |
| `pnpm start` | Derlenmiş sunucuyu çalıştırır |
| `pnpm test` | Vitest testleri |
| `pnpm db:deploy` | Production migration'ları |
| `pnpm db:seed` | Örnek veri yükler |

### Web (`apps/web`)

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | Vite geliştirme sunucusu |
| `pnpm build` | Tip kontrolü + production derlemesi |
| `pnpm preview` | Derlenmiş çıktıyı önizler |
| `pnpm test` | Node test çalıştırıcısı |

---

## Veritabanı

Prisma şeması [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) içindedir.
Migration'lar `apps/api/prisma/migrations/` altında tutulur.

```bash
# Şema değişikliğinden sonra yeni migration oluştur
pnpm db:migrate

# Production'da migration uygula (migration dev değil)
pnpm --filter api db:deploy

# Görsel veritabanı tarayıcısı
pnpm db:studio
```

---

## API Rotaları

Tüm rotalar [`registerRoutes()`](apps/api/src/routes/index.ts:19) içinde kaydedilir.

| Prefix | Dosya | Açıklama |
| --- | --- | --- |
| `/public` | [`public.routes.ts`](apps/api/src/routes/public.routes.ts) | Herkese açık uçlar (QR doğrulama vb.) |
| `/public/portal` | [`portal.routes.ts`](apps/api/src/routes/portal.routes.ts) | Müşteri portalı (herkese açık) |
| `/cron` | [`cron.routes.ts`](apps/api/src/routes/cron.routes.ts) | Zamanlanmış görev tetikleyicileri |
| `/auth` | [`auth.routes.ts`](apps/api/src/routes/auth.routes.ts) | Kayıt / giriş |
| `/companies` | [`company.routes.ts`](apps/api/src/routes/company.routes.ts) | Şirket profili |
| `/customers` | [`customer.routes.ts`](apps/api/src/routes/customer.routes.ts) | Müşteri CRUD |
| `/invoices` | [`invoice.routes.ts`](apps/api/src/routes/invoice.routes.ts) | Fatura CRUD + PDF + QR |
| `/projects` | [`project.routes.ts`](apps/api/src/routes/project.routes.ts) | Proje yönetimi |
| `/recurring-invoices` | [`recurring.routes.ts`](apps/api/src/routes/recurring.routes.ts) | Tekrarlayan faturalar |
| `/quotes` | [`quote.routes.ts`](apps/api/src/routes/quote.routes.ts) | Teklifler |
| `/expenses` | [`expense.routes.ts`](apps/api/src/routes/expense.routes.ts) | Giderler |
| `/portals` | [`portal.routes.ts`](apps/api/src/routes/portal.routes.ts) | Müşteri portalı yönetimi |
| `/accounting` | [`accounting.routes.ts`](apps/api/src/routes/accounting.routes.ts) | Muhasebe entegrasyonu (Bexio OAuth, senkronizasyon) |
| `/billing` | [`billing.routes.ts`](apps/api/src/routes/billing.routes.ts) | Stripe abonelikleri |
| `/reports` | [`report.routes.ts`](apps/api/src/routes/report.routes.ts) | Raporlar |

---

## Test

```bash
# API testleri (Vitest)
cd apps/api && pnpm test

# Web testleri (Node yerleşik test çalıştırıcısı)
cd apps/web && pnpm test

# Tüm paketlerde tip kontrolü
pnpm typecheck
```

- **API**: [`invoice.service.test.ts`](apps/api/src/services/invoice.service.test.ts),
  [`qrbill.service.test.ts`](apps/api/src/services/qrbill.service.test.ts),
  [`recurring.service.test.ts`](apps/api/src/services/recurring.service.test.ts),
  [`bexio.service.test.ts`](apps/api/src/services/bexio.service.test.ts)
- **Web**: `apps/web/tests/*.test.mjs` — yardımcı fonksiyonlar ve API istemcisi

---

## Dağıtım

| Katman | Platform | Yapılandırma |
| --- | --- | --- |
| Web | **Vercel** | [`apps/web/vercel.json`](apps/web/vercel.json) |
| API | **Railway** | [`apps/api/Dockerfile`](apps/api/Dockerfile), [`apps/api/railway.json`](apps/api/railway.json) |
| Veritabanı | **Supabase** | PostgreSQL bağlantı dizesi |

Adım adım kılavuz: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

### Production kontrol listesi

1. `NODE_ENV=production` ayarlayın.
2. Güçlü bir `JWT_SECRET` ve `CRON_SECRET` üretin (`openssl rand -hex 32`).
3. `CORS_ORIGIN` ve `APP_URL` değerlerini gerçek alan adına ayarlayın.
4. `pnpm --filter api db:deploy` ile migration'ları uygulayın.
5. Stripe webhook'unu production URL'ine yönlendirin.
6. Çok instance'lıysanız `CRON_ENABLED=false` yapıp harici cron kullanın.

---

## İsviçre KDV Oranları

SwissBill, İsviçre KDV oranlarını yerleşik olarak destekler:

| Oran | Değer | Kullanım |
| --- | --- | --- |
| Standart | **8.1%** | Çoğu mal ve hizmet |
| İndirimli | **2.6%** | Gıda, ilaç, kitaplar vb. |
| Özel | **3.8%** | Konaklama hizmetleri |

Oranlar [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts) içinde tanımlıdır
ve fatura hesaplamaları [`invoice-calc.ts`](packages/shared/src/invoice-calc.ts) tarafından
yapılır.

---

## QR-Fatura Standartları

SwissBill, **Swiss Payment Standards 2026**'ya uygun QR-faturalar üretir:

- **Referans tipleri**: QRR (QR referansı), SCOR (alacaklı referansı), NON (referanssız)
- **Format**: SPC / 0200 / 1 (Swiss QR Code veri yapısı)
- **Doğrulama**: IBAN, referans ve tutar otomatik doğrulanır
- **PDF**: QR kod faturaya gömülü olarak üretilir

İlgili servisler:
[`qrbill.service.ts`](apps/api/src/services/qrbill.service.ts),
[`pdf.service.ts`](apps/api/src/services/pdf.service.ts)

---

## Diller

Arayüz 6 dili destekler; çeviriler `apps/web/src/locales/` altındadır:

| Kod | Dil |
| --- | --- |
| `de` | Almanca |
| `fr` | Fransızca |
| `it` | İtalyanca |
| `en` | İngilizce |
| `tr` | Türkçe |
| `ku` | Kürtçe |

Dil, tarayıcı tercihine göre otomatik algılanır (`i18next-browser-languagedetector`).

---

## Dokümantasyon

| Dosya | İçerik |
| --- | --- |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Yeni özellikler: çoklu şirket, plan limitleri, e-imza, TWINT, muhasebe entegrasyonu |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Dağıtım adımları (Vercel, Railway, Supabase) |
| [`docs/STRIPE-RESEND-SETUP.md`](docs/STRIPE-RESEND-SETUP.md) | Stripe ve Resend kurulumu |
| [`docs/LAUNCH-KIT.md`](docs/LAUNCH-KIT.md) | Lansman kontrol listesi |
| [`docs/MARKETING.md`](docs/MARKETING.md) | Pazarlama metinleri ve strateji |

---

## Lisans

Özel mülkiyet (private). Tüm hakları saklıdır.
