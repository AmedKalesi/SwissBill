import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n";
import { LocaleFlag } from "@/components/LocaleFlag";

interface LanguageSwitcherProps {
  /** "light" for white backgrounds, "dark" for coloured backgrounds. */
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ variant = "light" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = (SUPPORTED_LOCALES.find((locale) =>
    i18n.resolvedLanguage?.startsWith(locale.slice(0, 2)),
  ) ?? "de-CH") as SupportedLocale;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (locale: SupportedLocale) => {
    void i18n.changeLanguage(locale);
    setOpen(false);
  };

  const triggerClasses =
    variant === "dark"
      ? "border-white/30 bg-white dark:bg-surface-800/10 text-white hover:bg-white dark:bg-surface-800/20"
      : "border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition ${triggerClasses}`}
      >
        <LocaleFlag locale={current} className="h-4 w-6" />
        <span className="hidden sm:inline">{LOCALE_LABELS[current]}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 py-1 shadow-lg"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <li key={locale}>
              <button
                type="button"
                role="option"
                aria-selected={locale === current}
                onClick={() => handleSelect(locale)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                  locale === current
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                <LocaleFlag locale={locale} className="h-4 w-6" />
                {LOCALE_LABELS[locale]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
