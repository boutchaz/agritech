
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface AnimatedNumberProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber = ({ value, label, prefix = "", suffix = "" }: AnimatedNumberProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const displayValue = interpolate(frame, [0, fps * 1.5], [0, value], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 52,
          fontWeight: "bold",
          color: "#166534",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {prefix}
        {Math.round(displayValue * 10) / 10}
        {suffix}
      </div>
      <div
        style={{
          fontSize: 24,
          color: "#6b7280",
          marginTop: 8,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
};
