import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#000000",
          borderRadius: "12px"
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: "22px",
            letterSpacing: "-0.02em",
            color: "#FFFFFF",
            lineHeight: 1
          }}
        >
          iDC
        </span>
      </div>
    ),
    { ...size }
  );
}
