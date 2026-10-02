import type { SupportedLocale } from "@/lib/i18n";

interface LocaleFlagProps {
  locale: SupportedLocale;
  className?: string;
}

/**
 * Renders a small flag for each supported locale.
 *
 * Emoji flags are used where a standard emoji exists. The Kurdish flag has no
 * emoji representation, so it is drawn as an inline SVG (red / white / green
 * horizontal bands with the golden sun emblem).
 */
export function LocaleFlag({ locale, className = "h-4 w-6" }: LocaleFlagProps) {
  if (locale === "ku") {
    return (
      <svg
        viewBox="0 0 30 20"
        className={`${className} rounded-[2px] shadow-sm ring-1 ring-black/10`}
        role="img"
        aria-label="Kurdistan"
      >
        <rect width="30" height="20" fill="#ffffff" />
        <rect width="30" height="6.67" fill="#ed2024" />
        <rect y="13.33" width="30" height="6.67" fill="#278e43" />
        <g transform="translate(15 10)">
          <circle r="3.4" fill="#fecc00" />
          {Array.from({ length: 21 }).map((_, index) => {
            const angle = (index * 360) / 21;
            return (
              <rect
                key={index}
                x="-0.28"
                y="-5.4"
                width="0.56"
                height="1.9"
                fill="#fecc00"
                transform={`rotate(${angle})`}
              />
            );
          })}
        </g>
      </svg>
    );
  }

  const emoji: Record<Exclude<SupportedLocale, "ku">, string> = {
    "de-CH": "🇩🇪",
    "fr-CH": "🇫🇷",
    "it-CH": "🇮🇹",
    en: "🇬🇧",
    tr: "🇹🇷",
  };

  return (
    <span aria-hidden="true" className={`${className} leading-none`}>
      {emoji[locale as Exclude<SupportedLocale, "ku">]}
    </span>
  );
}
