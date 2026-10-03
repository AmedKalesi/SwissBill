/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette aligned with the flinkli logo (Swiss red).
        // 600 is the exact tile colour used in Logo.tsx so the mark and the
        // UI share one red; 500/700 are the gradient stops of the logo tile.
        brand: {
          50: "#fef4f3",
          100: "#fde5e3",
          200: "#fbd0cc",
          300: "#f7aaa3",
          400: "#f27a70",
          500: "#e23b2e",
          600: "#d52b1e",
          700: "#b81f14",
          800: "#93190f",
          900: "#7a1a12",
          950: "#420a06",
        },
        // Neutral surfaces keep financial information legible and the brand distinct.
        surface: {
          50: "#f6f7f9",
          100: "#eef1f5",
          200: "#e2e6ec",
          300: "#ccd3dd",
          400: "#98a2b3",
          500: "#667085",
          600: "#475467",
          700: "#344054",
          800: "#1d2939",
          900: "#101828",
        },
        swiss: {
          red: "#d52b1e",
          dark: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      // Layered, low-opacity shadows keep the Swiss/editorial feel — depth
      // without the heavy "bootstrap card" look.
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        "card-hover":
          "0 12px 28px -8px rgba(16, 24, 40, 0.16), 0 4px 10px -4px rgba(16, 24, 40, 0.08)",
        brand: "0 10px 30px -10px rgba(213, 43, 30, 0.45)",
        "brand-lg": "0 18px 48px -14px rgba(213, 43, 30, 0.5)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "brand-sheen":
          "linear-gradient(100deg, #e23b2e 0%, #d52b1e 45%, #b81f14 100%)",
        "grid-faint":
          "linear-gradient(to right, rgba(16,24,40,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,24,40,0.045) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      transitionTimingFunction: {
        // Single easing curve reused across the site for a consistent feel.
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-up": "fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
