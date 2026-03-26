import type { Rule, Finding, FileDiff, ParsedDiff } from "./types.js";

/** Check added lines for pattern matches */
function checkAdded(
  file: FileDiff,
  pattern: RegExp,
  ruleId: string,
  ruleName: string,
  severity: "critical" | "high" | "medium" | "low" | "info",
  message: string,
  category: string
): Finding[] {
  const findings: Finding[] = [];
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === "add" && pattern.test(line.content)) {
        findings.push({
          ruleId,
          ruleName,
          severity,
          message,
          file: file.newPath,
          line: line.newLineNumber,
          snippet: line.content.trim(),
          category,
        });
      }
    }
  }
  return findings;
}

// ─── Additional Security Rules ───

export const pathTraversal: Rule = {
  id: "SEC005",
  name: "Path Traversal Risk",
  category: "security",
  severity: "high",
  description: "Detects potential path traversal patterns",
  check(file) {
    const patterns = [
      /\.\.\//,
      /path\.join\(.*(?:req|request|params|query|body)\b/i,
      /readFile(?:Sync)?\s*\(.*(?:req|request|params|query|body)\b/i,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAdded(file, pat, "SEC005", "Path Traversal Risk", "high",
          "Potential path traversal vulnerability", "security")
      );
    }
    return findings;
  },
};

export const commandInjection: Rule = {
  id: "SEC006",
  name: "Command Injection",
  category: "security",
  severity: "critical",
  description: "Detects potential command injection via unsanitized input",
  check(file) {
    const patterns = [
      /exec\s*\(\s*`/,
      /exec\s*\(.*\$\{/,
      /child_process\.\w+\s*\(.*\+/,
      /spawn\s*\(.*\$\{/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAdded(file, pat, "SEC006", "Command Injection", "critical",
          "Potential command injection via template literal or concatenation", "security")
      );
    }
    return findings;
  },
};

export const weakCrypto: Rule = {
  id: "SEC007",
  name: "Weak Cryptography",
  category: "security",
  severity: "high",
  description: "Detects use of weak crypto algorithms",
  check(file) {
    const patterns = [
      /\b(?:md5|sha1)\b/i,
      /createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/,
      /DES|RC4|Blowfish/i,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAdded(file, pat, "SEC007", "Weak Cryptography", "high",
          "Use of weak cryptographic algorithm", "security")
      );
    }
    return findings;
  },
};

export const corsWildcard: Rule = {
  id: "SEC008",
  name: "CORS Wildcard",
  category: "security",
  severity: "medium",
  description: "Detects wildcard CORS origins",
  check(file) {
    return checkAdded(
      file,
      /(?:cors|origin|Access-Control-Allow-Origin)\s*[:=]\s*["']\*/i,
      "SEC008", "CORS Wildcard", "medium",
      "CORS wildcard (*) allows requests from any origin", "security"
    );
  },
};

export const hardcodedIP: Rule = {
  id: "SEC009",
  name: "Hardcoded IP Address",
  category: "security",
  severity: "low",
  description: "Detects hardcoded IP addresses (non-localhost)",
  check(file) {
    return checkAdded(
      file,
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,
      "SEC009", "Hardcoded IP Address", "low",
      "Hardcoded IP address detected", "security"
    ).filter(
      // Exclude localhost and common local IPs
      (f) =>
        !f.snippet?.includes("127.0.0.1") &&
        !f.snippet?.includes("0.0.0.0")
    );
  },
};

export const unsafeDeserialization: Rule = {
  id: "SEC010",
  name: "Unsafe Deserialization",
  category: "security",
  severity: "high",
  description: "Detects unsafe deserialization of user input",
  check(file) {
    const patterns = [
      /pickle\.loads?\s*\(/,
      /yaml\.(?:load|unsafe_load)\s*\(/,
      /JSON\.parse\s*\(.*(?:req|request|body|params)\b/,
      /unserialize\s*\(/,
      /Marshal\.load\s*\(/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAdded(file, pat, "SEC010", "Unsafe Deserialization", "high",
          "Potentially unsafe deserialization of untrusted data", "security")
      );
    }
    return findings;
  },
};

/** All extended rules */
export const extendedRules: Rule[] = [
  pathTraversal,
  commandInjection,
  weakCrypto,
  corsWildcard,
  hardcodedIP,
  unsafeDeserialization,
];
