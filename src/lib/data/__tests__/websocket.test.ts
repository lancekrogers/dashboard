import { WebSocketConnector } from "../websocket";
import type { DaemonEvent, ConnectionState } from "../types";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close(_code?: number) {
    this.readyState = 3;
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateError() {
    this.onerror?.();
  }
}

(global as Record<string, unknown>).WebSocket = MockWebSocket;

function makeEvent(overrides: Partial<DaemonEvent> = {}): DaemonEvent {
  return {
    type: "status_update",
    agentId: "agent-1",
    agentName: "coordinator",
    timestamp: new Date().toISOString(),
    payload: {},
    ...overrides,
  };
}

describe("WebSocketConnector", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("transitions from disconnected to connecting to connected", () => {
    const states: ConnectionState[] = [];
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });
    connector.onStateChange((s) => states.push(s));

    expect(connector.getState()).toBe("disconnected");

    connector.connect();
    expect(states).toContain("connecting");

    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    expect(states).toContain("connected");
    expect(connector.getState()).toBe("connected");

    connector.disconnect();
  });

  it("parses valid JSON into DaemonEvent", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });
    const events: DaemonEvent[] = [];
    connector.onEvent((e) => events.push(e));

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const event = makeEvent({ type: "task_assignment" });
    ws.simulateMessage(JSON.stringify(event));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("task_assignment");

    connector.disconnect();
  });

  it("handles invalid JSON gracefully", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });
    const events: DaemonEvent[] = [];
    connector.onEvent((e) => events.push(e));

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage("not-json{{{");

    expect(events).toHaveLength(0);

    connector.disconnect();
  });

  it("triggers auto-reconnect after disconnect", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
      autoReconnect: true,
      reconnectDelayMs: 1000,
    });

    connector.connect();
    const ws1 = MockWebSocket.instances[0];
    ws1.simulateOpen();
    ws1.simulateClose();

    expect(MockWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);

    connector.disconnect();
  });

  it("updates agent status from heartbeat events", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const heartbeat = makeEvent({
      type: "heartbeat",
      agentId: "agent-1",
      agentName: "coordinator",
      payload: { status: "running", currentTask: "task-123", uptimeSeconds: 300 },
    });
    ws.simulateMessage(JSON.stringify(heartbeat));

    const agents = connector.getAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].status).toBe("running");
    expect(agents[0].currentTask).toBe("task-123");

    connector.disconnect();
  });

  it("tracks agent_started and agent_stopped events", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage(
      JSON.stringify(makeEvent({ type: "agent_started", agentId: "a1", agentName: "defi" }))
    );
    expect(connector.getAgents()[0].status).toBe("running");

    ws.simulateMessage(
      JSON.stringify(makeEvent({ type: "agent_stopped", agentId: "a1", agentName: "defi" }))
    );
    expect(connector.getAgents()[0].status).toBe("stopped");

    connector.disconnect();
  });

  it("tracks agent_error events", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage(
      JSON.stringify(
        makeEvent({
          type: "agent_error",
          agentId: "a1",
          agentName: "inference",
          payload: { error: "Out of memory" },
        })
      )
    );

    const agents = connector.getAgents();
    expect(agents[0].status).toBe("error");
    expect(agents[0].lastError).toBe("Out of memory");
    expect(agents[0].errorCount).toBe(1);

    connector.disconnect();
  });

  it("cleanly disconnects", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    connector.disconnect();
    expect(connector.getState()).toBe("disconnected");

    // Should not reconnect after explicit disconnect
    jest.advanceTimersByTime(10000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("unsubscribes listeners correctly", () => {
    const connector = new WebSocketConnector({
      url: "ws://localhost:8080/ws",
    });
    const events: DaemonEvent[] = [];
    const unsub = connector.onEvent((e) => events.push(e));

    connector.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage(JSON.stringify(makeEvent()));
    expect(events).toHaveLength(1);

    unsub();
    ws.simulateMessage(JSON.stringify(makeEvent()));
    expect(events).toHaveLength(1); // No new events after unsub

    connector.disconnect();
  });
});
