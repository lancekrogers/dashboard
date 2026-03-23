"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UseWebSocketResult, DaemonEvent, AgentInfo } from "@/lib/data/types";
import {
  createSyntheticState,
  AGENT_DEFS,
  generateHeartbeat,
  generateTradeResult,
  generateInferenceResult,
  generateRiskCheckRequested,
  generateRiskCheckDecision,
  generatePnLReport,
  generatePaymentSettled,
  generateTaskAssignment,
  generateVaultDecision,
  type SyntheticState,
} from "@/lib/data/synthetic-events";

const MAX_EVENTS = 1000;

function deriveAgents(state: SyntheticState): AgentInfo[] {
  return AGENT_DEFS.map((a) => ({
    id: a.id,
    name: a.name,
    status: "running" as const,
    lastHeartbeat: new Date().toISOString(),
    currentTask:
      a.name === "coordinator"
        ? "Monitoring 05_defi_pnl sequence execution"
        : a.name === "inference"
          ? `Running llama-3-8b inference job #${state.jobCounter}`
          : state.tradeCount > 0
            ? null
            : "Warming up DeFi strategy",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    errorCount: a.name === "inference" ? 1 : 0,
    lastError:
      a.name === "inference"
        ? "Temporary 0G compute timeout (resolved)"
        : null,
  }));
}

const startTime = Date.now();

export function useSyntheticWebSocket(): UseWebSocketResult {
  const stateRef = useRef<SyntheticState>(createSyntheticState());
  const [events, setEvents] = useState<DaemonEvent[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>(() =>
    deriveAgents(stateRef.current)
  );

  const pushEvent = useCallback((event: DaemonEvent) => {
    setEvents((prev) => {
      const next = [...prev, event];
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
    });
  }, []);

  useEffect(() => {
    const s = stateRef.current;

    // Heartbeats: every 5s, one per agent (staggered)
    const heartbeatTimers = AGENT_DEFS.map((agent, i) =>
      setInterval(() => {
        pushEvent(generateHeartbeat(s, agent));
        setAgents(deriveAgents(s));
      }, 5000)
    );

    // Stagger initial heartbeats
    AGENT_DEFS.forEach((agent, i) => {
      setTimeout(() => {
        pushEvent(generateHeartbeat(s, agent));
        setAgents(deriveAgents(s));
      }, i * 500);
    });

    // Trade results: 15-30s
    const tradeTimer = setInterval(() => {
      pushEvent(generateTradeResult(s));
    }, 15000 + Math.random() * 15000);

    // Kick off first trade quickly
    const firstTrade = setTimeout(() => pushEvent(generateTradeResult(s)), 3000);

    // Inference results: 10-20s
    const inferenceTimer = setInterval(() => {
      pushEvent(generateInferenceResult(s));
    }, 10000 + Math.random() * 10000);

    const firstInference = setTimeout(
      () => pushEvent(generateInferenceResult(s)),
      2000
    );

    // Risk checks: 20-40s request, +2-5s decision
    const riskTimer = setInterval(() => {
      pushEvent(generateRiskCheckRequested(s));
      setTimeout(() => {
        pushEvent(generateRiskCheckDecision(s));
      }, 2000 + Math.random() * 3000);
    }, 20000 + Math.random() * 20000);

    // Kick off first risk check quickly
    const firstRisk = setTimeout(() => {
      pushEvent(generateRiskCheckRequested(s));
      setTimeout(() => pushEvent(generateRiskCheckDecision(s)), 2500);
    }, 4000);

    // PnL report: 60s
    const pnlTimer = setInterval(() => {
      pushEvent(generatePnLReport(s));
    }, 60000);

    // Payment settled: 30-60s
    const paymentTimer = setInterval(() => {
      pushEvent(generatePaymentSettled(s));
    }, 30000 + Math.random() * 30000);

    // Task assignment: 45-90s
    const taskTimer = setInterval(() => {
      pushEvent(generateTaskAssignment(s));
    }, 45000 + Math.random() * 45000);

    // Kick off first task assignment quickly for CRE panel
    const firstTask = setTimeout(() => pushEvent(generateTaskAssignment(s)), 1000);

    // Vault decisions: replay real agent_log.json entries every 8s
    const vaultTimer = setInterval(() => {
      pushEvent(generateVaultDecision(s));
    }, 8000);

    // Kick off first vault decision quickly
    const firstVault = setTimeout(() => pushEvent(generateVaultDecision(s)), 1500);

    return () => {
      heartbeatTimers.forEach(clearInterval);
      clearInterval(tradeTimer);
      clearInterval(inferenceTimer);
      clearInterval(riskTimer);
      clearInterval(pnlTimer);
      clearInterval(paymentTimer);
      clearInterval(taskTimer);
      clearInterval(vaultTimer);
      clearTimeout(firstTrade);
      clearTimeout(firstInference);
      clearTimeout(firstRisk);
      clearTimeout(firstTask);
      clearTimeout(firstVault);
    };
  }, [pushEvent]);

  const reconnect = useCallback(() => {
    // No-op for synthetic
  }, []);

  return {
    data: events,
    agents,
    connectionState: "connected",
    error: null,
    isLoading: false,
    reconnect,
  };
}
