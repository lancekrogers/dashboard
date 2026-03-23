"use client";

import type { ReactNode } from "react";

function ConnectionStatus() {
  const mode =
    process.env.NEXT_PUBLIC_USE_MOCK === "true"
      ? "Synthetic"
      : process.env.NEXT_PUBLIC_USE_GRPC === "true"
        ? "gRPC"
        : "WebSocket";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Mode:</span>
      <span className="text-gray-300">{mode}</span>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">
            Agent Economy Observer
          </h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            ETHDenver 2026
          </span>
        </div>
        <ConnectionStatus />
      </header>
      <main className="grid grid-cols-4 grid-rows-[1fr_1fr] gap-3 p-3 flex-1 min-h-0">
        {children}
      </main>
    </div>
  );
}
