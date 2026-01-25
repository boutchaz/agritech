import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Enhanced animations with spring physics
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80, mass: 1 },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const titleY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
    from: -100,
    to: 0,
  });

  const taglineOpacity = interpolate(frame, [30, 70], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [30, 70], [50, 0], { extrapolateRight: "clamp" });

  // Background gradient animation
  const gradientAngle = interpolate(frame, [0, 120], [0, 45], { extrapolateRight: "clamp" });

  // Floating particles (simulated with circles)
  const particles = Array.from({ length: 15 }, (_, i) => {
    const delay = i * 8;
    const particleY = interpolate(
      frame,
      [delay, delay + 60],
      [-100, height + 100],
      { extrapolateRight: "clamp" }
    );
    const particleOpacity = interpolate(
      frame,
      [delay, delay + 20, delay + 50, delay + 60],
      [0, 1, 1, 0],
      { extrapolateRight: "clamp" }
    );
    const particleX = (i / 15) * width;
    return { x: particleX, y: particleY, opacity: particleOpacity, size: 4 + (i % 3) * 4 };
  });

  // Morocco badge
  const badgeScale = spring({
    frame: frame - 80,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const badgeOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #166534 0%, #15803d 50%, #22c55e 100%)`,
      }}
    >
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            opacity: p.opacity,
          }}
        />
      ))}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Morocco Badge */}
        <div
          style={{
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              padding: "12px 32px",
              borderRadius: 30,
              border: "2px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <span style={{ fontSize: 20, color: "#ffffff", fontWeight: "bold" }}>
              🇲🇦 Fabriqué pour le Maroc
            </span>
          </div>
        </div>

        {/* Logo/Icon with enhanced animation */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
              border: "3px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Title with slide animation */}
        <h1
          style={{
            fontSize: 100,
            fontWeight: "bold",
            color: "#ffffff",
            margin: 0,
            marginBottom: 30,
            transform: `translateY(${titleY}px)`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          AgriTech
        </h1>

        {/* Tagline with fade and slide */}
        <p
          style={{
            fontSize: 36,
            color: "#bbf7d0",
            margin: 0,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          La plateforme agricole #1 au Maroc
        </p>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 20,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <span style={{ fontSize: 22, color: "#86efac", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            Gérez vos exploitations depuis votre téléphone • Fonctionne hors-ligne
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
