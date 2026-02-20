"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UseMirrorNodeResult,
  HCSMessage,
  FestivalProgress,
  ConnectionState,
  MirrorNodeConfig,
} from "@/lib/data/types";
import { MirrorNodeClient } from "@/lib/data/mirror-node";

const MAX_MESSAGES = 5000;

export function useMirrorNode(
  config?: Partial<MirrorNodeConfig>
): UseMirrorNodeResult {
  const clientRef = useRef<MirrorNodeClient | null>(null);
  const [messages, setMessages] = useState<HCSMessage[]>([]);
  const [festivalProgress, setFestivalProgress] =
    useState<FestivalProgress | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!clientRef.current) {
    clientRef.current = new MirrorNodeClient(config);
  }

  useEffect(() => {
    const client = clientRef.current!;
    let receivedFirst = false;

    const unsubMessages = client.onMessages((newMessages: HCSMessage[]) => {
      if (!receivedFirst) {
        receivedFirst = true;
        setIsLoading(false);
        setConnectionState("connected");
      }

      setMessages((prev) => {
        const next = [...prev, ...newMessages];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });

      // Parse festival progress from messages if present
      for (const msg of newMessages) {
        if (msg.messageType === "quality_gate" || msg.messageType === "task_result") {
          try {
            const parsed = JSON.parse(msg.message);
            if (parsed.festivalProgress) {
              setFestivalProgress(parsed.festivalProgress);
            }
          } catch {
            // Not a festival progress message
          }
        }
      }
    });

    const unsubError = client.onError((err: Error) => {
      setError(err);
      setConnectionState("error");
    });

    client.startPolling();

    // If no messages arrive within a short window, mark as connected anyway
    const initialTimer = setTimeout(() => {
      if (!receivedFirst) {
        setIsLoading(false);
        setConnectionState("connected");
      }
    }, 10000);

    return () => {
      clearTimeout(initialTimer);
      unsubMessages();
      unsubError();
      client.stopPolling();
    };
  }, []);

  const refresh = useCallback(() => {
    clientRef.current?.refresh();
  }, []);

  return {
    data: messages,
    festivalProgress,
    connectionState,
    error,
    isLoading,
    refresh,
  };
}
