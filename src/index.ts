// Core
export { parseDiff, classifyFile } from "./parser.js";
export { analyze, gate } from "./analyzer.js";
export { builtinRules, getRules } from "./rules.js";
export { extendedRules } from "./rules-extended.js";
export {
  calculateScore,
  calculateBlastRadius,
  buildSummary,
  filterBySeverity,
  sortFindings,
} from "./scorer.js";

// Output
export { format, formatText, formatJSON, formatOneline, formatMarkdown } from "./reporter.js";
export { toSarif, formatSarif } from "./sarif.js";
export { toAnnotations, formatAnnotations, toReviewComments, formatReviewBody } from "./annotations.js";

// Features
export { globToRegex, matchGlob, matchAny } from "./glob.js";
export { loadConfig, parseConfig, mergeConfigs } from "./config.js";
export { buildCustomRule, parseCustomRules, validateCustomRuleDefinition } from "./custom-rules.js";
export { calculateStats, formatStats } from "./stats.js";
export { assessComplexity, assessAllComplexity } from "./complexity.js";
export { compare, formatComparison } from "./compare.js";
export { fingerprintDiff, fingerprintFindings, diffsEqual, changedFiles } from "./fingerprint.js";
export { generateSuggestions, formatSuggestions, getSuggestionTemplate } from "./suggestions.js";
export { batchAnalyze, formatBatchResult } from "./batch.js";
export { getProfile, listProfiles, applyProfile, applySeverityOverrides } from "./profiles.js";
export { summarizeByCategory, analyzeRuleFrequency, formatCategorySummary, formatRuleFrequency } from "./summary.js";
export { analyzeTrend, createSnapshot, formatTrend, sparkline } from "./trend.js";
export { parseCodeowners, findOwners, analyzeOwnership } from "./ownership.js";

// CLI
export { run } from "./cli.js";

// Types
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
export type { CustomRuleDefinition } from "./custom-rules.js";
export type { FileStats, DiffStats, CategoryStats } from "./stats.js";
export type { FileComplexity } from "./complexity.js";
export type { Comparison } from "./compare.js";
export type { DiffFingerprint } from "./fingerprint.js";
export type { Suggestion } from "./suggestions.js";
export type { BatchEntry, BatchResult, BatchEntryResult, AggregateResult } from "./batch.js";
export type { Profile, SeverityOverrides } from "./profiles.js";
export type { CategorySummary, RuleFrequency } from "./summary.js";
export type { Snapshot, TrendAnalysis } from "./trend.js";
export type { OwnerEntry, OwnershipReport } from "./ownership.js";
