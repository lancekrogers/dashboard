"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { FestivalView } from "@/components/panels/FestivalView";
import { HCSFeed } from "@/components/panels/HCSFeed";
import { AgentActivity } from "@/components/panels/AgentActivity";
import { DeFiPnL } from "@/components/panels/DeFiPnL";
import { InferenceMetrics } from "@/components/panels/InferenceMetrics";
import { useLiveData } from "@/hooks/useLiveData";
import { useMockData } from "@/hooks/useMockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function LiveDashboard() {
  const live = useLiveData();

  return (
    <DashboardLayout>
      <div className="overflow-hidden min-h-0">
        <FestivalView
          data={live.festivalProgress}
          isLoading={live.isLoading}
          error={live.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <HCSFeed
          messages={live.hcsMessages}
          connectionState={live.connectionState}
          isLoading={live.isLoading}
          error={live.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <AgentActivity
          agents={live.agents}
          connectionState={live.connectionState}
          isLoading={live.isLoading}
          error={live.error}
          className="h-full"
        />
      </div>
      <div className="col-span-2 overflow-hidden min-h-0">
        <DeFiPnL
          summary={live.pnlSummary}
          chartData={live.pnlChart}
          trades={live.trades}
          connectionState={live.connectionState}
          isLoading={live.isLoading}
          error={live.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <InferenceMetrics
          compute={live.compute}
          storage={live.storage}
          inft={live.inft}
          jobs={live.inferenceJobs}
          connectionState={live.connectionState}
          isLoading={live.isLoading}
          error={live.error}
          className="h-full"
        />
      </div>
    </DashboardLayout>
  );
}

function MockDashboard() {
  const mock = useMockData();

  return (
    <DashboardLayout>
      <div className="overflow-hidden min-h-0">
        <FestivalView
          data={mock.festivalProgress}
          isLoading={mock.isLoading}
          error={mock.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <HCSFeed
          messages={mock.hcsMessages}
          connectionState={mock.connectionState}
          isLoading={mock.isLoading}
          error={mock.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <AgentActivity
          agents={mock.agents}
          connectionState={mock.connectionState}
          isLoading={mock.isLoading}
          error={mock.error}
          className="h-full"
        />
      </div>
      <div className="col-span-2 overflow-hidden min-h-0">
        <DeFiPnL
          summary={mock.pnlSummary}
          chartData={mock.pnlChart}
          trades={mock.trades}
          connectionState={mock.connectionState}
          isLoading={mock.isLoading}
          error={mock.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <InferenceMetrics
          compute={mock.compute}
          storage={mock.storage}
          inft={mock.inft}
          jobs={mock.inferenceJobs}
          connectionState={mock.connectionState}
          isLoading={mock.isLoading}
          error={mock.error}
          className="h-full"
        />
      </div>
    </DashboardLayout>
  );
}

export default function Home() {
  if (USE_MOCK) {
    return <MockDashboard />;
  }
  return <LiveDashboard />;
}
