"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UseWebSocketResult,
  DaemonEvent,
  AgentInfo,
  ConnectionState,
  WebSocketConfig,
} from "@/lib/data/types";
import { WebSocketConnector } from "@/lib/data/websocket";

const MAX_EVENTS = 1000;

export function useWebSocket(
  config?: Partial<WebSocketConfig>
): UseWebSocketResult {
  const connectorRef = useRef<WebSocketConnector | null>(null);
  const [events, setEvents] = useState<DaemonEvent[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  if (!connectorRef.current) {
    connectorRef.current = new WebSocketConnector(config);
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
        setError(new Error("WebSocket connection error"));
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

  const reconnect = useCallback(() => {
    const connector = connectorRef.current;
    if (connector) {
      connector.disconnect();
      connector.connect();
    }
  }, []);

  return {
    data: events,
    agents,
    connectionState,
    error,
    isLoading: connectionState === "connecting",
    reconnect,
  };
}
