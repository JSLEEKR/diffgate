# Changelog

All notable changes to **diffgate** are documented here.

## [0.1.0] - 2026-03-26

### Added
- Unified diff parser with file, hunk, and line-level parsing
- 23 built-in rules across 6 categories (security, blast-radius, config, code-quality, database, dependencies)
- Risk scoring with severity weights and 5 level classifications (safe/caution/warning/danger/critical)
- Blast radius calculation (file count, line count, category spread)
- Gate mode for CI -- fail when risk score exceeds threshold
- 7 output formats: text, JSON, one-line, Markdown, SARIF 2.1.0, GitHub Actions annotations, PR review comments
- 5 built-in profiles: strict, security, ci, relaxed, review
- Custom rule definitions via `.diffgaterc.json` with pattern matching and file filters
- Diff comparison -- detect new and resolved findings between versions
- Batch analysis for multiple diffs
- Trend tracking with snapshots, historical analysis, and ASCII sparklines
- Change complexity assessment per file and per hunk
- CODEOWNERS parsing and ownership analysis
- Diff and finding fingerprinting for deduplication
- Fix suggestions with configurable templates for every finding
- File classification into 8 categories (source, config, test, docs, infra, data, dependency, other)
- Category summaries and rule frequency statistics
- Git integration (unstaged, staged, branch comparison)
- Zero external dependencies -- pure Node.js
- 446 tests
