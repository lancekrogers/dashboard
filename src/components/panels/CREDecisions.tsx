"use client";

import { useMemo } from "react";
import type { HCSMessage, ConnectionState } from "@/lib/data/types";

interface CREDecisionsProps {
  messages: HCSMessage[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

type DecisionStatus = "requested" | "approved" | "denied";

interface CREDecisionEntry {
  id: string;
  timestamp: string;
  taskId: string;
  agent: string;
  status: DecisionStatus;
  reason: string;
  maxPositionUSD: number | null;
  maxSlippageBps: number | null;
}

function parseJSON(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour12: false });
}

function formatUSD6(value: number | null): string {
  if (value === null) return "-";
  return `$${(value / 1_000_000).toFixed(2)}`;
}

export function CREDecisions({
  messages,
  connectionState,
  isLoading,
  error,
  className = "",
}: CREDecisionsProps) {
  const entries = useMemo(() => {
    const constraintsByTask = new Map<
      string,
      { maxPositionUSD: number | null; maxSlippageBps: number | null }
    >();

    for (const msg of messages) {
      if (msg.messageType !== "task_assignment") continue;
      const envelope = parseJSON(msg.message);
      if (!envelope) continue;
      const taskId = String(envelope.task_id ?? "");
      if (!taskId) continue;
      const payload = parseJSON(envelope.payload);
      const decision = payload ? parseJSON(payload.cre_decision) : null;
      if (!decision) continue;

      constraintsByTask.set(taskId, {
        maxPositionUSD:
          typeof decision.max_position_usd === "number"
            ? decision.max_position_usd
            : null,
        maxSlippageBps:
          typeof decision.max_slippage_bps === "number"
            ? decision.max_slippage_bps
            : null,
      });
    }

    const result: CREDecisionEntry[] = [];
    for (const msg of messages) {
      if (
        msg.messageType !== "risk_check_requested" &&
        msg.messageType !== "risk_check_approved" &&
        msg.messageType !== "risk_check_denied"
      ) {
        continue;
      }

      const envelope = parseJSON(msg.message);
      if (!envelope) continue;

      const taskId = String(envelope.task_id ?? "-");
      const agent = String(envelope.recipient ?? msg.senderAgent ?? "unknown");
      const payload = parseJSON(envelope.payload);
      const reason =
        payload && typeof payload.reason === "string"
          ? payload.reason
          : msg.messageType === "risk_check_approved"
            ? "approved"
            : msg.messageType === "risk_check_requested"
              ? "requested"
              : "denied";

      const status: DecisionStatus =
        msg.messageType === "risk_check_requested"
          ? "requested"
          : msg.messageType === "risk_check_approved"
            ? "approved"
            : "denied";

      const constraints = constraintsByTask.get(taskId);

      result.push({
        id: `${msg.topicId}-${msg.sequenceNumber}`,
        timestamp: msg.consensusTimestamp,
        taskId,
        agent,
        status,
        reason,
        maxPositionUSD: constraints?.maxPositionUSD ?? null,
        maxSlippageBps: constraints?.maxSlippageBps ?? null,
      });
    }

    return result.slice(-10).reverse();
  }, [messages]);

  const requestedCount = entries.filter((e) => e.status === "requested").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const deniedCount = entries.filter((e) => e.status === "denied").length;

  const dotClass =
    connectionState === "connected"
      ? "bg-green-500"
      : connectionState === "connecting"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 p-3 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-white">CRE Decisions</h2>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-xs text-gray-500">{connectionState}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2 shrink-0">
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">Requested</p>
          <p className="text-sm text-cyan-400 font-semibold tabular-nums">{requestedCount}</p>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">Approved</p>
          <p className="text-sm text-green-400 font-semibold tabular-nums">{approvedCount}</p>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1">
          <p className="text-[10px] text-gray-400 uppercase">Denied</p>
          <p className="text-sm text-red-400 font-semibold tabular-nums">{deniedCount}</p>
        </div>
      </div>

      {isLoading && entries.length === 0 && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-800 rounded" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400">Failed to load CRE events: {error.message}</p>}

      {!isLoading && !error && entries.length === 0 && (
        <div className="text-sm text-gray-500">
          <p>No CRE risk decisions yet.</p>
          <p className="text-xs mt-1">Watch for risk_check_requested / approved / denied events.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {entries.map((entry) => {
            const badgeClass =
              entry.status === "approved"
                ? "bg-green-900/60 text-green-300"
                : entry.status === "denied"
                  ? "bg-red-900/60 text-red-300"
                  : "bg-cyan-900/60 text-cyan-300";

            return (
              <div key={entry.id} className="rounded border border-gray-800 bg-gray-800/40 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 tabular-nums">{formatTimestamp(entry.timestamp)}</span>
                  <span className={`text-[10px] rounded px-1.5 py-0.5 uppercase ${badgeClass}`}>
                    {entry.status}
                  </span>
                </div>
                <p className="text-xs text-gray-200 truncate">task: {entry.taskId}</p>
                <p className="text-[11px] text-gray-400 truncate">reason: {entry.reason}</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>max: {formatUSD6(entry.maxPositionUSD)}</span>
                  <span>slippage: {entry.maxSlippageBps ?? "-"} bps</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
