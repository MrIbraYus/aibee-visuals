import { ImageResponse } from "next/og";

export const alt = "Aibee Visuals — We Build Brands That Make an Impact";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card (WhatsApp, LinkedIn, X…). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          color: "#fff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50% 50% 4px 50%", background: "#115DEF" }} />
          <div style={{ fontSize: 34, fontWeight: 800 }}>Aibee</div>
          <div style={{ fontSize: 34, marginLeft: -6 }}>Visuals</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>We Build Brands</div>
          <div style={{ fontSize: 96, fontStyle: "italic", letterSpacing: -3, lineHeight: 1.05, color: "#b7f500" }}>
            That Make an Impact.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            ["Brand Identity", "#e90059", "#fff"],
            ["Logo Design", "#b7f500", "#080808"],
            ["UI/UX & Web", "#1261f5", "#fff"],
            ["Social Media", "#FFD600", "#080808"],
          ].map(([label, bg, fg]) => (
            <div key={label} style={{ background: bg, color: fg, borderRadius: 999, padding: "12px 26px", fontSize: 24 }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
