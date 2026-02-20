"use client";

import { useState, useEffect, useRef } from "react";
import {
  UseGRPCResult,
  DaemonEvent,
  AgentInfo,
  ConnectionState,
  GRPCConfig,
} from "@/lib/data/types";
import { GRPCConnector } from "@/lib/data/grpc";
import { useWebSocket } from "./useWebSocket";

const MAX_EVENTS = 1000;
const USE_GRPC = process.env.NEXT_PUBLIC_USE_GRPC === "true";

function useGRPCDirect(config?: Partial<GRPCConfig>): UseGRPCResult {
  const connectorRef = useRef<GRPCConnector | null>(null);
  const [events, setEvents] = useState<DaemonEvent[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  if (!connectorRef.current) {
    connectorRef.current = new GRPCConnector(config);
  }

  useEffect(() => {
    const connector = connectorRef.current!;

    const unsubEvent = connector.onEvent((event: DaemonEvent) => {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
      });
      setAgents(connector.getAgents());
    });

    const unsubState = connector.onStateChange((state: ConnectionState) => {
      setConnectionState(state);
      if (state === "error") {
        setError(new Error("gRPC connection error"));
      } else if (state === "connected") {
        setError(null);
      }
    });

    connector.connect();

    return () => {
      unsubEvent();
      unsubState();
      connector.disconnect();
    };
  }, []);

  return {
    data: events,
    agents,
    connectionState,
    error,
    isLoading: connectionState === "connecting",
    isGRPC: true,
  };
}

function useWebSocketFallback(): UseGRPCResult {
  const ws = useWebSocket();

  return {
    data: ws.data,
    agents: ws.agents,
    connectionState: ws.connectionState,
    error: ws.error,
    isLoading: ws.isLoading,
    isGRPC: false,
  };
}

export function useGRPC(config?: Partial<GRPCConfig>): UseGRPCResult {
  // USE_GRPC is a module-level constant; hook call order is stable per build
  if (USE_GRPC) {
    return useGRPCDirect(config);
  }
  return useWebSocketFallback();
}
