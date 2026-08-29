import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "IDRIVECARS — Autorskie testy samochodów i pierwsze jazdy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#0A0A0A"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px"
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: "104px",
              letterSpacing: "0.06em",
              color: "#FAF8F5",
              lineHeight: 1
            }}
          >
            IDRIVECARS
          </span>
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 400,
              fontSize: "26px",
              letterSpacing: "0.04em",
              color: "#888884",
              lineHeight: 1
            }}
          >
            Testy samochodów · Pierwsze jazdy · Własne zdjęcia
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
