#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { analyze, gate } from "./analyzer.js";
import { format } from "./reporter.js";
import { builtinRules } from "./rules.js";
import type { DiffGateConfig, Severity } from "./types.js";

function usage(): string {
  return `diffgate — Analyze code diffs for risks

Usage:
  diffgate [options]                     Read diff from stdin
  diffgate --file <path>                 Read diff from file
  diffgate --git                         Use git diff (unstaged)
  diffgate --git --staged                Use git diff --staged
  diffgate --git --branch <base>         Use git diff <base>...HEAD

Options:
  --format <text|json|oneline|markdown>  Output format (default: text)
  --max-score <n>                        Fail if score exceeds threshold
  --severity <level>                     Minimum severity to report
  --exclude-rules <id,id,...>            Exclude specific rules
  --rules <id,id,...>                    Only run specific rules
  --exclude-files <glob,...>             Exclude file patterns
  --list-rules                           List all available rules
  --help                                 Show this help

Exit codes:
  0  Analysis passed (or no --max-score set)
  1  Analysis failed (score exceeds --max-score)
  2  Error`;
}

function listRules(): string {
  const lines = ["Available rules:", ""];
  const byCategory = new Map<string, typeof builtinRules>();
  for (const rule of builtinRules) {
    const list = byCategory.get(rule.category) ?? [];
    list.push(rule);
    byCategory.set(rule.category, list);
  }
  for (const [category, rules] of byCategory) {
    lines.push(`  ${category}:`);
    for (const rule of rules) {
      lines.push(
        `    ${rule.id}  ${rule.name.padEnd(25)} [${rule.severity}]  ${rule.description}`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function run(args: string[]): number {
  let diffSource: "stdin" | "file" | "git" = "stdin";
  let filePath: string | null = null;
  let gitStaged = false;
  let gitBranch: string | null = null;
  let outputFormat: "text" | "json" | "oneline" | "markdown" = "text";
  let maxScore: number | undefined;
  let severityThreshold: Severity | undefined;
  let excludeRules: string[] | undefined;
  let onlyRules: string[] | undefined;
  let excludeFiles: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case "--help":
      case "-h":
        process.stdout.write(usage() + "\n");
        return 0;
      case "--list-rules":
        process.stdout.write(listRules() + "\n");
        return 0;
      case "--file":
        diffSource = "file";
        filePath = args[++i] ?? null;
        break;
      case "--git":
        diffSource = "git";
        break;
      case "--staged":
        gitStaged = true;
        break;
      case "--branch":
        gitBranch = args[++i] ?? null;
        break;
      case "--format":
        outputFormat = (args[++i] ?? "text") as typeof outputFormat;
        break;
      case "--max-score":
        maxScore = parseInt(args[++i] ?? "100", 10);
        break;
      case "--severity":
        severityThreshold = (args[++i] ?? "info") as Severity;
        break;
      case "--exclude-rules":
        excludeRules = (args[++i] ?? "").split(",");
        break;
      case "--rules":
        onlyRules = (args[++i] ?? "").split(",");
        break;
      case "--exclude-files":
        excludeFiles = (args[++i] ?? "").split(",");
        break;
    }
  }

  let diffText: string;

  try {
    switch (diffSource) {
      case "file":
        if (!filePath) {
          process.stderr.write("Error: --file requires a path\n");
          return 2;
        }
        diffText = readFileSync(filePath, "utf-8");
        break;
      case "git": {
        let gitArgs: string[] = ["diff"];
        if (gitStaged) gitArgs.push("--staged");
        if (gitBranch) {
          // Sanitize branch name to prevent command injection
          const safeBranch = gitBranch.replace(/[^a-zA-Z0-9_\-./]/g, "");
          if (safeBranch !== gitBranch) {
            process.stderr.write("Error: branch name contains invalid characters\n");
            return 2;
          }
          gitArgs = ["diff", `${safeBranch}...HEAD`];
        }
        diffText = execSync(`git ${gitArgs.join(" ")}`, { encoding: "utf-8" });
        break;
      }
      default:
        diffText = readFileSync("/dev/stdin", "utf-8");
    }
  } catch (err) {
    process.stderr.write(
      `Error reading diff: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return 2;
  }

  if (!diffText.trim()) {
    process.stdout.write("No diff content to analyze.\n");
    return 0;
  }

  const config: DiffGateConfig = {
    rules: onlyRules,
    excludeRules,
    excludeFiles,
    severityThreshold,
    maxScore,
  };

  if (maxScore !== undefined) {
    const { result, passed } = gate(diffText, config);
    process.stdout.write(format(result, outputFormat) + "\n");
    return passed ? 0 : 1;
  }

  const result = analyze(diffText, config);
  process.stdout.write(format(result, outputFormat) + "\n");
  return 0;
}

// Run if this is the entry point
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("cli.js") || process.argv[1].endsWith("cli.ts"));

if (isMain) {
  const code = run(process.argv.slice(2));
  process.exit(code);
}
