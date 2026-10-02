interface LogoMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
}

/**
 * flinkli brand mark — a professional, scalable SVG logo.
 *
 * Design concept: "flink" (swift/agile) + Swiss invoicing.
 *  - A rounded tile with the site's Swiss-red gradient (brand-500 → 600 → 700),
 *    so the mark and the UI share one single brand colour.
 *  - A stylised invoice sheet whose top-right corner is "peeled" into a
 *    forward-leaning fold, signalling speed and momentum.
 *  - A crisp Swiss cross on the sheet anchors the Swiss identity without
 *    relying on the protected "Swiss" wording.
 *
 * The mark reads cleanly from 16px (favicon) up to large hero sizes and
 * stays crisp at any scale because it is pure vector geometry.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="flinkli"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fl-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e23b2e" />
          <stop offset="55%" stopColor="#d52b1e" />
          <stop offset="100%" stopColor="#b81f14" />
        </linearGradient>
        <linearGradient id="fl-sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fdeceb" />
        </linearGradient>
      </defs>

      {/* Rounded tile */}
      <rect width="64" height="64" rx="16" fill="url(#fl-tile)" />

      {/* Soft highlight for depth */}
      <path
        d="M0 16C0 7.163 7.163 0 16 0h32c8.837 0 16 7.163 16 16v6C52 12 34 8 18 14 8 18 2 26 0 34v-18Z"
        fill="#ffffff"
        opacity="0.14"
      />

      {/* Invoice sheet with a peeled, forward-leaning corner */}
      <path
        d="M17 13.5A2.5 2.5 0 0 1 19.5 11h18.2L47 20.3V48.5A2.5 2.5 0 0 1 44.5 51h-25A2.5 2.5 0 0 1 17 48.5v-35Z"
        fill="url(#fl-sheet)"
      />

      {/* Folded corner */}
      <path d="M37.7 11 47 20.3h-6.8A2.5 2.5 0 0 1 37.7 17.8V11Z" fill="#f3b6b0" />

      {/* Text lines on the sheet */}
      <rect x="22.5" y="24" width="15" height="2.4" rx="1.2" fill="#d8a7a2" />
      <rect x="22.5" y="29.4" width="10" height="2.4" rx="1.2" fill="#e6c3bf" />

      {/* Swiss cross accent (identity anchor) */}
      <path
        d="M31.4 36.2h2.2v2.6h2.6v2.2h-2.6v2.6h-2.2v-2.6h-2.6v-2.2h2.6v-2.6Z"
        fill="#d52b1e"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Show the "flinkli" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wordmark text colour class (defaults to dark slate). */
  wordmarkClassName?: string;
  className?: string;
}

/**
 * Full lockup: brand mark + optional wordmark. Use this in headers, the
 * sidebar, the landing page and auth screens for a consistent identity.
 */
export function Logo({
  size = 32,
  withWordmark = true,
  wordmarkClassName = "text-slate-900",
  className,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className={`text-lg font-semibold tracking-tight ${wordmarkClassName}`}>
          flinkli
        </span>
      )}
    </span>
  );
}
