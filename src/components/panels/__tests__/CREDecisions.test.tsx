import { render } from "@testing-library/react";
import { CREDecisions } from "../CREDecisions";
import type { HCSMessage } from "@/lib/data/types";

function makeMessage(overrides: Partial<HCSMessage> = {}): HCSMessage {
  return {
    consensusTimestamp: "2026-03-03T12:00:00.000Z",
    topicId: "0.0.12345",
    sequenceNumber: 1,
    message: "{}",
    messageType: "status_update",
    senderAgent: "coordinator",
    rawMessage: btoa("{}"),
    ...overrides,
  };
}

describe("CREDecisions", () => {
  it("renders empty state with no CRE messages", () => {
    const { getByText } = render(
      <CREDecisions
        messages={[]}
        connectionState="connected"
        isLoading={false}
        error={null}
      />
    );

    expect(getByText("No CRE risk decisions yet.")).toBeTruthy();
  });

  it("renders requested, approved, denied counts and constraints", () => {
    const taskAssignmentEnvelope = JSON.stringify({
      type: "task_assignment",
      sender: "coordinator",
      recipient: "defi-001",
      task_id: "task-001",
      payload: {
        task_id: "task-001",
        cre_decision: {
          approved: true,
          max_position_usd: 810000000,
          max_slippage_bps: 250,
        },
      },
    });

    const requestedEnvelope = JSON.stringify({
      type: "risk_check_requested",
      sender: "coordinator",
      recipient: "defi-001",
      task_id: "task-001",
      payload: { reason: "requested" },
    });

    const approvedEnvelope = JSON.stringify({
      type: "risk_check_approved",
      sender: "coordinator",
      recipient: "defi-001",
      task_id: "task-001",
      payload: { reason: "approved" },
    });

    const deniedEnvelope = JSON.stringify({
      type: "risk_check_denied",
      sender: "coordinator",
      recipient: "defi-001",
      task_id: "task-002",
      payload: { reason: "signal_confidence_below_threshold" },
    });

    const messages: HCSMessage[] = [
      makeMessage({ messageType: "task_assignment", message: taskAssignmentEnvelope, sequenceNumber: 1 }),
      makeMessage({ messageType: "risk_check_requested", message: requestedEnvelope, sequenceNumber: 2 }),
      makeMessage({ messageType: "risk_check_approved", message: approvedEnvelope, sequenceNumber: 3 }),
      makeMessage({ messageType: "risk_check_denied", message: deniedEnvelope, sequenceNumber: 4 }),
    ];

    const { getByText, getAllByText } = render(
      <CREDecisions
        messages={messages}
        connectionState="connected"
        isLoading={false}
        error={null}
      />
    );

    expect(getByText("Requested")).toBeTruthy();
    expect(getByText("Approved")).toBeTruthy();
    expect(getByText("Denied")).toBeTruthy();
    expect(getAllByText(/\$810\.00/).length).toBeGreaterThan(0);
    expect(getAllByText(/250/).length).toBeGreaterThan(0);
    expect(getByText(/signal_confidence_below_threshold/)).toBeTruthy();
  });
});
