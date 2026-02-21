import { render } from "@testing-library/react";
import { AgentActivity } from "../AgentActivity";
import type { AgentInfo } from "@/lib/data/types";

function makeAgent(overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    id: "coord-001",
    name: "coordinator",
    status: "running",
    lastHeartbeat: new Date(Date.now() - 3000).toISOString(),
    currentTask: "Monitoring test sequence",
    uptimeSeconds: 4980,
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

function makeAllAgents(): AgentInfo[] {
  return [
    makeAgent({ id: "coord-001", name: "coordinator" }),
    makeAgent({ id: "inf-001", name: "inference", currentTask: "Running inference job" }),
    makeAgent({ id: "defi-001", name: "defi", status: "idle", currentTask: null }),
  ];
}

describe("AgentActivity", () => {
  it("renders loading skeleton when isLoading and no agents", () => {
    const { container } = render(
      <AgentActivity agents={[]} connectionState="connecting" isLoading={true} error={null} />
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders error message when error is provided", () => {
    const { getByText } = render(
      <AgentActivity agents={[]} connectionState="error" isLoading={false} error={new Error("Disconnected")} />
    );
    expect(getByText(/Disconnected/)).toBeTruthy();
  });

  it("renders three agent cards when all agents present", () => {
    const agents = makeAllAgents();
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("coordinator")).toBeTruthy();
    expect(getByText("inference")).toBeTruthy();
    expect(getByText("defi")).toBeTruthy();
  });

  it("shows placeholder for missing agent", () => {
    const agents = [makeAgent({ name: "coordinator" })];
    const { getAllByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    // Two agents (inference, defi) are missing
    const placeholders = getAllByText("Waiting for agent...");
    expect(placeholders.length).toBe(2);
  });

  it("displays running status with correct label", () => {
    const agents = [makeAgent({ status: "running" })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Running")).toBeTruthy();
  });

  it("displays idle status with correct label", () => {
    const agents = [makeAgent({ name: "defi", status: "idle" })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Idle")).toBeTruthy();
  });

  it("displays error status with correct label", () => {
    const agents = [makeAgent({ status: "error" })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Error")).toBeTruthy();
  });

  it("displays current task", () => {
    const agents = [makeAgent({ currentTask: "Running llama-3-8b job" })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Running llama-3-8b job")).toBeTruthy();
  });

  it("shows None when no current task", () => {
    const agents = [makeAgent({ name: "defi", currentTask: null })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("None")).toBeTruthy();
  });

  it("displays error count when errors present", () => {
    const agents = [makeAgent({ errorCount: 3 })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("3")).toBeTruthy();
  });

  it("displays last error message when present", () => {
    const agents = [makeAgent({ errorCount: 1, lastError: "Timeout at 14:12:03" })];
    const { getByText } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Timeout at 14:12:03")).toBeTruthy();
  });

  it("displays connection status indicator", () => {
    const { getByText } = render(
      <AgentActivity agents={[]} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("connected")).toBeTruthy();
  });

  it("renders agent cards in correct order", () => {
    const agents = makeAllAgents();
    const { container } = render(
      <AgentActivity agents={agents} connectionState="connected" isLoading={false} error={null} />
    );
    const headings = container.querySelectorAll("h3");
    expect(headings[0].textContent).toBe("coordinator");
    expect(headings[1].textContent).toBe("inference");
    expect(headings[2].textContent).toBe("defi");
  });
});
