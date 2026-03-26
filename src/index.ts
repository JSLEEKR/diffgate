export { parseDiff, classifyFile } from "./parser.js";
export { analyze, gate } from "./analyzer.js";
export { builtinRules, getRules } from "./rules.js";
export {
  calculateScore,
  calculateBlastRadius,
  buildSummary,
  filterBySeverity,
  sortFindings,
} from "./scorer.js";
export { format, formatText, formatJSON, formatOneline, formatMarkdown } from "./reporter.js";
export { run } from "./cli.js";
export { globToRegex, matchGlob, matchAny } from "./glob.js";

export type {
  ParsedDiff,
  FileDiff,
  DiffHunk,
  DiffLine,
  Finding,
  Rule,
  Severity,
  RiskScore,
  AnalysisResult,
  AnalysisSummary,
  BlastRadius,
  DiffGateConfig,
} from "./types.js";
