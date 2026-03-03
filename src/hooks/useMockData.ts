"use client";

import { useState, useEffect, useRef } from "react";
import type {
  FestivalProgress,
  HCSMessage,
  AgentInfo,
  PnLSummary,
  PnLDataPoint,
  Trade,
  ComputeMetrics,
  StorageMetrics,
  INFTStatus,
  InferenceJob,
  ConnectionState,
  DaemonEventType,
} from "@/lib/data/types";
import {
  generateMockFestivalProgress,
  generateMockHCSMessages,
  generateMockAgents,
  generateMockPnLSummary,
  generateMockPnLChart,
  generateMockTrades,
  generateMockComputeMetrics,
  generateMockStorageMetrics,
  generateMockINFTStatus,
  generateMockInferenceJobs,
} from "@/lib/data/mock";

export interface MockDataResult {
  festivalProgress: FestivalProgress;
  hcsMessages: HCSMessage[];
  agents: AgentInfo[];
  pnlSummary: PnLSummary;
  pnlChart: PnLDataPoint[];
  trades: Trade[];
  compute: ComputeMetrics;
  storage: StorageMetrics;
  inft: INFTStatus;
  inferenceJobs: InferenceJob[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: null;
}

const MSG_TYPES: DaemonEventType[] = [
  "task_assignment", "status_update", "heartbeat",
  "quality_gate", "payment_settled", "task_result", "pnl_report",
  "risk_check_requested", "risk_check_approved", "risk_check_denied",
];
const AGENTS = ["coordinator", "inference", "defi"];
const MESSAGES = [
  "Agent heartbeat: all systems nominal",
  "Task 05_defi_pnl testing in progress",
  "Inference job #5679 completed in 115ms",
  "Trade signal detected: ETH/USDC",
  "Quality gate checkpoint reached",
  "Payment 0.3 HBAR settled",
  "CRE risk requested for execute_trade",
  "CRE risk approved with max_position_usd=810000000",
  "CRE risk denied: signal_confidence_below_threshold",
];

export function useMockData(): MockDataResult {
  const [messages, setMessages] = useState<HCSMessage[]>(() =>
    generateMockHCSMessages(20)
  );
  const [agents, setAgents] = useState<AgentInfo[]>(generateMockAgents);
  const [compute, setCompute] = useState<ComputeMetrics>(
    generateMockComputeMetrics
  );
  const seqRef = useRef(21);

  useEffect(() => {
    const interval = setInterval(() => {
      // Add a new HCS message
      const idx = seqRef.current++;
      const type = MSG_TYPES[idx % MSG_TYPES.length];
      const agent = AGENTS[idx % AGENTS.length];
      const newMsg: HCSMessage = {
        consensusTimestamp: new Date().toISOString(),
        topicId: "0.0.12345",
        sequenceNumber: idx,
        message: MESSAGES[idx % MESSAGES.length],
        messageType: type,
        senderAgent: agent,
        rawMessage: btoa(JSON.stringify({ type })),
      };
      setMessages((prev) => [...prev.slice(-999), newMsg]);

      // Update agent heartbeats
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          lastHeartbeat: new Date(
            Date.now() - Math.random() * 8000
          ).toISOString(),
          uptimeSeconds: a.uptimeSeconds + 4,
        }))
      );

      // Jitter compute metrics
      setCompute((prev) => ({
        ...prev,
        gpuUtilization: Math.min(
          100,
          Math.max(0, prev.gpuUtilization + (Math.random() - 0.5) * 10)
        ),
        memoryUtilization: Math.min(
          100,
          Math.max(0, prev.memoryUtilization + (Math.random() - 0.5) * 5)
        ),
        activeJobs: Math.max(0, prev.activeJobs + Math.round(Math.random() - 0.4)),
        totalInferences: prev.totalInferences + 1,
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return {
    festivalProgress: generateMockFestivalProgress(),
    hcsMessages: messages,
    agents,
    pnlSummary: generateMockPnLSummary(),
    pnlChart: generateMockPnLChart(60),
    trades: generateMockTrades(15),
    compute,
    storage: generateMockStorageMetrics(),
    inft: generateMockINFTStatus(),
    inferenceJobs: generateMockInferenceJobs(8),
    connectionState: "connected",
    isLoading: false,
    error: null,
  };
}
