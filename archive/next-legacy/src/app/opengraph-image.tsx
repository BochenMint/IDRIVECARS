import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "72px",
          color: "#ffffff"
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#a3a3a3"
          }}
        >
          Testy samochodów · Galerie
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 116,
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
              lineHeight: 1
            }}
          >
            IDRIVECARS
          </div>
          <div style={{ display: "flex", fontSize: 36, color: "#d4d4d4", maxWidth: 920 }}>
            Autorskie testy, pierwsze jazdy i duże fotografie — Marcin Bochenek.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 28,
            color: "#a3a3a3"
          }}
        >
          <span>idrivecars.pl</span>
          <span style={{ color: "#ffffff" }}>Bez krzyku. Z własnymi zdjęciami.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
