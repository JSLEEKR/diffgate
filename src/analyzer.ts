import type {
  AnalysisResult,
  DiffGateConfig,
  Finding,
  ParsedDiff,
  Severity,
} from "./types.js";
import { parseDiff } from "./parser.js";
import { getRules } from "./rules.js";
import { matchAny } from "./glob.js";
import {
  calculateScore,
  buildSummary,
  filterBySeverity,
  sortFindings,
} from "./scorer.js";

/**
 * Analyze a unified diff string for risks
 */
export function analyze(
  diffInput: string | ParsedDiff,
  config?: DiffGateConfig
): AnalysisResult {
  const diff =
    typeof diffInput === "string" ? parseDiff(diffInput) : diffInput;
  const rules = getRules(config);

  let findings: Finding[] = [];

  // Apply exclude files filter
  const filesToAnalyze = config?.excludeFiles
    ? diff.files.filter(
        (f) => !matchAny(f.newPath, config.excludeFiles!)
      )
    : diff.files;

  // Create a filtered diff for analysis
  const filteredDiff: ParsedDiff = {
    files: filesToAnalyze,
    totalAdditions: filesToAnalyze.reduce((s, f) => s + f.additions, 0),
    totalDeletions: filesToAnalyze.reduce((s, f) => s + f.deletions, 0),
  };

  // Run each rule against each file
  for (const file of filesToAnalyze) {
    for (const rule of rules) {
      const ruleFindings = rule.check(file, filteredDiff);
      findings.push(...ruleFindings);
    }
  }

  // Apply severity filter
  if (config?.severityThreshold) {
    findings = filterBySeverity(findings, config.severityThreshold);
  }

  // Sort by severity
  findings = sortFindings(findings);

  // Deduplicate global findings
  findings = deduplicateFindings(findings);

  const score = calculateScore(findings);
  const summary = buildSummary(findings, filteredDiff);

  return { findings, score, summary };
}

/**
 * Analyze and check against max score threshold
 */
export function gate(
  diffInput: string | ParsedDiff,
  config?: DiffGateConfig
): { result: AnalysisResult; passed: boolean } {
  const result = analyze(diffInput, config);
  const maxScore = config?.maxScore ?? 100;
  const passed = result.score.total <= maxScore;
  return { result, passed };
}

/**
 * Remove duplicate global findings
 */
function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.ruleId}:${f.file}:${f.line ?? ""}:${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
