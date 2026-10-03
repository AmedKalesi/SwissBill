import { useTranslation } from "react-i18next";

/**
 * Trust bar — a continuously scrolling strip of concrete, verifiable product
 * facts (Swiss QR-bill standard, VAT rates, multi-language, data residency).
 *
 * Deliberately avoids invented customer logos or fake review counts: every item
 * is a real capability of the product, so the strip builds credibility without
 * fabricating social proof.
 *
 * The track is duplicated and translated by -50% so the marquee loops seamlessly.
 * `aria-hidden` on the duplicate keeps screen readers from reading it twice.
 */
const ITEMS = [
  { key: "qrStandard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM21 14v7h-7" },
  { key: "vat", icon: "M4 3v18h17M9 16v-5M14 16V7M19 16v-3" },
  { key: "languages", icon: "M3 12h18M12 3a9 9 0 100 18 9 9 0 000-18M12 3c5 5 5 13 0 18-5-5-5-13 0-18" },
  { key: "swissHosted", icon: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" },
  { key: "pdf", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" },
  { key: "reminders", icon: "M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18" },
] as const;

function TrustItem({ itemKey, icon }: { itemKey: string; icon: string }) {
  const { t } = useTranslation();
  return (
    <li className="flex shrink-0 items-center gap-2.5 px-6 text-sm font-medium text-surface-500 dark:text-surface-400">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
      <span className="whitespace-nowrap">{t(`landing.trust.${itemKey}`)}</span>
    </li>
  );
}

export function TrustBar() {
  return (
    <div className="marquee-mask relative overflow-hidden border-y border-surface-200 bg-white py-5 dark:border-surface-800 dark:bg-surface-800/60">
      <ul className="animate-marquee flex w-max items-center">
        {ITEMS.map((item) => (
          <TrustItem key={item.key} itemKey={item.key} icon={item.icon} />
        ))}
        {/* Duplicate track for a seamless loop — hidden from assistive tech. */}
        <div aria-hidden="true" className="flex items-center">
          {ITEMS.map((item) => (
            <TrustItem key={`dup-${item.key}`} itemKey={item.key} icon={item.icon} />
          ))}
        </div>
      </ul>
    </div>
  );
}
