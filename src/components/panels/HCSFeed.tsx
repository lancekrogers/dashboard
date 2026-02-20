"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type {
  HCSMessage,
  DaemonEventType,
  ConnectionState,
} from "@/lib/data/types";

interface HCSFeedProps {
  messages: HCSMessage[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

const MESSAGE_TYPE_COLORS: Record<string, string> = {
  task_assignment: "bg-purple-900 text-purple-400",
  status_update: "bg-blue-900 text-blue-400",
  task_result: "bg-green-900 text-green-400",
  heartbeat: "bg-gray-800 text-gray-400",
  quality_gate: "bg-yellow-900 text-yellow-400",
  payment_settled: "bg-emerald-900 text-emerald-400",
  agent_started: "bg-blue-900 text-blue-400",
  agent_stopped: "bg-gray-800 text-gray-400",
  agent_error: "bg-red-900 text-red-400",
};

const AGENT_COLORS: Record<string, string> = {
  coordinator: "text-purple-400",
  inference: "text-blue-400",
  defi: "text-green-400",
};

const CONNECTION_DOTS: Record<ConnectionState, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500",
  disconnected: "bg-red-500",
  error: "bg-red-500",
};

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour12: false });
  } catch {
    // Hedera consensus timestamps are in seconds.nanoseconds format
    const seconds = parseFloat(timestamp);
    if (!isNaN(seconds)) {
      return new Date(seconds * 1000).toLocaleTimeString("en-US", {
        hour12: false,
      });
    }
    return timestamp;
  }
}

function MessageRow({ message }: { message: HCSMessage }) {
  const agentColor = AGENT_COLORS[message.senderAgent] || "text-gray-400";
  const typeColor = MESSAGE_TYPE_COLORS[message.messageType] || "bg-gray-800 text-gray-400";

  let preview = message.message;
  try {
    const parsed = JSON.parse(message.message);
    if (parsed.payload) {
      preview = JSON.stringify(parsed.payload);
    }
  } catch {
    // Use raw message text
  }

  return (
    <div className="border-b border-gray-800 px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500 tabular-nums">
          {formatTime(message.consensusTimestamp)}
        </span>
        <span className="text-gray-700">|</span>
        <span className={`${agentColor} font-medium`}>
          {message.senderAgent || "unknown"}
        </span>
        <span className="text-gray-700">|</span>
        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor}`}>
          {message.messageType}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{preview}</p>
    </div>
  );
}

export function HCSFeed({
  messages,
  connectionState,
  isLoading,
  error,
  className = "",
}: HCSFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<DaemonEventType>>(
    new Set()
  );

  const filteredMessages = useMemo(() => {
    if (activeFilters.size === 0) return messages;
    return messages.filter((m) => activeFilters.has(m.messageType));
  }, [messages, activeFilters]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAutoScroll(nearBottom);
  }, []);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages, isAutoScroll]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAutoScroll(true);
    }
  };

  const toggleFilter = (type: DaemonEventType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const allTypes: DaemonEventType[] = [
    "task_assignment", "status_update", "task_result",
    "heartbeat", "quality_gate", "payment_settled",
    "agent_started", "agent_stopped", "agent_error",
  ];

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">HCS Message Feed</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Filter {activeFilters.size > 0 && `(${activeFilters.size})`}
            </button>
            {showFilters && (
              <div className="absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded-lg p-2 z-10 min-w-[180px]">
                {allTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 py-1 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.size === 0 || activeFilters.has(type)}
                      onChange={() => toggleFilter(type)}
                      className="rounded border-gray-600"
                    />
                    {type}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${CONNECTION_DOTS[connectionState]}`} />
            <span className="text-xs text-gray-500">{connectionState}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && messages.length === 0 && (
        <div className="p-4 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-800 rounded w-3/4" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-red-400">
          <p>Failed to load HCS messages: {error.message}</p>
        </div>
      )}

      {!isLoading && !error && messages.length === 0 && (
        <div className="p-4 text-sm text-gray-500">
          <p>No HCS messages yet</p>
          <p className="text-xs mt-1">
            Messages will appear here as agents communicate through Hedera
            Consensus Service topics.
          </p>
        </div>
      )}

      {filteredMessages.length > 0 && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {filteredMessages.map((msg) => (
            <MessageRow key={msg.consensusTimestamp} message={msg} />
          ))}
        </div>
      )}

      {/* Auto-scroll indicator */}
      {!isAutoScroll && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="text-xs text-center py-1 text-blue-400 hover:text-blue-300 border-t border-gray-800"
        >
          New messages below
        </button>
      )}
    </div>
  );
}
