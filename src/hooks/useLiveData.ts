"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useMirrorNode } from "./useMirrorNode";
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
  DaemonEvent,
} from "@/lib/data/types";

export interface LiveDataResult {
  festivalProgress: FestivalProgress | null;
  hcsMessages: HCSMessage[];
  agents: AgentInfo[];
  pnlSummary: PnLSummary | null;
  pnlChart: PnLDataPoint[];
  trades: Trade[];
  compute: ComputeMetrics | null;
  storage: StorageMetrics | null;
  inft: INFTStatus | null;
  inferenceJobs: InferenceJob[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
}

const MAX_TRADES = 100;
const MAX_CHART_POINTS = 120;
const MAX_JOBS = 50;

export function useLiveData(): LiveDataResult {
  const ws = useWebSocket();
  const mirror = useMirrorNode();

  const [pnlSummary, setPnlSummary] = useState<PnLSummary | null>(null);
  const [pnlChart, setPnlChart] = useState<PnLDataPoint[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [compute, setCompute] = useState<ComputeMetrics | null>(null);
  const [storage, setStorage] = useState<StorageMetrics | null>(null);
  const [inft, setInft] = useState<INFTStatus | null>(null);
  const [inferenceJobs, setInferenceJobs] = useState<InferenceJob[]>([]);

  // Process incoming WebSocket events to extract structured data
  useEffect(() => {
    if (!ws.data || ws.data.length === 0) return;

    // Process only the latest events since last render
    const events = ws.data;
    const latest = events[events.length - 1];
    if (!latest) return;

    processEvent(latest);
  }, [ws.data?.length]);

  const processEvent = useCallback((event: DaemonEvent) => {
    const p = event.payload;

    switch (event.type) {
      case "heartbeat": {
        // Inference agent heartbeats carry compute metrics
        if (event.agentId?.includes("inference") || event.agentName?.includes("inference")) {
          if (p.gpuUtilization !== undefined) {
            setCompute({
              gpuUtilization: p.gpuUtilization as number,
              memoryUtilization: (p.memoryUtilization as number) ?? 0,
              activeJobs: (p.activeJobs as number) ?? 0,
              avgLatencyMs: (p.avgLatencyMs as number) ?? 0,
              totalInferences: (p.totalInferences as number) ?? 0,
            });
          }
          if (p.storage) {
            const s = p.storage as Record<string, unknown>;
            setStorage({
              totalStorageGb: (s.totalStorageGb as number) ?? 0,
              usedStorageGb: (s.usedStorageGb as number) ?? 0,
              objectCount: (s.objectCount as number) ?? 0,
            });
          }
          if (p.inft) {
            const i = p.inft as Record<string, unknown>;
            setInft({
              tokenId: (i.tokenId as string) ?? "",
              status: (i.status as INFTStatus["status"]) ?? "inactive",
              modelName: (i.modelName as string) ?? "",
              inferenceCount: (i.inferenceCount as number) ?? 0,
              lastActive: (i.lastActive as string) ?? event.timestamp,
            });
          }
        }
        break;
      }

      case "task_result": {
        // Inference job completions
        if (p.jobId || p.model) {
          const job: InferenceJob = {
            id: (p.jobId as string) ?? `job-${Date.now()}`,
            model: (p.model as string) ?? "unknown",
            status: (p.status as InferenceJob["status"]) ?? "completed",
            inputTokens: (p.inputTokens as number) ?? 0,
            outputTokens: (p.outputTokens as number) ?? 0,
            latencyMs: (p.latencyMs as number) ?? 0,
            timestamp: event.timestamp,
          };
          setInferenceJobs((prev) => {
            const next = [...prev, job];
            return next.length > MAX_JOBS ? next.slice(-MAX_JOBS) : next;
          });
        }

        // Trade results from DeFi agent
        if (p.txHash || p.pair) {
          const trade: Trade = {
            id: (p.tradeId as string) ?? `trade-${Date.now()}`,
            pair: (p.pair as string) ?? "ETH/USDC",
            side: (p.side as Trade["side"]) ?? "buy",
            amount: (p.amount as number) ?? 0,
            price: (p.price as number) ?? 0,
            timestamp: event.timestamp,
            pnl: (p.pnl as number) ?? 0,
            gasCost: (p.gasCost as number) ?? 0,
            txHash: (p.txHash as string) ?? "",
          };
          setTrades((prev) => {
            const next = [...prev, trade];
            return next.length > MAX_TRADES ? next.slice(-MAX_TRADES) : next;
          });

          // Update running P&L summary
          setPnlSummary((prev) => {
            const isWin = trade.pnl > 0;
            const s = prev ?? {
              totalRevenue: 0, totalCosts: 0, netProfit: 0,
              tradeCount: 0, winCount: 0, lossCount: 0, winRate: 0,
            };
            const totalRevenue = s.totalRevenue + Math.max(0, trade.pnl);
            const totalCosts = s.totalCosts + trade.gasCost + Math.abs(Math.min(0, trade.pnl));
            const tradeCount = s.tradeCount + 1;
            const winCount = s.winCount + (isWin ? 1 : 0);
            const lossCount = s.lossCount + (isWin ? 0 : 1);
            return {
              totalRevenue,
              totalCosts,
              netProfit: totalRevenue - totalCosts,
              tradeCount,
              winCount,
              lossCount,
              winRate: tradeCount > 0 ? Math.round((winCount / tradeCount) * 1000) / 10 : 0,
            };
          });

          // Append chart data point
          setPnlChart((prev) => {
            const last = prev[prev.length - 1];
            const cumRev = (last?.cumulativeRevenue ?? 0) + Math.max(0, trade.pnl);
            const cumCost = (last?.cumulativeCosts ?? 0) + trade.gasCost + Math.abs(Math.min(0, trade.pnl));
            const point: PnLDataPoint = {
              timestamp: event.timestamp,
              cumulativeRevenue: Math.round(cumRev * 100) / 100,
              cumulativeCosts: Math.round(cumCost * 100) / 100,
              cumulativeProfit: Math.round((cumRev - cumCost) * 100) / 100,
            };
            const next = [...prev, point];
            return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
          });
        }
        break;
      }

      case "payment_settled": {
        // Could also update P&L from payment events
        if (p.amount && p.txHash) {
          const trade: Trade = {
            id: (p.paymentId as string) ?? `pay-${Date.now()}`,
            pair: "HBAR/USD",
            side: "sell",
            amount: (p.amount as number) ?? 0,
            price: 1,
            timestamp: event.timestamp,
            pnl: (p.amount as number) ?? 0,
            gasCost: (p.fee as number) ?? 0,
            txHash: (p.txHash as string) ?? "",
          };
          setTrades((prev) => {
            const next = [...prev, trade];
            return next.length > MAX_TRADES ? next.slice(-MAX_TRADES) : next;
          });
        }
        break;
      }
    }
  }, []);

  // Derive overall connection state
  const connectionState: ConnectionState =
    ws.connectionState === "connected" || mirror.connectionState === "connected"
      ? "connected"
      : ws.connectionState === "connecting" || mirror.connectionState === "connecting"
        ? "connecting"
        : ws.connectionState === "error" || mirror.connectionState === "error"
          ? "error"
          : "disconnected";

  return {
    festivalProgress: mirror.festivalProgress,
    hcsMessages: mirror.data ?? [],
    agents: ws.agents,
    pnlSummary,
    pnlChart,
    trades,
    compute,
    storage,
    inft,
    inferenceJobs,
    connectionState,
    isLoading: ws.isLoading || mirror.isLoading,
    error: ws.error || mirror.error,
  };
}
