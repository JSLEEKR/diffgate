import type { Rule, Finding, Severity, FileDiff, ParsedDiff } from "./types.js";
import { matchGlob } from "./glob.js";

/**
 * Custom rule definition in JSON config
 */
export interface CustomRuleDefinition {
  id: string;
  name: string;
  category?: string;
  severity?: Severity;
  description?: string;
  /** Pattern to match in added lines */
  pattern?: string;
  /** File glob patterns to limit scope */
  filePatterns?: string[];
  /** Message template (supports {file}, {line}) */
  message?: string;
}

/**
 * Build a Rule from a custom rule definition
 */
export function buildCustomRule(def: CustomRuleDefinition): Rule {
  const severity = def.severity ?? "medium";
  const category = def.category ?? "custom";
  const message = def.message ?? `Custom rule ${def.id} triggered`;
  const description = def.description ?? `Custom rule: ${def.name}`;

  return {
    id: def.id,
    name: def.name,
    category,
    severity,
    description,
    check(file: FileDiff, _diff: ParsedDiff): Finding[] {
      // Check file pattern scope
      if (def.filePatterns && def.filePatterns.length > 0) {
        const matches = def.filePatterns.some((p) =>
          matchGlob(file.newPath, p)
        );
        if (!matches) return [];
      }

      if (!def.pattern) {
        // No pattern = file-level rule (triggers on any change)
        if (file.additions > 0 || file.deletions > 0) {
          return [
            {
              ruleId: def.id,
              ruleName: def.name,
              severity,
              message: message.replace("{file}", file.newPath),
              file: file.newPath,
              category,
            },
          ];
        }
        return [];
      }

      // Pattern-based matching on added lines
      const regex = new RegExp(def.pattern, "i");
      const findings: Finding[] = [];

      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === "add" && regex.test(line.content)) {
            findings.push({
              ruleId: def.id,
              ruleName: def.name,
              severity,
              message: message
                .replace("{file}", file.newPath)
                .replace("{line}", String(line.newLineNumber ?? 0)),
              file: file.newPath,
              line: line.newLineNumber,
              snippet: line.content.trim(),
              category,
            });
          }
        }
      }

      return findings;
    },
  };
}

/**
 * Parse custom rules from config
 */
export function parseCustomRules(
  definitions: CustomRuleDefinition[]
): Rule[] {
  return definitions.map(buildCustomRule);
}

/**
 * Validate a custom rule definition
 */
export function validateCustomRuleDefinition(
  def: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!def || typeof def !== "object") {
    return { valid: false, errors: ["Rule must be an object"] };
  }

  const d = def as Record<string, unknown>;

  if (typeof d["id"] !== "string" || !d["id"]) {
    errors.push("Rule must have a non-empty 'id' string");
  }

  if (typeof d["name"] !== "string" || !d["name"]) {
    errors.push("Rule must have a non-empty 'name' string");
  }

  if (d["severity"] !== undefined) {
    const valid = ["critical", "high", "medium", "low", "info"];
    if (!valid.includes(d["severity"] as string)) {
      errors.push(`Invalid severity: ${String(d["severity"])}`);
    }
  }

  if (d["pattern"] !== undefined && typeof d["pattern"] !== "string") {
    errors.push("'pattern' must be a string (regex)");
  }

  if (d["pattern"] !== undefined) {
    try {
      new RegExp(d["pattern"] as string);
    } catch {
      errors.push(`Invalid regex pattern: ${String(d["pattern"])}`);
    }
  }

  if (d["filePatterns"] !== undefined && !Array.isArray(d["filePatterns"])) {
    errors.push("'filePatterns' must be an array of strings");
  }

  return { valid: errors.length === 0, errors };
}
