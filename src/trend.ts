import type { Severity } from "./types.js";

/** A snapshot of an analysis at a point in time */
export interface Snapshot {
  timestamp: number;
  score: number;
  level: string;
  findingCount: number;
  bySeverity: Record<Severity, number>;
  label?: string;
}

/** Trend analysis result */
export interface TrendAnalysis {
  snapshots: Snapshot[];
  direction: "improving" | "stable" | "degrading";
  scoreTrend: number; // average delta per snapshot
  averageScore: number;
  peakScore: number;
  lowestScore: number;
  volatility: number; // standard deviation of scores
}

/**
 * Analyze trends across snapshots
 */
export function analyzeTrend(snapshots: Snapshot[]): TrendAnalysis {
  if (snapshots.length === 0) {
    return {
      snapshots: [],
      direction: "stable",
      scoreTrend: 0,
      averageScore: 0,
      peakScore: 0,
      lowestScore: 0,
      volatility: 0,
    };
  }

  const scores = snapshots.map((s) => s.score);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const peakScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  // Calculate score trend (average delta)
  let totalDelta = 0;
  for (let i = 1; i < scores.length; i++) {
    totalDelta += scores[i]! - scores[i - 1]!;
  }
  const scoreTrend =
    scores.length > 1 ? totalDelta / (scores.length - 1) : 0;

  // Calculate volatility (standard deviation)
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) /
    scores.length;
  const volatility = Math.sqrt(variance);

  // Determine direction
  let direction: TrendAnalysis["direction"];
  if (scoreTrend < -1) direction = "improving";
  else if (scoreTrend > 1) direction = "degrading";
  else direction = "stable";

  return {
    snapshots,
    direction,
    scoreTrend: Math.round(scoreTrend * 100) / 100,
    averageScore: Math.round(averageScore * 100) / 100,
    peakScore,
    lowestScore,
    volatility: Math.round(volatility * 100) / 100,
  };
}

/**
 * Create a snapshot from analysis data
 */
export function createSnapshot(
  score: number,
  level: string,
  findingCount: number,
  bySeverity: Record<Severity, number>,
  label?: string
): Snapshot {
  return {
    timestamp: Date.now(),
    score,
    level,
    findingCount,
    bySeverity,
    label,
  };
}

/**
 * Format trend as text
 */
export function formatTrend(trend: TrendAnalysis): string {
  const lines: string[] = [];
  const arrow =
    trend.direction === "improving"
      ? "v"
      : trend.direction === "degrading"
        ? "^"
        : "=";

  lines.push(
    `Trend: ${trend.direction} ${arrow} (avg delta: ${trend.scoreTrend >= 0 ? "+" : ""}${trend.scoreTrend})`
  );
  lines.push(
    `Average: ${trend.averageScore}, Peak: ${trend.peakScore}, Low: ${trend.lowestScore}, Volatility: ${trend.volatility}`
  );
  lines.push(`Snapshots: ${trend.snapshots.length}`);

  return lines.join("\n");
}

/**
 * Generate a simple ASCII sparkline from scores
 */
export function sparkline(scores: number[], width = 20): string {
  if (scores.length === 0) return "";
  const max = Math.max(...scores, 1);
  const chars = " _.-~*^";

  return scores
    .map((s) => {
      const normalized = Math.min(s / max, 1);
      const idx = Math.round(normalized * (chars.length - 1));
      return chars[idx];
    })
    .join("");
}
