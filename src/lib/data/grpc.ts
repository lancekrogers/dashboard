import {
  ConnectionState,
  GRPCConfig,
  DaemonEvent,
  AgentInfo,
} from "./types";

const DEFAULT_CONFIG: GRPCConfig = {
  url: process.env.NEXT_PUBLIC_DAEMON_GRPC_URL || "http://localhost:9090",
  autoReconnect: true,
  reconnectDelayMs: 3000,
  maxReconnectAttempts: 0,
  useRestFallback: true,
};

const MAX_BACKOFF_MS = 30000;
const BACKOFF_MULTIPLIER = 1.5;

type EventListener = (event: DaemonEvent) => void;
type StateListener = (state: ConnectionState) => void;

export class GRPCConnector {
  private config: GRPCConfig;
  private state: ConnectionState = "disconnected";
  private agents = new Map<string, AgentInfo>();
  private eventListeners = new Set<EventListener>();
  private stateListeners = new Set<StateListener>();
  private reconnectAttempts = 0;
  private currentDelay: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean;
  private eventSource: EventSource | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastTimestamp = "";
  private useSSE = true;

  constructor(config: Partial<GRPCConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentDelay = this.config.reconnectDelayMs;
    this.shouldReconnect = this.config.autoReconnect;
  }

  connect(): void {
    this.shouldReconnect = this.config.autoReconnect;

    if (this.config.useRestFallback) {
      if (this.useSSE) {
        this.connectSSE();
      } else {
        this.connectPolling();
      }
    } else {
      // gRPC-web would go here; for now fall through to SSE
      this.connectSSE();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.setState("disconnected");
  }

  onEvent(callback: EventListener): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  onStateChange(callback: StateListener): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  getAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private connectSSE(): void {
    this.setState("connecting");

    try {
      this.eventSource = new EventSource(
        `${this.config.url}/api/events/stream`
      );
    } catch {
      this.useSSE = false;
      this.connectPolling();
      return;
    }

    this.eventSource.onopen = () => {
      this.setState("connected");
      this.reconnectAttempts = 0;
      this.currentDelay = this.config.reconnectDelayMs;
    };

    this.eventSource.onerror = () => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.eventSource = null;
        this.setState("disconnected");
        this.scheduleReconnect();
      } else {
        this.setState("error");
      }
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleRawMessage(event.data as string);
    };
  }

  private connectPolling(): void {
    this.setState("connecting");

    // Initial fetch to confirm connectivity
    this.pollEvents()
      .then(() => {
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.currentDelay = this.config.reconnectDelayMs;

        this.pollingInterval = setInterval(() => {
          this.pollEvents().catch(() => {
            this.setState("error");
          });
        }, this.config.reconnectDelayMs);
      })
      .catch(() => {
        this.setState("error");
        this.scheduleReconnect();
      });
  }

  private async pollEvents(): Promise<void> {
    const params = this.lastTimestamp ? `?since=${this.lastTimestamp}` : "";
    const response = await fetch(
      `${this.config.url}/api/events${params}`
    );

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const events: DaemonEvent[] = await response.json();
    for (const event of events) {
      this.processEvent(event);
      this.lastTimestamp = event.timestamp;
    }
  }

  private handleRawMessage(data: string): void {
    let parsed: DaemonEvent;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    if (!parsed.type) return;
    this.processEvent(parsed);
  }

  private processEvent(event: DaemonEvent): void {
    this.updateAgentStatus(event);
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private updateAgentStatus(event: DaemonEvent): void {
    const { agentId, agentName, timestamp } = event;
    if (!agentId) return;

    const existing = this.agents.get(agentId);

    switch (event.type) {
      case "heartbeat": {
        const payload = event.payload as Record<string, unknown>;
        this.agents.set(agentId, {
          id: agentId,
          name: agentName,
          status:
            (payload.status as AgentInfo["status"]) ||
            existing?.status ||
            "running",
          lastHeartbeat: timestamp,
          currentTask: (payload.currentTask as string) || null,
          uptimeSeconds:
            (payload.uptimeSeconds as number) || existing?.uptimeSeconds || 0,
          errorCount: existing?.errorCount || 0,
          lastError: existing?.lastError || null,
        });
        break;
      }
      case "agent_started":
        this.agents.set(agentId, {
          ...(existing || this.defaultAgent(agentId, agentName)),
          status: "running",
          lastHeartbeat: timestamp,
        });
        break;
      case "agent_stopped":
        this.agents.set(agentId, {
          ...(existing || this.defaultAgent(agentId, agentName)),
          status: "stopped",
          lastHeartbeat: timestamp,
        });
        break;
      case "agent_error": {
        const errorMsg = (event.payload.error as string) || "Unknown error";
        this.agents.set(agentId, {
          ...(existing || this.defaultAgent(agentId, agentName)),
          status: "error",
          lastHeartbeat: timestamp,
          errorCount: (existing?.errorCount || 0) + 1,
          lastError: errorMsg,
        });
        break;
      }
    }
  }

  private defaultAgent(id: string, name: string): AgentInfo {
    return {
      id,
      name,
      status: "idle",
      lastHeartbeat: "",
      currentTask: null,
      uptimeSeconds: 0,
      errorCount: 0,
      lastError: null,
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.currentDelay = Math.min(
        this.currentDelay * BACKOFF_MULTIPLIER,
        MAX_BACKOFF_MS
      );
      this.connect();
    }, this.currentDelay);
  }
}
