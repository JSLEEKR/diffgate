/** Represents a single hunk in a diff */
export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/** A single line in a diff */
export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/** A parsed file diff */
export interface FileDiff {
  oldPath: string;
  newPath: string;
  status: "added" | "deleted" | "modified" | "renamed";
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}

/** Complete parsed diff */
export interface ParsedDiff {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
}

/** Risk severity levels */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** A detected risk finding */
export interface Finding {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  file: string;
  line?: number;
  snippet?: string;
  category: string;
}

/** Rule definition */
export interface Rule {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  check: (file: FileDiff, diff: ParsedDiff) => Finding[];
}

/** Analysis result */
export interface AnalysisResult {
  findings: Finding[];
  score: RiskScore;
  summary: AnalysisSummary;
}

/** Risk score breakdown */
export interface RiskScore {
  total: number;
  breakdown: Record<string, number>;
  level: "safe" | "caution" | "warning" | "danger" | "critical";
}

/** Analysis summary */
export interface AnalysisSummary {
  filesAnalyzed: number;
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<string, number>;
  blastRadius: BlastRadius;
}

/** Blast radius assessment */
export interface BlastRadius {
  filesChanged: number;
  linesChanged: number;
  categoriesAffected: string[];
  scope: "tiny" | "small" | "medium" | "large" | "massive";
}

/** Configuration */
export interface DiffGateConfig {
  rules?: string[];
  excludeRules?: string[];
  excludeFiles?: string[];
  severityThreshold?: Severity;
  maxScore?: number;
  customRules?: Rule[];
}
