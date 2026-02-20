import type {
  FestivalProgress,
  FestivalEntityStatus,
} from "@/lib/data/types";

export interface FestivalViewProps {
  data: FestivalProgress | null;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

export interface ProgressBarProps {
  percentage: number;
  size?: "sm" | "md";
}

export interface StatusBadgeProps {
  status: FestivalEntityStatus;
}

export const STATUS_COLORS: Record<
  FestivalEntityStatus,
  { text: string; bg: string }
> = {
  pending: { text: "text-gray-400", bg: "bg-gray-800" },
  active: { text: "text-blue-400", bg: "bg-blue-900" },
  completed: { text: "text-green-400", bg: "bg-green-900" },
  blocked: { text: "text-yellow-400", bg: "bg-yellow-900" },
  failed: { text: "text-red-400", bg: "bg-red-900" },
};
