"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { FestivalView } from "@/components/panels/FestivalView";
import { HCSFeed } from "@/components/panels/HCSFeed";
import { AgentActivity } from "@/components/panels/AgentActivity";
import { DeFiPnL } from "@/components/panels/DeFiPnL";
import { InferenceMetrics } from "@/components/panels/InferenceMetrics";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMirrorNode } from "@/hooks/useMirrorNode";
import { useMockData } from "@/hooks/useMockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function LiveDashboard() {
  const ws = useWebSocket();
  const mirror = useMirrorNode();

  return (
    <DashboardLayout>
      <div className="overflow-hidden min-h-0">
        <FestivalView
          data={mirror.festivalProgress}
          isLoading={mirror.isLoading}
          error={mirror.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <HCSFeed
          messages={mirror.data || []}
          connectionState={mirror.connectionState}
          isLoading={mirror.isLoading}
          error={mirror.error}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <AgentActivity
          agents={ws.agents}
          connectionState={ws.connectionState}
          isLoading={ws.isLoading}
          error={ws.error}
          className="h-full"
        />
      </div>
      <div className="col-span-2 overflow-hidden min-h-0">
        <DeFiPnL
          summary={null}
          chartData={[]}
          trades={[]}
          connectionState={ws.connectionState}
          isLoading={ws.isLoading}
          error={null}
          className="h-full"
        />
      </div>
      <div className="overflow-hidden min-h-0">
        <InferenceMetrics
          compute={null}
          storage={null}
          inft={null}
          jobs={[]}
          connectionState={ws.connectionState}
          isLoading={ws.isLoading}
          error={null}
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return <MockDashboard />;
  }
  return <LiveDashboard />;
}
