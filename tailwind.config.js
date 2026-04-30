/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Intencity design tokens
        primary: "#000000", // app background (unified base black)
        secondary: "#15151B", // main cards/sections
        surface: "#1B1B23", // elevated cards/modals
        "surface-hover": "#23232D",

        // Text
        "text-primary": "#F4F4F5",
        "text-secondary": "#A1A1AA",
        "text-muted": "#71717A",

        // Accents
        accent: {
          violet: "#7A3CFF",
          "violet-active": "#9C6BFF",
          cyan: "#22D3EE",
        },

        // States
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.07)",
      },
      boxShadow: {
        // subtle lift for dark surfaces
        "surface-sm": "0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)",
        "glow-violet": "0 0 0 1px rgba(122,60,255,0.38), 0 12px 30px rgba(122,60,255,0.24)",
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.22), 0 10px 30px rgba(34,211,238,0.12)",
      },
      borderRadius: {
        // slightly more premium defaults (keeps existing rounded-xl etc. valid)
        xl: "0.9rem",
        "2xl": "1.15rem",
      },
    },
  },
  plugins: [],
};
