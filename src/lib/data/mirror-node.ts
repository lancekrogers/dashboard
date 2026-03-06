import {
  MirrorNodeConfig,
  HCSMessage,
  DaemonEventType,
} from "./types";

const DEFAULT_CONFIG: MirrorNodeConfig = {
  baseUrl:
    process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL ||
    "https://testnet.mirrornode.hedera.com",
  pollingIntervalMs: 5000,
  topicIds: (process.env.NEXT_PUBLIC_HEDERA_TOPIC_IDS || "")
    .split(",")
    .filter(Boolean),
};

interface MirrorTopicMessage {
  consensus_timestamp: string;
  message: string;
  payer_account_id: string;
  running_hash: string;
  sequence_number: number;
  topic_id: string;
}

interface MirrorTopicResponse {
  messages: MirrorTopicMessage[];
  links?: { next?: string };
}

interface MirrorTransaction {
  consensus_timestamp: string;
  transaction_hash: string;
  name: string;
  node: string;
  result: string;
  transfers: Array<{
    account: string;
    amount: number;
  }>;
  token_transfers?: Array<{
    token_id: string;
    account: string;
    amount: number;
  }>;
}

interface MirrorTransactionsResponse {
  transactions: MirrorTransaction[];
}

interface MirrorAccountInfo {
  account: string;
  balance: { balance: number; timestamp: string };
  key: { _type: string; key: string } | null;
}

type MessageListener = (messages: HCSMessage[]) => void;
type ErrorListener = (error: Error) => void;

export class MirrorNodeClient {
  private config: MirrorNodeConfig;
  private lastTimestamps = new Map<string, string>();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private messageListeners = new Set<MessageListener>();
  private errorListeners = new Set<ErrorListener>();
  private isPolling = false;

  constructor(config: Partial<MirrorNodeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async fetchTopicMessages(
    topicId: string,
    afterTimestamp?: string
  ): Promise<HCSMessage[]> {
    const params = new URLSearchParams({
      limit: "100",
      order: "asc",
    });

    if (afterTimestamp) {
      params.set("timestamp", `gt:${afterTimestamp}`);
    }

    const url = `${this.config.baseUrl}/api/v1/topics/${topicId}/messages?${params}`;
    const response = await this.fetchWithRetry(url);
    const data: MirrorTopicResponse = await response.json();

    return data.messages.map((msg) => this.parseTopicMessage(msg, topicId));
  }

  async fetchTransactions(
    accountId: string,
    type?: string
  ): Promise<MirrorTransaction[]> {
    const params = new URLSearchParams({
      "account.id": accountId,
      limit: "50",
      order: "desc",
    });

    if (type) {
      params.set("type", type);
    }

    const url = `${this.config.baseUrl}/api/v1/transactions?${params}`;
    const response = await this.fetchWithRetry(url);
    const data: MirrorTransactionsResponse = await response.json();

    return data.transactions;
  }

  async fetchAccountInfo(accountId: string): Promise<MirrorAccountInfo> {
    const url = `${this.config.baseUrl}/api/v1/accounts/${accountId}`;
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;

    // Initial poll immediately
    this.pollAllTopics();

    this.pollingTimer = setInterval(() => {
      this.pollAllTopics();
    }, this.config.pollingIntervalMs);
  }

  stopPolling(): void {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async refresh(): Promise<void> {
    await this.pollAllTopics();
  }

  onMessages(callback: MessageListener): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onError(callback: ErrorListener): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  private async pollAllTopics(): Promise<void> {
    for (const topicId of this.config.topicIds) {
      try {
        const lastTs = this.lastTimestamps.get(topicId);
        const messages = await this.fetchTopicMessages(topicId, lastTs);

        if (messages.length > 0) {
          const latest = messages[messages.length - 1];
          this.lastTimestamps.set(topicId, latest.consensusTimestamp);

          for (const listener of this.messageListeners) {
            listener(messages);
          }
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));
        for (const listener of this.errorListeners) {
          listener(error);
        }
      }
    }
  }

  private parseTopicMessage(
    msg: MirrorTopicMessage,
    topicId: string
  ): HCSMessage {
    const decoded = atob(msg.message);
    let messageType: DaemonEventType = "status_update";
    let senderAgent = "";

    try {
      const envelope = JSON.parse(decoded) as Record<string, unknown>;
      if (typeof envelope.type === "string") {
        messageType = envelope.type as DaemonEventType;
      }
      if (typeof envelope.agentId === "string") {
        senderAgent = envelope.agentId;
      } else if (typeof envelope.sender === "string") {
        senderAgent = envelope.sender;
      }
    } catch {
      // Message is not JSON-encoded daemon event; keep defaults
    }

    return {
      consensusTimestamp: msg.consensus_timestamp,
      topicId,
      sequenceNumber: msg.sequence_number,
      message: decoded,
      messageType,
      senderAgent,
      rawMessage: msg.message,
    };
  }

  private async fetchWithRetry(
    url: string,
    retries = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(url);

      if (response.ok) return response;

      if (response.status === 429 && attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(
        `Mirror node request failed: ${response.status} ${response.statusText}`
      );
    }

    throw new Error("Mirror node request failed after retries");
  }
}
