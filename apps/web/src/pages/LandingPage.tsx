import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProductMockup } from "@/components/ProductMockup";
import { LiveInvoicePreview } from "@/components/LiveInvoicePreview";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TrustBar } from "@/components/TrustBar";
import { PricingSection } from "@/components/PricingSection";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ScrollProgress } from "@/components/ScrollProgress";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { SecuritySection } from "@/components/SecuritySection";
import { TestimonialsSection } from "@/components/TestimonialsSection";

const FEATURES = [
  { key: "qr", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM21 14v7h-7" },
  { key: "customers", icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8M22 21v-2a4 4 0 00-3-3.87M16 3a4 4 0 010 8" },
  { key: "reminders", icon: "M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18" },
  { key: "languages", icon: "M3 12h18M12 3a9 9 0 100 18 9 9 0 000-18M12 3c5 5 5 13 0 18-5-5-5-13 0-18" },
  { key: "vat", icon: "M4 3v18h17M9 16v-5M14 16V7M19 16v-3" },
  { key: "pdf", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" },
] as const;

/** Hero stats — all real product capabilities, no invented traction numbers. */
const STATS = [
  { key: "languages", value: 6, suffix: "" },
  { key: "vatRates", value: 4, suffix: "" },
  { key: "setup", value: 2, suffix: " min" },
] as const;

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Reading progress indicator */}
      <ScrollProgress />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-surface-200 bg-surface-50/80 backdrop-blur-md dark:border-surface-800 dark:bg-surface-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center transition hover:opacity-80">
            <Logo size={32} />
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              to="/qr-generator"
              className="hidden text-sm font-medium text-surface-600 transition hover:text-surface-900 sm:block dark:text-surface-300 dark:hover:text-white"
            >
              {t("landing.navGenerator")}
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-surface-600 transition hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
            >
              {t("landing.navLogin")}
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"
            >
              {t("landing.navRegister")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Faint grid + animated brand orbs give the hero depth without noise. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-60 dark:opacity-[0.07]"
        />
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-900/40"
        />
        <div
          aria-hidden="true"
          className="animate-float-slower pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-950/50"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-28">
          <span className="animate-rise-in inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-brand-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            {t("landing.badge")}
          </span>

          <h1 className="animate-rise-in mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-surface-900 sm:text-6xl sm:leading-[1.08] dark:text-white">
            {t("landing.heroTitle")}{" "}
            <span className="text-gradient-brand">{t("landing.heroTitleAccent")}</span>
          </h1>

          <p className="animate-rise-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-600 dark:text-surface-300">
            {t("landing.heroSubtitle")}
          </p>

          <div className="animate-rise-in mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="group w-full rounded-lg bg-brand-600 px-6 py-3 text-center text-base font-semibold text-white shadow-brand transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-brand-lg sm:w-auto"
            >
              {t("landing.ctaPrimary")}
              <span className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              to="/qr-generator"
              className="w-full rounded-lg border border-surface-300 bg-white px-6 py-3 text-center text-base font-semibold text-surface-700 transition hover:-translate-y-0.5 hover:bg-surface-100 sm:w-auto dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700"
            >
              {t("landing.ctaSecondary")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">{t("landing.ctaHint")}</p>

          {/* Hero stats */}
          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t border-surface-200 pt-8 dark:border-surface-800">
            {STATS.map((s) => (
              <div key={s.key} className="text-center">
                <dt className="order-2 mt-1 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                  {t(`landing.stats.${s.key}`)}
                </dt>
                <dd className="order-1 text-3xl font-bold tabular-nums text-surface-900 dark:text-white">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Ürün mockup'ı — hero'ya "gerçek ürün" hissi katar */}
        <ProductMockup />
      </section>

      {/* Trust bar — gerçek ürün yetenekleri, uydurma referans yok */}
      <TrustBar />

      {/* Features */}
      <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
        <div className="mx-auto max-w-6xl px-4">
          <RevealOnScroll className="text-center">
            <h2 className="text-3xl font-bold text-surface-900 dark:text-white">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-surface-600 dark:text-surface-300">
              {t("landing.featuresSubtitle")}
            </p>
          </RevealOnScroll>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={f.key} delay={i * 70} className="flex">
                <div className="card-lift group w-full rounded-2xl border border-surface-200 bg-surface-50/50 p-7 shadow-card hover:border-brand-200 hover:bg-white hover:shadow-card-hover dark:border-surface-700 dark:bg-surface-900/40 dark:hover:border-brand-800 dark:hover:bg-surface-900">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-transform duration-300 ease-smooth group-hover:scale-110 group-hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.icon} /></svg>
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-surface-900 dark:text-white">
                    {t(`landing.features.${f.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                    {t(`landing.features.${f.key}.desc`)}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* İş akışı — flinkli mevcut araçlarınıza nasıl oturuyor */}
      <IntegrationsSection />

      {/* Canlı QR-fatura önizlemesi — interaktif */}
      <section className="border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4">
          <RevealOnScroll className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
              {t("landing.preview.badge")}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-surface-900 dark:text-white">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-3 text-surface-600 dark:text-surface-300">
              {t("landing.preview.subtitle")}
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={120} className="mt-12">
            <LiveInvoicePreview />
          </RevealOnScroll>
        </div>
      </section>

      {/* Erken aşama — dürüst kurucu notu (uydurma referans/rakam yok) */}
      <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
        <div className="mx-auto max-w-3xl px-4">
          <RevealOnScroll>
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-8 sm:p-10 dark:border-brand-900 dark:bg-brand-950/30">
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
                {t("landing.early.badge")}
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl dark:text-white">
                {t("landing.early.title")}
              </h2>
              <p className="mt-3 text-surface-600 dark:text-surface-300">{t("landing.early.body")}</p>
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  SB
                </span>
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">
                    {t("landing.early.founderName")}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {t("landing.early.founderRole")}
                  </p>
                  <p className="mt-2 text-sm italic text-surface-600 dark:text-surface-300">
                    “{t("landing.early.founderNote")}”
                  </p>
                </div>
              </div>
              <Link
                to="/register"
                className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-brand transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-brand-lg"
              >
                {t("landing.early.cta")}
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Karşılaştırma — flinkli vs. Excel vs. muhasebeci */}
      <ComparisonSection />

      {/* Güvenlik & veri konumu — İsviçre'de barındırma */}
      <SecuritySection />

      {/* Erken kullanıcı sesleri — uydurma yorum yok */}
      <TestimonialsSection />

      {/* Pricing — aylık/yıllık geçişli interaktif bölüm */}
      <PricingSection />

      {/* FAQ — akordeon */}
      <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
        <div className="mx-auto max-w-6xl px-4">
          <RevealOnScroll className="text-center">
            <h2 className="text-3xl font-bold text-surface-900 dark:text-white">
              {t("landing.faqTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-surface-600 dark:text-surface-300">
              {t("landing.faqSubtitle")}
            </p>
          </RevealOnScroll>
          <FaqAccordion />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-surface-900 py-20 dark:bg-surface-950 dark:ring-1 dark:ring-inset dark:ring-surface-800">
        <div
          aria-hidden="true"
          className="animate-float-slow pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white">
            {t("landing.finalTitle")}
          </h2>
          <p className="mt-3 text-surface-300">{t("landing.finalSubtitle")}</p>
          <Link
            to="/register"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            {t("landing.ctaPrimary")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 py-8 dark:border-surface-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-surface-500 sm:flex-row dark:text-surface-400">
          <span>© {new Date().getFullYear()} flinkli</span>
          <div className="flex gap-4">
            <Link to="/qr-generator" className="transition hover:text-surface-900 dark:hover:text-white">
              {t("landing.navGenerator")}
            </Link>
            <Link to="/login" className="transition hover:text-surface-900 dark:hover:text-white">
              {t("landing.navLogin")}
            </Link>
            <Link to="/register" className="transition hover:text-surface-900 dark:hover:text-white">
              {t("landing.navRegister")}
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl flex-col items-center gap-2 border-t border-surface-200 px-4 pt-6 text-center text-xs text-surface-400 dark:border-surface-800 dark:text-surface-500">
          <a
            href="https://www.atelierlago.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 font-medium text-surface-500 transition hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400"
          >
            <span className="font-semibold tracking-wide">Atelier Lago</span>
            <span className="h-3 w-px bg-surface-300 dark:bg-surface-600" aria-hidden="true" />
            <span>Lugano · Schweiz</span>
          </a>
          <p className="max-w-xl leading-relaxed">{t("landing.craftedBy")}</p>
        </div>
      </footer>
    </div>
  );
}
