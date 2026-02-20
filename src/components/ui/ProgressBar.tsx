"use client";

interface ProgressBarProps {
  percentage: number;
  size?: "sm" | "md";
  className?: string;
}

export function ProgressBar({
  percentage,
  size = "sm",
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const height = size === "md" ? "h-2.5" : "h-1.5";
  const fillColor =
    clamped > 80 ? "bg-green-500" : clamped > 50 ? "bg-blue-500" : "bg-gray-500";

  return (
    <div
      className={`w-full bg-gray-700 rounded-full overflow-hidden ${height} ${className}`}
    >
      <div
        className={`${fillColor} ${height} rounded-full transition-all duration-500`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
