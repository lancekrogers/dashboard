"use client";

import { useState, useEffect } from "react";
import type { AgentInfo, ConnectionState } from "@/lib/data/types";
import { formatUptime, formatTimeAgo } from "@/lib/utils/formatTime";

interface AgentActivityProps {
  agents: AgentInfo[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

const AGENT_ORDER = ["coordinator", "inference", "defi"];

const AGENT_ACCENTS: Record<string, string> = {
  coordinator: "border-purple-500",
  inference: "border-blue-500",
  defi: "border-green-500",
};

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  running: { dot: "bg-green-500", text: "text-green-400", label: "Running" },
  idle: { dot: "bg-yellow-500", text: "text-yellow-400", label: "Idle" },
  error: { dot: "bg-red-500", text: "text-red-400", label: "Error" },
  stopped: { dot: "bg-gray-500", text: "text-gray-400", label: "Stopped" },
};

function HeartbeatDot({ lastHeartbeat }: { lastHeartbeat: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const diffSec = Math.floor(
    (Date.now() - new Date(lastHeartbeat).getTime()) / 1000
  );
  const color =
    isNaN(diffSec) || diffSec > 30
      ? "bg-red-500"
      : diffSec > 10
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        {diffSec < 10 && (
          <div
            key={lastHeartbeat}
            className={`absolute inset-0 w-2 h-2 rounded-full ${color} animate-ping`}
          />
        )}
      </div>
      <span className="text-xs text-gray-500">
        {lastHeartbeat ? formatTimeAgo(lastHeartbeat) : "never"}
      </span>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentInfo | null }) {
  if (!agent) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 border-t-2 border-t-gray-600 p-4">
        <p className="text-sm text-gray-500">Waiting for agent...</p>
      </div>
    );
  }

  const accent =
    agent.status === "error"
      ? "border-red-500"
      : AGENT_ACCENTS[agent.name] || "border-gray-500";
  const statusStyle = STATUS_STYLES[agent.status] || STATUS_STYLES.stopped;

  return (
    <div
      className={`bg-gray-800/50 rounded-lg border border-gray-700 border-t-2 ${accent} p-4 space-y-2`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-100 capitalize">
          {agent.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
          <span className={`text-xs ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Heartbeat</span>
          <HeartbeatDot lastHeartbeat={agent.lastHeartbeat} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Task</span>
          <span className="text-gray-300 truncate max-w-[150px]">
            {agent.currentTask || "None"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Uptime</span>
          <span className="text-gray-300 tabular-nums">
            {formatUptime(agent.uptimeSeconds)}
          </span>
        </div>

        {agent.errorCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Errors</span>
            <span className="text-red-400">{agent.errorCount}</span>
          </div>
        )}

        {agent.lastError && (
          <p className="text-red-400/80 text-[10px] truncate" title={agent.lastError}>
            {agent.lastError}
          </p>
        )}
      </div>
    </div>
  );
}

export function AgentActivity({
  agents,
  connectionState,
  isLoading,
  error,
  className = "",
}: AgentActivityProps) {
  const agentMap = new Map(agents.map((a) => [a.name, a]));

  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Agent Activity</h2>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">{connectionState}</span>
        </div>
      </div>

      {isLoading && agents.length === 0 && (
        <div className="grid grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-32" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">
          Failed to load agent data: {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-3 gap-3">
          {AGENT_ORDER.map((name) => (
            <AgentCard
              key={name}
              agent={agentMap.get(name) || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
