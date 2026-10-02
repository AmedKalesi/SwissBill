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
    },
  },
  plugins: [],
};
