import React from "react";
import { render } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  function getFill(container: HTMLElement): HTMLElement {
    // container > outer div > fill div
    const outer = container.firstChild as HTMLElement;
    return outer.firstChild as HTMLElement;
  }

  it("renders with 0% width", () => {
    const { container } = render(<ProgressBar percentage={0} />);
    expect(getFill(container).style.width).toBe("0%");
  });

  it("renders with 50% width", () => {
    const { container } = render(<ProgressBar percentage={50} />);
    expect(getFill(container).style.width).toBe("50%");
  });

  it("renders with 100% width", () => {
    const { container } = render(<ProgressBar percentage={100} />);
    expect(getFill(container).style.width).toBe("100%");
  });

  it("clamps values above 100", () => {
    const { container } = render(<ProgressBar percentage={150} />);
    expect(getFill(container).style.width).toBe("100%");
  });

  it("clamps negative values to 0", () => {
    const { container } = render(<ProgressBar percentage={-10} />);
    expect(getFill(container).style.width).toBe("0%");
  });

  it("applies sm size by default", () => {
    const { container } = render(<ProgressBar percentage={50} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("h-1.5");
  });

  it("applies md size", () => {
    const { container } = render(<ProgressBar percentage={50} size="md" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("h-2.5");
  });
});
