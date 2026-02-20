// ============================================================
// Connection State Types
// ============================================================

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface ConnectorConfig {
  url: string;
  autoReconnect: boolean;
  reconnectDelayMs: number;
  maxReconnectAttempts: number;
}

export interface DataHookResult<T> {
  data: T | null;
  connectionState: ConnectionState;
  error: Error | null;
  isLoading: boolean;
}

// ============================================================
// Daemon Event Types (WebSocket + gRPC)
// ============================================================

export type DaemonEventType =
  | "task_assignment"
  | "status_update"
  | "task_result"
  | "heartbeat"
  | "quality_gate"
  | "payment_settled"
  | "agent_started"
  | "agent_stopped"
  | "agent_error";

export interface DaemonEvent {
  type: DaemonEventType;
  agentId: string;
  agentName: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export type AgentStatus = "running" | "idle" | "error" | "stopped";

export interface AgentInfo {
  id: string;
  name: string;
  status: AgentStatus;
  lastHeartbeat: string;
  currentTask: string | null;
  uptimeSeconds: number;
  errorCount: number;
  lastError: string | null;
}

// ============================================================
// HCS Message Types (Mirror Node + WebSocket)
// ============================================================

export interface HCSMessage {
  consensusTimestamp: string;
  topicId: string;
  sequenceNumber: number;
  message: string;
  messageType: DaemonEventType;
  senderAgent: string;
  rawMessage: string;
}

export interface HCSFeedFilter {
  messageTypes?: DaemonEventType[];
  senderAgent?: string;
  topicId?: string;
}

// ============================================================
// DeFi P&L Types (Base Chain)
// ============================================================

export interface Trade {
  id: string;
  pair: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: string;
  pnl: number;
  gasCost: number;
  txHash: string;
}

export interface PnLSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

export interface PnLDataPoint {
  timestamp: string;
  cumulativeRevenue: number;
  cumulativeCosts: number;
  cumulativeProfit: number;
}

// ============================================================
// Inference & 0G Metrics Types
// ============================================================

export interface ComputeMetrics {
  gpuUtilization: number;
  memoryUtilization: number;
  activeJobs: number;
  avgLatencyMs: number;
  totalInferences: number;
}

export interface StorageMetrics {
  totalStorageGb: number;
  usedStorageGb: number;
  objectCount: number;
}

export interface INFTStatus {
  tokenId: string;
  status: "active" | "minting" | "inactive";
  modelName: string;
  inferenceCount: number;
  lastActive: string;
}

export interface InferenceJob {
  id: string;
  model: string;
  status: "pending" | "running" | "completed" | "failed";
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  timestamp: string;
}

// ============================================================
// Festival View Types
// ============================================================

export type FestivalEntityStatus =
  | "pending"
  | "active"
  | "completed"
  | "blocked"
  | "failed";

export interface FestivalTask {
  id: string;
  name: string;
  status: FestivalEntityStatus;
  autonomy: "low" | "medium" | "high";
}

export interface FestivalSequence {
  id: string;
  name: string;
  status: FestivalEntityStatus;
  tasks: FestivalTask[];
  completionPercent: number;
}

export interface FestivalPhase {
  id: string;
  name: string;
  status: FestivalEntityStatus;
  sequences: FestivalSequence[];
  completionPercent: number;
}

export interface FestivalProgress {
  festivalId: string;
  festivalName: string;
  phases: FestivalPhase[];
  overallCompletionPercent: number;
}

// ============================================================
// Connector Interfaces
// ============================================================

export interface WebSocketConfig extends ConnectorConfig {
  protocols?: string[];
}

export interface GRPCConfig extends ConnectorConfig {
  useRestFallback: boolean;
}

export interface MirrorNodeConfig {
  baseUrl: string;
  pollingIntervalMs: number;
  topicIds: string[];
}

// ============================================================
// Hook Return Types
// ============================================================

export interface UseWebSocketResult extends DataHookResult<DaemonEvent[]> {
  agents: AgentInfo[];
  reconnect: () => void;
}

export interface UseGRPCResult extends DataHookResult<DaemonEvent[]> {
  agents: AgentInfo[];
  isGRPC: boolean;
}

export interface UseMirrorNodeResult extends DataHookResult<HCSMessage[]> {
  festivalProgress: FestivalProgress | null;
  refresh: () => void;
}
