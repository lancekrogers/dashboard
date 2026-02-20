import React from "react";
import { render } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";
import type { FestivalEntityStatus } from "@/lib/data/types";

describe("StatusBadge", () => {
  const statuses: FestivalEntityStatus[] = [
    "pending",
    "active",
    "completed",
    "blocked",
    "failed",
  ];

  it.each(statuses)("renders '%s' status text", (status) => {
    const { getByText } = render(<StatusBadge status={status} />);
    expect(getByText(status)).toBeTruthy();
  });

  it("renders pending with gray colors", () => {
    const { container } = render(<StatusBadge status="pending" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-gray-800");
    expect(span.className).toContain("text-gray-400");
  });

  it("renders completed with green colors", () => {
    const { container } = render(<StatusBadge status="completed" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-green-900");
    expect(span.className).toContain("text-green-400");
  });

  it("renders active with blue colors", () => {
    const { container } = render(<StatusBadge status="active" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-blue-900");
    expect(span.className).toContain("text-blue-400");
  });

  it("renders blocked with yellow colors", () => {
    const { container } = render(<StatusBadge status="blocked" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-yellow-900");
    expect(span.className).toContain("text-yellow-400");
  });

  it("renders failed with red colors", () => {
    const { container } = render(<StatusBadge status="failed" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-red-900");
    expect(span.className).toContain("text-red-400");
  });
});
