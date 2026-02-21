import { render, fireEvent } from "@testing-library/react";
import { HCSFeed } from "../HCSFeed";
import type { HCSMessage } from "@/lib/data/types";

function makeMessage(overrides: Partial<HCSMessage> = {}): HCSMessage {
  return {
    consensusTimestamp: "2026-02-20T14:32:01.000Z",
    topicId: "0.0.12345",
    sequenceNumber: 1,
    message: "Test message payload",
    messageType: "task_assignment",
    senderAgent: "coordinator",
    rawMessage: btoa("test"),
    ...overrides,
  };
}

function makeMessages(count: number): HCSMessage[] {
  return Array.from({ length: count }, (_, i) =>
    makeMessage({
      consensusTimestamp: new Date(Date.now() - (count - i) * 1000).toISOString(),
      sequenceNumber: i + 1,
      message: `Message ${i + 1}`,
      messageType: ["task_assignment", "status_update", "heartbeat", "quality_gate", "payment_settled", "task_result"][i % 6] as HCSMessage["messageType"],
      senderAgent: ["coordinator", "inference", "defi"][i % 3],
    })
  );
}

describe("HCSFeed", () => {
  it("renders loading skeleton when isLoading and no messages", () => {
    const { container } = render(
      <HCSFeed messages={[]} connectionState="connecting" isLoading={true} error={null} />
    );
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders error message when error is provided", () => {
    const { getByText } = render(
      <HCSFeed messages={[]} connectionState="error" isLoading={false} error={new Error("Connection lost")} />
    );
    expect(getByText(/Connection lost/)).toBeTruthy();
  });

  it("renders empty state when no messages and not loading", () => {
    const { getByText } = render(
      <HCSFeed messages={[]} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("No HCS messages yet")).toBeTruthy();
  });

  it("renders message rows with correct count", () => {
    const messages = makeMessages(5);
    const { getAllByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    // Each message has a sender agent name displayed
    const coordinatorMessages = getAllByText("coordinator");
    expect(coordinatorMessages.length).toBe(2); // messages 0 and 3
  });

  it("displays sender agent with correct text", () => {
    const messages = [makeMessage({ senderAgent: "inference" })];
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("inference")).toBeTruthy();
  });

  it("displays message type badges", () => {
    const messages = [makeMessage({ messageType: "quality_gate" })];
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("quality_gate")).toBeTruthy();
  });

  it("displays message payload text", () => {
    const messages = [makeMessage({ message: "Quality gate PASSED for 01_data_layer" })];
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Quality gate PASSED for 01_data_layer")).toBeTruthy();
  });

  it("handles messages with missing senderAgent gracefully", () => {
    const messages = [makeMessage({ senderAgent: "" })];
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("unknown")).toBeTruthy();
  });

  it("handles invalid JSON in message field gracefully", () => {
    const messages = [makeMessage({ message: "not json {{{" })];
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("not json {{{")).toBeTruthy();
  });

  it("shows connection indicator for connected state", () => {
    const { getByText } = render(
      <HCSFeed messages={[]} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("connected")).toBeTruthy();
  });

  it("shows connection indicator for disconnected state", () => {
    const { getByText } = render(
      <HCSFeed messages={[]} connectionState="disconnected" isLoading={false} error={null} />
    );
    expect(getByText("disconnected")).toBeTruthy();
  });

  it("renders filter button", () => {
    const messages = makeMessages(3);
    const { getByText } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    expect(getByText("Filter")).toBeTruthy();
  });

  it("opens filter dropdown on click", () => {
    const messages = [makeMessage({ messageType: "task_assignment" })];
    const { getByText, getAllByRole } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    fireEvent.click(getByText("Filter"));
    // Should now show checkboxes for all 9 message types
    const checkboxes = getAllByRole("checkbox");
    expect(checkboxes.length).toBe(9);
    // Verify a type that isn't in the messages to avoid ambiguity
    expect(getByText("agent_started")).toBeTruthy();
  });

  it("filters messages when type is toggled", () => {
    const messages = [
      makeMessage({ sequenceNumber: 1, messageType: "heartbeat", message: "heartbeat msg" }),
      makeMessage({ sequenceNumber: 2, messageType: "task_assignment", message: "task msg", consensusTimestamp: new Date(Date.now() + 1000).toISOString() }),
    ];
    const { getByText, getAllByRole } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    // Open filter
    fireEvent.click(getByText("Filter"));
    // Click heartbeat checkbox to filter to only heartbeat
    const checkboxes = getAllByRole("checkbox");
    const heartbeatCheckbox = checkboxes.find((cb) => {
      const label = cb.closest("label");
      return label?.textContent?.includes("heartbeat");
    });
    expect(heartbeatCheckbox).toBeTruthy();
    fireEvent.click(heartbeatCheckbox!);
    // Now only heartbeat should be visible (activeFilters has heartbeat)
    expect(getByText("heartbeat msg")).toBeTruthy();
  });

  it("handles Hedera seconds.nanoseconds timestamp format", () => {
    const messages = [makeMessage({ consensusTimestamp: "1708300000.123456789" })];
    const { container } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    // Should render without crashing and show some time value
    const timeSpan = container.querySelector(".tabular-nums");
    expect(timeSpan).toBeTruthy();
    expect(timeSpan!.textContent).not.toBe("1708300000.123456789");
  });

  it("renders 500+ messages without crashing", () => {
    const messages = makeMessages(500);
    const { container } = render(
      <HCSFeed messages={messages} connectionState="connected" isLoading={false} error={null} />
    );
    const messageRows = container.querySelectorAll(".border-b.border-gray-800.px-3");
    expect(messageRows.length).toBe(500);
  });
});
