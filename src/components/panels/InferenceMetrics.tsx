"use client";

import type {
  ComputeMetrics,
  StorageMetrics,
  INFTStatus,
  InferenceJob,
  ConnectionState,
} from "@/lib/data/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatTimeAgo } from "@/lib/utils/formatTime";

interface InferenceMetricsProps {
  compute: ComputeMetrics | null;
  storage: StorageMetrics | null;
  inft: INFTStatus | null;
  jobs: InferenceJob[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

function ComputeGauge({ compute }: { compute: ComputeMetrics | null }) {
  if (!compute) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mx-auto mb-3" />
        <div className="w-32 h-32 mx-auto bg-gray-700 rounded-full" />
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const percentage = Math.round(compute.gpuUtilization);
  const color =
    percentage < 50 ? "#22c55e" : percentage < 80 ? "#eab308" : "#ef4444";
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${(percentage / 100) * circumference} ${circumference}`;

  const memColor =
    compute.memoryUtilization < 50
      ? "text-green-400"
      : compute.memoryUtilization < 80
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider text-center mb-2">
        GPU Utilization
      </h3>
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            transform="rotate(-90 18 18)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <p className="text-xs text-gray-500">Memory</p>
          <p className={`text-sm tabular-nums ${memColor}`}>
            {Math.round(compute.memoryUtilization)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Active Jobs</p>
          <p className="text-sm text-gray-300 tabular-nums">
            {compute.activeJobs}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg Latency</p>
          <p className="text-sm text-gray-300 tabular-nums">
            {compute.avgLatencyMs}ms
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm text-gray-300 tabular-nums">
            {compute.totalInferences.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function StorageUsage({ storage }: { storage: StorageMetrics | null }) {
  if (!storage) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
        <div className="h-4 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-28 mb-3" />
        <div className="h-3 bg-gray-700 rounded mb-2" />
        <div className="h-4 bg-gray-700 rounded w-16" />
      </div>
    );
  }

  const percentage = (storage.usedStorageGb / storage.totalStorageGb) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
        Storage Usage
      </h3>
      <div className="space-y-2">
        <p className="text-sm text-white">
          Used: {storage.usedStorageGb.toFixed(1)} GB
        </p>
        <p className="text-sm text-gray-500">
          Total: {storage.totalStorageGb.toFixed(1)} GB
        </p>
        <ProgressBar percentage={percentage} size="md" />
        <p className="text-sm text-gray-300 tabular-nums">
          {percentage.toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500">
          Objects: {storage.objectCount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

const INFT_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-900 text-green-400",
  minting: "bg-yellow-900 text-yellow-400",
  inactive: "bg-gray-800 text-gray-400",
};

function INFTCard({ inft }: { inft: INFTStatus | null }) {
  if (!inft) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-20 mb-3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-gray-700 rounded" />
          <div className="h-8 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        iNFT Status
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Token: </span>
            <span className="font-mono">{inft.tokenId}</span>
          </p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Status: </span>
            <span
              className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                INFT_STATUS_STYLES[inft.status] || INFT_STATUS_STYLES.inactive
              }`}
            >
              {inft.status}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Model: </span>
            {inft.modelName}
          </p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Inferences: </span>
            <span className="tabular-nums">
              {inft.inferenceCount.toLocaleString()}
            </span>
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Last Active: {formatTimeAgo(inft.lastActive)}
      </p>
    </div>
  );
}

const JOB_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-800 text-gray-400",
  running: "bg-blue-900 text-blue-400",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

function JobTable({ jobs }: { jobs: InferenceJob[] }) {
  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        Recent Inference Jobs
      </h3>
      <div className="overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700 sticky top-0 bg-gray-900">
            <tr>
              <th className="text-left py-1 font-medium">Model</th>
              <th className="text-center py-1 font-medium">Status</th>
              <th className="text-center py-1 font-medium">Tokens</th>
              <th className="text-right py-1 font-medium">Latency</th>
              <th className="text-right py-1 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  No inference jobs recorded yet.
                </td>
              </tr>
            ) : (
              jobs.slice(0, 30).map((job) => (
                <tr
                  key={job.id}
                  className="text-sm text-gray-300 border-b border-gray-800"
                >
                  <td className="py-1.5 truncate max-w-[100px]">
                    {job.model}
                  </td>
                  <td className="py-1.5 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        JOB_STATUS_STYLES[job.status] ||
                        JOB_STATUS_STYLES.pending
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-center text-xs">
                    {job.inputTokens}/
                    {job.status === "running" ? "..." : job.outputTokens}
                  </td>
                  <td className="py-1.5 text-right text-xs">
                    {job.status === "running" ? "..." : `${job.latencyMs}ms`}
                  </td>
                  <td className="py-1.5 text-right text-xs text-gray-500">
                    {new Date(job.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InferenceMetrics({
  compute,
  storage,
  inft,
  jobs,
  connectionState,
  isLoading,
  error,
  className = "",
}: InferenceMetricsProps) {
  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800 p-3 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-white">
          Inference &amp; 0G Metrics
        </h2>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected"
                ? "bg-green-500"
                : connectionState === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">{connectionState}</span>
        </div>
      </div>

      {isLoading && !compute && !storage && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-56 bg-gray-800 rounded-lg" />
            <div className="h-56 bg-gray-800 rounded-lg" />
          </div>
          <div className="h-24 bg-gray-800 rounded-lg" />
          <div className="h-32 bg-gray-800 rounded-lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">
          Failed to load inference data: {error.message}
        </p>
      )}

      {!isLoading && !error && !compute && !storage && (
        <div className="text-sm text-gray-500">
          <p>No inference data available</p>
          <p className="text-xs mt-1">
            Inference metrics will display once the inference agent connects to
            0G compute.
          </p>
        </div>
      )}

      {(compute || storage) && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ComputeGauge compute={compute} />
            <StorageUsage storage={storage} />
          </div>

          <INFTCard inft={inft} />

          <JobTable jobs={jobs} />
        </div>
      )}
    </div>
  );
}
