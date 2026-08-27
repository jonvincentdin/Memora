import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Every token below reads from a CSS variable (defined in
        // app/globals.css for :root and .dark) instead of a fixed hex, so
        // toggling the `dark` class on <html> re-themes the whole app
        // without touching component classes like `bg-surface`/`text-ink`.
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
          dark: "rgb(var(--color-accent-dark) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        dark: {
          bg: "#12141F",
          surface: "#1A1D2B",
          line: "#2A2E42",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 31, 59, 0.04), 0 1px 12px rgba(27, 31, 59, 0.04)",
        "card-hover": "0 4px 8px rgba(27, 31, 59, 0.06), 0 8px 24px rgba(27, 31, 59, 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "highlight-sweep": {
          "0%": { backgroundSize: "0% 40%" },
          "100%": { backgroundSize: "100% 40%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "highlight-sweep": "highlight-sweep 0.6s ease-out 0.2s both",
      },
    },
  },
  plugins: [],
};

export default config;
