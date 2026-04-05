
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { moroccanData } from "../../data/mock-data";

export const MultiOrgScene = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = opacityIn * opacityOut;

  return (
    <AbsoluteFill style={{ backgroundColor: "#f8fafc", opacity }}>
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
            color: "#1e293b",
            textAlign: "center",
          }}
        >
          Multi-Exploitations & Sécurité
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
          Gérez plusieurs fermes avec permissions granulaires • Conforme RGPD Maroc
        </p>

        <div style={{ display: "flex", gap: 50, alignItems: "flex-start" }}>
          {/* Org switcher mock with Moroccan data */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              minWidth: 380,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#1f2937", marginBottom: 20 }}>
              Vos Exploitations
            </div>
            {moroccanData.organizations.map((org, index) => {
              const cardDelay = 30 + index * 10;
              const cardOpacity = interpolate(
                frame,
                [cardDelay, cardDelay + 20],
                [0, 1],
                { extrapolateRight: "clamp" }
              );
              const cardX = interpolate(
                frame,
                [cardDelay, cardDelay + 20],
                [-30, 0],
                { extrapolateRight: "clamp" }
              );
              const cardScale = interpolate(
                frame,
                [cardDelay + 20, cardDelay + 30],
                [1, 1],
                { extrapolateRight: "clamp" }
              );

              return (
                <div
                  key={org.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    backgroundColor: index === 0 ? "#f0fdf4" : "#f9fafb",
                    borderRadius: 12,
                    marginBottom: 12,
                    border: index === 0 ? "2px solid #166534" : "2px solid transparent",
                    opacity: cardOpacity,
                    transform: `translateX(${cardX}px) scale(${cardScale})`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: org.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {org.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: "#1f2937" }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>📍 {org.location}</div>
                  </div>
                  <div
                    style={{
                      backgroundColor: index === 0 ? "#166534" : "#e5e7eb",
                      color: index === 0 ? "#ffffff" : "#6b7280",
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                  >
                    {index === 0 ? "Actif" : org.role}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security features with Morocco-specific compliance */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              minWidth: 320,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#1f2937", marginBottom: 20 }}>
              Sécurité & Conformité
            </div>

            {[
              { icon: "🔐", title: "Auth 2FA", desc: "Protection renforcée", highlight: false },
              { icon: "👥", title: "Rôles", desc: "Contrôle d'accès", highlight: false },
              { icon: "📊", title: "Audit Log", desc: "Traçabilité complète", highlight: false },
              { icon: "🇲🇦", title: "Hébergement Maroc", desc: "Données locales", highlight: true },
              { icon: "⚖️", title: "RGPD Marocain", desc: "Conformité 100%", highlight: true },
            ].map((feature, index) => {
              const featureOpacity = interpolate(
                frame,
                [70 + index * 12, 100 + index * 12],
                [0, 1],
                { extrapolateRight: "clamp" }
              );
              const featureY = interpolate(
                frame,
                [70 + index * 12, 100 + index * 12],
                [20, 0],
                { extrapolateRight: "clamp" }
              );

              return (
                <div
                  key={feature.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 0",
                    opacity: featureOpacity,
                    transform: `translateY(${featureY}px)`,
                  }}
                >
                  <span style={{ fontSize: 36 }}>{feature.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: feature.highlight ? "bold" : "normal",
                        color: feature.highlight ? "#166534" : "#1f2937",
                      }}
                    >
                      {feature.title}
                    </div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>{feature.desc}</div>
                  </div>
                  {feature.highlight && (
                    <div
                      style={{
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      NOUVEAU
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            gap: 25,
            marginTop: 40,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {moroccanData.trustBadges.map((badge, itemIdx) => {
            const badgeOpacity = interpolate(frame, [130 + itemIdx * 10, 155 + itemIdx * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#ffffff",
                  padding: "12px 20px",
                  borderRadius: 100,
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#166534",
                  opacity: badgeOpacity,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
              >
                <span style={{ fontSize: 22 }}>{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
