# SwissBill — Dağıtım Rehberi (Vercel + Railway + Supabase)

Bu rehber, SwissBill uygulamasını üretime (production) almak için adım adım
talimatları içerir.

## Mimari

| Bileşen | Platform | Notlar |
| --- | --- | --- |
| Frontend (React + Vite) | **Vercel** | Statik SPA, `/api/*` isteklerini Railway'e proxy'ler |
| Backend (Fastify API) | **Railway** | Docker ile derlenir, Prisma migration'ları otomatik uygulanır |
| Veritabanı (PostgreSQL) | **Supabase** | Bağlantı havuzu (pooler) kullanılır |
| E-posta | **Resend** | Fatura ve hatırlatma gönderimi |
| Ödeme | **Stripe** | CHF abonelikler |

---

## 1. Supabase (Veritabanı)

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun (bölge: `eu-central-1` — Frankfurt, İsviçre'ye en yakın).
2. **Project Settings → Database → Connection string** bölümünden iki bağlantı alın:
   - **Connection pooling** (port `6543`, `?pgbouncer=true`) → `DATABASE_URL`
   - **Direct connection** (port `5432`) → `DIRECT_URL` (migration'lar için)
3. Veritabanı şifresini güvenli bir yerde saklayın.

```
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

---

## 2. Railway (Backend API)

1. [railway.app](https://railway.app) üzerinde **New Project → Deploy from GitHub repo** seçin.
2. Depoyu bağlayın. Railway kök dizindeki [`apps/api/railway.json`](../apps/api/railway.json) dosyasını otomatik algılar.
3. **Variables** sekmesinde aşağıdaki ortam değişkenlerini ekleyin:

```
NODE_ENV=production
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGIN=https://swissbill.vercel.app
DATABASE_URL=<Supabase pooler URL>
DIRECT_URL=<Supabase direct URL>
JWT_SECRET=<en az 32 karakter rastgele dize>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
RESEND_API_KEY=re_...
EMAIL_FROM="SwissBill <fatura@swissbill.ch>"
APP_URL=https://swissbill.vercel.app
```

4. **Settings → Networking → Generate Domain** ile bir genel alan adı oluşturun (ör. `swissbill-api.up.railway.app`).
5. Dağıtım tamamlandığında `https://<domain>/health` adresinin `{"status":"ok"}` döndürdüğünü doğrulayın.

> **Not:** Dockerfile, başlangıçta `pnpm db:deploy` ile Prisma migration'larını otomatik uygular.

---

## 3. Vercel (Frontend)

1. [vercel.com](https://vercel.com) üzerinde **Add New → Project** ile depoyu içe aktarın.
2. **Root Directory** olarak `swissbill` (monorepo kökü) seçin. Vercel [`apps/web/vercel.json`](../apps/web/vercel.json) dosyasını kullanır.
3. **Environment Variables** bölümünde:

```
VITE_API_URL=/api
```

> `/api` göreli yol kullanılır; Vercel `vercel.json` içindeki `rewrites` kuralı istekleri Railway API'sine yönlendirir. Railway alan adınız farklıysa `apps/web/vercel.json` içindeki `destination` değerini güncelleyin.

4. **Deploy** edin. Dağıtım sonrası `https://<proje>.vercel.app` adresini test edin.

---

## 4. Stripe Webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<railway-domain>/api/billing/webhook`
3. Dinlenecek olaylar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Oluşturulan **Signing secret**'i (`whsec_...`) Railway'de `STRIPE_WEBHOOK_SECRET` olarak ayarlayın.

---

## 5. Resend (E-posta)

1. [resend.com](https://resend.com) üzerinde alan adınızı doğrulayın (SPF/DKIM kayıtları).
2. API anahtarı oluşturun ve Railway'de `RESEND_API_KEY` olarak ayarlayın.
3. `EMAIL_FROM` değerini doğrulanmış alan adınızla güncelleyin.

---

## 6. Dağıtım Sonrası Kontrol Listesi

- [ ] `GET /health` → `{"status":"ok"}`
- [ ] Kayıt ve giriş akışı çalışıyor
- [ ] Şirket profili kaydedilebiliyor (IBAN doğrulaması)
- [ ] Fatura oluşturulup PDF indirilebiliyor (QR-fatura görünür)
- [ ] Fatura e-posta ile gönderilebiliyor (Resend)
- [ ] Ödeme hatırlatması gönderilebiliyor
- [ ] Gelir raporu ekranı veri gösteriyor
- [ ] Stripe abonelik yükseltmesi çalışıyor
- [ ] CORS: Frontend alan adı `CORS_ORIGIN` içinde tanımlı

---

## 7. Yerel Geliştirme

```bash
# Bağımlılıkları kur
pnpm install

# Ortam değişkenlerini hazırla
cp .env.example .env
# .env dosyasını doldurun

# Prisma istemcisini üret ve migration'ları uygula
pnpm db:generate
pnpm db:migrate

# Geliştirme sunucularını başlat (web + api)
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- Sağlık kontrolü: http://localhost:4000/health
