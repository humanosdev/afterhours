/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Intencity — premium live-city surfaces (charcoal / navy, not pure black)
        /** Same token as `:root --ah-bg-primary` / `--ah-bg-primary-rgb` (globals.css). */
        primary: "rgb(var(--ah-bg-primary-rgb) / <alpha-value>)",
        secondary: "#12151B",
        surface: "#1B2028",
        "surface-hover": "#232A35",

        // Light canvas tokens (map chrome / future light shell)
        canvas: "#F7F8FA",
        "canvas-muted": "#EFF2F7",
        "canvas-deep": "#E7ECF5",

        // Text — slightly warm neutrals
        "text-primary": "#F5F3EF",
        "text-secondary": "#A8B0BF",
        "text-muted": "#737D8F",

        // Primary interactive — electric blue (icon-aligned; class names keep `accent-violet*` for churn)
        accent: {
          violet: "#3B66FF",
          "violet-active": "#5B82FF",
          /** Mid tone between primary pair */
          indigo: "#4774FF",
          /** Muted brand blue (rare emphasis — not purple) */
          brand: "#4A6EC4",
          mint: "#5EEAD4",
          "mint-soft": "#6EE7B7",
          warm: "#FF7A59",
          "warm-soft": "#FF915A",
          cyan: "#5EEAD4",
        },

        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.065)",
      },
      boxShadow: {
        "surface-sm": "0 1px 0 rgba(255,255,255,0.04), 0 8px 28px rgba(0,0,0,0.32)",
        "glow-violet":
          "0 0 0 1px rgba(59, 102, 255, 0.32), 0 12px 32px rgba(59, 102, 255, 0.16)",
        "glow-cyan":
          "0 0 0 1px rgba(94, 234, 212, 0.2), 0 10px 28px rgba(94, 234, 212, 0.1)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
      },
    },
  },
  plugins: [],
};
