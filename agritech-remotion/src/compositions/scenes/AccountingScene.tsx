import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { moroccanData } from "../../data/mock-data";

export const AccountingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = opacityIn * opacityOut;

  const chartHeight = interpolate(frame, [30, 80], [0, height * 0.32], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#faf5ff", opacity }}>
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
            color: "#7c3aed",
            textAlign: "center",
          }}
        >
          Comptabilité & Finances
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
          Suivez vos revenus, dépenses et factures en Dirhams
        </p>

        {/* Chart */}
        <div
          style={{
            width: width * 0.65,
            height: height * 0.38,
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 35,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
          }}
        >
          {moroccanData.revenueData.map((value, index) => {
            const barDelay = 40 + index * 10;
            const barHeight = interpolate(
              frame,
              [barDelay, barDelay + 40],
              [0, (value / Math.max(...moroccanData.revenueData)) * chartHeight],
              { extrapolateRight: "clamp" }
            );

            return (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: 50,
                    height: barHeight,
                    backgroundColor: index === moroccanData.revenueData.length - 1 ? "#7c3aed" : "#a78bfa",
                    borderRadius: 8,
                    marginBottom: 12,
                    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
                  }}
                />
                <span style={{ fontSize: 16, color: "#6b7280", fontWeight: "bold" }}>
                  {moroccanData.months[index]}
                </span>
              </div>
            );
          })}

          {/* Y-axis labels */}
          <div
            style={{
              position: "absolute",
              left: 50,
              top: 40,
              display: "flex",
              flexDirection: "column",
              gap: 80,
            }}
          >
            {["500k", "250k", "0"].map((label, i) => (
              <span key={i} style={{ fontSize: 14, color: "#9ca3af", fontWeight: "bold" }}>
                {label} MAD
              </span>
            ))}
          </div>
        </div>

        {/* Revenue highlight */}
        <div
          style={{
            marginTop: 30,
            backgroundColor: "#7c3aed",
            color: "#ffffff",
            padding: "20px 50px",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(124, 58, 237, 0.3)",
            opacity: interpolate(frame, [140, 170], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <span style={{ fontSize: 22, fontWeight: "normal" }}>Revenu annuel: </span>
          <span style={{ fontSize: 36, fontWeight: "bold" }}>
            {(moroccanData.stats.monthlyRevenue * 12 / 1000).toFixed(0)}k MAD
          </span>
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 30,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "🧾 Factures conforme TVA",
            "📊 Export PDF/Excel",
            "💰 Suivi des subventions PMV",
            "🏦 Compatible avec les banques marocaines",
          ].map((feature, i) => {
            const featureOpacity = interpolate(frame, [100 + i * 10, 125 + i * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: 100,
                  fontSize: 18,
                  color: "#7c3aed",
                  fontWeight: "bold",
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
