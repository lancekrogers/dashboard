import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { FestivalView } from "../FestivalView";
import type { FestivalProgress } from "@/lib/data/types";

function makeMockData(): FestivalProgress {
  return {
    festivalId: "DA0001",
    festivalName: "dashboard",
    overallCompletionPercent: 50,
    phases: [
      {
        id: "phase-1",
        name: "001_IMPLEMENT",
        status: "active",
        completionPercent: 50,
        sequences: [
          {
            id: "seq-1",
            name: "01_data_layer",
            status: "completed",
            completionPercent: 100,
            tasks: [
              { id: "t1", name: "01_link_project", status: "completed", autonomy: "medium" },
              { id: "t2", name: "02_design_data_layer", status: "completed", autonomy: "medium" },
            ],
          },
          {
            id: "seq-2",
            name: "02_festival_view",
            status: "active",
            completionPercent: 0,
            tasks: [
              { id: "t3", name: "01_design_component", status: "pending", autonomy: "medium" },
            ],
          },
        ],
      },
    ],
  };
}

describe("FestivalView", () => {
  it("renders loading skeleton when isLoading and no data", () => {
    const { container } = render(
      <FestivalView data={null} isLoading={true} error={null} />
    );
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders error message when error is provided", () => {
    const error = new Error("Connection failed");
    const { getByText } = render(
      <FestivalView data={null} isLoading={false} error={error} />
    );
    expect(getByText(/Connection failed/)).toBeTruthy();
  });

  it("renders empty state when no data and not loading", () => {
    const { getByText } = render(
      <FestivalView data={null} isLoading={false} error={null} />
    );
    expect(getByText("No festival data available")).toBeTruthy();
  });

  it("renders festival data with phase names", () => {
    const data = makeMockData();
    const { getByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );
    expect(getByText("001_IMPLEMENT")).toBeTruthy();
  });

  it("renders overall completion percentage", () => {
    const data = makeMockData();
    const { getByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );
    expect(getByText("50% complete")).toBeTruthy();
  });

  it("shows sequences when phase is expanded (default)", () => {
    const data = makeMockData();
    const { getByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );
    expect(getByText("01_data_layer")).toBeTruthy();
    expect(getByText("02_festival_view")).toBeTruthy();
  });

  it("toggles phase expansion on click", () => {
    const data = makeMockData();
    const { getByText, queryByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );

    // Sequences visible by default
    expect(getByText("01_data_layer")).toBeTruthy();

    // Click to collapse
    fireEvent.click(getByText("001_IMPLEMENT"));
    expect(queryByText("01_data_layer")).toBeNull();

    // Click to re-expand
    fireEvent.click(getByText("001_IMPLEMENT"));
    expect(getByText("01_data_layer")).toBeTruthy();
  });

  it("shows tasks when sequence is expanded", () => {
    const data = makeMockData();
    const { getByText, queryByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );

    // Tasks are hidden by default (sequences collapsed)
    expect(queryByText("01_link_project")).toBeNull();

    // Click to expand sequence
    fireEvent.click(getByText("01_data_layer"));
    expect(getByText("01_link_project")).toBeTruthy();
    expect(getByText("02_design_data_layer")).toBeTruthy();
  });

  it("does not crash with empty phases array", () => {
    const data: FestivalProgress = {
      festivalId: "test",
      festivalName: "test",
      phases: [],
      overallCompletionPercent: 0,
    };
    const { getByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );
    expect(getByText("0% complete")).toBeTruthy();
  });

  it("does not crash with sequence with zero tasks", () => {
    const data: FestivalProgress = {
      festivalId: "test",
      festivalName: "test",
      overallCompletionPercent: 0,
      phases: [
        {
          id: "p1",
          name: "Phase1",
          status: "pending",
          completionPercent: 0,
          sequences: [
            {
              id: "s1",
              name: "EmptySeq",
              status: "pending",
              completionPercent: 0,
              tasks: [],
            },
          ],
        },
      ],
    };
    const { getByText } = render(
      <FestivalView data={data} isLoading={false} error={null} />
    );
    expect(getByText("EmptySeq")).toBeTruthy();
  });
});
