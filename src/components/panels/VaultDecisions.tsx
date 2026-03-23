"use client";

import { useMemo } from "react";
import type { ConnectionState, VaultDecision } from "@/lib/data/types";

interface VaultDecisionsProps {
  decisions: VaultDecision[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour12: false });
}

function formatUSD(value: number): string {
  const sign = value >= 0 ? "" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function VaultDecisions({
  decisions,
  connectionState,
  isLoading,
  error,
  className = "",
}: VaultDecisionsProps) {
  const entries = useMemo(() => {
    return [...decisions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [decisions]);

  const goCount = entries.filter((e) => e.decision === "GO").length;
  const noGoCount = entries.filter((e) => e.decision === "NO_GO").length;
  const onChainCount = entries.filter((e) => e.txHash !== null).length;

  const dotClass =
    connectionState === "connected"
      ? "bg-green-500"
      : connectionState === "connecting"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 p-3 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-white">Vault Decisions</h2>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-xs text-gray-500">{connectionState}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2 shrink-0">
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">GO</p>
          <p className="text-sm text-green-400 font-semibold tabular-nums">{goCount}</p>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">NO_GO</p>
          <p className="text-sm text-red-400 font-semibold tabular-nums">{noGoCount}</p>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">On-Chain</p>
          <p className="text-sm text-cyan-400 font-semibold tabular-nums">{onChainCount}</p>
        </div>
      </div>

      {isLoading && entries.length === 0 && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-800 rounded" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400">Failed to load vault decisions: {error.message}</p>}

      {!isLoading && !error && entries.length === 0 && (
        <div className="text-sm text-gray-500">
          <p>No vault decisions yet.</p>
          <p className="text-xs mt-1">Watch for GO / NO_GO decision events.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {entries.map((entry) => {
            const badgeClass =
              entry.decision === "GO"
                ? "bg-green-900/60 text-green-300"
                : "bg-red-900/60 text-red-300";

            const profitColor =
              entry.netProfitEstimateUsd >= 0 ? "text-green-400" : "text-red-400";

            return (
              <div key={entry.id} className="rounded border border-gray-800 bg-gray-800/40 px-2 py-1.5">
                {/* Top row: timestamp + decision badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 uppercase font-medium text-white ${entry.decision === "GO" ? "bg-green-600" : "bg-red-600"}`}>
                    {entry.decision}
                  </span>
                </div>

                {/* Second row: ritual ID + signal */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-cyan-400 font-mono truncate">{entry.ritualId}</span>
                  {entry.signal && (
                    <span className="text-xs text-orange-400 truncate">{entry.signal}</span>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Confidence</span>
                    <span className="text-gray-200 tabular-nums">{entry.confidence}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">CRE Gates</span>
                    <span className="text-gray-200 tabular-nums">{entry.gatesPassed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Deviation</span>
                    <span className="text-gray-200 tabular-nums">{entry.deviationPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Est. Profit</span>
                    <span className={`tabular-nums ${profitColor}`}>
                      {formatUSD(entry.netProfitEstimateUsd)}
                    </span>
                  </div>
                </div>

                {/* Execute phase: on-chain details */}
                {entry.phase === "execute" && (
                  <div className="mt-1 pt-1 border-t border-gray-700/50 space-y-0.5">
                    {entry.tokenIn && entry.tokenOut && (
                      <p className="text-xs text-gray-300">
                        {entry.tokenIn} → {entry.tokenOut}
                      </p>
                    )}
                    {entry.chain && (
                      <p className="text-[10px] text-gray-500">{entry.chain}</p>
                    )}
                    {entry.txHash && (
                      <p className="text-[10px] text-cyan-400 font-mono">
                        {truncateTxHash(entry.txHash)}
                      </p>
                    )}
                    {entry.withinTolerance !== null && (
                      <span
                        className={`inline-block text-[10px] rounded px-1 py-0.5 ${
                          entry.withinTolerance
                            ? "bg-green-900/60 text-green-300"
                            : "bg-red-900/60 text-red-300"
                        }`}
                      >
                        {entry.withinTolerance ? "\u2713 within tolerance" : "\u2717 out of tolerance"}
                      </span>
                    )}
                  </div>
                )}

                {/* Tools used */}
                {entry.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="text-[9px] text-gray-400 bg-gray-700/60 rounded px-1 py-0.5"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                {/* Duration */}
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
