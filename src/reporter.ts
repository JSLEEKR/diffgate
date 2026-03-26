import type { AnalysisResult, Finding, Severity } from "./types.js";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "\x1b[31m", // red
  high: "\x1b[33m", // yellow
  medium: "\x1b[36m", // cyan
  low: "\x1b[37m", // white
  info: "\x1b[90m", // gray
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "!!",
  high: "! ",
  medium: "~ ",
  low: ". ",
  info: "  ",
};

const LEVEL_COLORS: Record<string, string> = {
  safe: "\x1b[32m",
  caution: "\x1b[36m",
  warning: "\x1b[33m",
  danger: "\x1b[31m",
  critical: "\x1b[91m",
};

/**
 * Format analysis result as plain text
 */
export function formatText(result: AnalysisResult): string {
  const lines: string[] = [];
  const { score, summary, findings } = result;

  // Header
  const levelColor = LEVEL_COLORS[score.level] ?? "";
  lines.push(
    `${BOLD}diffgate${RESET} risk analysis — ${levelColor}${BOLD}${score.level.toUpperCase()}${RESET} (score: ${score.total})`
  );
  lines.push("");

  // Blast radius
  const br = summary.blastRadius;
  lines.push(
    `Blast radius: ${br.scope} (${br.filesChanged} files, ${br.linesChanged} lines, ${br.categoriesAffected.length} categories)`
  );
  lines.push("");

  // Findings by severity
  if (findings.length === 0) {
    lines.push("No findings. Clean diff!");
  } else {
    lines.push(`${findings.length} finding(s):`);
    lines.push("");

    for (const finding of findings) {
      const color = SEVERITY_COLORS[finding.severity];
      const icon = SEVERITY_ICONS[finding.severity];
      const loc = finding.line ? `:${finding.line}` : "";
      lines.push(
        `  ${color}${icon}${RESET} [${finding.ruleId}] ${finding.message}`
      );
      lines.push(
        `     ${SEVERITY_COLORS.info}${finding.file}${loc}${RESET}`
      );
      if (finding.snippet) {
        lines.push(`     ${SEVERITY_COLORS.info}> ${finding.snippet}${RESET}`);
      }
    }
  }

  // Score breakdown
  if (Object.keys(score.breakdown).length > 0) {
    lines.push("");
    lines.push("Score breakdown:");
    for (const [cat, pts] of Object.entries(score.breakdown).sort(
      (a, b) => b[1] - a[1]
    )) {
      lines.push(`  ${cat}: ${pts}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format analysis result as JSON
 */
export function formatJSON(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format as a minimal one-line summary
 */
export function formatOneline(result: AnalysisResult): string {
  const { score, summary } = result;
  const parts: string[] = [
    `${score.level.toUpperCase()} (${score.total})`,
    `${summary.totalFindings} findings`,
    `${summary.blastRadius.filesChanged} files`,
  ];
  if (summary.bySeverity.critical > 0) {
    parts.push(`${summary.bySeverity.critical} critical`);
  }
  if (summary.bySeverity.high > 0) {
    parts.push(`${summary.bySeverity.high} high`);
  }
  return parts.join(" | ");
}

/**
 * Format as Markdown (for PR comments)
 */
export function formatMarkdown(result: AnalysisResult): string {
  const lines: string[] = [];
  const { score, summary, findings } = result;

  const emoji =
    score.level === "safe"
      ? ":white_check_mark:"
      : score.level === "caution"
        ? ":large_blue_circle:"
        : score.level === "warning"
          ? ":warning:"
          : score.level === "danger"
            ? ":red_circle:"
            : ":no_entry:";

  lines.push(`## ${emoji} diffgate: ${score.level.toUpperCase()} (score: ${score.total})`);
  lines.push("");

  // Summary table
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Files changed | ${summary.blastRadius.filesChanged} |`);
  lines.push(`| Lines changed | ${summary.blastRadius.linesChanged} |`);
  lines.push(`| Blast radius | ${summary.blastRadius.scope} |`);
  lines.push(`| Findings | ${summary.totalFindings} |`);
  lines.push("");

  if (findings.length > 0) {
    lines.push("### Findings");
    lines.push("");

    const severityEmoji: Record<Severity, string> = {
      critical: ":no_entry:",
      high: ":red_circle:",
      medium: ":warning:",
      low: ":large_blue_circle:",
      info: ":information_source:",
    };

    for (const f of findings) {
      const loc = f.line ? `:${f.line}` : "";
      lines.push(
        `- ${severityEmoji[f.severity]} **[${f.ruleId}]** ${f.message} — \`${f.file}${loc}\``
      );
      if (f.snippet) {
        lines.push(`  \`\`\`\n  ${f.snippet}\n  \`\`\``);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format result using specified format
 */
export function format(
  result: AnalysisResult,
  fmt: "text" | "json" | "oneline" | "markdown" = "text"
): string {
  switch (fmt) {
    case "json":
      return formatJSON(result);
    case "oneline":
      return formatOneline(result);
    case "markdown":
      return formatMarkdown(result);
    case "text":
    default:
      return formatText(result);
  }
}
