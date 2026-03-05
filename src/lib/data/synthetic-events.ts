import type {
  DaemonEvent,
  DaemonEventType,
  HCSMessage,
  FestivalProgress,
} from "./types";

// ============================================================
// Internal state for stateful event generation
// ============================================================

export interface SyntheticState {
  ethPrice: number;
  totalRevenue: number;
  totalCosts: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  jobCounter: number;
  tradeCounter: number;
  gpuUtilization: number;
  memoryUtilization: number;
  activeJobs: number;
  totalInferences: number;
  pendingRiskCheck: { taskId: string; recipient: string } | null;
}

export function createSyntheticState(): SyntheticState {
  return {
    ethPrice: 3200 + (Math.random() - 0.5) * 100,
    totalRevenue: 0,
    totalCosts: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    jobCounter: 5670,
    tradeCounter: 0,
    gpuUtilization: 75 + Math.random() * 10,
    memoryUtilization: 40 + Math.random() * 10,
    activeJobs: 3,
    totalInferences: 5678,
    pendingRiskCheck: null,
  };
}

// ============================================================
// Agent definitions
// ============================================================

interface AgentDef {
  id: string;
  name: string;
}

export const AGENT_DEFS: AgentDef[] = [
  { id: "coord-001", name: "coordinator" },
  { id: "inf-001", name: "inference" },
  { id: "defi-001", name: "defi" },
];

// ============================================================
// Helpers
// ============================================================

function now(): string {
  return new Date().toISOString();
}

function randomHex(len: number): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// Random walk with mean reversion
function jitter(current: number, mean: number, scale: number, min: number, max: number): number {
  const drift = (mean - current) * 0.1;
  return clamp(current + drift + (Math.random() - 0.5) * scale, min, max);
}

// ============================================================
// Event generators
// ============================================================

export function generateHeartbeat(state: SyntheticState, agent: AgentDef): DaemonEvent {
  const base: DaemonEvent = {
    type: "heartbeat",
    agentId: agent.id,
    agentName: agent.name,
    timestamp: now(),
    payload: {},
  };

  if (agent.name === "inference") {
    state.gpuUtilization = jitter(state.gpuUtilization, 78, 10, 20, 98);
    state.memoryUtilization = jitter(state.memoryUtilization, 45, 5, 15, 85);
    state.activeJobs = clamp(state.activeJobs + Math.round((Math.random() - 0.45) * 1.5), 0, 8);

    base.payload = {
      gpuUtilization: Math.round(state.gpuUtilization * 10) / 10,
      memoryUtilization: Math.round(state.memoryUtilization * 10) / 10,
      activeJobs: state.activeJobs,
      avgLatencyMs: Math.floor(80 + Math.random() * 80),
      totalInferences: state.totalInferences,
      storage: {
        totalStorageGb: 50.0,
        usedStorageGb: 12.4 + state.totalInferences * 0.001,
        objectCount: 1234 + state.totalInferences,
      },
      inft: {
        tokenId: "0.0.98765",
        status: "active",
        modelName: "llama-3-8b",
        inferenceCount: state.totalInferences,
        lastActive: now(),
      },
    };
  } else if (agent.name === "coordinator") {
    base.payload = { monitoringSequence: "05_defi_pnl" };
  } else {
    base.payload = { status: state.tradeCount > 0 ? "idle" : "warming_up" };
  }

  return base;
}

export function generateTradeResult(state: SyntheticState): DaemonEvent {
  // Random walk ETH price
  state.ethPrice += (Math.random() - 0.48) * 15;
  state.ethPrice = clamp(state.ethPrice, 2800, 3600);

  state.tradeCounter++;
  const side = Math.random() > 0.5 ? "buy" : "sell";
  const amount = Math.round((Math.random() * 3 + 0.1) * 10000) / 10000;
  const pnl = Math.round((Math.random() - 0.35) * 80 * 100) / 100;
  const gasCost = Math.round(Math.random() * 4 * 100) / 100;
  const isWin = pnl > 0;

  state.totalRevenue += Math.max(0, pnl);
  state.totalCosts += gasCost + Math.abs(Math.min(0, pnl));
  state.tradeCount++;
  if (isWin) state.winCount++;
  else state.lossCount++;

  return {
    type: "task_result",
    agentId: "defi-001",
    agentName: "defi",
    timestamp: now(),
    payload: {
      txHash: `0x${randomHex(64)}`,
      pair: ["ETH/USDC", "WETH/DAI", "USDC/USDT"][state.tradeCounter % 3],
      side,
      amount,
      price: Math.round(state.ethPrice * 100) / 100,
      pnl,
      gasCost,
      tradeId: `trade-${state.tradeCounter}`,
    },
  };
}

export function generateInferenceResult(state: SyntheticState): DaemonEvent {
  state.jobCounter++;
  state.totalInferences++;

  const models = ["llama-3-8b", "mistral-7b", "phi-3-mini"];
  return {
    type: "task_result",
    agentId: "inf-001",
    agentName: "inference",
    timestamp: now(),
    payload: {
      jobId: `job-${state.jobCounter}`,
      model: models[state.jobCounter % models.length],
      status: "completed",
      inputTokens: Math.floor(Math.random() * 400) + 80,
      outputTokens: Math.floor(Math.random() * 300) + 30,
      latencyMs: Math.floor(Math.random() * 180) + 40,
    },
  };
}

export function generatePnLReport(state: SyntheticState): DaemonEvent {
  const winRate = state.tradeCount > 0
    ? Math.round((state.winCount / state.tradeCount) * 1000) / 10
    : 0;

  return {
    type: "pnl_report",
    agentId: "defi-001",
    agentName: "defi",
    timestamp: now(),
    payload: {
      totalRevenue: Math.round(state.totalRevenue * 100) / 100,
      totalCosts: Math.round(state.totalCosts * 100) / 100,
      netProfit: Math.round((state.totalRevenue - state.totalCosts) * 100) / 100,
      tradeCount: state.tradeCount,
      winCount: state.winCount,
      lossCount: state.lossCount,
      winRate,
    },
  };
}

export function generateRiskCheckRequested(state: SyntheticState): DaemonEvent {
  const taskId = `task-${Date.now().toString(36)}`;
  state.pendingRiskCheck = { taskId, recipient: "defi-001" };

  return {
    type: "risk_check_requested",
    agentId: "coord-001",
    agentName: "coordinator",
    timestamp: now(),
    payload: {
      task_id: taskId,
      recipient: "defi-001",
      payload: { reason: "requested" },
    },
  };
}

export function generateRiskCheckDecision(state: SyntheticState): DaemonEvent {
  const pending = state.pendingRiskCheck;
  const taskId = pending?.taskId ?? `task-${Date.now().toString(36)}`;
  const recipient = pending?.recipient ?? "defi-001";
  state.pendingRiskCheck = null;

  const approved = Math.random() < 0.75;
  const type: DaemonEventType = approved ? "risk_check_approved" : "risk_check_denied";

  return {
    type,
    agentId: "coord-001",
    agentName: "coordinator",
    timestamp: now(),
    payload: {
      task_id: taskId,
      recipient,
      payload: {
        reason: approved
          ? "approved"
          : ["signal_confidence_below_threshold", "cre_unreachable", "position_limit_exceeded"][
              Math.floor(Math.random() * 3)
            ],
      },
    },
  };
}

export function generatePaymentSettled(state: SyntheticState): DaemonEvent {
  const amount = Math.round((Math.random() * 2 + 0.1) * 100) / 100;
  return {
    type: "payment_settled",
    agentId: "defi-001",
    agentName: "defi",
    timestamp: now(),
    payload: {
      paymentId: `pay-${Date.now().toString(36)}`,
      amount,
      fee: Math.round(Math.random() * 0.05 * 100) / 100,
      txHash: `0x${randomHex(64)}`,
    },
  };
}

export function generateTaskAssignment(state: SyntheticState): DaemonEvent {
  const taskId = `task-${Date.now().toString(36)}`;
  return {
    type: "task_assignment",
    agentId: "coord-001",
    agentName: "coordinator",
    timestamp: now(),
    payload: {
      task_id: taskId,
      payload: {
        cre_decision: {
          max_position_usd: Math.floor(500_000_000 + Math.random() * 500_000_000),
          max_slippage_bps: Math.floor(10 + Math.random() * 40),
        },
      },
    },
  };
}

// ============================================================
// HCS message conversion
// ============================================================

export function eventToHCSMessage(event: DaemonEvent, seqNum: number): HCSMessage {
  // Build envelope that CREDecisions.tsx can parse
  const envelope: Record<string, unknown> = {
    type: event.type,
    agentId: event.agentId,
    ...event.payload,
  };

  const messageStr = JSON.stringify(envelope);

  return {
    consensusTimestamp: event.timestamp,
    topicId: "0.0.12345",
    sequenceNumber: seqNum,
    message: messageStr,
    messageType: event.type,
    senderAgent: event.agentName,
    rawMessage: btoa(messageStr),
  };
}

// ============================================================
// Static festival progress (moved from mock.ts)
// ============================================================

export function generateFestivalProgress(): FestivalProgress {
  return {
    festivalId: "DA0001",
    festivalName: "dashboard",
    overallCompletionPercent: 72,
    phases: [
      {
        id: "001_IMPLEMENT",
        name: "IMPLEMENT",
        status: "active",
        completionPercent: 72,
        sequences: [
          {
            id: "01_data_layer", name: "data_layer", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "link_project", status: "completed", autonomy: "medium" },
              { id: "02", name: "design_data_layer", status: "completed", autonomy: "medium" },
              { id: "03", name: "implement_websocket", status: "completed", autonomy: "medium" },
              { id: "04", name: "implement_grpc", status: "completed", autonomy: "medium" },
              { id: "05", name: "implement_mirror_node", status: "completed", autonomy: "medium" },
              { id: "06", name: "testing", status: "completed", autonomy: "medium" },
              { id: "07", name: "review", status: "completed", autonomy: "low" },
              { id: "08", name: "iterate", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "02_festival_view", name: "festival_view", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "design_component", status: "completed", autonomy: "medium" },
              { id: "02", name: "implement_panel", status: "completed", autonomy: "medium" },
              { id: "03", name: "testing", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "03_hcs_feed", name: "hcs_feed", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "design_component", status: "completed", autonomy: "medium" },
              { id: "02", name: "implement_panel", status: "completed", autonomy: "medium" },
              { id: "03", name: "testing", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "04_agent_activity", name: "agent_activity", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "design_component", status: "completed", autonomy: "medium" },
              { id: "02", name: "implement_panel", status: "completed", autonomy: "medium" },
              { id: "03", name: "testing", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "05_defi_pnl", name: "defi_pnl", status: "active", completionPercent: 60,
            tasks: [
              { id: "01", name: "design_component", status: "completed", autonomy: "medium" },
              { id: "02", name: "implement_panel", status: "completed", autonomy: "medium" },
              { id: "03", name: "testing", status: "active", autonomy: "medium" },
              { id: "04", name: "review", status: "pending", autonomy: "low" },
              { id: "05", name: "iterate", status: "pending", autonomy: "medium" },
            ],
          },
          {
            id: "06_inference_metrics", name: "inference_metrics", status: "pending", completionPercent: 0,
            tasks: [
              { id: "01", name: "design_component", status: "pending", autonomy: "medium" },
              { id: "02", name: "implement_panel", status: "pending", autonomy: "medium" },
              { id: "03", name: "testing", status: "pending", autonomy: "medium" },
            ],
          },
          {
            id: "07_demo_polish", name: "demo_polish", status: "pending", completionPercent: 0,
            tasks: [
              { id: "01", name: "layout_tuning", status: "pending", autonomy: "medium" },
              { id: "02", name: "mock_data", status: "pending", autonomy: "medium" },
              { id: "03", name: "performance_verify", status: "pending", autonomy: "medium" },
            ],
          },
        ],
      },
    ],
  };
}
