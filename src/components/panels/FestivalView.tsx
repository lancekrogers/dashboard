"use client";

import { useState } from "react";
import type {
  FestivalProgress,
  FestivalPhase,
  FestivalSequence,
  FestivalTask,
} from "@/lib/data/types";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface FestivalViewProps {
  data: FestivalProgress | null;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

function TaskRow({ task }: { task: FestivalTask }) {
  const checked = task.status === "completed";

  return (
    <div className="flex items-center gap-2 py-1 pl-10 text-sm text-gray-300">
      <span className="font-mono text-xs text-gray-500">
        {checked ? "[x]" : "[ ]"}
      </span>
      <span className="truncate flex-1">{task.name}</span>
      <StatusBadge status={task.status} />
    </div>
  );
}

function SequenceRow({
  sequence,
  isExpanded,
  onToggle,
}: {
  sequence: FestivalSequence;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-1.5 pl-6 cursor-pointer hover:bg-gray-800/50 rounded transition-colors"
      >
        <span className="text-gray-500 text-xs w-4">
          {isExpanded ? "v" : ">"}
        </span>
        <span className="text-sm text-gray-200 truncate flex-1 text-left">
          {sequence.name}
        </span>
        <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
          {sequence.completionPercent}%
        </span>
        <ProgressBar
          percentage={sequence.completionPercent}
          size="sm"
          className="w-20"
        />
      </button>
      {isExpanded &&
        sequence.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
    </div>
  );
}

function PhaseRow({
  phase,
  isExpanded,
  onToggle,
  expandedSequences,
  onToggleSequence,
}: {
  phase: FestivalPhase;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSequences: Set<string>;
  onToggleSequence: (id: string) => void;
}) {
  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-2 pl-2 cursor-pointer hover:bg-gray-800/50 rounded transition-colors"
      >
        <span className="text-gray-500 text-sm w-4">
          {isExpanded ? "v" : ">"}
        </span>
        <span className="text-sm font-semibold text-gray-100 truncate flex-1 text-left">
          {phase.name}
        </span>
        <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
          {phase.completionPercent}%
        </span>
        <ProgressBar
          percentage={phase.completionPercent}
          size="md"
          className="w-24"
        />
      </button>
      {isExpanded &&
        phase.sequences.map((seq) => (
          <SequenceRow
            key={seq.id}
            sequence={seq}
            isExpanded={expandedSequences.has(seq.id)}
            onToggle={() => onToggleSequence(seq.id)}
          />
        ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-48" />
      <div className="h-2.5 bg-gray-800 rounded w-full" />
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 pl-2">
            <div className="h-3 bg-gray-800 rounded w-4" />
            <div className="h-3 bg-gray-800 rounded flex-1" />
            <div className="h-3 bg-gray-800 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FestivalView({
  data,
  isLoading,
  error,
  className = "",
}: FestivalViewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    if (!data) return new Set<string>();
    return new Set(data.phases.map((p) => p.id));
  });
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    new Set()
  );

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSequence = (id: string) => {
    setExpandedSequences((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800 p-3 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-white">Festival Progress</h2>
        {data && (
          <span className="text-sm text-gray-400">
            {data.overallCompletionPercent}% complete
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && !data && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 mt-2">
          <p>Failed to load festival data: {error.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            Check your data source connection
          </p>
        </div>
      )}

      {/* Empty */}
      {!data && !isLoading && !error && (
        <div className="text-sm text-gray-500 mt-2">
          <p>No festival data available</p>
          <p className="text-xs mt-1">
            Festival progress will appear here once connected to a data source.
          </p>
        </div>
      )}

      {/* Data */}
      {data && (
        <div className="flex-1 min-h-0 flex flex-col">
          <ProgressBar
            percentage={data.overallCompletionPercent}
            size="md"
            className="mb-3 shrink-0"
          />
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0">
            {data.phases.map((phase) => (
              <PhaseRow
                key={phase.id}
                phase={phase}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={() => togglePhase(phase.id)}
                expandedSequences={expandedSequences}
                onToggleSequence={toggleSequence}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
