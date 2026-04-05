
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { moroccanData } from "../../data/mock-data";

export const ParcelManagementScene = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = opacityIn * opacityOut;

  // Map scale animation with bounce
  const mapScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, stiffness: 80, mass: 1.5 },
  });

  // Moroccan regions labels
  const regions = [
    { name: "Doukkala-Abda", x: 0.25, y: 0.4, ha: 3200 },
    { name: "Gharb", x: 0.4, y: 0.3, ha: 2800 },
    { name: "Souss-Massa", x: 0.65, y: 0.55, ha: 1500 },
    { name: "Tadla", x: 0.55, y: 0.35, ha: 1200 },
    { name: "Tafilalet", x: 0.8, y: 0.45, ha: 800 },
  ];

  // Pulse animation for regions
  const pulse = Math.sin(frame / 15) * 0.1 + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#f0fdf4", opacity }}>
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
            color: "#166534",
            textAlign: "center",
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Gestion des Parcelles
        </h2>

        <p
          style={{
            fontSize: 26,
            color: "#6b7280",
            marginBottom: 40,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Visualisez toutes vos parcelles sur la carte interactive du Maroc
        </p>

        {/* Map visualization mock with Morocco shape */}
        <div
          style={{
            width: width * 0.65,
            height: height * 0.45,
            backgroundColor: "#e5e7eb",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
            transform: `scale(${mapScale})`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Map grid pattern */}
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0, opacity: 0.2 }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Morocco outline (simplified) */}
          <svg
            width="70%"
            height="80%"
            viewBox="0 0 200 250"
            style={{ opacity: 0.3, position: "absolute" }}
          >
            <path
              d="M50,20 L150,20 L180,80 L160,150 L120,200 L80,220 L40,180 L30,100 Z"
              fill="#166534"
              stroke="#166534"
              strokeWidth="3"
            />
          </svg>

          {/* Region markers */}
          {regions.map((region, itemIdx) => {
            const markerOpacity = interpolate(frame, [40 + itemIdx * 12, 70 + itemIdx * 12], [0, 1], {
              extrapolateRight: "clamp",
            });
            const markerScale = interpolate(frame, [70 + itemIdx * 12, 100 + itemIdx * 12], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  position: "absolute",
                  left: region.x * width * 0.65,
                  top: region.y * height * 0.45,
                  opacity: markerOpacity,
                  transform: `translate(-50%, -50%) scale(${markerScale * pulse})`,
                }}
              >
                {/* Pulsing circle */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                    opacity: 0.3,
                    position: "absolute",
                    left: -25,
                    top: -25,
                    animation: "pulse 2s infinite",
                  }}
                />
                {/* Center dot */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#166534",
                    border: "3px solid #ffffff",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                />
                {/* Label */}
                <div
                  style={{
                    position: "absolute",
                    top: 30,
                    left: -60,
                    backgroundColor: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#166534" }}>
                    {region.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{region.ha} ha</div>
                </div>
              </div>
            );
          })}

          {/* Stats overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              padding: "16px 24px",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, color: "#374151", fontWeight: "500" }}>
              🛰️ Images satellite Sentinel-2
            </span>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              Actualisation: 5 jours
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: 40, display: "flex", gap: 60 }}>
          <AnimatedNumber value={moroccanData.stats.parcels} label="parcelles actives" />
          <AnimatedNumber value={moroccanData.stats.hectares} label="hectares totaux" suffix=" ha" />
          <AnimatedNumber value={6} label="régions couvertes" />
        </div>

        {/* Features list */}
        <div
          style={{
            display: "flex",
            gap: 30,
            marginTop: 35,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "📍 Géolocalisation précise",
            "📊 Historique par parcelle",
            "🌧️ Données météo locales",
            "📱 Mode hors-ligne",
          ].map((feature, itemIdx) => {
            const featureOpacity = interpolate(frame, [80 + itemIdx * 10, 110 + itemIdx * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: 100,
                  fontSize: 18,
                  color: "#166534",
                  opacity: featureOpacity,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
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
