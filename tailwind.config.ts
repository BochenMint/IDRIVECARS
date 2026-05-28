import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFFFF",
        ink: "#0A0A0A",
        subtle: "#6B6B6B",
        line: "#E5E5E5",
        accent: "#CC0000"
      },
      fontFamily: {
        display: ["var(--font-display)", "Helvetica Neue", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      fontSize: {
        "display-xl": ["clamp(3rem,8vw,7rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2rem,5vw,4rem)", { lineHeight: "1", letterSpacing: "-0.02em" }]
      },
      spacing: {
        gutter: "clamp(1rem,4vw,3rem)"
      },
      typography: {
        article: {
          css: {
            maxWidth: "42rem",
            fontSize: "1.125rem",
            lineHeight: 1.8,
            color: "#1a1a1a",
            "--tw-prose-headings": "#0A0A0A",
            "--tw-prose-body": "#1a1a1a",
            "--tw-prose-links": "#0A0A0A",
            p: { marginTop: "0", marginBottom: "1.5em" },
            "p:first-of-type": {
              fontSize: "1.25rem",
              lineHeight: 1.65,
              color: "#333"
            },
            h2: {
              marginTop: "2.5em",
              marginBottom: "0.5em",
              fontSize: "1.75rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-display), sans-serif",
              textTransform: "uppercase"
            },
            h3: {
              marginTop: "2em",
              fontSize: "1.2rem",
              fontWeight: "600"
            },
            img: { borderRadius: "0", marginTop: "2em", marginBottom: "2em" },
            a: { textDecoration: "underline", textUnderlineOffset: "3px" }
          }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
