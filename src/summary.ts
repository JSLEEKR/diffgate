import type { AnalysisResult, Finding, Severity } from "./types.js";

/** Category summary entry */
export interface CategorySummary {
  category: string;
  findingCount: number;
  score: number;
  topSeverity: Severity;
  ruleIds: string[];
}

/** Rule frequency analysis */
export interface RuleFrequency {
  ruleId: string;
  ruleName: string;
  count: number;
  severity: Severity;
  files: string[];
}

/**
 * Summarize findings by category
 */
export function summarizeByCategory(
  result: AnalysisResult
): CategorySummary[] {
  const cats = new Map<string, {
    findings: Finding[];
    score: number;
  }>();

  for (const f of result.findings) {
    if (!cats.has(f.category)) {
      cats.set(f.category, { findings: [], score: 0 });
    }
    const entry = cats.get(f.category)!;
    entry.findings.push(f);
  }

  // Get scores from breakdown
  for (const [cat, score] of Object.entries(result.score.breakdown)) {
    if (cats.has(cat)) {
      cats.get(cat)!.score = score;
    }
  }

  const severityOrder: Record<Severity, number> = {
    critical: 4, high: 3, medium: 2, low: 1, info: 0,
  };

  return [...cats.entries()]
    .map(([category, data]) => {
      const topSeverity = data.findings.reduce(
        (max, f) =>
          severityOrder[f.severity] > severityOrder[max]
            ? f.severity
            : max,
        "info" as Severity
      );
      const ruleIds = [...new Set(data.findings.map((f) => f.ruleId))];
      return {
        category,
        findingCount: data.findings.length,
        score: data.score,
        topSeverity,
        ruleIds,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Analyze rule frequency across findings
 */
export function analyzeRuleFrequency(
  result: AnalysisResult
): RuleFrequency[] {
  const freq = new Map<string, {
    ruleName: string;
    count: number;
    severity: Severity;
    files: Set<string>;
  }>();

  for (const f of result.findings) {
    if (!freq.has(f.ruleId)) {
      freq.set(f.ruleId, {
        ruleName: f.ruleName,
        count: 0,
        severity: f.severity,
        files: new Set(),
      });
    }
    const entry = freq.get(f.ruleId)!;
    entry.count++;
    entry.files.add(f.file);
  }

  return [...freq.entries()]
    .map(([ruleId, data]) => ({
      ruleId,
      ruleName: data.ruleName,
      count: data.count,
      severity: data.severity,
      files: [...data.files],
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Format category summary as text
 */
export function formatCategorySummary(summaries: CategorySummary[]): string {
  if (summaries.length === 0) return "No findings by category.";

  const lines: string[] = ["Findings by category:", ""];
  for (const s of summaries) {
    lines.push(
      `  ${s.category} (${s.findingCount} findings, score: ${s.score}, top: ${s.topSeverity})`
    );
    lines.push(`    rules: ${s.ruleIds.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Format rule frequency as text
 */
export function formatRuleFrequency(frequencies: RuleFrequency[]): string {
  if (frequencies.length === 0) return "No rule frequencies to report.";

  const lines: string[] = ["Rule frequency:", ""];
  for (const f of frequencies) {
    lines.push(
      `  ${f.ruleId} ${f.ruleName} — ${f.count} hit(s) [${f.severity}] in ${f.files.length} file(s)`
    );
  }
  return lines.join("\n");
}
