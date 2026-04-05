
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";

export const HeroScene = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const opacityIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = opacityIn * opacityOut;

  // Title animations
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Floating crop icons
  const crops = [
    { icon: "🌾", label: "Céréales", x: 0.15, y: 0.2 },
    { icon: "🫒", label: "Olivier", x: 0.8, y: 0.25 },
    { icon: "🍊", label: "Agrumes", x: 0.1, y: 0.7 },
    { icon: "🍅", label: "Maraîchage", x: 0.85, y: 0.65 },
  ];

  // CTA button pulse
  const ctaScale = interpolate(
    frame,
    [40, 80, 160],
    [1, 1.05, 1.05],
    { extrapolateRight: "clamp" }
  );
  const ctaPulse = interpolate(
    frame,
    [0, 100, 200],
    [0, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Feature pills stagger animation
  const features = [
    { text: "📱 Application Mobile", color: "#22c55e" },
    { text: "📶 Hors-Ligne", color: "#3b82f6" },
    { text: "🛰️ Images Satellite", color: "#8b5cf6" },
    { text: "🌍 Multi-Langue AR/FR", color: "#f59e0b" },
  ];

  // Pain points (staggered)
  const painPoints = [
    { text: "❌ Perte de temps dans les déplacements", delay: 0 },
    { text: "❌ Difficulté à suivre plusieurs parcelles", delay: 20 },
    { text: "❌ Mauvaise gestion de l'eau", delay: 40 },
    { text: "❌ Manque de visibilité sur l'état des cultures", delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#f0fdf4", opacity }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Floating crop icons */}
        {crops.map((crop, itemIdx) => {
          const floatOffset = Math.sin((frame / 30) * 2 + itemIdx) * 15;
          const cropOpacity = interpolate(frame, [30 + itemIdx * 10, 60 + itemIdx * 10], [0, 1], {
              extrapolateRight: "clamp",
            });
          const cropScale = interpolate(frame, [30 + itemIdx * 10, 70 + itemIdx * 10], [0, 1], {
              extrapolateRight: "clamp",
            });

          return (
            <div
              key={"item-" + itemIdx}
              style={{
                position: "absolute",
                left: crop.x * width,
                top: crop.y * height + floatOffset,
                opacity: cropOpacity,
                transform: `scale(${cropScale})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 60,
                  filter: "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.1))",
                }}
              >
                {crop.icon}
              </div>
              <span
                style={{
                  fontSize: 16,
                  color: "#166534",
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                {crop.label}
              </span>
            </div>
          );
        })}

        {/* Main Title */}
        <h2
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: "#166534",
            margin: 0,
            marginBottom: 20,
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            transform: `scale(${titleScale})`,
            textShadow: "0 2px 10px rgba(22, 101, 52, 0.2)",
          }}
        >
          Pilotez Votre Exploitation
        </h2>

        <h3
          style={{
            fontSize: 36,
            color: "#15803d",
            margin: 0,
            marginBottom: 40,
            fontFamily: "system-ui, -apple-system, sans-serif",
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Depuis votre téléphone, où que vous soyez au Maroc
        </h3>

        {/* Pain points that fade in */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 40,
            maxWidth: 700,
          }}
        >
          {painPoints.map((point, itemIdx) => {
            const pointOpacity = interpolate(
              frame,
              [60 + point.delay, 90 + point.delay],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const pointX = interpolate(
              frame,
              [60 + point.delay, 90 + point.delay],
              [30, 0],
              { extrapolateRight: "clamp" }
            );

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  fontSize: 22,
                  color: "#64748b",
                  opacity: pointOpacity,
                  transform: `translateX(${pointX}px)`,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {point.text}
              </div>
            );
          })}
        </div>

        {/* Solution highlight */}
        <div
          style={{
            backgroundColor: "#dcfce7",
            padding: "20px 40px",
            borderRadius: 16,
            marginBottom: 30,
            opacity: interpolate(frame, [140, 170], [0, 1], { extrapolateRight: "clamp" }),
            transform: interpolate(frame, [140, 170], [20, 0], { extrapolateRight: "clamp" }, (v) => `translateY(${v}px)`),
          }}
        >
          <span style={{ fontSize: 26, color: "#166534", fontWeight: "bold" }}>
            ✅ AgriTech simplifie votre quotidien
          </span>
        </div>

        {/* CTA Button with pulse */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
          }}
        >
          <div
            style={{
              backgroundColor: "#166534",
              color: "#ffffff",
              padding: "24px 64px",
              borderRadius: 16,
              fontSize: 32,
              fontWeight: "bold",
              boxShadow: `0 15px 50px rgba(22, 101, 52, ${0.3 + ctaPulse * 0.2})`,
              fontFamily: "system-ui, -apple-system, sans-serif",
              position: "relative",
            }}
          >
            Commencer Gratuitement
            {/* Pulse ring */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: 24,
                border: "3px solid #166534",
                opacity: ctaPulse * 0.5,
                transform: `scale(${1 + ctaPulse * 0.1})`,
              }}
            />
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 50,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 900,
          }}
        >
          {features.map((feature, itemIdx) => {
            const pillOpacity = interpolate(
              frame,
              [100 + itemIdx * 15, 130 + itemIdx * 15],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const pillY = interpolate(
              frame,
              [100 + itemIdx * 15, 130 + itemIdx * 15],
              [20, 0],
              { extrapolateRight: "clamp" }
            );

            return (
              <div
                key={"item-" + itemIdx}
                style={{
                  backgroundColor: feature.color,
                  color: "#ffffff",
                  padding: "14px 28px",
                  borderRadius: 100,
                  fontSize: 20,
                  fontWeight: "bold",
                  opacity: pillOpacity,
                  transform: `translateY(${pillY}px)`,
                  boxShadow: `0 4px 15px ${feature.color}40`,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {feature.text}
              </div>
            );
          })}
        </div>

        {/* Trust indicator */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ display: "flex" }}>
            {[...Array(5)].map((_, spanIdx) => (
              <span key={"span-" + spanIdx} style={{ fontSize: 24 }}>
                ⭐
              </span>
            ))}
          </div>
          <span style={{ fontSize: 18, color: "#64748b" }}>
            +500 agriculteurs marocains nous font confiance
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
