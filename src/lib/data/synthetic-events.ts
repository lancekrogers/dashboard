import type {
  DaemonEvent,
  DaemonEventType,
  HCSMessage,
  FestivalProgress,
} from "./types";
import { AGENT_LOG_ENTRIES } from "./agent-log-data";

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
  vaultDecisionIndex: number;
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
    vaultDecisionIndex: 0,
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
// Vault decision generator (replays real agent_log.json data)
// ============================================================

export function generateVaultDecision(state: SyntheticState): DaemonEvent {
  const entry = AGENT_LOG_ENTRIES[state.vaultDecisionIndex % AGENT_LOG_ENTRIES.length];
  state.vaultDecisionIndex++;

  return {
    type: "vault_decision" as DaemonEventType,
    agentId: "defi-001",
    agentName: "defi",
    timestamp: now(),
    payload: {
      timestamp: entry.timestamp,
      phase: entry.phase,
      action: entry.action,
      festival_id: entry.festival_id,
      tools_used: entry.tools_used,
      decision: entry.decision,
      reasoning: entry.reasoning,
      execution: entry.execution ?? undefined,
      verification: entry.verification ?? undefined,
      duration_ms: entry.duration_ms,
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

// Real festival data from: fest show --festival synthesis-fest-ritual-runtime-SF0002
// and fest show --festival agent-market-research-RI-AM0001-0009
export function generateFestivalProgress(): FestivalProgress {
  return {
    festivalId: "SF0002",
    festivalName: "synthesis-fest-ritual-runtime",
    overallCompletionPercent: 100,
    phases: [
      {
        id: "001_IMPLEMENT",
        name: "IMPLEMENT",
        status: "completed",
        completionPercent: 100,
        sequences: [
          {
            id: "01_ritual_contract", name: "ritual_contract", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "audit_current_ritual_template", status: "completed", autonomy: "medium" },
              { id: "02", name: "define_artifact_contract", status: "completed", autonomy: "medium" },
              { id: "03", name: "tighten_unattended_workflow", status: "completed", autonomy: "medium" },
              { id: "04", name: "validate_go_and_no_go_paths", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "02_fest_runtime_bridge", name: "fest_runtime_bridge", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "map_fest_cli_command_contract", status: "completed", autonomy: "medium" },
              { id: "02", name: "implement_ritual_run_invocation", status: "completed", autonomy: "medium" },
              { id: "03", name: "add_run_inspection_and_timeouts", status: "completed", autonomy: "medium" },
              { id: "04", name: "resolve_artifact_paths", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "03_obey_daemon_runtime", name: "obey_daemon_runtime", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "extend_obey_session_wrapper", status: "completed", autonomy: "medium" },
              { id: "02", name: "add_daemon_preflight_and_logging", status: "completed", autonomy: "medium" },
              { id: "03", name: "bind_session_to_ritual_workdir", status: "completed", autonomy: "medium" },
              { id: "04", name: "verify_non_deterministic_runtime", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "04_ritual_decision_loop", name: "ritual_decision_loop", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "insert_ritual_at_cycle_start", status: "completed", autonomy: "medium" },
              { id: "02", name: "parse_decision_json", status: "completed", autonomy: "medium" },
              { id: "03", name: "gate_trades_on_ritual_go", status: "completed", autonomy: "medium" },
              { id: "04", name: "preserve_rationale_and_guardrails", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "05_artifact_aggregation", name: "artifact_aggregation", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "refactor_or_wrap_loggen", status: "completed", autonomy: "medium" },
              { id: "02", name: "refresh_agent_log_after_cycle", status: "completed", autonomy: "medium" },
              { id: "03", name: "verify_archived_artifact_intake", status: "completed", autonomy: "medium" },
              { id: "04", name: "document_protocol_labs_evidence", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "06_end_to_end_verification", name: "end_to_end_verification", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "run_live_daemon_backed_ritual_cycles", status: "completed", autonomy: "medium" },
              { id: "02", name: "verify_go_and_no_go_outcomes", status: "completed", autonomy: "medium" },
              { id: "03", name: "rehearse_demo_evidence", status: "completed", autonomy: "medium" },
              { id: "04", name: "stabilize_final_blockers", status: "completed", autonomy: "medium" },
              { id: "05", name: "testing", status: "completed", autonomy: "medium" },
              { id: "06", name: "review", status: "completed", autonomy: "low" },
              { id: "07", name: "iterate", status: "completed", autonomy: "medium" },
              { id: "08", name: "fest_commit", status: "completed", autonomy: "medium" },
            ],
          },
        ],
      },
    ],
  };
}

// Real ritual run data from: fest show --festival agent-market-research-RI-AM0001-0009
export function generateRitualProgress(): FestivalProgress {
  return {
    festivalId: "RI-AM0001-0009",
    festivalName: "agent-market-research",
    overallCompletionPercent: 100,
    phases: [
      {
        id: "001_INGEST", name: "INGEST", status: "completed", completionPercent: 100,
        sequences: [
          {
            id: "01_ingest_steps", name: "market_data_collection", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "QUERY POOL STATE", status: "completed", autonomy: "high" },
              { id: "02", name: "COLLECT PRICE HISTORY", status: "completed", autonomy: "high" },
              { id: "03", name: "GET VOLUME AND VOLATILITY", status: "completed", autonomy: "high" },
              { id: "04", name: "QUERY VAULT STATE", status: "completed", autonomy: "high" },
              { id: "05", name: "VALIDATE AND PACKAGE", status: "completed", autonomy: "high" },
            ],
          },
        ],
      },
      {
        id: "002_RESEARCH", name: "RESEARCH", status: "completed", completionPercent: 100,
        sequences: [
          {
            id: "01_analysis_steps", name: "signal_analysis", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "COMPUTE MOVING AVERAGE", status: "completed", autonomy: "high" },
              { id: "02", name: "CALCULATE PRICE DEVIATION", status: "completed", autonomy: "high" },
              { id: "03", name: "RUN CRE RISK GATES", status: "completed", autonomy: "high" },
              { id: "04", name: "SCORE OPPORTUNITY", status: "completed", autonomy: "high" },
              { id: "05", name: "SYNTHESIZE FINDINGS", status: "completed", autonomy: "high" },
            ],
          },
        ],
      },
      {
        id: "003_DECIDE", name: "DECIDE", status: "completed", completionPercent: 100,
        sequences: [
          {
            id: "01_synthesize_decision", name: "synthesize_decision", status: "completed", completionPercent: 100,
            tasks: [
              { id: "01", name: "aggregate_findings", status: "completed", autonomy: "medium" },
              { id: "02", name: "produce_decision", status: "completed", autonomy: "medium" },
              { id: "03", name: "generate_log_entry", status: "completed", autonomy: "medium" },
              { id: "04", name: "validate_decision", status: "completed", autonomy: "medium" },
              { id: "05", name: "review_rationale", status: "completed", autonomy: "low" },
              { id: "06", name: "iterate_if_needed", status: "completed", autonomy: "medium" },
            ],
          },
        ],
      },
    ],
  };
}
