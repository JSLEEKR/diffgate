import { describe, it, expect } from "vitest";
import { parseDiff } from "../src/parser.js";
import { analyze } from "../src/analyzer.js";
import { batchAnalyze } from "../src/batch.js";
import { assessAllComplexity } from "../src/complexity.js";
import { fingerprintDiff } from "../src/fingerprint.js";
import { calculateStats } from "../src/stats.js";

function generateLargeDiff(fileCount: number, linesPerFile: number): string {
  const files: string[] = [];
  for (let f = 0; f < fileCount; f++) {
    const additions = Array.from(
      { length: linesPerFile },
      (_, i) => `+const line${f}_${i} = ${i};`
    ).join("\n");
    files.push(`diff --git a/src/file${f}.ts b/src/file${f}.ts
--- a/src/file${f}.ts
+++ b/src/file${f}.ts
@@ -1 +1,${linesPerFile + 1} @@
 header
${additions}
`);
  }
  return files.join("");
}

describe("Stress tests", () => {
  it("parses 100-file diff within 100ms", () => {
    const diff = generateLargeDiff(100, 10);
    const start = performance.now();
    const result = parseDiff(diff);
    const elapsed = performance.now() - start;

    expect(result.files).toHaveLength(100);
    expect(elapsed).toBeLessThan(100);
  });

  it("analyzes 50-file diff within 200ms", () => {
    const diff = generateLargeDiff(50, 20);
    const start = performance.now();
    const result = analyze(diff);
    const elapsed = performance.now() - start;

    expect(result.summary.filesAnalyzed).toBe(50);
    expect(elapsed).toBeLessThan(200);
  });

  it("handles 1000-line single file", () => {
    const diff = generateLargeDiff(1, 1000);
    const result = analyze(diff);
    expect(result.summary.filesAnalyzed).toBe(1);
    expect(result.findings.length).toBeGreaterThanOrEqual(0);
  });

  it("batch analyzes 20 diffs", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      id: `pr-${i}`,
      diff: generateLargeDiff(3, 5),
    }));
    const start = performance.now();
    const result = batchAnalyze(entries);
    const elapsed = performance.now() - start;

    expect(result.entries).toHaveLength(20);
    expect(elapsed).toBeLessThan(500);
  });

  it("complexity analysis on 30 files", () => {
    const diff = parseDiff(generateLargeDiff(30, 15));
    const start = performance.now();
    const complexity = assessAllComplexity(diff.files);
    const elapsed = performance.now() - start;

    expect(complexity).toHaveLength(30);
    expect(elapsed).toBeLessThan(50);
  });

  it("fingerprinting 50-file diff", () => {
    const diff = parseDiff(generateLargeDiff(50, 10));
    const start = performance.now();
    const fp = fingerprintDiff(diff);
    const elapsed = performance.now() - start;

    expect(fp.fileHashes.size).toBe(50);
    expect(elapsed).toBeLessThan(100);
  });

  it("statistics on large diff", () => {
    const diff = parseDiff(generateLargeDiff(50, 20));
    const stats = calculateStats(diff);
    expect(stats.totalFiles).toBe(50);
    expect(stats.totalChurn).toBe(50 * 20);
  });

  it("handles diff with many hunks per file", () => {
    const hunks = Array.from({ length: 20 }, (_, i) => {
      const start = i * 50 + 1;
      return `@@ -${start},3 +${start},4 @@
 line${start}
+added at ${start}
 line${start + 1}
 line${start + 2}`;
    }).join("\n");

    const diff = `diff --git a/big.ts b/big.ts
--- a/big.ts
+++ b/big.ts
${hunks}
`;
    const result = parseDiff(diff);
    expect(result.files[0]!.hunks.length).toBe(20);
    expect(result.files[0]!.additions).toBe(20);
  });

  it("analysis results are consistent across runs", () => {
    const diff = generateLargeDiff(10, 10);
    const r1 = analyze(diff);
    const r2 = analyze(diff);
    expect(r1.score.total).toBe(r2.score.total);
    expect(r1.findings.length).toBe(r2.findings.length);
  });
});
