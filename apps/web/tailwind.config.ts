import type { Config } from "tailwindcss";

/**
 * NEMESIS design tokens.
 *
 * Palette: near-black canvas with a resolved (white) foreground. Two
 * "fragment" colors — red and blue — represent the chromatic-aberration
 * split used throughout the brand to signal "chaos resolving into order".
 * A single resolve green is reserved for approval/success states only.
 *
 * Fonts use system stacks by default (mono for data/labels, sans for body)
 * so the project builds with zero network dependency. Swap in self-hosted
 * IBM Plex Mono / Inter via next/font when you have network access — see
 * README.md.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "nm-bg": "#0a0a0a",
        "nm-surface": "#121212",
        "nm-border": "#232323",
        "nm-fg": "#f0f0f0",
        "nm-muted": "#7a7a7a",
        "nm-fragment-red": "#e2524f",
        "nm-fragment-blue": "#4a8fd9",
        "nm-resolve": "#97c459",
      },
      fontFamily: {
        mono: [
          "'IBM Plex Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        sans: [
          "'Inter'",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
