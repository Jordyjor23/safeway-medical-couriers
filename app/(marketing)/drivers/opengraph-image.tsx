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
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "row",
          background: "linear-gradient(120deg, #f7fbff 0%, #eef7ff 58%, #d9eeff 100%)",
          color: "#071b2f",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "54px 58px",
        }}
      >
        <div
          style={{
            width: "760px",
            height: "522px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 54, lineHeight: 1, fontWeight: 800, letterSpacing: "-3px" }}>
              Safeway
            </div>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: "7px", color: "#1489e6", fontWeight: 800 }}>
              COURIERS
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
            <div style={{ display: "flex", fontSize: 27, color: "#168de8", fontWeight: 800, letterSpacing: "2px" }}>
              NOW ACCEPTING
            </div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: "-2px", marginTop: 8 }}>
              DRIVER APPLICATIONS
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700, marginTop: 24 }}>
              Medical Couriers & Independent Contract Drivers
            </div>
            <div style={{ display: "flex", fontSize: 23, lineHeight: 1.45, marginTop: 16, color: "#466279", width: "650px" }}>
              Building our driver network now for upcoming routes and contracts.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: "auto", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 23, fontWeight: 800 }}>
              Columbus, Ohio
            </div>
            <div style={{ display: "flex", fontSize: 21, color: "#567086" }}>
              SafewayCouriers.com/drivers
            </div>
          </div>
        </div>

        <div
          style={{
            width: "320px",
            height: "500px",
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            padding: "34px",
            borderRadius: "36px",
            background: "linear-gradient(160deg, #0a223a, #103f69)",
            color: "white",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, letterSpacing: "3px", color: "#8ed0ff", fontWeight: 700 }}>
            DRIVER NETWORK
          </div>
          <div style={{ display: "flex", fontSize: 45, fontWeight: 800, lineHeight: 1.08, marginTop: 22 }}>
            Ready when the route opens.
          </div>
          <div style={{ display: "flex", height: "2px", background: "rgba(255,255,255,.18)", marginTop: 28 }} />
          <div style={{ display: "flex", flexDirection: "column", fontSize: 22, lineHeight: 1.55, marginTop: 26, color: "#d6e8f7" }}>
            <div style={{ display: "flex" }}>Medical couriers</div>
            <div style={{ display: "flex" }}>Independent contractors</div>
            <div style={{ display: "flex" }}>Local & regional routes</div>
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "center",
              padding: "16px 20px",
              borderRadius: "18px",
              background: "#39a8ff",
              color: "#061525",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            APPLY NOW →
          </div>
        </div>
      </div>
    ),
    size
  );
}
