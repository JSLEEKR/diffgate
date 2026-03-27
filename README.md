<div align="center">

# :construction: diffgate

### Pre-merge diff safety checker with rules engine

[![GitHub Stars](https://img.shields.io/github/stars/JSLEEKR/diffgate?style=for-the-badge&logo=github&color=yellow)](https://github.com/JSLEEKR/diffgate/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-446%20passing-brightgreen?style=for-the-badge)](#)

<br/>

**Catch risky code changes before they reach production -- no AI, no network calls, pure static analysis**

[Quick Start](#quick-start) | [Rules](#rules-23) | [CLI](#cli-usage) | [API](#programmatic-api) | [Profiles](#profiles) | [Architecture](#architecture)

</div>

---

## Why This Exists

Code reviews catch bugs, but they miss systemic risks. A 500-line diff touching source, infrastructure, and database files has a different blast radius than a 10-line typo fix. A `.env` file slipping into a commit goes unnoticed until credentials leak. A `DROP TABLE` in a migration file passes review because the reviewer was focused on the application code.

**diffgate** scores every diff for risk. Pipe in a unified diff, point it at a git branch, or integrate it into CI -- it runs 23 rules across 6 categories and returns a risk score with specific findings. No AI, no network calls, pure static analysis on the diff text itself.

- **23 built-in rules** across security, blast radius, config, code quality, database, and dependencies
- **Risk scoring** with severity weights and level classification (safe/caution/warning/danger/critical)
- **7 output formats** -- text, JSON, one-line, Markdown, SARIF, GitHub Actions annotations, PR review comments
- **Zero dependencies** -- pure Node.js, no external packages

## Requirements

- Node.js 18+
- No external dependencies

## Quick Start

```bash
# Install globally
npm install -g diffgate

# Analyze a git diff
git diff | diffgate

# Analyze staged changes
diffgate --git --staged

# Compare against main branch
diffgate --git --branch main

# Gate CI (fail if score exceeds threshold)
git diff main...HEAD | diffgate --max-score 30
```

## How It Works

```
Input           Parse           Analyze         Score           Output
──────────      ──────────      ──────────      ──────────      ──────────
Unified diff →  File diffs  →   23 rules    →   Risk score  →   Text/JSON/
 or git          + hunks        across 6        + level          SARIF/MD/
                 + lines        categories                       Annotations
```

1. **Parse** -- unified diff text is parsed into structured `FileDiff` objects with hunks and lines
2. **Classify** -- each file is categorized (source, config, test, docs, infra, data, dependency)
3. **Analyze** -- 23 rules scan for patterns across added lines, file types, and cross-file relationships
4. **Score** -- findings are weighted by severity and summed into a risk score with a level classification
5. **Report** -- results are formatted for terminals, CI, or code scanning tools

## Features

### Risk Scoring
- **Severity weights** -- critical (25), high (15), medium (8), low (3), info (1)
- **Level classification** -- safe (0-9), caution (10-29), warning (30-59), danger (60-99), critical (100+)
- **Blast radius** -- calculates scope based on file count, line count, and category spread
- **Gate mode** -- fail CI when risk score exceeds a configurable threshold

### 23 Built-in Rules
- **Security (10)** -- hardcoded secrets, dangerous functions, SQL injection, disabled security, path traversal, command injection, weak crypto, CORS wildcard, hardcoded IPs, unsafe deserialization
- **Blast Radius (3)** -- large file changes, many files changed, cross-category changes
- **Config (3)** -- config file changes, infrastructure changes, exposed .env files
- **Code Quality (3)** -- TODO/FIXME added, debug code, tests deleted
- **Database (2)** -- migration files, destructive SQL statements
- **Dependencies (2)** -- dependency changes, lockfile without manifest

### Output Formats (7)
- **Text** -- colored terminal output with severity markers and file locations
- **JSON** -- full structured analysis result for programmatic consumption
- **One-line** -- compact single-line summary for logs and notifications
- **Markdown** -- formatted tables and badges for PR comments
- **SARIF** -- SARIF 2.1.0 for GitHub Code Scanning integration
- **Annotations** -- GitHub Actions annotation format for inline PR feedback
- **Review comments** -- structured comments for GitHub PR review API

### Custom Rules
- **JSON definition** -- define pattern-based rules in `.diffgaterc.json`
- **File pattern filters** -- target rules to specific file globs
- **Full severity control** -- assign any severity level to custom rules
- **Rule validation** -- definitions are validated before use

### Profiles (5)
- **strict** -- max score 25, all rules, low+ severity
- **security** -- max score 50, security + config rules only
- **ci** -- max score 60, medium+ severity, balanced for automation
- **relaxed** -- max score 100, high+ severity, critical issues only
- **review** -- no threshold, info+ severity, all findings visible

### Diff Comparison
- **Version comparison** -- compare analysis results between two versions
- **New findings** -- detect newly introduced risks
- **Resolved findings** -- detect risks that were fixed
- **Regression detection** -- flag score increases between versions

### Batch Analysis
- **Multi-PR analysis** -- analyze multiple diffs in a single run
- **Aggregated stats** -- summary statistics across all analyzed diffs
- **Pass/fail per item** -- individual gate results for each diff

### Trend Tracking
- **Snapshots** -- create point-in-time snapshots of analysis results
- **Historical analysis** -- track risk score trends over time
- **Sparklines** -- ASCII sparkline visualization of score history
- **Regression alerts** -- detect sustained score increases

### Complexity Assessment
- **Per-file complexity** -- assess change complexity for each modified file
- **Hunk analysis** -- evaluate complexity of individual diff hunks
- **Aggregate scoring** -- overall complexity score for the entire diff

### CODEOWNERS Integration
- **Owner mapping** -- map changed files to team owners via CODEOWNERS
- **Ownership analysis** -- identify which teams are affected by changes
- **Cross-team detection** -- flag changes spanning multiple team boundaries

### Fingerprinting
- **Diff fingerprinting** -- generate stable hashes for diff content
- **Finding fingerprinting** -- deduplicate findings across runs
- **Change detection** -- detect whether diffs are semantically equivalent

### Fix Suggestions
- **Actionable remediation** -- every finding includes a fix suggestion
- **Template-based** -- suggestions use configurable templates
- **Severity-aware** -- suggestion urgency matches finding severity

### File Classification
- **Auto-classification** -- files categorized by extension and path patterns
- **8 categories** -- source, config, test, docs, infrastructure, data, dependency, other
- **Custom patterns** -- override classification with glob patterns

## CLI Usage

```bash
# Basic analysis
git diff | diffgate

# Git integration
diffgate --git                    # Unstaged changes
diffgate --git --staged           # Staged changes
diffgate --git --branch main      # Compare against main

# Output formats
diffgate --format text            # Default colored output
diffgate --format json            # Structured JSON
diffgate --format oneline         # Single line summary
diffgate --format markdown        # PR comment format
diffgate --format sarif           # Code scanning format
diffgate --format annotations     # GitHub Actions annotations

# Filtering
diffgate --min-severity medium    # Ignore low/info findings
diffgate --exclude SEC009,CQ001   # Skip specific rules
diffgate --include SEC*           # Only security rules
diffgate --exclude-files "*.test.ts"  # Skip test files

# Gate mode
diffgate --max-score 30           # Fail if score > 30
diffgate --max-score 50 --profile ci

# Profiles
diffgate --profile strict         # Maximum coverage
diffgate --profile security       # Security-focused
diffgate --profile ci             # CI pipeline balanced
diffgate --profile relaxed        # High severity only
diffgate --profile review         # All findings, no gate

# Comparison
diffgate --compare baseline.json  # Compare against previous run
diffgate --snapshot results.json  # Save snapshot for later comparison

# Batch
diffgate --batch diffs/           # Analyze all .diff files in directory

# Stats and suggestions
diffgate --stats                  # Category and rule statistics
diffgate --suggestions            # Show fix suggestions for findings
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Analysis passed (score within threshold) |
| 1 | Analysis failed (score exceeds threshold) |

## Rules (23)

| ID | Rule | Category | Severity | Description |
|----|------|----------|----------|-------------|
| SEC001 | Hardcoded Secrets | security | critical | API keys, passwords, tokens, AWS keys, private keys |
| SEC002 | Dangerous Functions | security | high | `eval()`, `exec()`, `innerHTML`, `os.system()` |
| SEC003 | SQL Injection Risk | security | critical | String concatenation in SQL queries |
| SEC004 | Disabled Security | security | high | `verify=false`, disabled CSRF/TLS/auth |
| SEC005 | Path Traversal Risk | security | high | `../` patterns, unsanitized file paths |
| SEC006 | Command Injection | security | critical | Template literals in `exec`/`spawn` |
| SEC007 | Weak Cryptography | security | high | MD5, SHA-1, DES, RC4 usage |
| SEC008 | CORS Wildcard | security | medium | Wildcard (`*`) CORS origins |
| SEC009 | Hardcoded IP | security | low | Non-localhost IP addresses |
| SEC010 | Unsafe Deserialization | security | high | `pickle`, `yaml.load`, `unserialize` |
| BR001 | Large File Change | blast-radius | medium | Files with >100 or >300 changed lines |
| BR002 | Many Files Changed | blast-radius | medium | Diffs touching >10 or >20 files |
| BR003 | Cross-Category Change | blast-radius | medium | Changes spanning 3+ categories |
| CFG001 | Configuration Change | config | medium | Any configuration file modification |
| CFG002 | Infrastructure Change | config | high | Dockerfile, Terraform, K8s changes |
| CFG003 | Env File Exposed | config | critical | `.env` files committed (not `.example`/`.template`) |
| CQ001 | TODO/FIXME Added | code-quality | info | New TODO/FIXME/HACK comments |
| CQ002 | Debug Code | code-quality | low | `console.log`, `debugger`, `print()` left in code |
| CQ003 | Tests Deleted | code-quality | high | Test files deleted or net test lines removed |
| DB001 | Database Migration | database | high | Migration or schema file changes |
| DB002 | Destructive SQL | database | critical | DROP, TRUNCATE, DELETE without WHERE |
| DEP001 | Dependency Change | dependencies | medium | Dependency manifest modifications |
| DEP002 | Lockfile Without Manifest | dependencies | low | Lockfile changed without manifest change |

## Profiles

| Profile | Threshold | Min Severity | Focus |
|---------|-----------|-------------|-------|
| strict | 25 | low | Maximum coverage -- all rules, strict threshold |
| security | 50 | all | Security + config rules only |
| ci | 60 | medium | Balanced automation -- ignore low/info |
| relaxed | 100 | high | Critical issues only |
| review | none | info | All findings visible, no gate |

```bash
# Apply a profile
diffgate --profile strict

# Override profile threshold
diffgate --profile ci --max-score 40
```

## Scoring

| Severity | Points | Level Thresholds |
|----------|--------|-----------------|
| critical | 25 | 0-9: safe |
| high | 15 | 10-29: caution |
| medium | 8 | 30-59: warning |
| low | 3 | 60-99: danger |
| info | 1 | 100+: critical |

The risk score is the sum of all finding severity points. The blast radius (file count, line count, category spread) contributes to the summary but does not directly affect the score.

## Configuration

### .diffgaterc.json

```json
{
  "excludeRules": ["CQ001"],
  "excludeFiles": ["**/*.test.ts", "**/*.spec.ts"],
  "maxScore": 50,
  "minSeverity": "medium",
  "profile": "ci",
  "customRules": [
    {
      "id": "TEAM001",
      "name": "No Direct DB Access",
      "pattern": "new Pool|createConnection",
      "filePatterns": ["src/api/**/*.ts"],
      "severity": "high",
      "message": "Use the repository layer instead of direct DB access"
    }
  ]
}
```

Configuration is loaded from `.diffgaterc.json` in the current directory. CLI flags override config file values.

## Programmatic API

### Core Analysis

```typescript
import { analyze, gate, parseDiff } from "diffgate";

// Parse a unified diff
const parsed = parseDiff(diffString);
console.log(parsed.files.length); // number of changed files

// Analyze for risks
const result = analyze(diffString);
console.log(result.score.level);     // "warning"
console.log(result.score.total);     // 33
console.log(result.findings.length); // 4

// Gate mode -- fail if score exceeds threshold
const { passed, result: gateResult } = gate(diffString, { maxScore: 30 });
if (!passed) process.exit(1);
```

### Output Formatting

```typescript
import {
  format,
  formatText,
  formatJSON,
  formatMarkdown,
  toSarif,
  toAnnotations,
  toReviewComments,
} from "diffgate";

// Format as text, JSON, one-line, or markdown
const text = formatText(result);
const json = formatJSON(result);
const md = formatMarkdown(result);

// SARIF for code scanning
const sarif = toSarif(result);

// GitHub Actions annotations
const annotations = toAnnotations(result);

// PR review comments
const comments = toReviewComments(result);
```

### Scoring and Filtering

```typescript
import {
  calculateScore,
  calculateBlastRadius,
  filterBySeverity,
  sortFindings,
} from "diffgate";

// Calculate risk score
const score = calculateScore(findings);

// Calculate blast radius
const blastRadius = calculateBlastRadius(parsed);

// Filter findings by minimum severity
const filtered = filterBySeverity(findings, "medium");

// Sort findings by severity (critical first)
const sorted = sortFindings(findings);
```

### Diff Comparison

```typescript
import { compare, formatComparison } from "diffgate";

// Compare two analysis results
const comparison = compare(beforeResult, afterResult);
console.log(comparison.newFindings);      // newly introduced risks
console.log(comparison.resolvedFindings); // risks that were fixed
console.log(comparison.scoreDelta);       // score change

const formatted = formatComparison(comparison);
```

### Batch Analysis

```typescript
import { batchAnalyze, formatBatchResult } from "diffgate";

const batch = batchAnalyze([
  { id: "pr-1", diff: diff1 },
  { id: "pr-2", diff: diff2 },
  { id: "pr-3", diff: diff3 },
], { maxScore: 50 });

console.log(batch.passed);    // all passed?
console.log(batch.results);   // per-item results
const formatted = formatBatchResult(batch);
```

### Trend Tracking

```typescript
import { analyzeTrend, createSnapshot, formatTrend, sparkline } from "diffgate";

// Create a snapshot
const snapshot = createSnapshot(result, "v1.2.3");

// Analyze trend from history
const trend = analyzeTrend(snapshots);
console.log(trend.direction);  // "improving" | "stable" | "degrading"

// ASCII sparkline
const chart = sparkline(snapshots.map(s => s.score));
console.log(chart); // "  ▂▄▆█▆▄▂"
```

### Custom Rules

```typescript
import { buildCustomRule, parseCustomRules } from "diffgate";

// Build a custom rule from definition
const rule = buildCustomRule({
  id: "TEAM001",
  name: "No Direct DB Access",
  pattern: "new Pool|createConnection",
  filePatterns: ["src/api/**/*.ts"],
  severity: "high",
  message: "Use repository layer",
});

// Parse custom rules from config
const rules = parseCustomRules(config.customRules);
```

### CODEOWNERS Integration

```typescript
import { parseCodeowners, findOwners, analyzeOwnership } from "diffgate";

// Parse CODEOWNERS file
const owners = parseCodeowners(codeownersContent);

// Find owners for a file
const fileOwners = findOwners(owners, "src/api/users.ts");

// Analyze ownership across all changed files
const ownership = analyzeOwnership(owners, parsed);
console.log(ownership.teams);     // affected teams
console.log(ownership.crossTeam); // cross-team change?
```

### Complexity Assessment

```typescript
import { assessComplexity, assessAllComplexity } from "diffgate";

// Assess complexity for a single file
const complexity = assessComplexity(fileDiff);

// Assess complexity for all files
const allComplexity = assessAllComplexity(parsed);
```

### Fingerprinting

```typescript
import { fingerprintDiff, fingerprintFindings, diffsEqual } from "diffgate";

// Generate stable fingerprint for a diff
const hash = fingerprintDiff(diffString);

// Fingerprint findings for deduplication
const findingHashes = fingerprintFindings(findings);

// Check if two diffs are semantically equivalent
const equal = diffsEqual(diff1, diff2);
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Diff Safety Check
on: [pull_request]

jobs:
  diffgate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install -g diffgate

      # Risk analysis with gate
      - run: git diff origin/main...HEAD | diffgate --max-score 50

      # SARIF upload to Code Scanning
      - run: git diff origin/main...HEAD | diffgate --format sarif > results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

      # PR comment with markdown
      - run: |
          git diff origin/main...HEAD | diffgate --format markdown > comment.md
```

### Pre-commit Hook

```bash
#!/bin/sh
git diff --staged | npx diffgate --max-score 30
```

### GitLab CI

```yaml
diffgate:
  script:
    - npm install -g diffgate
    - git diff origin/main...HEAD | diffgate --max-score 50 --format json
```

## Architecture

```
src/
  index.ts           # Public API exports (60+ symbols)
  types.ts           # Core type definitions (ParsedDiff, Finding, Rule, etc.)
  parser.ts          # Unified diff parser (text → FileDiff[])
  analyzer.ts        # Analysis engine (rules + scoring + gate)
  rules.ts           # 13 core rules (SEC001-SEC004, BR001-BR003, CFG001-CFG003, CQ001-CQ003)
  rules-extended.ts  # 10 extended rules (SEC005-SEC010, DB001-DB002, DEP001-DEP002)
  scorer.ts          # Risk score calculation and blast radius
  config.ts          # .diffgaterc.json loader and config merging
  cli.ts             # CLI entry point (stdin/git/file input)
  reporter.ts        # Text, JSON, one-line, Markdown formatters
  sarif.ts           # SARIF 2.1.0 output
  annotations.ts     # GitHub Actions annotations and PR review comments
  custom-rules.ts    # Custom rule builder and validator
  profiles.ts        # Built-in profiles (strict, security, ci, relaxed, review)
  glob.ts            # Glob pattern matching for file filters
  compare.ts         # Diff comparison (new/resolved findings)
  batch.ts           # Multi-diff batch analysis
  trend.ts           # Historical trend tracking with sparklines
  complexity.ts      # Change complexity assessment
  ownership.ts       # CODEOWNERS parsing and ownership analysis
  fingerprint.ts     # Diff and finding fingerprinting
  suggestions.ts     # Fix suggestion templates
  stats.ts           # Category and rule frequency statistics
  summary.ts         # Category summaries and rule frequency analysis
```

### Data Flow

```
                    ┌──────────────┐
                    │  Unified     │
                    │  Diff Input  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Parser     │
                    │  (text →     │
                    │  FileDiff[]) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  23 Rules  │ │Blast  │ │ Classify  │
        │  (6 cats)  │ │Radius │ │  Files    │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼───────┐
                    │   Scorer     │
                    │  (weighted   │
                    │   sum)       │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │   Text    │ │ SARIF │ │Annotations│
        │ JSON / MD │ │       │ │  Review   │
        └───────────┘ └───────┘ └───────────┘
```

## License

MIT
