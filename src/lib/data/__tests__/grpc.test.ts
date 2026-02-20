import { GRPCConnector } from "../grpc";
import type { DaemonEvent, ConnectionState } from "../types";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = 0;
  url: string;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }
}

(global as Record<string, unknown>).EventSource = MockEventSource;

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

describe("GRPCConnector", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("opens SSE connection and transitions to connected", () => {
    const states: ConnectionState[] = [];
    const connector = new GRPCConnector({
      url: "http://localhost:9090",
      useRestFallback: true,
    });
    connector.onStateChange((s) => states.push(s));

    connector.connect();
    expect(states).toContain("connecting");

    const es = MockEventSource.instances[0];
    expect(es.url).toBe("http://localhost:9090/api/events/stream");

    es.simulateOpen();
    expect(states).toContain("connected");
    expect(connector.getState()).toBe("connected");

    connector.disconnect();
  });

  it("parses SSE messages into DaemonEvent", () => {
    const connector = new GRPCConnector({
      url: "http://localhost:9090",
      useRestFallback: true,
    });
    const events: DaemonEvent[] = [];
    connector.onEvent((e) => events.push(e));

    connector.connect();
    MockEventSource.instances[0].simulateOpen();
    MockEventSource.instances[0].simulateMessage(
      JSON.stringify(makeEvent({ type: "heartbeat" }))
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("heartbeat");

    connector.disconnect();
  });

  it("tracks agent status from events", () => {
    const connector = new GRPCConnector({
      url: "http://localhost:9090",
      useRestFallback: true,
    });

    connector.connect();
    MockEventSource.instances[0].simulateOpen();
    MockEventSource.instances[0].simulateMessage(
      JSON.stringify(
        makeEvent({
          type: "agent_started",
          agentId: "a1",
          agentName: "defi",
        })
      )
    );

    const agents = connector.getAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("defi");
    expect(agents[0].status).toBe("running");

    connector.disconnect();
  });

  it("handles invalid JSON gracefully", () => {
    const connector = new GRPCConnector({
      url: "http://localhost:9090",
      useRestFallback: true,
    });
    const events: DaemonEvent[] = [];
    connector.onEvent((e) => events.push(e));

    connector.connect();
    MockEventSource.instances[0].simulateOpen();
    MockEventSource.instances[0].simulateMessage("not-json");

    expect(events).toHaveLength(0);

    connector.disconnect();
  });

  it("cleanly disconnects", () => {
    const connector = new GRPCConnector({
      url: "http://localhost:9090",
      useRestFallback: true,
    });

    connector.connect();
    MockEventSource.instances[0].simulateOpen();

    connector.disconnect();
    expect(connector.getState()).toBe("disconnected");
  });
});
