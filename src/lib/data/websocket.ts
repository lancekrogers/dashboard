import {
  ConnectionState,
  WebSocketConfig,
  DaemonEvent,
  AgentInfo,
} from "./types";

const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_HUB_WS_URL || "ws://localhost:8080/ws",
  autoReconnect: true,
  reconnectDelayMs: 2000,
  maxReconnectAttempts: 0,
};

const MAX_BACKOFF_MS = 30000;
const BACKOFF_MULTIPLIER = 1.5;

type EventListener = (event: DaemonEvent) => void;
type StateListener = (state: ConnectionState) => void;

export class WebSocketConnector {
  private config: WebSocketConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private agents = new Map<string, AgentInfo>();
  private eventListeners = new Set<EventListener>();
  private stateListeners = new Set<StateListener>();
  private reconnectAttempts = 0;
  private currentDelay: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentDelay = this.config.reconnectDelayMs;
    this.shouldReconnect = this.config.autoReconnect;
  }

  connect(): void {
    this.shouldReconnect = this.config.autoReconnect;
    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
    } catch {
      this.setState("error");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.setState("connected");
      this.reconnectAttempts = 0;
      this.currentDelay = this.config.reconnectDelayMs;
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.setState("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.setState("error");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000);
      this.ws = null;
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

  private handleMessage(event: MessageEvent): void {
    let parsed: DaemonEvent;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      return;
    }

    if (!parsed.type) return;

    this.updateAgentStatus(parsed);

    for (const listener of this.eventListeners) {
      listener(parsed);
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
          status: (payload.status as AgentInfo["status"]) || existing?.status || "running",
          lastHeartbeat: timestamp,
          currentTask: (payload.currentTask as string) || null,
          uptimeSeconds: (payload.uptimeSeconds as number) || existing?.uptimeSeconds || 0,
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
