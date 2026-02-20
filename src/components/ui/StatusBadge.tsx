"use client";

import type { FestivalEntityStatus } from "@/lib/data/types";

interface StatusBadgeProps {
  status: FestivalEntityStatus;
  className?: string;
}

const STATUS_STYLES: Record<FestivalEntityStatus, string> = {
  pending: "bg-gray-800 text-gray-400",
  active: "bg-blue-900 text-blue-400",
  completed: "bg-green-900 text-green-400",
  blocked: "bg-yellow-900 text-yellow-400",
  failed: "bg-red-900 text-red-400",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}
