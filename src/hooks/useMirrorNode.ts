"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UseMirrorNodeResult,
  HCSMessage,
  FestivalProgress,
  FestivalProgressPayload,
  FestivalProgressSource,
  ConnectionState,
  MirrorNodeConfig,
} from "@/lib/data/types";
import { MirrorNodeClient } from "@/lib/data/mirror-node";

const MAX_MESSAGES = 5000;

type JsonRecord = Record<string, unknown>;

function parseJsonRecord(input: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : null;
  } catch {
    return null;
  }
}

function toJsonRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  if (typeof value === "string") {
    return parseJsonRecord(value);
  }
  return null;
}

function parseFestivalProgressPayload(
  messageRecord: JsonRecord
): FestivalProgressPayload | null {
  const payloadRecord = toJsonRecord(messageRecord.payload ?? messageRecord);
  if (!payloadRecord) return null;

  const source = payloadRecord.source;
  if (source !== "fest" && source !== "synthetic") return null;

  const festivalProgress = toJsonRecord(payloadRecord.festivalProgress);
  if (!festivalProgress) return null;

  return {
    version: typeof payloadRecord.version === "string" ? payloadRecord.version : "v1",
    source: source as FestivalProgressSource,
    selector: typeof payloadRecord.selector === "string" ? payloadRecord.selector : "",
    snapshot_time:
      typeof payloadRecord.snapshot_time === "string"
        ? payloadRecord.snapshot_time
        : new Date().toISOString(),
    stale_after_seconds:
      typeof payloadRecord.stale_after_seconds === "number"
        ? payloadRecord.stale_after_seconds
        : undefined,
    festivalProgress: festivalProgress as unknown as FestivalProgress,
    fallback_reason:
      typeof payloadRecord.fallback_reason === "string"
        ? payloadRecord.fallback_reason
        : undefined,
  };
}

function parseLegacyFestivalProgress(messageRecord: JsonRecord): FestivalProgress | null {
  const direct = toJsonRecord(messageRecord.festivalProgress);
  if (direct) return direct as unknown as FestivalProgress;

  const payloadRecord = toJsonRecord(messageRecord.payload);
  if (!payloadRecord) return null;
  const nested = toJsonRecord(payloadRecord.festivalProgress);
  if (!nested) return null;
  return nested as unknown as FestivalProgress;
}

export function useMirrorNode(
  config?: Partial<MirrorNodeConfig>
): UseMirrorNodeResult {
  const clientRef = useRef<MirrorNodeClient | null>(null);
  const hasExplicitProgressRef = useRef(false);
  const [messages, setMessages] = useState<HCSMessage[]>([]);
  const [festivalProgress, setFestivalProgress] =
    useState<FestivalProgress | null>(null);
  const [festivalProgressSource, setFestivalProgressSource] =
    useState<FestivalProgressSource | null>(null);
  const [festivalProgressFallbackReason, setFestivalProgressFallbackReason] =
    useState<string | null>(null);
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

      // Parse festival progress from messages.
      // Explicit `festival_progress` events always take precedence.
      let nextProgress: FestivalProgress | null = null;
      let nextSource: FestivalProgressSource | null = null;
      let nextFallbackReason: string | null = null;
      for (const msg of newMessages) {
        const parsed = parseJsonRecord(msg.message);
        if (!parsed) continue;

        if (msg.messageType === "festival_progress") {
          const payload = parseFestivalProgressPayload(parsed);
          if (payload) {
            hasExplicitProgressRef.current = true;
            nextProgress = payload.festivalProgress;
            nextSource = payload.source;
            nextFallbackReason = payload.fallback_reason ?? null;
          }
          continue;
        }

        if (hasExplicitProgressRef.current) {
          continue;
        }

        if (msg.messageType === "quality_gate" || msg.messageType === "task_result") {
          const legacyProgress = parseLegacyFestivalProgress(parsed);
          if (legacyProgress) {
            nextProgress = legacyProgress;
            nextSource = null;
            nextFallbackReason = null;
          }
        }
      }

      if (nextProgress) {
        setFestivalProgress(nextProgress);
        setFestivalProgressSource(nextSource);
        setFestivalProgressFallbackReason(nextFallbackReason);
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
    festivalProgressSource,
    festivalProgressFallbackReason,
    connectionState,
    error,
    isLoading,
    refresh,
  };
}
