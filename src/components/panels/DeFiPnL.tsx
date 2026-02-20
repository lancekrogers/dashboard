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
  Tooltip,
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
    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function formatUSD(n: number): string {
  const prefix = n < 0 ? "-" : "";
  return `${prefix}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChartTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
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
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 1000) === 0)
      : chartData;

  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">DeFi P&L</h2>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === "connected" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">Base</span>
        </div>
      </div>

      {isLoading && !summary && (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-800 rounded-lg" />
            ))}
          </div>
          <div className="h-[200px] bg-gray-800 rounded-lg" />
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
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-5 gap-2 mb-4">
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
              value={formatUSD(summary.netProfit)}
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
              color={
                summary.winRate > 60
                  ? "text-green-400"
                  : summary.winRate > 40
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            />
          </div>

          {/* Chart */}
          {displayData.length > 0 && (
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={displayData}>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatChartTime}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    stroke="#374151"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    stroke="#374151"
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(label) => formatChartTime(String(label))}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeRevenue"
                    stroke="#22c55e"
                    dot={false}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeCosts"
                    stroke="#ef4444"
                    dot={false}
                    name="Costs"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#3b82f6"
                    dot={false}
                    strokeDasharray="5 5"
                    name="Net Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent trades */}
          {trades.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Recent Trades
              </h3>
              <div className="overflow-auto max-h-[200px]">
                <table className="w-full text-xs">
                  <thead className="text-gray-500 border-b border-gray-800 sticky top-0 bg-gray-900">
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
                      <tr key={trade.id} className="border-b border-gray-800/50">
                        <td className="py-1 text-gray-300">{trade.pair}</td>
                        <td
                          className={`py-1 ${
                            trade.side === "buy"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.side}
                        </td>
                        <td className="py-1 text-right text-gray-300">
                          {trade.amount.toFixed(4)}
                        </td>
                        <td className="py-1 text-right text-gray-300">
                          {formatUSD(trade.price)}
                        </td>
                        <td
                          className={`py-1 text-right ${
                            trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatUSD(trade.pnl)}
                        </td>
                        <td className="py-1 text-right text-gray-400">
                          {formatUSD(trade.gasCost)}
                        </td>
                        <td className="py-1 text-right text-gray-500">
                          {formatChartTime(trade.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
