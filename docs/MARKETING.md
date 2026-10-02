# SwissBill — Pazarlama ve Lansman Planı

Bu doküman, SwissBill'in ilk kullanıcılarını kazanmak için uygulanacak
pazarlama taktiklerini ve lansman adımlarını içerir.

---

## 1. Konumlandırma

**Tek cümle:** İsviçreli freelancer'lar için QR-fatura + müşteri yönetimi —
5 dakikada ilk faturanızı gönderin.

**Fark:** Rakipler (Bexio, Banana, Abacus) karmaşık ve pahalıdır.
SwissBill basit, uygun fiyatlı (29 CHF/ay) ve QR-fatura standardına
tam uyumludur.

**Hedef kitle:**
- İsviçre'deki serbest çalışanlar (yazılımcı, tasarımcı, danışman, fotoğrafçı)
- 1–5 kişilik küçük ajanslar
- Muhasebe bilgisi olmayan, hızlı fatura kesmek isteyen kişiler

---

## 2. Lead Magnet: Ücretsiz QR-Fatura Üretici

**URL:** `/qr-generator` (kayıt gerektirmez)

**Amaç:** SEO trafiği + e-posta listesi toplama + ürüne yönlendirme.

**Nasıl çalışır:**
1. Kullanıcı `/qr-generator` sayfasına gelir (organik arama veya sosyal medya)
2. Alacaklı/borçlu bilgilerini ve tutarı girer
3. "QR-Rechnung als PDF herunterladen" butonuna basar
4. PDF anında indirilir (backend: `POST /api/public/qr-generator`)
5. Sayfada "Kostenloses Konto erstellen →" CTA'sı ile kayda yönlendirilir

**Geliştirme fikirleri (v2):**
- E-posta gir → PDF e-postayla gönderilsin (liste toplama)
- "Faturayı kaydet ve hatırlatma al" → kayıt zorunlu
- Şablon galerisi (farklı sektörler için)

---

## 3. SEO Stratejisi

**Hedef anahtar kelimeler (Almanca):**
- "QR Rechnung erstellen kostenlos"
- "QR Rechnung Vorlage"
- "Rechnung schreiben Freelancer Schweiz"
- "QR IBAN Rechnung"
- "Kleinunternehmer Rechnung Schweiz"

**Hedef anahtar kelimeler (Fransızca):**
- "créer QR facture gratuit"
- "facture freelance suisse"

**İçerik planı:**
1. Blog: "QR-Rechnung erstellen: Schritt-für-Schritt Anleitung 2026"
2. Blog: "QR-IBAN vs. normale IBAN — was ist der Unterschied?"
3. Blog: "MWST für Freelancer in der Schweiz: Die 3 Sätze erklärt"
4. Landing page: `/qr-generator` (yukarıda)

**Teknik SEO:**
- `index.html`'e meta description + Open Graph etiketleri ekle
- `sitemap.xml` ve `robots.txt` oluştur
- Her dil için `hreflang` etiketleri (de-CH, fr-CH, it-CH, en)

---

## 4. Lansman Kanalları

### 4.1 Product Hunt
- **Ne zaman:** Salı–Perşembe, 00:01 PST
- **Başlık:** "SwissBill — QR invoices for Swiss freelancers"
- **Tagline:** "Create compliant Swiss QR-bills in 5 minutes. Free plan."
- **Görseller:** 3–5 ekran görüntüsü + 1 demo GIF
- **İlk yorum:** Kurucu hikâyesi (neden yaptım, kimin için)
- **Hazırlık:** 10–15 destekçiden lansman günü upvote isteyin

### 4.2 Indie Hackers
- **Post:** "I built a QR-invoice tool for Swiss freelancers — here's what I learned"
- **İçerik:** Teknik stack, ilk kullanıcı geri bildirimleri, gelir hedefleri
- **Etkileşim:** Yorumlara aktif yanıt verin

### 4.3 Reddit
- r/Switzerland, r/freelance, r/SwissPersonalFinance
- **Kural:** Doğrudan reklam yapmayın; değer katın, gerektiğinde link verin
- **Örnek:** "How do you handle QR invoices as a freelancer in Switzerland?"

### 4.4 Yerel topluluklar
- İsviçre freelancer Facebook grupları
- LinkedIn: "Freelancer Schweiz" grupları
- Yerel coworking alanları (Zürich, Cenevre, Basel) — poster/broşür

### 4.5 İçerik/podcast
- İsviçreli girişimcilik podcast'lerine konuk olma
- YouTube: "QR-Rechnung in 5 Minuten erstellen" (ekran kaydı)

---

## 5. E-posta Pazarlama

**Araç:** Resend (zaten entegre) veya Mailchimp/Brevo

**Akış:**
1. **Hoş geldin:** Ücretsiz üreticiyi kullandıktan sonra teşekkür + ipuçları
2. **Gün 2:** "Faturalarınızı otomatik hatırlatın" (özellik tanıtımı)
3. **Gün 5:** "Pro'ya geçin — ilk ay %50 indirim" (dönüşüm)
4. **Gün 10:** Başarı hikâyesi / sosyal kanıt

---

## 6. Fiyatlandırma ve Dönüşüm

| Plan | Fiyat | Hedef |
|------|-------|-------|
| Free | 0 CHF | Deneme, lead magnet |
| Pro | 29 CHF/ay | Bireysel freelancer |
| Business | 59 CHF/ay | Küçük ajanslar |

**Dönüşüm tetikleyicileri:**
- Free planda 3 müşteri / 5 fatura limiti → "Pro'ya geçin" uyarısı
- Ödeme hatırlatma özelliği → Pro'da
- Gelir raporu → Pro'da

---

## 7. Ölçüm (KPI)

| Metrik | Hedef (ilk 3 ay) |
|--------|------------------|
| `/qr-generator` ziyaret | 5.000 |
| Kayıt | 250 |
| Ücretli abone | 25 |
| MRR | ~725 CHF |
| Churn | < %5 |

**Araçlar:** Vercel Analytics, Plausible veya Umami (gizlilik dostu).

---

## 8. Lansman Kontrol Listesi

- [ ] `/qr-generator` sayfası canlı ve test edildi
- [ ] Meta etiketleri + Open Graph eklendi
- [ ] `sitemap.xml` + `robots.txt` oluşturuldu
- [ ] Product Hunt taslağı hazır
- [ ] Indie Hackers postu yazıldı
- [ ] 3 blog yazısı yayınlandı
- [ ] E-posta akışı kuruldu
- [ ] Analytics entegre edildi
- [ ] Sosyal medya hesapları açıldı
- [ ] Destek e-postası (support@) kuruldu
