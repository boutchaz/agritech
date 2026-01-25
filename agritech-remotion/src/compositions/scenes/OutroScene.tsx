import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { moroccanData } from "../../data/mock-data";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacity = opacityIn;

  // CTA pulse animation
  const ctaScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 10, stiffness: 100 },
  });
  const ctaPulse = Math.sin(frame / 20) * 0.02 + 1;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)",
        opacity,
      }}
    >
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
        {/* Main CTA */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: "bold",
            marginBottom: 20,
            color: "#ffffff",
            textAlign: "center",
            opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Prêt à transformer votre exploitation ?
        </h2>

        <p
          style={{
            fontSize: 28,
            color: "#bbf7d0",
            marginBottom: 50,
            textAlign: "center",
            maxWidth: 1000,
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Rejoignez +500 agriculteurs marocains qui font confiance à AgriTech
          <br />
          <span style={{ fontSize: 22, color: "#86efac" }}>
            De Doukkala à Tafilalet, en passant par le Souss • Fonctionne hors-ligne
          </span>
        </p>

        {/* CTA Button with pulse */}
        <div
          style={{
            transform: `scale(${ctaScale * ctaPulse})`,
            marginBottom: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              color: "#166534",
              padding: "26px 80px",
              borderRadius: 16,
              fontSize: 36,
              fontWeight: "bold",
              boxShadow: `0 20px 60px rgba(0, 0, 0, ${0.3 + Math.sin(frame / 15) * 0.1})`,
              position: "relative",
            }}
          >
            Essai Gratuit 30 Jours
            {/* Animated border */}
            <div
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: 20,
                border: "3px solid rgba(255, 255, 255, 0.5)",
                opacity: Math.sin(frame / 20) * 0.5 + 0.5,
              }}
            />
          </div>
        </div>

        {/* Pricing cards */}
        <div
          style={{
            display: "flex",
            gap: 25,
            opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" }),
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {moroccanData.pricing.map((plan, index) => {
            const cardDelay = index * 10;
            const cardOpacity = interpolate(
              frame,
              [90 + cardDelay, 120 + cardDelay],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const cardY = interpolate(
              frame,
              [90 + cardDelay, 120 + cardDelay],
              [40, 0],
              { extrapolateRight: "clamp" }
            );

            return (
              <div
                key={plan.name}
                style={{
                  backgroundColor: plan.popular ? "#ffffff" : "rgba(255, 255, 255, 0.15)",
                  backdropFilter: plan.popular ? "none" : "blur(10px)",
                  borderRadius: 20,
                  padding: plan.popular ? "36px 44px" : "28px 36px",
                  minWidth: plan.popular ? 300 : 260,
                  boxShadow: plan.popular
                    ? "0 20px 60px rgba(0, 0, 0, 0.2)"
                    : "0 10px 30px rgba(0, 0, 0, 0.1)",
                  border: plan.popular ? "4px solid #fbbf24" : "2px solid rgba(255, 255, 255, 0.2)",
                  opacity: cardOpacity,
                  transform: `translateY(${cardY}px)`,
                  position: "relative",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#fbbf24",
                      color: "#166534",
                      padding: "6px 16px",
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: "bold",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    POPULAIRE
                  </div>
                )}

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: plan.popular ? "#1f2937" : "#ffffff",
                    marginBottom: 12,
                  }}
                >
                  {plan.name}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: "bold",
                      color: plan.popular ? "#166534" : "#ffffff",
                    }}
                  >
                    {plan.price}
                    <span style={{ fontSize: 24, fontWeight: "normal" }}> {plan.currency}</span>
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      color: plan.popular ? "#6b7280" : "#bbf7d0",
                      marginLeft: 8,
                    }}
                  >
                    {plan.period}
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {plan.features.map((feature, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 12,
                        fontSize: 16,
                        color: plan.popular ? "#1f2937" : "#ffffff",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    backgroundColor: plan.popular ? "#166534" : "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: 10,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: "bold",
                  }}
                >
                  {plan.price === "0" ? "Commencer" : "Essayer Gratuit"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: 50, display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {moroccanData.trustBadges.map((badge, i) => {
            const badgeOpacity = interpolate(frame, [140 + i * 10, 165 + i * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: badgeOpacity,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  padding: "12px 20px",
                  borderRadius: 100,
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <span style={{ fontSize: 24 }}>{badge.icon}</span>
                <span style={{ fontSize: 18, color: "#ffffff", fontWeight: "bold" }}>{badge.text}</span>
              </div>
            );
          })}
        </div>

        {/* Final CTA */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(frame, [170, 200], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontSize: 20, color: "#bbf7d0" }}>
            📧 Support en Arabe & Français • 🇲🇦 Conçu pour le Maroc • 📶 Fonctionne Hors-ligne
          </div>
        </div>

        {/* Logo */}
        <div
          style={{
            marginTop: 35,
            fontSize: 36,
            fontWeight: "bold",
            color: "#ffffff",
            opacity: interpolate(frame, [190, 220], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          AgriTech.ma 🇲🇦
        </div>
      </div>
    </AbsoluteFill>
  );
};
