import type { Finding, Severity } from "./types.js";
import { getSuggestionTemplate } from "./suggestions.js";

/** GitHub Actions annotation format */
export interface Annotation {
  file: string;
  line: number;
  endLine?: number;
  level: "error" | "warning" | "notice";
  message: string;
  title: string;
}

/** GitHub PR review comment */
export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side: "RIGHT";
}

const SEVERITY_TO_LEVEL: Record<Severity, Annotation["level"]> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "notice",
  info: "notice",
};

/**
 * Convert findings to GitHub Actions annotations (::error, ::warning, ::notice)
 */
export function toAnnotations(findings: Finding[]): Annotation[] {
  return findings
    .filter((f) => f.line !== undefined)
    .map((f) => ({
      file: f.file,
      line: f.line!,
      level: SEVERITY_TO_LEVEL[f.severity],
      message: f.message + (f.snippet ? ` | ${f.snippet}` : ""),
      title: `[${f.ruleId}] ${f.ruleName}`,
    }));
}

/**
 * Format annotations as GitHub Actions workflow commands
 */
export function formatAnnotations(annotations: Annotation[]): string {
  return annotations
    .map((a) => {
      const params = [`file=${a.file}`, `line=${a.line}`];
      if (a.endLine) params.push(`endLine=${a.endLine}`);
      params.push(`title=${a.title}`);
      return `::${a.level} ${params.join(",")}::${a.message}`;
    })
    .join("\n");
}

/**
 * Convert findings to GitHub PR review comments
 */
export function toReviewComments(findings: Finding[]): ReviewComment[] {
  return findings
    .filter((f) => f.line !== undefined)
    .map((f) => {
      const severityEmoji =
        f.severity === "critical"
          ? ":no_entry:"
          : f.severity === "high"
            ? ":red_circle:"
            : f.severity === "medium"
              ? ":warning:"
              : ":information_source:";

      let body = `${severityEmoji} **[${f.ruleId}]** ${f.message}`;

      if (f.snippet) {
        body += `\n\`\`\`\n${f.snippet}\n\`\`\``;
      }

      const suggestion = getSuggestionTemplate(f.ruleId);
      if (suggestion) {
        body += `\n\n**Fix:** ${suggestion.fix}`;
      }

      return {
        path: f.file,
        line: f.line!,
        body,
        side: "RIGHT" as const,
      };
    });
}

/**
 * Format as a combined GitHub PR review body
 */
export function formatReviewBody(
  comments: ReviewComment[],
  scoreSummary: string
): string {
  const lines: string[] = [];
  lines.push("## diffgate Review");
  lines.push("");
  lines.push(scoreSummary);
  lines.push("");

  if (comments.length === 0) {
    lines.push(":white_check_mark: No inline findings.");
  } else {
    lines.push(`Found ${comments.length} inline issue(s).`);
  }

  return lines.join("\n");
}
