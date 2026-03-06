"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UseMirrorNodeResult, HCSMessage } from "@/lib/data/types";
import {
  createSyntheticState,
  AGENT_DEFS,
  generateHeartbeat,
  generateTradeResult,
  generateInferenceResult,
  generateRiskCheckRequested,
  generateRiskCheckDecision,
  generateTaskAssignment,
  generatePaymentSettled,
  eventToHCSMessage,
  generateFestivalProgress,
  type SyntheticState,
} from "@/lib/data/synthetic-events";

const MAX_MESSAGES = 5000;

// Pool of generator functions to randomly pick from
type EventGen = (state: SyntheticState) => ReturnType<typeof generateHeartbeat>;

const generators: EventGen[] = [
  (s) => generateHeartbeat(s, AGENT_DEFS[0]),
  (s) => generateHeartbeat(s, AGENT_DEFS[1]),
  (s) => generateHeartbeat(s, AGENT_DEFS[2]),
  (s) => generateTradeResult(s),
  (s) => generateInferenceResult(s),
  (s) => generateRiskCheckRequested(s),
  (s) => generateRiskCheckDecision(s),
  (s) => generateTaskAssignment(s),
  (s) => generatePaymentSettled(s),
];

export function useSyntheticMirrorNode(): UseMirrorNodeResult {
  const stateRef = useRef<SyntheticState>(createSyntheticState());
  const seqRef = useRef(1);
  const [messages, setMessages] = useState<HCSMessage[]>([]);
  const festivalProgress = generateFestivalProgress();

  useEffect(() => {
    const s = stateRef.current;

    // Seed initial task assignment + risk flow for CRE panel
    const seed = [
      generateTaskAssignment(s),
      generateRiskCheckRequested(s),
      generateRiskCheckDecision(s),
    ];
    const seedMessages = seed.map((e) => eventToHCSMessage(e, seqRef.current++));
    setMessages(seedMessages);

    const timer = setInterval(() => {
      const count = Math.random() > 0.5 ? 2 : 1;
      const newMessages: HCSMessage[] = [];

      for (let i = 0; i < count; i++) {
        const gen = generators[Math.floor(Math.random() * generators.length)];
        const event = gen(s);
        newMessages.push(eventToHCSMessage(event, seqRef.current++));
      }

      setMessages((prev) => {
        const next = [...prev, ...newMessages];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    // No-op for synthetic
  }, []);

  return {
    data: messages,
    festivalProgress,
    festivalProgressSource: "synthetic",
    festivalProgressFallbackReason: "mock data mode",
    connectionState: "connected",
    error: null,
    isLoading: false,
    refresh,
  };
}
