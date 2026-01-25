import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { moroccanData } from "../../data/mock-data";

export const TaskPlanningScene: React.FC = () => {
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
            color: "#166534",
            textAlign: "center",
          }}
        >
          Planification des Tâches
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
          Assignez et suivez les tâches de votre équipe agricole
        </p>

        {/* Task cards with Moroccan data */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 25,
            width: width * 0.7,
          }}
        >
          {moroccanData.tasks.map((task, index) => {
            const cardDelay = index * 10;
            const cardOpacity = interpolate(
              frame,
              [cardDelay, cardDelay + 20],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const cardY = interpolate(
              frame,
              [cardDelay, cardDelay + 20],
              [40, 0],
              { extrapolateRight: "clamp" }
            );
            const progressWidth = interpolate(
              frame,
              [cardDelay + 25, cardDelay + 60],
              [0, task.progress],
              { extrapolateRight: "clamp" }
            );
            const cardScale = interpolate(
              frame,
              [cardDelay + 20, cardDelay + 30],
              [1, 1],
              { extrapolateRight: "clamp" }
            );

            // Priority colors
            const priorityColors = {
              "Terminé": { bg: "#dcfce7", text: "#166534" },
              "En cours": { bg: "#dbeafe", text: "#1e40af" },
              "Urgent": { bg: "#fee2e2", text: "#991b1b" },
            };

            const priorityStyle = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors["En cours"];

            return (
              <div
                key={task.name}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.1)",
                  opacity: cardOpacity,
                  transform: `translateY(${cardY}px) scale(${cardScale})`,
                  border: "2px solid transparent",
                  borderColor: task.priority === "Urgent" ? "#fecaca" : "transparent",
                }}
              >
                {/* Priority badge */}
                <div
                  style={{
                    display: "inline-block",
                    backgroundColor: priorityStyle.bg,
                    color: priorityStyle.text,
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: "bold",
                    marginBottom: 12,
                  }}
                >
                  {task.priority}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 22, fontWeight: "bold", color: "#1f2937" }}>
                    {task.name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: task.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    {task.assignee.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, color: "#1f2937" }}>{task.assignee}</div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>📍 {task.location}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: 10,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressWidth}%`,
                      height: "100%",
                      backgroundColor: task.color,
                      borderRadius: 6,
                    }}
                  />
                </div>

                <div style={{ marginTop: 10, textAlign: "right", fontSize: 18, color: "#6b7280" }}>
                  {Math.round(progressWidth)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ marginTop: 35, display: "flex", gap: 60 }}>
          <AnimatedNumber value={moroccanData.stats.activeTasks} label="tâches actives" />
          <AnimatedNumber value={moroccanData.stats.teamMembers} label="membres d'équipe" />
        </div>

        {/* Value props */}
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
            "📲 Notifications WhatsApp",
            "🗣️ Arabic Voice Notes",
            "📸 Photo Reports",
            "📍 GPS Tracking",
          ].map((feature, i) => {
            const featureOpacity = interpolate(frame, [100 + i * 8, 125 + i * 8], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  backgroundColor: "#166534",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: 100,
                  fontSize: 18,
                  fontWeight: "bold",
                  opacity: featureOpacity,
                  boxShadow: "0 4px 15px rgba(22, 101, 52, 0.3)",
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
