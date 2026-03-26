import type { AnalysisResult, Finding, Severity } from "./types.js";

/** Comparison between two analysis results */
export interface Comparison {
  before: AnalysisResult;
  after: AnalysisResult;
  scoreDelta: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
  persistedFindings: Finding[];
  levelChanged: boolean;
  improved: boolean;
  degraded: boolean;
}

/**
 * Compare two analysis results to detect regressions
 */
export function compare(
  before: AnalysisResult,
  after: AnalysisResult
): Comparison {
  const scoreDelta = after.score.total - before.score.total;

  const beforeKeys = new Set(before.findings.map(findingKey));
  const afterKeys = new Set(after.findings.map(findingKey));

  const newFindings = after.findings.filter(
    (f) => !beforeKeys.has(findingKey(f))
  );
  const resolvedFindings = before.findings.filter(
    (f) => !afterKeys.has(findingKey(f))
  );
  const persistedFindings = after.findings.filter(
    (f) => beforeKeys.has(findingKey(f))
  );

  const levelChanged = before.score.level !== after.score.level;
  const improved = scoreDelta < 0;
  const degraded = scoreDelta > 0;

  return {
    before,
    after,
    scoreDelta,
    newFindings,
    resolvedFindings,
    persistedFindings,
    levelChanged,
    improved,
    degraded,
  };
}

/**
 * Format comparison as text
 */
export function formatComparison(comp: Comparison): string {
  const lines: string[] = [];
  const arrow = comp.degraded ? ">>>" : comp.improved ? "<<<" : "===";

  lines.push(
    `${comp.before.score.level.toUpperCase()} (${comp.before.score.total}) ${arrow} ${comp.after.score.level.toUpperCase()} (${comp.after.score.total})  [delta: ${comp.scoreDelta >= 0 ? "+" : ""}${comp.scoreDelta}]`
  );
  lines.push("");

  if (comp.newFindings.length > 0) {
    lines.push(`New findings (${comp.newFindings.length}):`);
    for (const f of comp.newFindings) {
      lines.push(`  + [${f.ruleId}] ${f.message} — ${f.file}`);
    }
    lines.push("");
  }

  if (comp.resolvedFindings.length > 0) {
    lines.push(`Resolved findings (${comp.resolvedFindings.length}):`);
    for (const f of comp.resolvedFindings) {
      lines.push(`  - [${f.ruleId}] ${f.message} — ${f.file}`);
    }
    lines.push("");
  }

  if (comp.persistedFindings.length > 0) {
    lines.push(`Persisted findings (${comp.persistedFindings.length}):`);
    for (const f of comp.persistedFindings) {
      lines.push(`  = [${f.ruleId}] ${f.message} — ${f.file}`);
    }
  }

  return lines.join("\n");
}

function findingKey(f: Finding): string {
  return `${f.ruleId}:${f.file}:${f.message}`;
}
