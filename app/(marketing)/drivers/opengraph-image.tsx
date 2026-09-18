import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Safeway Couriers — Now Accepting Driver Applications";
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
          background: "linear-gradient(120deg, #f7fbff 0%, #eef7ff 58%, #d9eeff 100%)",
          color: "#071b2f",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -70,
            bottom: -120,
            width: 530,
            height: 530,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(39,151,241,.28), rgba(39,151,241,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 85,
            top: 65,
            width: 330,
            height: 500,
            borderRadius: 38,
            background: "linear-gradient(160deg, #0a223a, #103f69)",
            boxShadow: "0 24px 60px rgba(11,34,56,.22)",
            display: "flex",
            flexDirection: "column",
            padding: 34,
            color: "white",
          }}
        >
          <div style={{ fontSize: 20, letterSpacing: "3px", color: "#8ed0ff", fontWeight: 700 }}>DRIVER NETWORK</div>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.08, marginTop: 20 }}>Ready when the route opens.</div>
          <div style={{ height: 2, background: "rgba(255,255,255,.18)", marginTop: 28 }} />
          <div style={{ fontSize: 23, lineHeight: 1.55, marginTop: 26, color: "#d6e8f7" }}>
            Medical couriers<br />
            Independent contractors<br />
            Local & regional routes
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "center",
              padding: "16px 20px",
              borderRadius: 18,
              background: "#39a8ff",
              color: "#061525",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            APPLY NOW →
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "54px 58px", width: 770, zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 850, letterSpacing: "-3px" }}>Safeway</div>
            <div style={{ fontSize: 24, letterSpacing: "7px", color: "#1489e6", fontWeight: 800 }}>COURIERS</div>
          </div>

          <div style={{ marginTop: 50 }}>
            <div style={{ fontSize: 27, color: "#168de8", fontWeight: 800, letterSpacing: "2px" }}>NOW ACCEPTING</div>
            <div style={{ fontSize: 65, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-2px", marginTop: 5 }}>
              DRIVER<br />APPLICATIONS
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 22 }}>
              Medical Couriers & Independent Contract Drivers
            </div>
            <div style={{ fontSize: 23, lineHeight: 1.45, marginTop: 14, color: "#466279", maxWidth: 650 }}>
              Building our driver network now for upcoming routes and contracts.
            </div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 23, fontWeight: 800 }}>
              <div style={{ width: 16, height: 16, borderRadius: 99, background: "#168de8" }} />
              Columbus, Ohio
            </div>
            <div style={{ fontSize: 22, color: "#567086" }}>SafewayCouriers.com/drivers</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
