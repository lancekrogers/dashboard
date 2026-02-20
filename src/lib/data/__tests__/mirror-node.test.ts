import { MirrorNodeClient } from "../mirror-node";

// Mock fetch
const mockFetch = jest.fn();
(global as Record<string, unknown>).fetch = mockFetch;

// Mock atob for base64 decoding
(global as Record<string, unknown>).atob = (str: string) =>
  Buffer.from(str, "base64").toString("binary");

function makeTopicResponse(messages: Array<{ message: string; sequence_number: number }>) {
  return {
    messages: messages.map((m, i) => ({
      consensus_timestamp: `1234567890.${String(i).padStart(9, "0")}`,
      message: Buffer.from(m.message).toString("base64"),
      payer_account_id: "0.0.1234",
      running_hash: "abc",
      sequence_number: m.sequence_number,
      topic_id: "0.0.12345",
    })),
    links: {},
  };
}

describe("MirrorNodeClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches and decodes HCS messages", async () => {
    const eventPayload = JSON.stringify({
      type: "task_assignment",
      agentId: "agent-1",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeTopicResponse([
        { message: eventPayload, sequence_number: 1 },
        { message: eventPayload, sequence_number: 2 },
      ])),
    });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 5000,
      topicIds: [],
    });

    const messages = await client.fetchTopicMessages("0.0.12345");

    expect(messages).toHaveLength(2);
    expect(messages[0].sequenceNumber).toBe(1);
    expect(messages[0].messageType).toBe("task_assignment");
    expect(messages[0].senderAgent).toBe("agent-1");
    expect(messages[0].message).toContain("task_assignment");
  });

  it("constructs URL with afterTimestamp parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 5000,
      topicIds: [],
    });

    await client.fetchTopicMessages("0.0.12345", "1234567890.000000001");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("timestamp=gt%3A1234567890.000000001");
  });

  it("starts and stops polling correctly", async () => {
    const eventPayload = JSON.stringify({
      type: "status_update",
      agentId: "agent-1",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeTopicResponse([
        { message: eventPayload, sequence_number: 1 },
      ])),
    });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 5000,
      topicIds: ["0.0.12345"],
    });

    const receivedMessages: unknown[] = [];
    client.onMessages((msgs) => receivedMessages.push(...msgs));

    client.startPolling();

    // Initial poll happens immediately
    await jest.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Next poll after interval
    await jest.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    client.stopPolling();

    // No more polls after stop
    await jest.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not crash on network errors during polling", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 1000,
      topicIds: ["0.0.12345"],
    });

    const errors: Error[] = [];
    client.onError((e) => errors.push(e));

    client.startPolling();
    await jest.advanceTimersByTimeAsync(0);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Network error");

    // Should continue polling
    await jest.advanceTimersByTimeAsync(1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    client.stopPolling();
  });

  it("retries on 429 rate limit response", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 5000,
      topicIds: [],
    });

    const fetchPromise = client.fetchTopicMessages("0.0.12345");

    // Advance past the retry backoff delay
    await jest.advanceTimersByTimeAsync(2000);

    const messages = await fetchPromise;
    expect(messages).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles non-JSON HCS messages gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(makeTopicResponse([
        { message: "plain text not json", sequence_number: 1 },
      ])),
    });

    const client = new MirrorNodeClient({
      baseUrl: "https://testnet.mirrornode.hedera.com",
      pollingIntervalMs: 5000,
      topicIds: [],
    });

    const messages = await client.fetchTopicMessages("0.0.12345");
    expect(messages).toHaveLength(1);
    expect(messages[0].messageType).toBe("status_update"); // default
    expect(messages[0].senderAgent).toBe(""); // default
  });
});
