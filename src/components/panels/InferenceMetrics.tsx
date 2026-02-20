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

function GaugeCircle({
  percentage,
  label,
}: {
  percentage: number;
  label: string;
}) {
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const dashArray = `${(clamped / 100) * circumference} ${circumference}`;
  const color =
    clamped > 80 ? "#ef4444" : clamped > 50 ? "#eab308" : "#22c55e";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
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
            strokeDasharray={dashArray}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-white tabular-nums">
            {clamped.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

const JOB_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-800 text-gray-400",
  running: "bg-blue-900 text-blue-400",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

const INFT_STATUS_MAP: Record<string, string> = {
  active: "bg-green-900 text-green-400",
  minting: "bg-yellow-900 text-yellow-400",
  inactive: "bg-gray-800 text-gray-400",
};

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
      className={`bg-gray-900 rounded-lg border border-gray-800 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Inference Metrics</h2>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">0G</span>
        </div>
      </div>

      {isLoading && !compute && (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 bg-gray-800 rounded-lg" />
            <div className="h-28 bg-gray-800 rounded-lg" />
          </div>
          <div className="h-16 bg-gray-800 rounded-lg" />
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
            Metrics will appear once the inference agent connects to 0G.
          </p>
        </div>
      )}

      {(compute || storage) && (
        <div className="space-y-4">
          {/* Compute + Storage */}
          <div className="grid grid-cols-2 gap-3">
            {/* Compute */}
            {compute && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Compute
                </h3>
                <div className="flex justify-around">
                  <GaugeCircle percentage={compute.gpuUtilization} label="GPU" />
                  <GaugeCircle
                    percentage={compute.memoryUtilization}
                    label="Memory"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500">Jobs</p>
                    <p className="text-xs text-gray-300 tabular-nums">
                      {compute.activeJobs}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Latency</p>
                    <p className="text-xs text-gray-300 tabular-nums">
                      {compute.avgLatencyMs}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Total</p>
                    <p className="text-xs text-gray-300 tabular-nums">
                      {compute.totalInferences.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Storage */}
            {storage && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Storage
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      {storage.usedStorageGb.toFixed(1)} GB
                    </span>
                    <span className="text-gray-500">
                      / {storage.totalStorageGb.toFixed(1)} GB
                    </span>
                  </div>
                  <ProgressBar
                    percentage={
                      (storage.usedStorageGb / storage.totalStorageGb) * 100
                    }
                    size="md"
                  />
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500">Objects</p>
                    <p className="text-xs text-gray-300 tabular-nums">
                      {storage.objectCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* iNFT Status */}
          {inft && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                iNFT
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Token: </span>
                  <span className="text-gray-300 font-mono">{inft.tokenId}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status: </span>
                  <span
                    className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      INFT_STATUS_MAP[inft.status] || INFT_STATUS_MAP.inactive
                    }`}
                  >
                    {inft.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Model: </span>
                  <span className="text-gray-300">{inft.modelName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Inferences: </span>
                  <span className="text-gray-300 tabular-nums">
                    {inft.inferenceCount.toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Last active: {formatTimeAgo(inft.lastActive)}
              </p>
            </div>
          )}

          {/* Job Table */}
          {jobs.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Recent Jobs
              </h3>
              <div className="overflow-auto max-h-[180px]">
                <table className="w-full text-xs">
                  <thead className="text-gray-500 border-b border-gray-800 sticky top-0 bg-gray-900">
                    <tr>
                      <th className="text-left py-1 font-medium">Model</th>
                      <th className="text-left py-1 font-medium">Status</th>
                      <th className="text-right py-1 font-medium">Tokens</th>
                      <th className="text-right py-1 font-medium">Latency</th>
                      <th className="text-right py-1 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {jobs.slice(0, 30).map((job) => (
                      <tr key={job.id} className="border-b border-gray-800/50">
                        <td className="py-1 text-gray-300">{job.model}</td>
                        <td className="py-1">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              JOB_STATUS_STYLES[job.status] ||
                              JOB_STATUS_STYLES.pending
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-1 text-right text-gray-300 tabular-nums">
                          {job.status === "running"
                            ? "..."
                            : `${job.inputTokens}/${job.outputTokens}`}
                        </td>
                        <td className="py-1 text-right text-gray-300 tabular-nums">
                          {job.status === "running"
                            ? "..."
                            : `${job.latencyMs}ms`}
                        </td>
                        <td className="py-1 text-right text-gray-500">
                          {formatTimeAgo(job.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
