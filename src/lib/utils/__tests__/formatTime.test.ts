import { formatUptime, formatTimeAgo } from "../formatTime";

describe("formatUptime", () => {
  it("formats 0 seconds", () => {
    expect(formatUptime(0)).toBe("0s");
  });

  it("formats seconds only", () => {
    expect(formatUptime(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatUptime(90)).toBe("1m 30s");
  });

  it("formats hours and minutes", () => {
    expect(formatUptime(3661)).toBe("1h 1m");
  });

  it("formats days and hours", () => {
    expect(formatUptime(90000)).toBe("1d 1h");
  });

  it("formats exactly 2 days", () => {
    expect(formatUptime(172800)).toBe("2d 0h");
  });
});

describe("formatTimeAgo", () => {
  it("returns 'just now' for recent timestamps", () => {
    const recent = new Date(Date.now() - 5000).toISOString();
    expect(formatTimeAgo(recent)).toBe("just now");
  });

  it("returns seconds ago for 10-59 second old timestamps", () => {
    const ts = new Date(Date.now() - 30000).toISOString();
    const result = formatTimeAgo(ts);
    expect(result).toMatch(/^\d+s ago$/);
  });

  it("returns minutes ago for 60+ second old timestamps", () => {
    const ts = new Date(Date.now() - 120000).toISOString();
    expect(formatTimeAgo(ts)).toBe("2m ago");
  });

  it("returns hours ago for 60+ minute old timestamps", () => {
    const ts = new Date(Date.now() - 7200000).toISOString();
    expect(formatTimeAgo(ts)).toBe("2h ago");
  });

  it("returns 'just now' for future timestamps", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(formatTimeAgo(future)).toBe("just now");
  });

  it("returns 'just now' for invalid timestamps", () => {
    expect(formatTimeAgo("not-a-date")).toBe("just now");
  });
});
