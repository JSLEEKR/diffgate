import type { Finding, Severity } from "./types.js";

/** A suggestion for fixing a finding */
export interface Suggestion {
  finding: Finding;
  fix: string;
  explanation: string;
  autoFixable: boolean;
}

/** Suggestion templates by rule ID */
const SUGGESTIONS: Record<string, {
  fix: string;
  explanation: string;
  autoFixable: boolean;
}> = {
  SEC001: {
    fix: "Move secrets to environment variables or a secrets manager",
    explanation: "Hardcoded secrets in source code can be exposed through version control. Use environment variables (process.env.SECRET), a .env file (excluded from git), or a secrets manager.",
    autoFixable: false,
  },
  SEC002: {
    fix: "Replace with safe alternatives (e.g., JSON.parse instead of eval)",
    explanation: "Functions like eval() execute arbitrary code, opening the door to code injection attacks. Use structured alternatives.",
    autoFixable: false,
  },
  SEC003: {
    fix: "Use parameterized queries or prepared statements",
    explanation: "String concatenation in SQL queries allows attackers to inject malicious SQL. Use placeholders: db.query('SELECT * FROM users WHERE id = $1', [userId])",
    autoFixable: false,
  },
  SEC004: {
    fix: "Re-enable security feature or document the exception",
    explanation: "Disabling security features (SSL verification, CSRF protection) removes critical safeguards. If necessary for development, use environment-specific configuration.",
    autoFixable: false,
  },
  SEC005: {
    fix: "Sanitize file paths with path.resolve and validate against a base directory",
    explanation: "Path traversal allows attackers to access files outside the intended directory. Always validate that resolved paths stay within the allowed base directory.",
    autoFixable: false,
  },
  SEC006: {
    fix: "Use a safe argument list instead of string interpolation",
    explanation: "Pass command arguments as an array to child_process.spawn() instead of building a command string. This prevents shell metacharacter injection.",
    autoFixable: false,
  },
  SEC007: {
    fix: "Use SHA-256 or stronger algorithms",
    explanation: "MD5 and SHA-1 have known collision vulnerabilities. Use SHA-256, SHA-3, or bcrypt/scrypt for password hashing.",
    autoFixable: false,
  },
  CFG003: {
    fix: "Add .env to .gitignore and use .env.example for template",
    explanation: "Environment files often contain secrets. Keep them out of version control and provide a template file (.env.example) instead.",
    autoFixable: false,
  },
  CQ002: {
    fix: "Remove debug statements before committing",
    explanation: "Debug statements like console.log() clutter production code and may leak sensitive data to browser consoles.",
    autoFixable: true,
  },
  DB002: {
    fix: "Add IF EXISTS guard and backup plan",
    explanation: "Destructive SQL operations (DROP, TRUNCATE) are irreversible. Always include IF EXISTS, create backups, and use transactions.",
    autoFixable: false,
  },
};

/**
 * Generate suggestions for findings
 */
export function generateSuggestions(findings: Finding[]): Suggestion[] {
  return findings
    .map((f) => {
      const template = SUGGESTIONS[f.ruleId];
      if (!template) return null;
      return {
        finding: f,
        fix: template.fix,
        explanation: template.explanation,
        autoFixable: template.autoFixable,
      };
    })
    .filter((s): s is Suggestion => s !== null);
}

/**
 * Format suggestions as text
 */
export function formatSuggestions(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) return "No suggestions available.";

  const lines: string[] = ["Suggestions:", ""];
  for (const s of suggestions) {
    const loc = s.finding.line ? `:${s.finding.line}` : "";
    lines.push(
      `  [${s.finding.ruleId}] ${s.finding.file}${loc}`
    );
    lines.push(`    Fix: ${s.fix}`);
    lines.push(`    Why: ${s.explanation}`);
    if (s.autoFixable) {
      lines.push("    (auto-fixable)");
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Get suggestion for a specific rule
 */
export function getSuggestionTemplate(
  ruleId: string
): { fix: string; explanation: string; autoFixable: boolean } | null {
  return SUGGESTIONS[ruleId] ?? null;
}
