import type { AnalysisResult, DiffGateConfig, ParsedDiff } from "./types.js";
import { analyze } from "./analyzer.js";
import { parseDiff } from "./parser.js";

/** Batch analysis entry */
export interface BatchEntry {
  id: string;
  diff: string | ParsedDiff;
}

/** Batch analysis result */
export interface BatchResult {
  entries: BatchEntryResult[];
  aggregate: AggregateResult;
}

/** Individual entry result */
export interface BatchEntryResult {
  id: string;
  result: AnalysisResult;
  passed: boolean;
}

/** Aggregate across all entries */
export interface AggregateResult {
  totalEntries: number;
  totalFindings: number;
  totalScore: number;
  averageScore: number;
  passedCount: number;
  failedCount: number;
  worstEntry: string | null;
  bestEntry: string | null;
}

/**
 * Analyze multiple diffs in batch
 */
export function batchAnalyze(
  entries: BatchEntry[],
  config?: DiffGateConfig
): BatchResult {
  const maxScore = config?.maxScore ?? Infinity;

  const results: BatchEntryResult[] = entries.map((entry) => {
    const result = analyze(entry.diff, config);
    return {
      id: entry.id,
      result,
      passed: result.score.total <= maxScore,
    };
  });

  const totalFindings = results.reduce(
    (sum, r) => sum + r.result.findings.length,
    0
  );
  const totalScore = results.reduce(
    (sum, r) => sum + r.result.score.total,
    0
  );
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  const sorted = [...results].sort(
    (a, b) => b.result.score.total - a.result.score.total
  );

  return {
    entries: results,
    aggregate: {
      totalEntries: entries.length,
      totalFindings,
      totalScore,
      averageScore:
        entries.length > 0 ? Math.round(totalScore / entries.length) : 0,
      passedCount,
      failedCount,
      worstEntry: sorted[0]?.id ?? null,
      bestEntry: sorted.length > 0 ? sorted[sorted.length - 1]!.id : null,
    },
  };
}

/**
 * Format batch results as text
 */
export function formatBatchResult(batch: BatchResult): string {
  const lines: string[] = [];
  const agg = batch.aggregate;

  lines.push(
    `Batch analysis: ${agg.totalEntries} entries, ${agg.passedCount} passed, ${agg.failedCount} failed`
  );
  lines.push(
    `Total findings: ${agg.totalFindings}, Average score: ${agg.averageScore}`
  );
  lines.push("");

  for (const entry of batch.entries) {
    const status = entry.passed ? "PASS" : "FAIL";
    lines.push(
      `  [${status}] ${entry.id}: score ${entry.result.score.total} (${entry.result.score.level}), ${entry.result.findings.length} findings`
    );
  }

  if (agg.worstEntry) {
    lines.push("");
    lines.push(`Worst: ${agg.worstEntry}, Best: ${agg.bestEntry}`);
  }

  return lines.join("\n");
}
