import type {
  Finding,
  RiskScore,
  Severity,
  AnalysisSummary,
  BlastRadius,
  ParsedDiff,
} from "./types.js";
import { classifyFile } from "./parser.js";

/** Severity weight mapping */
const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

/** Severity ordering (higher = more severe) */
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Calculate risk score from findings
 */
export function calculateScore(findings: Finding[]): RiskScore {
  const breakdown: Record<string, number> = {};

  for (const finding of findings) {
    const weight = SEVERITY_WEIGHTS[finding.severity];
    const cat = finding.category;
    breakdown[cat] = (breakdown[cat] ?? 0) + weight;
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  let level: RiskScore["level"];
  if (total >= 100) level = "critical";
  else if (total >= 60) level = "danger";
  else if (total >= 30) level = "warning";
  else if (total >= 10) level = "caution";
  else level = "safe";

  return { total, breakdown, level };
}

/**
 * Calculate blast radius from parsed diff
 */
export function calculateBlastRadius(diff: ParsedDiff): BlastRadius {
  const filesChanged = diff.files.length;
  const linesChanged = diff.totalAdditions + diff.totalDeletions;
  const categoriesAffected = [
    ...new Set(diff.files.map((f) => classifyFile(f.newPath))),
  ];

  let scope: BlastRadius["scope"];
  if (filesChanged > 20 || linesChanged > 1000) scope = "massive";
  else if (filesChanged > 10 || linesChanged > 500) scope = "large";
  else if (filesChanged > 5 || linesChanged > 200) scope = "medium";
  else if (filesChanged > 2 || linesChanged > 50) scope = "small";
  else scope = "tiny";

  return { filesChanged, linesChanged, categoriesAffected, scope };
}

/**
 * Build analysis summary
 */
export function buildSummary(
  findings: Finding[],
  diff: ParsedDiff
): AnalysisSummary {
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const byCategory: Record<string, number> = {};

  for (const f of findings) {
    bySeverity[f.severity]++;
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  }

  return {
    filesAnalyzed: diff.files.length,
    totalFindings: findings.length,
    bySeverity,
    byCategory,
    blastRadius: calculateBlastRadius(diff),
  };
}

/**
 * Filter findings by minimum severity
 */
export function filterBySeverity(
  findings: Finding[],
  minSeverity: Severity
): Finding[] {
  const minOrder = SEVERITY_ORDER[minSeverity];
  return findings.filter((f) => SEVERITY_ORDER[f.severity] >= minOrder);
}

/**
 * Sort findings by severity (most severe first)
 */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );
}
