import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Safeway Couriers — Medical Courier Services in Columbus, Ohio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #061525 0%, #0b2238 55%, #0f4c81 100%)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.16,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -110,
            top: -110,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(55,166,255,.55), rgba(55,166,255,0))",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 72px", width: "100%", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 62, lineHeight: 1, fontWeight: 800, letterSpacing: "-3px" }}>Safeway</div>
              <div style={{ fontSize: 28, letterSpacing: "8px", color: "#49a9ff", fontWeight: 700 }}>COURIERS</div>
            </div>
            <div style={{ width: 2, height: 84, background: "rgba(255,255,255,.25)", marginLeft: 14 }} />
            <div style={{ fontSize: 18, lineHeight: 1.45, color: "#c8d9e8", letterSpacing: "2px" }}>
              MEDICAL LOGISTICS<br />THAT MATTER
            </div>
          </div>

          <div style={{ marginTop: 64, maxWidth: 820 }}>
            <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-2px" }}>
              Medical Courier Services
            </div>
            <div style={{ fontSize: 36, color: "#69b9ff", fontWeight: 700, marginTop: 10 }}>
              Columbus & Central Ohio
            </div>
            <div style={{ fontSize: 25, color: "#d8e5ef", marginTop: 24, lineHeight: 1.4 }}>
              Secure · Time-sensitive · Professional healthcare transportation
            </div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", color: "#d6e8f8", fontSize: 22 }}>
              <div style={{ width: 15, height: 15, borderRadius: 99, background: "#43a8ff" }} />
              People delivering a healthier tomorrow.
            </div>
            <div
              style={{
                display: "flex",
                padding: "16px 26px",
                borderRadius: 999,
                background: "white",
                color: "#0b2238",
                fontSize: 23,
                fontWeight: 800,
              }}
            >
              SafewayCouriers.com
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
