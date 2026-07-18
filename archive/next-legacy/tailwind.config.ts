import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FAFAF8",
        ink: "#171717",
        muted: "#737373",
        accent: "#B91C1C",
        "accent-soft": "#FEF2F2"
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "ui-sans-serif", "sans-serif"]
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "72ch",
            lineHeight: 1.75,
            "--tw-prose-body": "rgb(38 38 38)",
            "--tw-prose-headings": "rgb(23 23 23)",
            "p + p": { marginTop: "1.25em" },
            h2: { marginTop: "1.75em", marginBottom: "0.75em", fontWeight: "600" },
            h3: { marginTop: "1.5em", marginBottom: "0.5em", fontWeight: "600" }
          }
        },
        article: {
          css: {
            maxWidth: "65ch",
            fontSize: "1.0625rem",
            lineHeight: 1.85,
            "--tw-prose-body": "rgb(38 38 38)",
            "--tw-prose-headings": "rgb(23 23 23)",
            p: { marginTop: "0", marginBottom: "1.25em" },
            "p:first-of-type": {
              fontSize: "1.2em",
              lineHeight: 1.65,
              color: "rgb(64 64 64)",
              fontWeight: "400"
            },
            "p + p": { marginTop: "1.25em" },
            h2: {
              marginTop: "2.25em",
              marginBottom: "0.6em",
              fontSize: "1.4em",
              fontWeight: "400",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              fontFamily: "var(--font-display), ui-serif, Georgia, serif"
            },
            h3: {
              marginTop: "1.75em",
              marginBottom: "0.4em",
              fontSize: "1.15em",
              fontWeight: "600",
              lineHeight: 1.4
            },
            "ul, ol": { marginTop: "0.75em", marginBottom: "1.25em", paddingLeft: "1.5em" },
            li: { marginTop: "0.35em", marginBottom: "0.35em" },
            a: { fontWeight: "500", color: "rgb(23 23 23)" },
            strong: { fontWeight: "600" },
            figure: { marginTop: "2.5em", marginBottom: "2.5em" },
            img: { borderRadius: "0.5rem", marginTop: "1.5em", marginBottom: "1.5em" }
          }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
