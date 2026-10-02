import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import en from "@/locales/en.json";
import tr from "@/locales/tr.json";
import ku from "@/locales/ku.json";

export const SUPPORTED_LOCALES = [
  "de-CH",
  "fr-CH",
  "it-CH",
  "en",
  "tr",
  "ku",
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  "de-CH": "Deutsch",
  "fr-CH": "Français",
  "it-CH": "Italiano",
  en: "English",
  tr: "Türkçe",
  ku: "Kurdî",
};

/**
 * Flag emoji shown in the language switcher. Kurdish has no emoji flag, so it
 * is rendered as an inline SVG by the LocaleFlag component instead.
 */
export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  "de-CH": "🇩🇪",
  "fr-CH": "🇫🇷",
  "it-CH": "🇮🇹",
  en: "🇬🇧",
  tr: "🇹🇷",
  ku: "",
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "de-CH": { translation: de },
      "fr-CH": { translation: fr },
      "it-CH": { translation: it },
      en: { translation: en },
      tr: { translation: tr },
      ku: { translation: ku },
    },
    fallbackLng: "de-CH",
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "flinkli.locale",
      caches: ["localStorage"],
    },
  });

export default i18n;
