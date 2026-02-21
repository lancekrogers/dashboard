"use client";

import type {
  PnLSummary,
  PnLDataPoint,
  Trade,
  ConnectionState,
} from "@/lib/data/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DeFiPnLProps {
  summary: PnLSummary | null;
  chartData: PnLDataPoint[];
  trades: Trade[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  className?: string;
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function formatUSD(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChartTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

function SummaryCards({ summary }: { summary: PnLSummary | null }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-5 gap-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-gray-800 rounded-lg" />
        ))}
      </div>
    );
  }

  const winRateColor =
    summary.winRate > 60
      ? "text-green-400"
      : summary.winRate > 40
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="grid grid-cols-5 gap-2">
      <SummaryCard
        label="Revenue"
        value={formatUSD(summary.totalRevenue)}
        color="text-green-400"
      />
      <SummaryCard
        label="Costs"
        value={formatUSD(summary.totalCosts)}
        color="text-red-400"
      />
      <SummaryCard
        label="Net P&L"
        value={`${summary.netProfit >= 0 ? "+" : "-"}${formatUSD(summary.netProfit)}`}
        color={summary.netProfit >= 0 ? "text-green-400" : "text-red-400"}
      />
      <SummaryCard
        label="Trades"
        value={summary.tradeCount.toString()}
        color="text-white"
      />
      <SummaryCard
        label="Win Rate"
        value={`${summary.winRate.toFixed(1)}%`}
        color={winRateColor}
      />
    </div>
  );
}

function PnLChart({ data }: { data: PnLDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-500">
        Chart will appear when trading data is available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatChartTime}
          stroke="#6b7280"
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(val: number) => `$${val}`}
          stroke="#6b7280"
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
          labelFormatter={(ts) => new Date(String(ts)).toLocaleString()}
          formatter={(value, name) => [
            `$${Number(value).toFixed(2)}`,
            String(name),
          ]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="cumulativeRevenue"
          stroke="#22c55e"
          name="Revenue"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="cumulativeCosts"
          stroke="#ef4444"
          name="Costs"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="cumulativeProfit"
          stroke="#3b82f6"
          name="Net Profit"
          dot={false}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TradeTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700 sticky top-0 bg-gray-900">
          <tr>
            <th className="text-left py-1 font-medium">Pair</th>
            <th className="text-left py-1 font-medium">Side</th>
            <th className="text-right py-1 font-medium">Amount</th>
            <th className="text-right py-1 font-medium">Price</th>
            <th className="text-right py-1 font-medium">P&L</th>
            <th className="text-right py-1 font-medium">Gas</th>
            <th className="text-right py-1 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={7} className="text-center text-gray-500 py-4">
              No trades recorded yet.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700 sticky top-0 bg-gray-900">
        <tr>
          <th className="text-left py-1 font-medium">Pair</th>
          <th className="text-left py-1 font-medium">Side</th>
          <th className="text-right py-1 font-medium">Amount</th>
          <th className="text-right py-1 font-medium">Price</th>
          <th className="text-right py-1 font-medium">P&L</th>
          <th className="text-right py-1 font-medium">Gas</th>
          <th className="text-right py-1 font-medium">Time</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {trades.slice(0, 50).map((trade) => (
          <tr
            key={trade.id}
            className="text-sm text-gray-300 border-b border-gray-800 hover:bg-gray-800/50"
          >
            <td className="py-1">{trade.pair}</td>
            <td
              className={`py-1 ${
                trade.side === "buy" ? "text-green-400" : "text-red-400"
              }`}
            >
              {trade.side.toUpperCase()}
            </td>
            <td className="py-1 text-right">{trade.amount.toFixed(4)}</td>
            <td className="py-1 text-right">
              ${trade.price.toLocaleString()}
            </td>
            <td
              className={`py-1 text-right ${
                trade.pnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
            </td>
            <td className="py-1 text-right text-gray-500">
              ${trade.gasCost.toFixed(4)}
            </td>
            <td className="py-1 text-right text-gray-500">
              {formatChartTime(trade.timestamp)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeFiPnL({
  summary,
  chartData,
  trades,
  connectionState,
  isLoading,
  error,
  className = "",
}: DeFiPnLProps) {
  const displayData =
    chartData.length > 1000
      ? chartData.filter(
          (_, i) => i % Math.ceil(chartData.length / 1000) === 0,
        )
      : chartData;

  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800 p-4 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">DeFi P&L (Base)</h2>
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

      {isLoading && !summary && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-800 rounded-lg" />
            ))}
          </div>
          <div className="h-[200px] bg-gray-800 rounded-lg" />
          <div className="h-[100px] bg-gray-800 rounded-lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">
          Failed to load DeFi data: {error.message}
        </p>
      )}

      {!isLoading && !error && !summary && (
        <div className="text-sm text-gray-500">
          <p>No trading data available</p>
          <p className="text-xs mt-1">
            P&L data will appear once the DeFi agent begins trading on Base.
          </p>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <SummaryCards summary={summary} />

          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Revenue vs Costs
            </h3>
            <PnLChart data={displayData} />
          </div>

          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Recent Trades
            </h3>
            <div className="overflow-y-auto max-h-[200px]">
              <TradeTable trades={trades} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
