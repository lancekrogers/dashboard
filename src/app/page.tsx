"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { FestivalView } from "@/components/panels/FestivalView";
import { HCSFeed } from "@/components/panels/HCSFeed";
import { AgentActivity } from "@/components/panels/AgentActivity";
import { DeFiPnL } from "@/components/panels/DeFiPnL";
import { VaultDecisions } from "@/components/panels/VaultDecisions";
import { InferenceMetrics } from "@/components/panels/InferenceMetrics";
import { CREDecisions } from "@/components/panels/CREDecisions";
import { useLiveData } from "@/hooks/useLiveData";

export default function Home() {
  const data = useLiveData();

  return (
    <DashboardLayout>
      {/* Row 1: Festival (wide) | HCS Feed | CRE Decisions | Vault Decisions */}
      <div className="overflow-hidden min-h-0">
        <FestivalView
          data={data.festivalProgress}
          source={data.festivalProgressSource}
          fallbackReason={data.festivalProgressFallbackReason}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <HCSFeed
          messages={data.hcsMessages}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <CREDecisions
          messages={data.hcsMessages}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <VaultDecisions
          decisions={data.vaultDecisions}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>

      {/* Row 2: Agent Activity | DeFi P&L | Inference Metrics | (empty) */}
      <div className="overflow-hidden min-h-0">
        <AgentActivity
          agents={data.agents}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0 col-span-2">
        <DeFiPnL
          summary={data.pnlSummary}
          chartData={data.pnlChart}
          trades={data.trades}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <InferenceMetrics
          compute={data.compute}
          storage={data.storage}
          inft={data.inft}
          jobs={data.inferenceJobs}
          connectionState={data.connectionState}
          isLoading={data.isLoading}
          error={data.error}
          className="h-full"
        />
      </div>
    </DashboardLayout>
  );
}
