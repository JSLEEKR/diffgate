import type { Rule, Finding, FileDiff, ParsedDiff } from "./types.js";
import { classifyFile } from "./parser.js";

/** Check added lines for pattern matches */
function checkAddedLines(
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

// ─── Security Rules ───

const hardcodedSecrets: Rule = {
  id: "SEC001",
  name: "Hardcoded Secrets",
  category: "security",
  severity: "critical",
  description: "Detects hardcoded API keys, passwords, tokens",
  check(file) {
    const patterns = [
      /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']{8,}/i,
      /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+/i,
      /(?:secret|token)\s*[:=]\s*["'][^"']{8,}/i,
      /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*["'][^"']+/i,
      /(?:AKIA[0-9A-Z]{16})/,
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
      /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAddedLines(
          file,
          pat,
          "SEC001",
          "Hardcoded Secrets",
          "critical",
          "Potential hardcoded secret detected",
          "security"
        )
      );
    }
    return findings;
  },
};

const dangerousFunctions: Rule = {
  id: "SEC002",
  name: "Dangerous Functions",
  category: "security",
  severity: "high",
  description: "Detects use of unsafe functions like eval, exec",
  check(file) {
    const patterns = [
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /\bFunction\s*\(/,
      /\b__import__\s*\(/,
      /\bos\.system\s*\(/,
      /\bsubprocess\.call\s*\(.*shell\s*=\s*True/,
      /innerHTML\s*=/,
      /dangerouslySetInnerHTML/,
      /document\.write\s*\(/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAddedLines(
          file,
          pat,
          "SEC002",
          "Dangerous Functions",
          "high",
          "Use of potentially dangerous function",
          "security"
        )
      );
    }
    return findings;
  },
};

const sqlInjection: Rule = {
  id: "SEC003",
  name: "SQL Injection Risk",
  category: "security",
  severity: "critical",
  description: "Detects potential SQL injection via string concatenation",
  check(file) {
    const patterns = [
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b.*["'`]\s*\+/i,
      /["'`]\s*\+.*\b(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b/i,
      /f["'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP).*\{/i,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAddedLines(
          file,
          pat,
          "SEC003",
          "SQL Injection Risk",
          "critical",
          "Potential SQL injection via string concatenation",
          "security"
        )
      );
    }
    return findings;
  },
};

const disabledSecurity: Rule = {
  id: "SEC004",
  name: "Disabled Security",
  category: "security",
  severity: "high",
  description: "Detects disabled security features",
  check(file) {
    const patterns = [
      /verify\s*[:=]\s*false/i,
      /ssl[_-]?verify\s*[:=]\s*false/i,
      /(?:disable|skip)[_-]?(?:auth|ssl|tls|csrf|cors|security)/i,
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
      /AllowAny/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAddedLines(
          file,
          pat,
          "SEC004",
          "Disabled Security",
          "high",
          "Security feature appears to be disabled",
          "security"
        )
      );
    }
    return findings;
  },
};

// ─── Blast Radius Rules ───

const largeFileChange: Rule = {
  id: "BR001",
  name: "Large File Change",
  category: "blast-radius",
  severity: "medium",
  description: "Files with large number of changes",
  check(file) {
    const total = file.additions + file.deletions;
    if (total > 300) {
      return [
        {
          ruleId: "BR001",
          ruleName: "Large File Change",
          severity: "high",
          message: `File has ${total} changed lines (${file.additions}+ / ${file.deletions}-)`,
          file: file.newPath,
          category: "blast-radius",
        },
      ];
    }
    if (total > 100) {
      return [
        {
          ruleId: "BR001",
          ruleName: "Large File Change",
          severity: "medium",
          message: `File has ${total} changed lines (${file.additions}+ / ${file.deletions}-)`,
          file: file.newPath,
          category: "blast-radius",
        },
      ];
    }
    return [];
  },
};

const manyFilesChanged: Rule = {
  id: "BR002",
  name: "Many Files Changed",
  category: "blast-radius",
  severity: "medium",
  description: "Diff touches many files",
  check(_file, diff) {
    // Only report once (on first file)
    if (diff.files[0] !== _file) return [];
    const count = diff.files.length;
    if (count > 20) {
      return [
        {
          ruleId: "BR002",
          ruleName: "Many Files Changed",
          severity: "high",
          message: `${count} files changed in this diff`,
          file: "(global)",
          category: "blast-radius",
        },
      ];
    }
    if (count > 10) {
      return [
        {
          ruleId: "BR002",
          ruleName: "Many Files Changed",
          severity: "medium",
          message: `${count} files changed in this diff`,
          file: "(global)",
          category: "blast-radius",
        },
      ];
    }
    return [];
  },
};

const crossCategoryChange: Rule = {
  id: "BR003",
  name: "Cross-Category Change",
  category: "blast-radius",
  severity: "medium",
  description: "Changes span multiple categories (source, config, infra, etc.)",
  check(_file, diff) {
    if (diff.files[0] !== _file) return [];
    const categories = new Set(diff.files.map((f) => classifyFile(f.newPath)));
    if (categories.size >= 4) {
      return [
        {
          ruleId: "BR003",
          ruleName: "Cross-Category Change",
          severity: "high",
          message: `Changes span ${categories.size} categories: ${[...categories].join(", ")}`,
          file: "(global)",
          category: "blast-radius",
        },
      ];
    }
    if (categories.size >= 3) {
      return [
        {
          ruleId: "BR003",
          ruleName: "Cross-Category Change",
          severity: "medium",
          message: `Changes span ${categories.size} categories: ${[...categories].join(", ")}`,
          file: "(global)",
          category: "blast-radius",
        },
      ];
    }
    return [];
  },
};

// ─── Config & Infrastructure Rules ───

const configChange: Rule = {
  id: "CFG001",
  name: "Configuration Change",
  category: "config",
  severity: "medium",
  description: "Changes to configuration files",
  check(file) {
    const cat = classifyFile(file.newPath);
    if (cat === "config" && file.additions + file.deletions > 0) {
      return [
        {
          ruleId: "CFG001",
          ruleName: "Configuration Change",
          severity: "medium",
          message: `Configuration file modified: ${file.newPath}`,
          file: file.newPath,
          category: "config",
        },
      ];
    }
    return [];
  },
};

const infraChange: Rule = {
  id: "CFG002",
  name: "Infrastructure Change",
  category: "config",
  severity: "high",
  description: "Changes to infrastructure-as-code files",
  check(file) {
    const cat = classifyFile(file.newPath);
    if (cat === "infrastructure") {
      return [
        {
          ruleId: "CFG002",
          ruleName: "Infrastructure Change",
          severity: "high",
          message: `Infrastructure file modified: ${file.newPath}`,
          file: file.newPath,
          category: "config",
        },
      ];
    }
    return [];
  },
};

const envFileExposed: Rule = {
  id: "CFG003",
  name: "Env File Exposed",
  category: "config",
  severity: "critical",
  description: "Detects .env files being committed",
  check(file) {
    if (/\.env(?:\.|$)/.test(file.newPath) && !file.newPath.includes(".example") && !file.newPath.includes(".sample") && !file.newPath.includes(".template")) {
      return [
        {
          ruleId: "CFG003",
          ruleName: "Env File Exposed",
          severity: "critical",
          message: `Environment file committed: ${file.newPath}`,
          file: file.newPath,
          category: "config",
        },
      ];
    }
    return [];
  },
};

// ─── Code Quality Rules ───

const todoAdded: Rule = {
  id: "CQ001",
  name: "TODO/FIXME Added",
  category: "code-quality",
  severity: "info",
  description: "New TODO or FIXME comments added",
  check(file) {
    return checkAddedLines(
      file,
      /(?:TODO|FIXME|HACK|XXX|WORKAROUND)\b/i,
      "CQ001",
      "TODO/FIXME Added",
      "info",
      "New TODO/FIXME comment added",
      "code-quality"
    );
  },
};

const debugCode: Rule = {
  id: "CQ002",
  name: "Debug Code",
  category: "code-quality",
  severity: "low",
  description: "Debug statements left in code",
  check(file) {
    const patterns = [
      /console\.log\s*\(/,
      /debugger\b/,
      /print\s*\(/,
      /fmt\.Println\s*\(/,
      /System\.out\.println\s*\(/,
    ];
    const findings: Finding[] = [];
    for (const pat of patterns) {
      findings.push(
        ...checkAddedLines(
          file,
          pat,
          "CQ002",
          "Debug Code",
          "low",
          "Debug statement detected",
          "code-quality"
        )
      );
    }
    return findings;
  },
};

const deletedTests: Rule = {
  id: "CQ003",
  name: "Tests Deleted",
  category: "code-quality",
  severity: "high",
  description: "Test files deleted or tests removed",
  check(file) {
    const cat = classifyFile(file.newPath);
    if (cat === "test") {
      if (file.status === "deleted") {
        return [
          {
            ruleId: "CQ003",
            ruleName: "Tests Deleted",
            severity: "high",
            message: `Test file deleted: ${file.newPath}`,
            file: file.newPath,
            category: "code-quality",
          },
        ];
      }
      if (file.deletions > file.additions && file.deletions - file.additions > 10) {
        return [
          {
            ruleId: "CQ003",
            ruleName: "Tests Deleted",
            severity: "medium",
            message: `Net ${file.deletions - file.additions} test lines removed in ${file.newPath}`,
            file: file.newPath,
            category: "code-quality",
          },
        ];
      }
    }
    return [];
  },
};

// ─── Database Rules ───

const dbMigration: Rule = {
  id: "DB001",
  name: "Database Migration",
  category: "database",
  severity: "high",
  description: "Database migration or schema changes detected",
  check(file) {
    const cat = classifyFile(file.newPath);
    if (cat === "database") {
      return [
        {
          ruleId: "DB001",
          ruleName: "Database Migration",
          severity: "high",
          message: `Database change detected: ${file.newPath}`,
          file: file.newPath,
          category: "database",
        },
      ];
    }
    return [];
  },
};

const destructiveSQL: Rule = {
  id: "DB002",
  name: "Destructive SQL",
  category: "database",
  severity: "critical",
  description: "Detects DROP, TRUNCATE, DELETE without WHERE",
  check(file) {
    const findings: Finding[] = [];
    findings.push(
      ...checkAddedLines(
        file,
        /\bDROP\s+(?:TABLE|DATABASE|INDEX|COLUMN)/i,
        "DB002",
        "Destructive SQL",
        "critical",
        "DROP statement detected",
        "database"
      )
    );
    findings.push(
      ...checkAddedLines(
        file,
        /\bTRUNCATE\s+/i,
        "DB002",
        "Destructive SQL",
        "critical",
        "TRUNCATE statement detected",
        "database"
      )
    );
    findings.push(
      ...checkAddedLines(
        file,
        /\bDELETE\s+FROM\s+\w+\s*;/i,
        "DB002",
        "Destructive SQL",
        "critical",
        "DELETE without WHERE clause detected",
        "database"
      )
    );
    return findings;
  },
};

// ─── Dependency Rules ───

const dependencyChange: Rule = {
  id: "DEP001",
  name: "Dependency Change",
  category: "dependencies",
  severity: "medium",
  description: "Dependencies added or modified",
  check(file) {
    const cat = classifyFile(file.newPath);
    if (cat === "dependencies" && file.additions > 0) {
      return [
        {
          ruleId: "DEP001",
          ruleName: "Dependency Change",
          severity: "medium",
          message: `Dependency file modified: ${file.newPath}`,
          file: file.newPath,
          category: "dependencies",
        },
      ];
    }
    return [];
  },
};

const lockfileConflict: Rule = {
  id: "DEP002",
  name: "Lockfile Without Manifest",
  category: "dependencies",
  severity: "low",
  description: "Lockfile changed without corresponding manifest",
  check(file, diff) {
    const lockfiles: Record<string, string> = {
      "package-lock.json": "package.json",
      "yarn.lock": "package.json",
      "poetry.lock": "pyproject.toml",
      "Gemfile.lock": "Gemfile",
      "Cargo.lock": "Cargo.toml",
      "go.sum": "go.mod",
    };
    const basename = file.newPath.split("/").pop() ?? "";
    const manifest = lockfiles[basename];
    if (!manifest) return [];

    const manifestChanged = diff.files.some(
      (f) => (f.newPath.split("/").pop() ?? "") === manifest
    );
    if (!manifestChanged) {
      return [
        {
          ruleId: "DEP002",
          ruleName: "Lockfile Without Manifest",
          severity: "low",
          message: `${basename} changed without ${manifest} change`,
          file: file.newPath,
          category: "dependencies",
        },
      ];
    }
    return [];
  },
};

/** All built-in rules */
export const builtinRules: Rule[] = [
  // Security
  hardcodedSecrets,
  dangerousFunctions,
  sqlInjection,
  disabledSecurity,
  // Blast radius
  largeFileChange,
  manyFilesChanged,
  crossCategoryChange,
  // Config
  configChange,
  infraChange,
  envFileExposed,
  // Code quality
  todoAdded,
  debugCode,
  deletedTests,
  // Database
  dbMigration,
  destructiveSQL,
  // Dependencies
  dependencyChange,
  lockfileConflict,
];

/**
 * Get rules filtered by config
 */
export function getRules(config?: {
  rules?: string[];
  excludeRules?: string[];
  customRules?: Rule[];
}): Rule[] {
  let rules = [...builtinRules];

  if (config?.customRules) {
    rules = [...rules, ...config.customRules];
  }

  if (config?.rules && config.rules.length > 0) {
    rules = rules.filter((r) => config.rules!.includes(r.id));
  }

  if (config?.excludeRules && config.excludeRules.length > 0) {
    rules = rules.filter((r) => !config.excludeRules!.includes(r.id));
  }

  return rules;
}
