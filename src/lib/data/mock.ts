import type {
  FestivalProgress,
  HCSMessage,
  DaemonEventType,
  AgentInfo,
  PnLSummary,
  PnLDataPoint,
  Trade,
  ComputeMetrics,
  StorageMetrics,
  INFTStatus,
  InferenceJob,
} from "./types";

const PAYLOADS: Record<DaemonEventType, string[]> = {
  task_assignment: [
    "Assigned task 03_implement_websocket to inference agent",
    "Assigned task 02_design_data_layer to coordinator",
    "Assigned quality gate review to coordinator",
  ],
  status_update: [
    "Task 03_implement_websocket: 45% complete, writing tests",
    "Deploying updated inference model to 0G network",
    "Syncing latest HCS messages from topic 0.0.12345",
  ],
  task_result: [
    "Task 03_implement_websocket completed successfully",
    "Quality gate passed: all tests green",
    "Trade execution completed: ETH/USDC buy at $3,245.50",
  ],
  heartbeat: [
    "GPU: 78% | Memory: 45% | Active jobs: 3",
    "GPU: 82% | Memory: 51% | Active jobs: 4",
    "Idle | Waiting for next trade signal",
  ],
  quality_gate: [
    "Quality gate PASSED for 01_data_layer",
    "Quality gate PASSED for 02_festival_view",
    "Quality gate running for 05_defi_pnl",
  ],
  payment_settled: [
    "Payment 0.5 HBAR settled for task completion",
    "Payment 1.2 HBAR settled for inference job #5678",
    "Gas refund 0.01 HBAR processed",
  ],
  agent_started: ["Agent coordinator initialized and ready"],
  agent_stopped: ["Agent defi entering idle mode"],
  agent_error: ["Temporary 0G compute timeout (resolved)"],
};

export function generateMockFestivalProgress(): FestivalProgress {
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

const AGENTS = ["coordinator", "inference", "defi"] as const;
const MSG_TYPES: DaemonEventType[] = [
  "task_assignment", "status_update", "task_result",
  "heartbeat", "quality_gate", "payment_settled",
];

export function generateMockHCSMessages(count: number): HCSMessage[] {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const type = MSG_TYPES[i % MSG_TYPES.length];
    const agent = AGENTS[i % AGENTS.length];
    const payloads = PAYLOADS[type];
    const payload = payloads[i % payloads.length];
    return {
      consensusTimestamp: new Date((now - count + i) * 1000).toISOString(),
      topicId: "0.0.12345",
      sequenceNumber: i + 1,
      message: payload,
      messageType: type,
      senderAgent: agent,
      rawMessage: btoa(JSON.stringify({ type, agentId: agent })),
    };
  });
}

export function generateMockAgents(): AgentInfo[] {
  return [
    {
      id: "coord-001", name: "coordinator", status: "running",
      lastHeartbeat: new Date(Date.now() - 3000).toISOString(),
      currentTask: "Monitoring 05_defi_pnl sequence execution",
      uptimeSeconds: 4980, errorCount: 0, lastError: null,
    },
    {
      id: "inf-001", name: "inference", status: "running",
      lastHeartbeat: new Date(Date.now() - 5000).toISOString(),
      currentTask: "Running llama-3-8b inference job #5678",
      uptimeSeconds: 4920, errorCount: 1,
      lastError: "Temporary 0G compute timeout at 14:12:03 (resolved)",
    },
    {
      id: "defi-001", name: "defi", status: "idle",
      lastHeartbeat: new Date(Date.now() - 12000).toISOString(),
      currentTask: null,
      uptimeSeconds: 4800, errorCount: 0, lastError: null,
    },
  ];
}

export function generateMockPnLSummary(): PnLSummary {
  return {
    totalRevenue: 1234.56, totalCosts: 456.78, netProfit: 777.78,
    tradeCount: 42, winCount: 30, lossCount: 12, winRate: 71.4,
  };
}

export function generateMockPnLChart(points: number): PnLDataPoint[] {
  const now = Date.now();
  let rev = 0, cost = 0;
  return Array.from({ length: points }, (_, i) => {
    rev += Math.random() * 50 + 10;
    cost += Math.random() * 20 + 5;
    return {
      timestamp: new Date(now - (points - i) * 60000).toISOString(),
      cumulativeRevenue: Math.round(rev * 100) / 100,
      cumulativeCosts: Math.round(cost * 100) / 100,
      cumulativeProfit: Math.round((rev - cost) * 100) / 100,
    };
  });
}

export function generateMockTrades(count: number): Trade[] {
  const pairs = ["ETH/USDC", "WETH/DAI", "USDC/USDT"];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const side = Math.random() > 0.5 ? "buy" : "sell" as const;
    const pnl = (Math.random() - 0.35) * 100;
    return {
      id: `trade-${i}`,
      pair: pairs[i % pairs.length],
      side,
      amount: Math.round(Math.random() * 5 * 10000) / 10000,
      price: 3200 + Math.random() * 200,
      timestamp: new Date(now - (count - i) * 300000).toISOString(),
      pnl: Math.round(pnl * 100) / 100,
      gasCost: Math.round(Math.random() * 5 * 100) / 100,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    };
  });
}

export function generateMockComputeMetrics(): ComputeMetrics {
  return {
    gpuUtilization: 78, memoryUtilization: 45,
    activeJobs: 3, avgLatencyMs: 120, totalInferences: 5678,
  };
}

export function generateMockStorageMetrics(): StorageMetrics {
  return { totalStorageGb: 50.0, usedStorageGb: 12.4, objectCount: 1234 };
}

export function generateMockINFTStatus(): INFTStatus {
  return {
    tokenId: "0.0.98765", status: "active", modelName: "llama-3-8b",
    inferenceCount: 5678, lastActive: new Date(Date.now() - 120000).toISOString(),
  };
}

export function generateMockInferenceJobs(count: number): InferenceJob[] {
  const models = ["llama-3-8b", "mistral-7b", "phi-3-mini"];
  const statuses = ["completed", "completed", "running", "completed", "pending"] as const;
  return Array.from({ length: count }, (_, i) => ({
    id: `job-${i}`,
    model: models[i % models.length],
    status: statuses[i % statuses.length],
    inputTokens: Math.floor(Math.random() * 500) + 50,
    outputTokens: statuses[i % statuses.length] === "running" ? 0 : Math.floor(Math.random() * 300) + 20,
    latencyMs: statuses[i % statuses.length] === "running" ? 0 : Math.floor(Math.random() * 200) + 50,
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
}
