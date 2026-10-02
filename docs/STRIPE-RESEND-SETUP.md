# Stripe & Resend Canlı Kurulum Rehberi

Bu rehber, SwissBill'in ödeme (Stripe) ve e-posta (Resend) entegrasyonlarını
**canlı moda** almak için gereken tüm adımları içerir.

> **Durum: ✅ TAMAMLANDI (test modu)**
> Stripe ve Resend entegrasyonları yapılandırıldı ve doğrulandı.
> Aşağıdaki değerler [`apps/api/.env`](../apps/api/.env) dosyasına girilmiştir.
> Canlıya (gerçek para) geçmek için **Bölüm 5**'i uygulayın.

---

## Bölüm 1 — Stripe (CHF Abonelik)

### 1.1 Hesap ve ürün oluşturma

1. https://dashboard.stripe.com/register adresinden hesap aç (İsviçre şirketi/şahıs için CHF desteklenir).
2. Sol menüden **Test mode** anahtarının **açık** olduğundan emin ol (önce test edeceğiz).
3. **Products → Add product** ile iki ürün oluştur:

| Ürün adı | Fiyat | Periyot | Product ID | Price ID |
|----------|-------|---------|------------|----------|
| SwissBill Pro | 29.00 CHF | Aylık (recurring) | `prod_VMckrWYHjvobCd` | `price_1ULtVHI0Qd0O6hwEDtgSeQF8` |
| SwissBill Business | 59.00 CHF | Aylık (recurring) | `prod_VMckNVSmmFdoTh` | `price_1ULtVMI0Qd0O6hwEOATLwaZK` |

4. Her ürünü kaydettikten sonra açılan sayfada **Pricing** bölümündeki
   `price_...` ile başlayan **Price ID**'yi kopyala.

> ✅ **Bu adım tamamlandı.** Yukarıdaki Price ID'ler Stripe API ile doğrulandı
> (29 CHF ve 59 CHF, aylık, `chf` para birimi).

### 1.2 API anahtarları

**Developers → API keys** sayfasından:
- **Secret key** (`sk_test_...` veya canlıda `sk_live_...`) → `STRIPE_SECRET_KEY`

> ⚠️ **Önemli:** `mk_...` / `rk_...` ile başlayan değerler **restricted key**'dir.
> `mk_1UL3PGI0Qd0O6hwEY6lDROrc` gibi kısa değerler ise anahtarın **ID**'sidir,
> anahtarın kendisi değildir. Gerçek değer **Reveal** butonuna basınca görünür
> ve `sk_...` ile başlar (~107 karakter).

> ✅ **Bu adım tamamlandı.** `sk_test_...` anahtarı Stripe API'ye karşı doğrulandı
> (`GET /v1/prices` → HTTP 200).

### 1.3 Webhook kurulumu

**Developers → Webhooks → Add endpoint**:

- **Endpoint URL (yerel test için):** `https://<ngrok-adresin>/api/billing/webhook`
- **Endpoint URL (üretim):** `https://<railway-api-domain>/api/billing/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Kaydettikten sonra **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

> ⚠️ Webhook URL'i **`/api`** önekini içermelidir (rotalar `/api/billing` altında).

### 1.4 Yerel webhook testi

Stripe CLI kurulu (v1.53.0, Homebrew ile):

```bash
brew install stripe/stripe-cli/stripe
```

API çalışırken (`pnpm --filter api dev`) ayrı bir terminalde:

```bash
# .env'deki anahtarı kullanarak dinle
KEY=$(grep '^STRIPE_SECRET_KEY=' apps/api/.env | cut -d'"' -f2)
stripe listen \
  --api-key "$KEY" \
  --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted \
  --forward-to localhost:4000/api/billing/webhook
```

Terminal çıktısındaki `whsec_...` değerini `.env`'deki
`STRIPE_WEBHOOK_SECRET` alanına yaz.

> ✅ **Bu adım tamamlandı.** Yerel webhook secret'ı alındı ve `.env`'e girildi.
> Webhook endpoint'i imzasız isteklerde doğru şekilde **HTTP 400** döndürüyor.

Test kartı: `4242 4242 4242 4242`, herhangi bir gelecek tarih, herhangi bir CVC.

### 1.5 Canlıya geçiş

1. Stripe panelinde **Test mode**'u kapat.
2. **Activate account** ile işletme bilgilerini (IBAN, adres, vergi no) tamamla.
3. Canlı `sk_live_...` anahtarını ve canlı Price ID'leri kopyala.
4. Canlı webhook endpoint'ini yeniden oluştur (test webhook'ları canlıda çalışmaz).

---

## Bölüm 2 — Resend (E-posta)

### 2.1 Hesap ve API anahtarı

1. https://resend.com/signup adresinden kayıt ol.
2. **API Keys → Create API Key** → izin: **Full access** (önerilir) veya **Sending access**.
3. `re_...` ile başlayan anahtarı kopyala → `RESEND_API_KEY`

> ℹ️ **Not:** "Sending access" (kısıtlı) anahtar, `GET /domains` gibi uçlarda
> `401 restricted_api_key` döndürür — bu **normaldir**. E-posta gönderimi
> (`POST /emails`) bu anahtarla sorunsuz çalışır. SwissBill yalnızca gönderim
> yaptığı için bu yeterlidir.

> ✅ **Bu adım tamamlandı.** Test e-postası gönderildi (`POST /emails` → HTTP 200,
> message ID alındı).

### 2.2 Domain doğrulama (canlı gönderim için zorunlu)

`fatura@swissbill.ch` gibi kendi adresinden göndermek için:

1. **Domains → Add Domain** → `swissbill.ch` ekle.
2. Resend'in verdiği DNS kayıtlarını domain sağlayıcında (Namecheap, Cloudflare vb.) ekle:
   - **SPF** (TXT)
   - **DKIM** (TXT/CNAME)
   - **DMARC** (TXT, önerilir)
3. **Verify** butonuna bas; yeşil onay alana kadar bekle (5 dk – 24 saat).

> Domain doğrulanana kadar test için `onboarding@resend.dev` adresini
> `EMAIL_FROM` olarak kullanabilirsin (yalnızca kendi e-postana gönderir).

### 2.3 Gönderen adresi

Test aşamasında:

```env
EMAIL_FROM="SwissBill <onboarding@resend.dev>"
```

Domain doğrulandıktan sonra:

```env
EMAIL_FROM="SwissBill <fatura@swissbill.ch>"
```

---

## Bölüm 3 — .env Değerleri (mevcut durum)

[`apps/api/.env`](../apps/api/.env) dosyasındaki doğrulanmış değerler:

```env
# --- Stripe (CHF abonelik) ---
STRIPE_SECRET_KEY="sk_test_..."                 # ✅ doğrulandı (HTTP 200)
STRIPE_WEBHOOK_SECRET="whsec_..."               # ✅ Stripe CLI'dan alındı
STRIPE_PRICE_PRO="price_1ULtVHI0Qd0O6hwEDtgSeQF8"      # 29.00 CHF/ay
STRIPE_PRICE_BUSINESS="price_1ULtVMI0Qd0O6hwEOATLwaZK" # 59.00 CHF/ay

# --- E-posta (Resend) ---
RESEND_API_KEY="re_..."                         # ✅ doğrulandı (gönderim başarılı)
EMAIL_FROM="SwissBill <onboarding@resend.dev>"  # domain doğrulanınca değiştir
```

> 🔐 **Güvenlik:** Bu anahtarlar sohbete yapıştırıldığı için **sızmış** kabul
> edilmelidir. Canlıya geçmeden önce Stripe ve Resend panelinden **Roll / Revoke**
> edip yeni anahtar üretin. `sk_test_` anahtarı test anahtarıdır (gerçek para riski yoktur).

---

## Bölüm 4 — Doğrulama

### 4.1 Stripe yapılandırma kontrolü

```bash
curl -s http://localhost:4000/api/billing/plan \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq
```

Yanıtta `"stripeConfigured": true` görünmeli.

> ℹ️ Bu uç nokta kimlik doğrulama ve veritabanı gerektirir. Veritabanı
> bağlanmadan önce Stripe yapılandırması doğrudan API ile doğrulanabilir:
> ```bash
> KEY=$(grep '^STRIPE_SECRET_KEY=' apps/api/.env | cut -d'"' -f2)
> curl -s https://api.stripe.com/v1/prices?limit=1 -u "$KEY:" | jq '.data[0].unit_amount'
> ```

### 4.2 Checkout akışı

1. Uygulamada giriş yap → **Abonelik** sayfası (`/billing`)
2. **Pro** planını seç → Stripe Checkout'a yönlendirilmeli
3. Test kartı `4242 4242 4242 4242` ile öde
4. `/billing?success=1` sayfasına dönmeli
5. Veritabanında `Subscription.plan = "pro"` olmalı

### 4.3 E-posta gönderimi

1. Bir fatura oluştur → **E-posta ile gönder** butonuna bas
2. Resend panelinde **Emails** sekmesinde gönderim görünmeli
3. Alıcı gelen kutusunda PDF ekli e-posta olmalı

---

## Bölüm 5 — Üretim Ortamı (Railway)

Railway'de **Variables** sekmesine aynı değerleri gir. Ek olarak:

```env
NODE_ENV=production
APP_URL="https://swissbill.ch"
CORS_ORIGIN="https://swissbill.ch"
```

> ⚠️ `APP_URL` Stripe checkout dönüş adreslerinde kullanılır — doğru olmalı.

Canlıya geçiş adımları:

1. Stripe'ta **Test mode**'u kapat → canlı `sk_live_...` ve canlı Price ID'leri al.
2. Canlı webhook endpoint'ini oluştur → canlı `whsec_...` al.
3. Resend'de `swissbill.ch` domainini doğrula → `EMAIL_FROM`'u güncelle.
4. Railway'de tüm değerleri güncelle ve yeniden deploy et.

---

## Kontrol Listesi

- [x] Stripe hesabı açıldı
- [x] Pro (29 CHF) ve Business (59 CHF) ürünleri oluşturuldu
- [x] `STRIPE_SECRET_KEY` alındı ve doğrulandı
- [x] Webhook endpoint oluşturuldu (`/api/billing/webhook`)
- [x] `STRIPE_WEBHOOK_SECRET` alındı (Stripe CLI)
- [x] `STRIPE_PRICE_PRO` ve `STRIPE_PRICE_BUSINESS` alındı
- [x] Resend hesabı açıldı
- [x] `RESEND_API_KEY` alındı ve doğrulandı
- [x] Test e-posta gönderimi başarılı
- [ ] Domain doğrulandı (SPF/DKIM/DMARC)
- [ ] `EMAIL_FROM` üretim adresine ayarlandı
- [ ] Test checkout başarılı (veritabanı gerekli)
- [ ] Anahtarlar Roll/Revoke edildi (sızıntı önlemi)
- [ ] Canlı moda geçildi (sk_live, canlı webhook)
