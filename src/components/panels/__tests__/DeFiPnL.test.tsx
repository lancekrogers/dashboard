import { render } from "@testing-library/react";
import { DeFiPnL } from "../DeFiPnL";
import type { PnLSummary, PnLDataPoint, Trade } from "@/lib/data/types";

function makeSummary(overrides: Partial<PnLSummary> = {}): PnLSummary {
  return {
    totalRevenue: 12500.5,
    totalCosts: 8200.75,
    netProfit: 4299.75,
    tradeCount: 142,
    winCount: 98,
    lossCount: 44,
    winRate: 69.0,
    ...overrides,
  };
}

function makeDataPoint(overrides: Partial<PnLDataPoint> = {}): PnLDataPoint {
  return {
    timestamp: new Date().toISOString(),
    cumulativeRevenue: 1000,
    cumulativeCosts: 500,
    cumulativeProfit: 500,
    ...overrides,
  };
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t-001",
    pair: "ETH/USDC",
    side: "buy",
    amount: 1.5,
    price: 3200,
    timestamp: new Date().toISOString(),
    pnl: 45.2,
    gasCost: 0.0042,
    txHash: "0xabc123",
    ...overrides,
  };
}

const defaultProps = {
  summary: null as PnLSummary | null,
  chartData: [] as PnLDataPoint[],
  trades: [] as Trade[],
  connectionState: "connected" as const,
  isLoading: false,
  error: null as Error | null,
};

describe("DeFiPnL", () => {
  it("renders loading skeleton when isLoading and no summary", () => {
    const { container } = render(
      <DeFiPnL {...defaultProps} isLoading={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders error message", () => {
    const { getByText } = render(
      <DeFiPnL
        {...defaultProps}
        connectionState="error"
        error={new Error("RPC timeout")}
      />,
    );
    expect(getByText(/RPC timeout/)).toBeTruthy();
  });

  it("renders empty state when no summary and not loading", () => {
    const { getByText } = render(<DeFiPnL {...defaultProps} />);
    expect(getByText("No trading data available")).toBeTruthy();
  });

  it("renders panel title with (Base)", () => {
    const { getByText } = render(<DeFiPnL {...defaultProps} />);
    expect(getByText("DeFi P&L (Base)")).toBeTruthy();
  });

  it("shows connection state", () => {
    const { getByText } = render(
      <DeFiPnL {...defaultProps} connectionState="disconnected" />,
    );
    expect(getByText("disconnected")).toBeTruthy();
  });

  it("renders all five summary cards", () => {
    const summary = makeSummary();
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    expect(getByText("Revenue")).toBeTruthy();
    expect(getByText("Costs")).toBeTruthy();
    expect(getByText("Net P&L")).toBeTruthy();
    expect(getByText("Trades")).toBeTruthy();
    expect(getByText("Win Rate")).toBeTruthy();
  });

  it("formats trade count as plain number", () => {
    const summary = makeSummary({ tradeCount: 142 });
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    expect(getByText("142")).toBeTruthy();
  });

  it("formats win rate with one decimal", () => {
    const summary = makeSummary({ winRate: 69.0 });
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    expect(getByText("69.0%")).toBeTruthy();
  });

  it("renders positive net P&L with + prefix", () => {
    const summary = makeSummary({ netProfit: 100 });
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    const netPnlCard = container.querySelectorAll(".text-green-400");
    const texts = Array.from(netPnlCard).map((el) => el.textContent);
    expect(texts.some((t) => t?.includes("+"))).toBe(true);
  });

  it("renders negative net P&L with red color", () => {
    const summary = makeSummary({ netProfit: -500 });
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    const redElements = container.querySelectorAll(".text-red-400");
    const texts = Array.from(redElements).map((el) => el.textContent);
    expect(texts.some((t) => t?.includes("$500.00"))).toBe(true);
  });

  it("renders chart empty placeholder when no chartData", () => {
    const summary = makeSummary();
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} chartData={[]} />,
    );
    expect(
      getByText("Chart will appear when trading data is available."),
    ).toBeTruthy();
  });

  it("renders Revenue vs Costs section label", () => {
    const summary = makeSummary();
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} />,
    );
    expect(getByText("Revenue vs Costs")).toBeTruthy();
  });

  it("renders Recent Trades section label", () => {
    const summary = makeSummary();
    const trades = [makeTrade()];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("Recent Trades")).toBeTruthy();
  });

  it("renders trade table with correct columns", () => {
    const summary = makeSummary();
    const trades = [makeTrade()];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("Pair")).toBeTruthy();
    expect(getByText("Side")).toBeTruthy();
    expect(getByText("Amount")).toBeTruthy();
    expect(getByText("Price")).toBeTruthy();
    expect(getByText("Gas")).toBeTruthy();
    expect(getByText("Time")).toBeTruthy();
  });

  it("renders trade pair", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ pair: "WBTC/USDC" })];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("WBTC/USDC")).toBeTruthy();
  });

  it("renders trade side in uppercase", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ side: "buy" })];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("BUY")).toBeTruthy();
  });

  it("renders sell side in red", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ side: "sell" })];
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    const sellCell = container.querySelector("td.text-red-400");
    expect(sellCell?.textContent).toBe("SELL");
  });

  it("renders trade amount with 4 decimals", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ amount: 1.5 })];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("1.5000")).toBeTruthy();
  });

  it("renders gas cost with 4 decimals", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ gasCost: 0.0042 })];
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    expect(getByText("$0.0042")).toBeTruthy();
  });

  it("renders positive pnl with + prefix and green", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ pnl: 45.2 })];
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    const greenCells = container.querySelectorAll("td.text-green-400");
    const pnlCell = Array.from(greenCells).find((td) =>
      td.textContent?.includes("45.20"),
    );
    expect(pnlCell).toBeTruthy();
    expect(pnlCell?.textContent).toContain("+");
  });

  it("renders negative pnl in red without + prefix", () => {
    const summary = makeSummary();
    const trades = [makeTrade({ pnl: -12.5 })];
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    const cells = container.querySelectorAll("td");
    const pnlCell = Array.from(cells).find(
      (td) =>
        td.classList.contains("text-red-400") &&
        td.textContent?.includes("12.50"),
    );
    expect(pnlCell).toBeTruthy();
    expect(pnlCell?.textContent).not.toContain("+");
  });

  it("limits trades to 50 rows", () => {
    const summary = makeSummary();
    const trades = Array.from({ length: 60 }, (_, i) =>
      makeTrade({ id: `t-${i}` }),
    );
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={trades} />,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(50);
  });

  it("shows empty trades message when no trades", () => {
    const summary = makeSummary();
    const { getByText } = render(
      <DeFiPnL {...defaultProps} summary={summary} trades={[]} />,
    );
    expect(getByText("No trades recorded yet.")).toBeTruthy();
  });

  it("renders skeleton cards when summary is null during loading", () => {
    const { container } = render(
      <DeFiPnL {...defaultProps} isLoading={true} summary={null} />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse .bg-gray-800");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it("renders chart container when chartData is provided", () => {
    const summary = makeSummary();
    const chartData = Array.from({ length: 5 }, (_, i) =>
      makeDataPoint({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        cumulativeRevenue: 100 * (i + 1),
        cumulativeCosts: 50 * (i + 1),
        cumulativeProfit: 50 * (i + 1),
      }),
    );
    const { container } = render(
      <DeFiPnL {...defaultProps} summary={summary} chartData={chartData} />,
    );
    // Recharts renders a ResponsiveContainer div
    const chartWrapper = container.querySelector(".recharts-responsive-container");
    expect(chartWrapper).toBeTruthy();
  });

  it("applies win rate color tiers correctly", () => {
    // > 60 → green
    const { container: c1 } = render(
      <DeFiPnL {...defaultProps} summary={makeSummary({ winRate: 75.0 })} />,
    );
    const winRateCards1 = Array.from(
      c1.querySelectorAll(".text-green-400"),
    ).filter((el) => el.textContent === "75.0%");
    expect(winRateCards1.length).toBe(1);

    // 40-60 → yellow
    const { container: c2 } = render(
      <DeFiPnL {...defaultProps} summary={makeSummary({ winRate: 50.0 })} />,
    );
    const winRateCards2 = Array.from(
      c2.querySelectorAll(".text-yellow-400"),
    ).filter((el) => el.textContent === "50.0%");
    expect(winRateCards2.length).toBe(1);

    // < 40 → red
    const { container: c3 } = render(
      <DeFiPnL {...defaultProps} summary={makeSummary({ winRate: 25.0 })} />,
    );
    const winRateCards3 = Array.from(
      c3.querySelectorAll(".text-red-400"),
    ).filter((el) => el.textContent === "25.0%");
    expect(winRateCards3.length).toBe(1);
  });
});
