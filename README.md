<div align="center">

# :shield: diffgate

### Risk analysis for code diffs

[![GitHub Stars](https://img.shields.io/github/stars/JSLEEKR/diffgate?style=for-the-badge&logo=github&color=yellow)](https://github.com/JSLEEKR/diffgate/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-446%20passing-brightgreen?style=for-the-badge)](#)

<br/>

**Catch risky code changes before they reach production**

Security Scanning + Blast Radius + Config Safety + SQL Protection + SARIF + CODEOWNERS

[Quick Start](#quick-start) | [Rules](#rules) | [CI Integration](#ci-integration) | [API](#api) | [Profiles](#profiles)

</div>

---

## Why This Exists

Code reviews catch bugs, but they miss systemic risks. A 500-line diff touching source, infrastructure, and database files has a different blast radius than a 10-line typo fix. A `.env` file slipping into a commit goes unnoticed until credentials leak. A `DROP TABLE` in a migration file passes review because the reviewer was focused on the application code.

diffgate scores every diff for risk. Pipe in a unified diff, point it at a git branch, or integrate it into CI -- it runs 23 rules across 6 categories and returns a risk score with specific findings. No AI, no network calls, pure static analysis.

- **23 built-in rules** across security, blast radius, config, code quality, database, and dependencies
- **Risk scoring** with severity weights and level classification (safe/caution/warning/danger/critical)
- **7 output formats** -- text, JSON, one-line, Markdown, SARIF, GitHub Actions annotations, PR review comments
- **Gate mode** -- fail CI when risk score exceeds threshold
- **5 built-in profiles** -- strict, security, relaxed, ci, review
- **Custom rules** -- define pattern-based rules in JSON config
- **CODEOWNERS integration** -- map changes to team ownership
- **Diff comparison** -- detect regressions between versions
- **Batch analysis** -- analyze multiple PRs at once
- **Trend tracking** -- historical score analysis with sparklines
- **Fix suggestions** -- actionable remediation for every finding
- **Zero dependencies** -- pure Node.js, no external packages

## Quick Start

```bash
# Install
npm install -g diffgate

# Analyze git diff
git diff | diffgate

# Analyze staged changes
diffgate --git --staged

# Compare against main branch
diffgate --git --branch main

# Gate CI (fail if score > 30)
git diff main...HEAD | diffgate --max-score 30
```

## Rules

| ID | Rule | Category | Severity | Description |
|----|------|----------|----------|-------------|
| SEC001 | Hardcoded Secrets | security | critical | API keys, passwords, tokens, AWS keys, private keys |
| SEC002 | Dangerous Functions | security | high | eval(), exec(), innerHTML, os.system() |
| SEC003 | SQL Injection Risk | security | critical | String concatenation in SQL queries |
| SEC004 | Disabled Security | security | high | verify=false, disabled CSRF/TLS/auth |
| SEC005 | Path Traversal Risk | security | high | ../ patterns, unsanitized file paths |
| SEC006 | Command Injection | security | critical | Template literals in exec/spawn |
| SEC007 | Weak Cryptography | security | high | MD5, SHA-1, DES, RC4 usage |
| SEC008 | CORS Wildcard | security | medium | Wildcard (*) CORS origins |
| SEC009 | Hardcoded IP | security | low | Non-localhost IP addresses |
| SEC010 | Unsafe Deserialization | security | high | pickle, yaml.load, unserialize |
| BR001 | Large File Change | blast-radius | medium | Files with >100 or >300 changed lines |
| BR002 | Many Files Changed | blast-radius | medium | Diffs touching >10 or >20 files |
| BR003 | Cross-Category Change | blast-radius | medium | Changes spanning 3+ categories |
| CFG001 | Configuration Change | config | medium | Any configuration file modification |
| CFG002 | Infrastructure Change | config | high | Dockerfile, Terraform, K8s changes |
| CFG003 | Env File Exposed | config | critical | .env files committed (not .example/.template) |
| CQ001 | TODO/FIXME Added | code-quality | info | New TODO/FIXME/HACK comments |
| CQ002 | Debug Code | code-quality | low | console.log, debugger, print() left in code |
| CQ003 | Tests Deleted | code-quality | high | Test files deleted or net test lines removed |
| DB001 | Database Migration | database | high | Migration or schema file changes |
| DB002 | Destructive SQL | database | critical | DROP, TRUNCATE, DELETE without WHERE |
| DEP001 | Dependency Change | dependencies | medium | Dependency manifest modifications |
| DEP002 | Lockfile Without Manifest | dependencies | low | Lockfile changed without manifest change |

## Profiles

```bash
# Strict mode (max score 25, all rules)
diffgate --profile strict

# Security-only scan
diffgate --profile security

# CI pipeline mode
diffgate --profile ci

# Relaxed (high severity only)
diffgate --profile relaxed
```

| Profile | Threshold | Severity | Focus |
|---------|-----------|----------|-------|
| strict | 25 | low+ | Maximum coverage |
| security | 50 | all | Security + .env only |
| ci | 60 | medium+ | Balanced automation |
| relaxed | 100 | high+ | Critical issues only |
| review | none | info+ | All findings visible |

## CI Integration

### GitHub Actions

```yaml
- name: Risk Analysis
  run: |
    git diff origin/main...HEAD | npx diffgate --max-score 50 --format markdown

- name: SARIF Upload
  run: |
    git diff origin/main...HEAD | npx diffgate --format sarif > results.sarif
    # Upload to GitHub Code Scanning
```

### Pre-commit Hook

```bash
#!/bin/sh
git diff --staged | npx diffgate --max-score 30
```

## Output Formats

### Text (default)
```
diffgate risk analysis -- WARNING (score: 33)

Blast radius: small (3 files, 45 lines, 2 categories)

4 finding(s):
  !! [SEC001] Potential hardcoded secret detected
     src/db.ts:5
  !  [CFG002] Infrastructure file modified: Dockerfile
     Dockerfile
```

### JSON / SARIF / Markdown / One-line
```bash
diffgate --format json       # Full structured output
diffgate --format sarif      # GitHub Code Scanning compatible
diffgate --format markdown   # PR comment format with tables
diffgate --format oneline    # CAUTION (26) | 2 findings | 2 files
```

## Custom Rules

Create `.diffgaterc.json`:

```json
{
  "excludeRules": ["CQ001"],
  "excludeFiles": ["**/*.test.ts"],
  "maxScore": 50,
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

## API

```typescript
import { analyze, gate, parseDiff, compare, batchAnalyze } from "diffgate";

// Analyze a diff string
const result = analyze(diffString);
console.log(result.score.level);  // "warning"

// Gate mode
const { passed } = gate(diffString, { maxScore: 30 });

// Compare two versions
const comp = compare(beforeResult, afterResult);
console.log(comp.newFindings);    // new risks
console.log(comp.resolvedFindings); // fixed risks

// Batch analysis
const batch = batchAnalyze([
  { id: "pr-1", diff: diff1 },
  { id: "pr-2", diff: diff2 },
], { maxScore: 50 });
```

## Scoring

| Severity | Points | Level Thresholds |
|----------|--------|-----------------|
| critical | 25 | 0-9: safe |
| high | 15 | 10-29: caution |
| medium | 8 | 30-59: warning |
| low | 3 | 60-99: danger |
| info | 1 | 100+: critical |

## License

MIT
