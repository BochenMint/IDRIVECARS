import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF8F5",
        ink: "#000000",
        stone: "#C4BAB0",
        "stone-muted": "#9A9288",
        subtle: "#6E6A64",
        line: "#E5E0DA",
        accent: "#000000"
      },
      fontFamily: {
        display: ["var(--font-display)", "Helvetica Neue", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      fontSize: {
        "display-xl": ["clamp(3rem,8vw,7rem)", { lineHeight: "0.88", letterSpacing: "0.07em" }],
        "display-lg": ["clamp(2rem,5vw,4rem)", { lineHeight: "0.92", letterSpacing: "0.06em" }],
        "display-md": ["clamp(1.5rem,3vw,2.25rem)", { lineHeight: "0.95", letterSpacing: "0.05em" }],
        intro: ["1.3125rem", { lineHeight: "1.75", letterSpacing: "-0.01em" }],
        body: ["1.0625rem", { lineHeight: "1.8", letterSpacing: "0" }]
      },
      letterSpacing: {
        "nav-mono": "0.24em",
        "display-wide": "0.08em"
      },
      lineHeight: {
        body: "1.8",
        "body-relaxed": "1.9",
        lead: "1.75"
      },
      spacing: {
        gutter: "clamp(1.25rem,4vw,3.5rem)",
        section: "clamp(6rem,14vw,10rem)"
      },
      transitionDuration: {
        editorial: "450ms"
      },
      typography: {
        article: {
          css: {
            maxWidth: "65ch",
            fontSize: "1.0625rem",
            lineHeight: 1.85,
            fontWeight: "300",
            color: "#1a1a1a",
            "--tw-prose-headings": "#000000",
            "--tw-prose-body": "#1a1a1a",
            "--tw-prose-links": "#000000",
            "--tw-prose-hr": "#E5E0DA",
            p: { marginTop: "0", marginBottom: "1.65em" },
            "p:first-of-type": {
              fontSize: "1.3125rem",
              lineHeight: 1.75,
              fontWeight: "300",
              letterSpacing: "-0.01em",
              color: "#3d3a36"
            },
            h2: {
              marginTop: "3em",
              marginBottom: "0.6em",
              fontSize: "1.625rem",
              lineHeight: 1.05,
              fontWeight: "400",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-display), sans-serif",
              textTransform: "uppercase"
            },
            h3: {
              marginTop: "2.5em",
              marginBottom: "0.4em",
              fontSize: "1.125rem",
              lineHeight: 1.35,
              fontWeight: "400",
              letterSpacing: "0.02em"
            },
            img: { borderRadius: "0", marginTop: "2.5em", marginBottom: "2.5em" },
            a: {
              fontWeight: "400",
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "5px"
            },
            "a:hover": { color: "#3d3a36" }
          }
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
