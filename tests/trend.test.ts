import { describe, it, expect } from "vitest";
import {
  analyzeTrend,
  createSnapshot,
  formatTrend,
  sparkline,
} from "../src/trend.js";
import type { Snapshot } from "../src/trend.js";

function makeSnapshot(score: number, label?: string): Snapshot {
  return {
    timestamp: Date.now(),
    score,
    level: score > 60 ? "danger" : score > 30 ? "warning" : "safe",
    findingCount: score,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: score },
    label,
  };
}

describe("analyzeTrend", () => {
  it("detects improving trend", () => {
    const snapshots = [
      makeSnapshot(80),
      makeSnapshot(60),
      makeSnapshot(40),
      makeSnapshot(20),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.direction).toBe("improving");
    expect(trend.scoreTrend).toBeLessThan(0);
  });

  it("detects degrading trend", () => {
    const snapshots = [
      makeSnapshot(10),
      makeSnapshot(30),
      makeSnapshot(50),
      makeSnapshot(70),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.direction).toBe("degrading");
    expect(trend.scoreTrend).toBeGreaterThan(0);
  });

  it("detects stable trend", () => {
    const snapshots = [
      makeSnapshot(25),
      makeSnapshot(26),
      makeSnapshot(25),
      makeSnapshot(24),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.direction).toBe("stable");
  });

  it("calculates average score", () => {
    const snapshots = [
      makeSnapshot(10),
      makeSnapshot(20),
      makeSnapshot(30),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.averageScore).toBe(20);
  });

  it("finds peak and lowest scores", () => {
    const snapshots = [
      makeSnapshot(5),
      makeSnapshot(100),
      makeSnapshot(30),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.peakScore).toBe(100);
    expect(trend.lowestScore).toBe(5);
  });

  it("calculates volatility", () => {
    const stable = analyzeTrend([
      makeSnapshot(50),
      makeSnapshot(50),
      makeSnapshot(50),
    ]);
    const volatile = analyzeTrend([
      makeSnapshot(10),
      makeSnapshot(90),
      makeSnapshot(10),
    ]);
    expect(volatile.volatility).toBeGreaterThan(stable.volatility);
  });

  it("handles empty snapshots", () => {
    const trend = analyzeTrend([]);
    expect(trend.direction).toBe("stable");
    expect(trend.averageScore).toBe(0);
    expect(trend.snapshots).toHaveLength(0);
  });

  it("handles single snapshot", () => {
    const trend = analyzeTrend([makeSnapshot(42)]);
    expect(trend.averageScore).toBe(42);
    expect(trend.scoreTrend).toBe(0);
  });
});

describe("createSnapshot", () => {
  it("creates snapshot with current timestamp", () => {
    const before = Date.now();
    const snap = createSnapshot(25, "caution", 3, {
      critical: 1, high: 1, medium: 1, low: 0, info: 0,
    });
    expect(snap.timestamp).toBeGreaterThanOrEqual(before);
    expect(snap.score).toBe(25);
    expect(snap.level).toBe("caution");
    expect(snap.findingCount).toBe(3);
  });

  it("includes optional label", () => {
    const snap = createSnapshot(0, "safe", 0, {
      critical: 0, high: 0, medium: 0, low: 0, info: 0,
    }, "pr-123");
    expect(snap.label).toBe("pr-123");
  });
});

describe("formatTrend", () => {
  it("shows improving direction", () => {
    const trend = analyzeTrend([makeSnapshot(80), makeSnapshot(20)]);
    const output = formatTrend(trend);
    expect(output).toContain("improving");
  });

  it("shows degrading direction", () => {
    const trend = analyzeTrend([makeSnapshot(10), makeSnapshot(80)]);
    const output = formatTrend(trend);
    expect(output).toContain("degrading");
  });

  it("includes statistics", () => {
    const trend = analyzeTrend([
      makeSnapshot(10), makeSnapshot(20), makeSnapshot(30),
    ]);
    const output = formatTrend(trend);
    expect(output).toContain("Average:");
    expect(output).toContain("Peak:");
    expect(output).toContain("Volatility:");
  });

  it("includes snapshot count", () => {
    const trend = analyzeTrend([makeSnapshot(10), makeSnapshot(20)]);
    const output = formatTrend(trend);
    expect(output).toContain("Snapshots: 2");
  });
});

describe("sparkline", () => {
  it("generates characters for scores", () => {
    const result = sparkline([0, 10, 20, 50, 100]);
    expect(result.length).toBe(5);
  });

  it("handles empty scores", () => {
    expect(sparkline([])).toBe("");
  });

  it("handles all zeros", () => {
    const result = sparkline([0, 0, 0]);
    expect(result.length).toBe(3);
  });

  it("handles single value", () => {
    const result = sparkline([50]);
    expect(result.length).toBe(1);
  });

  it("represents higher values with different chars", () => {
    const low = sparkline([0]);
    const high = sparkline([100]);
    expect(low).not.toBe(high);
  });
});
