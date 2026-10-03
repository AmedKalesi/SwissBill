import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProductMockup } from "@/components/ProductMockup";
import { LiveInvoicePreview } from "@/components/LiveInvoicePreview";

const FEATURES = [
  { key: "qr", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM21 14v7h-7" },
  { key: "customers", icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8M22 21v-2a4 4 0 00-3-3.87M16 3a4 4 0 010 8" },
  { key: "reminders", icon: "M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18" },
  { key: "languages", icon: "M3 12h18M12 3a9 9 0 100 18 9 9 0 000-18M12 3c5 5 5 13 0 18-5-5-5-13 0-18" },
  { key: "vat", icon: "M4 3v18h17M9 16v-5M14 16V7M19 16v-3" },
  { key: "pdf", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" },
] as const;

const PLANS = [
  { key: "free", price: "0", highlight: false },
  { key: "pro", price: "29", highlight: true },
  { key: "business", price: "59", highlight: false },
] as const;

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-surface-200 bg-surface-50/90 backdrop-blur dark:border-surface-800 dark:bg-surface-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Link to="/" className="flex items-center">
            <Logo size={32} />
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              to="/qr-generator"
              className="hidden text-sm font-medium text-surface-600 hover:text-surface-900 sm:block dark:text-surface-300 dark:hover:text-white"
            >
              {t("landing.navGenerator")}
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
            >
              {t("landing.navLogin")}
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {t("landing.navRegister")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Soft brand glow behind the hero so the red logo feels native */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 max-w-3xl rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-950/40"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-28">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
            {t("landing.badge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-surface-900 sm:text-6xl sm:leading-[1.08] dark:text-white">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-600 dark:text-surface-300">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="w-full rounded-lg bg-brand-600 px-6 py-3 text-center text-base font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 sm:w-auto"
            >
              {t("landing.ctaPrimary")}
            </Link>
            <Link
              to="/qr-generator"
              className="w-full rounded-lg border border-surface-300 bg-white px-6 py-3 text-center text-base font-semibold text-surface-700 transition hover:bg-surface-100 sm:w-auto dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700"
            >
              {t("landing.ctaSecondary")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">{t("landing.ctaHint")}</p>
        </div>

        {/* Ürün mockup'ı — hero'ya "gerçek ürün" hissi katar */}
        <ProductMockup />
      </section>

      {/* Features */}
      <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-surface-600 dark:text-surface-300">
            {t("landing.featuresSubtitle")}
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className="rounded-2xl border border-surface-200 bg-surface-50/50 p-7 transition duration-200 hover:border-brand-200 hover:bg-white hover:shadow-lg hover:shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/40 dark:hover:border-brand-800 dark:hover:bg-surface-900"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.icon} /></svg>
                </span>
                <h3 className="mt-3 text-lg font-semibold text-surface-900 dark:text-white">
                  {t(`landing.features.${f.key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                  {t(`landing.features.${f.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Canlı QR-fatura önizlemesi — interaktif */}
      <section className="border-t border-surface-200 bg-surface-50 py-20 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900">
              {t("landing.preview.badge")}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-surface-900 dark:text-white">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-3 text-surface-600 dark:text-surface-300">
              {t("landing.preview.subtitle")}
            </p>
          </div>
          <div className="mt-12">
            <LiveInvoicePreview />
          </div>
        </div>
      </section>

      {/* Erken aşama — dürüst kurucu notu (uydurma referans/rakam yok) */}
      <section className="border-t border-surface-200 bg-white py-20 dark:border-surface-800 dark:bg-surface-800">
        <div className="mx-auto max-w-3xl px-4">
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
              className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
            >
              {t("landing.early.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-surface-900 dark:text-white">
            {t("landing.pricingTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-surface-600 dark:text-surface-300">
            {t("landing.pricingSubtitle")}
          </p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`flex flex-col rounded-2xl border bg-white p-8 dark:bg-surface-800 ${
                  p.highlight
                    ? "border-brand-600 shadow-xl shadow-brand-600/10 ring-1 ring-brand-600"
                    : "border-surface-200 dark:border-surface-700"
                }`}
              >
                {p.highlight && (
                  <span className="mb-3 self-start inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    {t("landing.popular")}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                  {t(`landing.plans.${p.key}.name`)}
                </h3>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-surface-900 dark:text-white">
                    {p.price}
                  </span>
                  <span className="text-surface-500 dark:text-surface-400"> CHF{t("landing.perMonth")}</span>
                </p>
                <ul className="mb-8 mt-6 flex-1 space-y-3 text-sm text-surface-600 dark:text-surface-300">
                  {[1, 2, 3, 4].map((i) => {
                    const line = t(`landing.plans.${p.key}.f${i}`, {
                      defaultValue: "",
                    });
                    if (!line) return null;
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-brand-600">✓</span>
                        <span>{line}</span>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  to="/register"
                  className={`mt-auto block rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                    p.highlight
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-surface-300 text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:hover:bg-surface-700"
                  }`}
                >
                  {t("landing.choosePlan")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface-900 py-20 dark:bg-surface-950 dark:ring-1 dark:ring-inset dark:ring-surface-800">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white">
            {t("landing.finalTitle")}
          </h2>
          <p className="mt-3 text-surface-300">{t("landing.finalSubtitle")}</p>
          <Link
            to="/register"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50"
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
            <Link to="/qr-generator" className="hover:text-surface-900 dark:hover:text-white">
              {t("landing.navGenerator")}
            </Link>
            <Link to="/login" className="hover:text-surface-900 dark:hover:text-white">
              {t("landing.navLogin")}
            </Link>
            <Link to="/register" className="hover:text-surface-900 dark:hover:text-white">
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
