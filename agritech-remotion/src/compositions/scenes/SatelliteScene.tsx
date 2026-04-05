
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { moroccanData } from "../../data/mock-data";

export const SatelliteScene = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = opacityIn * opacityOut;

  // Pulse animation for the heat map
  const pulseScale = interpolate(
    frame,
    [0, 60, 120],
    [1, 1.03, 1],
    { extrapolateRight: "clamp" }
  );

  // NDVI gradient animation
  const gradientAngle = interpolate(frame, [0, 180], [0, 360], { extrapolateRight: "loop" });

  // Floating alert indicators
  const alerts = [
    { type: "Canicule", region: "Souss", x: 0.25, y: 0.35, severity: "high" },
    { type: "Sécheresse", region: "Tafilalet", x: 0.7, y: 0.5, severity: "high" },
    { type: "Risque maladie", region: "Gharb", x: 0.45, y: 0.3, severity: "medium" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", opacity }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h2
          style={{
            fontSize: 70,
            fontWeight: "bold",
            marginBottom: 16,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          Analyses Satellite & NDVI
        </h2>

        <p
          style={{
            fontSize: 26,
            color: "#94a3b8",
            marginBottom: 40,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Surveillez la santé de vos cultures avec Sentinel-2 • Couverture totale du Maroc
        </p>

        {/* NDVI Heat Map */}
        <div
          style={{
            width: width * 0.65,
            height: height * 0.45,
            backgroundColor: "#1e293b",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            transform: `scale(${pulseScale})`,
            position: "relative",
          }}
        >
          {/* Heat map visualization */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `
                linear-gradient(${gradientAngle}deg,
                  #dc2626 0%,
                  #f97316 15%,
                  #eab308 30%,
                  #84cc16 50%,
                  #22c55e 70%,
                  #15803d 100%
                )
              `,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Morocco silhouette */}
            <svg
              width="60%"
              height="75%"
              viewBox="0 0 200 250"
              style={{ opacity: 0.4, filter: "drop-shadow(0 0 20px rgba(255,255,255,0.2))" }}
            >
              <path
                d="M50,20 L150,20 L180,80 L160,150 L120,200 L80,220 L40,180 L30,100 Z"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="10,5"
              />
            </svg>

            {/* Alert indicators */}
            {alerts.map((alert, itemIdx) => {
              const alertOpacity = interpolate(frame, [60 + itemIdx * 20, 90 + itemIdx * 20], [0, 1], {
                extrapolateRight: "clamp",
              });
              const alertPulse = Math.sin(frame / 15 + itemIdx) * 0.2 + 1;

              return (
                <div
                  key={"item-" + itemIdx}
                  style={{
                    position: "absolute",
                    left: alert.x * 100 + "%",
                    top: alert.y * 100 + "%",
                    opacity: alertOpacity,
                    transform: `translate(-50%, -50%) scale(${alertPulse})`,
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      backgroundColor: alert.severity === "high" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)",
                      border: `3px solid ${alert.severity === "high" ? "#ef4444" : "#f59e0b"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 32 }}>⚠️</span>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: 85,
                      left: -60,
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      padding: "10px 16px",
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontSize: 14, color: "#ffffff", fontWeight: "bold" }}>
                      {alert.type}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{alert.region}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scale legend */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              padding: 16,
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 16, color: "#ffffff", marginBottom: 10, fontWeight: "bold" }}>
              Indice NDVI
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                height: 14,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div style={{ flex: 1, backgroundColor: "#dc2626" }} />
              <div style={{ flex: 1, backgroundColor: "#f97316" }} />
              <div style={{ flex: 1, backgroundColor: "#eab308" }} />
              <div style={{ flex: 1, backgroundColor: "#84cc16" }} />
              <div style={{ flex: 1, backgroundColor: "#22c55e" }} />
              <div style={{ flex: 1, backgroundColor: "#15803d" }} />
            </div>
            <div
              style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginTop: 6 }}
            >
              <span>Stress hydrique</span>
              <span>Sain</span>
            </div>
          </div>

          {/* Satellite info */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: "14px 20px",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 14, color: "#ffffff", fontWeight: "bold" }}>
              🛰️ Sentinel-2
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Résolution: 10m/pixel
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: 40, display: "flex", gap: 60 }}>
          <AnimatedNumber value={moroccanData.stats.satelliteCoverage} label="couverture" suffix="%" />
          <AnimatedNumber value={moroccanData.stats.updateFrequencyDays} label="jours actualisation" />
        </div>

        {/* Value propositions */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 35,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "🌡️ Alertes canicule/gel",
            "💧 Prévision irrigation",
            "🦠 Détection maladies",
            "📱 Notifications SMS",
          ].map((feature, itemIdx) => {
            const featureOpacity = interpolate(frame, [100 + itemIdx * 10, 125 + itemIdx * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  backgroundColor: "#22c55e",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: 100,
                  fontSize: 18,
                  fontWeight: "bold",
                  opacity: featureOpacity,
                  boxShadow: "0 4px 15px rgba(34, 197, 94, 0.4)",
                }}
              >
                {feature}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
