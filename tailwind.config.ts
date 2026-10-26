import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17232b",
        volt: { DEFAULT: "#b86a00", soft: "#fbefd9", bright: "#f2a93b" },
        ok: "#2f7d4f",
        warn: "#a35b00",
        risk: "#b3362c",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
