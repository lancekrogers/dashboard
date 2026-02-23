import { render } from "@testing-library/react";
import { InferenceMetrics } from "../InferenceMetrics";
import type {
  ComputeMetrics,
  StorageMetrics,
  INFTStatus,
  InferenceJob,
} from "@/lib/data/types";

function makeCompute(overrides: Partial<ComputeMetrics> = {}): ComputeMetrics {
  return {
    gpuUtilization: 45,
    memoryUtilization: 38,
    activeJobs: 3,
    avgLatencyMs: 120,
    totalInferences: 5678,
    ...overrides,
  };
}

function makeStorage(overrides: Partial<StorageMetrics> = {}): StorageMetrics {
  return {
    totalStorageGb: 50,
    usedStorageGb: 12.4,
    objectCount: 1234,
    ...overrides,
  };
}

function makeINFT(overrides: Partial<INFTStatus> = {}): INFTStatus {
  return {
    tokenId: "0.0.12345",
    status: "active",
    modelName: "llama-3-8b",
    inferenceCount: 5678,
    lastActive: new Date(Date.now() - 120000).toISOString(),
    ...overrides,
  };
}

function makeJob(overrides: Partial<InferenceJob> = {}): InferenceJob {
  return {
    id: "job-001",
    model: "llama-3-8b",
    status: "completed",
    inputTokens: 512,
    outputTokens: 128,
    latencyMs: 120,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = {
  compute: null as ComputeMetrics | null,
  storage: null as StorageMetrics | null,
  inft: null as INFTStatus | null,
  jobs: [] as InferenceJob[],
  connectionState: "connected" as const,
  isLoading: false,
  error: null as Error | null,
};

describe("InferenceMetrics", () => {
  it("renders loading skeleton when isLoading and no data", () => {
    const { container } = render(
      <InferenceMetrics {...defaultProps} isLoading={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders error message", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        error={new Error("0G connection failed")}
      />,
    );
    expect(getByText(/0G connection failed/)).toBeTruthy();
  });

  it("renders empty state when no data", () => {
    const { getByText } = render(<InferenceMetrics {...defaultProps} />);
    expect(getByText("No inference data available")).toBeTruthy();
  });

  it("renders panel title", () => {
    const { container } = render(<InferenceMetrics {...defaultProps} />);
    expect(container.querySelector("h2")?.textContent).toBe(
      "Inference & 0G Metrics",
    );
  });

  it("shows connection state text", () => {
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} connectionState="disconnected" />,
    );
    expect(getByText("disconnected")).toBeTruthy();
  });

  // ComputeGauge tests
  it("renders GPU utilization percentage in gauge", () => {
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} compute={makeCompute()} />,
    );
    expect(getByText("45%")).toBeTruthy();
  });

  it("renders green color for GPU < 50%", () => {
    const { container } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute({ gpuUtilization: 30 })}
      />,
    );
    const gaugeText = container.querySelector(
      ".text-sm.font-bold",
    ) as HTMLElement;
    expect(gaugeText?.style.color).toBe("rgb(34, 197, 94)");
  });

  it("renders yellow color for GPU 50-80%", () => {
    const { container } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute({ gpuUtilization: 65 })}
      />,
    );
    const gaugeText = container.querySelector(
      ".text-sm.font-bold",
    ) as HTMLElement;
    expect(gaugeText?.style.color).toBe("rgb(234, 179, 8)");
  });

  it("renders red color for GPU > 80%", () => {
    const { container } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute({ gpuUtilization: 90 })}
      />,
    );
    const gaugeText = container.querySelector(
      ".text-sm.font-bold",
    ) as HTMLElement;
    expect(gaugeText?.style.color).toBe("rgb(239, 68, 68)");
  });

  it("renders compute stats below gauge", () => {
    const compute = makeCompute({
      memoryUtilization: 62,
      activeJobs: 3,
      avgLatencyMs: 120,
      totalInferences: 9876,
    });
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} compute={compute} />,
    );
    expect(getByText("Memory")).toBeTruthy();
    expect(getByText("62%")).toBeTruthy();
    expect(getByText("Active Jobs")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("Avg Latency")).toBeTruthy();
    expect(getByText("120ms")).toBeTruthy();
    expect(getByText("Total")).toBeTruthy();
    expect(getByText("9,876")).toBeTruthy();
  });

  it("renders compute skeleton when compute is null but storage present", () => {
    const { container } = render(
      <InferenceMetrics {...defaultProps} storage={makeStorage()} />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // StorageUsage tests
  it("renders storage used and total", () => {
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} storage={makeStorage()} />,
    );
    expect(getByText(/12\.4 GB/)).toBeTruthy();
    expect(getByText(/50\.0 GB/)).toBeTruthy();
  });

  it("renders storage percentage", () => {
    const storage = makeStorage({ usedStorageGb: 25, totalStorageGb: 100 });
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} storage={storage} />,
    );
    expect(getByText("25.0%")).toBeTruthy();
  });

  it("renders object count formatted", () => {
    const storage = makeStorage({ objectCount: 1234 });
    const { getByText } = render(
      <InferenceMetrics {...defaultProps} storage={storage} />,
    );
    expect(getByText(/1,234/)).toBeTruthy();
  });

  it("renders storage skeleton when storage is null but compute present", () => {
    const { container } = render(
      <InferenceMetrics {...defaultProps} compute={makeCompute()} />,
    );
    const storageSkeletons = container.querySelectorAll(".animate-pulse");
    expect(storageSkeletons.length).toBeGreaterThan(0);
  });

  // INFTCard tests
  it("renders iNFT token ID", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        inft={makeINFT()}
      />,
    );
    expect(getByText("0.0.12345")).toBeTruthy();
  });

  it("renders iNFT model name", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        inft={makeINFT({ modelName: "llama-3-8b" })}
      />,
    );
    expect(getByText(/llama-3-8b/)).toBeTruthy();
  });

  it("renders iNFT status badge", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        inft={makeINFT({ status: "active" })}
      />,
    );
    expect(getByText("active")).toBeTruthy();
  });

  it("renders iNFT minting status badge", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        inft={makeINFT({ status: "minting" })}
      />,
    );
    const badge = getByText("minting");
    expect(badge.className).toContain("bg-yellow-900");
  });

  it("renders iNFT inference count", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute({ totalInferences: 100 })}
        inft={makeINFT({ inferenceCount: 3456 })}
      />,
    );
    expect(getByText("3,456")).toBeTruthy();
  });

  it("renders iNFT skeleton when inft is null", () => {
    const { container } = render(
      <InferenceMetrics {...defaultProps} compute={makeCompute()} />,
    );
    // iNFT card shows skeleton
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // JobTable tests
  it("renders job table with model name", () => {
    const jobs = [makeJob({ model: "llama-3-8b" })];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    expect(getByText("llama-3-8b")).toBeTruthy();
  });

  it("renders job status badge", () => {
    const jobs = [makeJob({ status: "completed" })];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    const badge = getByText("completed");
    expect(badge.className).toContain("bg-green-900");
  });

  it("renders running job status badge in blue", () => {
    const jobs = [makeJob({ status: "running" })];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    const badge = getByText("running");
    expect(badge.className).toContain("bg-blue-900");
  });

  it("shows ... for running job latency", () => {
    const jobs = [makeJob({ status: "running" })];
    const { container } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    const cells = container.querySelectorAll("td");
    const latencyCell = Array.from(cells).find(
      (td) => td.textContent === "...",
    );
    expect(latencyCell).toBeTruthy();
  });

  it("shows inputTokens/... for running job tokens", () => {
    const jobs = [makeJob({ status: "running", inputTokens: 256 })];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    expect(getByText("256/...")).toBeTruthy();
  });

  it("shows inputTokens/outputTokens for completed jobs", () => {
    const jobs = [
      makeJob({ status: "completed", inputTokens: 512, outputTokens: 128 }),
    ];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    expect(getByText("512/128")).toBeTruthy();
  });

  it("limits jobs to 30 rows", () => {
    const jobs = Array.from({ length: 40 }, (_, i) =>
      makeJob({ id: `job-${i}` }),
    );
    const { container } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(30);
  });

  it("shows empty jobs message when no jobs", () => {
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={[]}
      />,
    );
    expect(getByText("No inference jobs recorded yet.")).toBeTruthy();
  });

  it("renders failed job status in red", () => {
    const jobs = [makeJob({ status: "failed" })];
    const { getByText } = render(
      <InferenceMetrics
        {...defaultProps}
        compute={makeCompute()}
        jobs={jobs}
      />,
    );
    const badge = getByText("failed");
    expect(badge.className).toContain("bg-red-900");
  });
});
