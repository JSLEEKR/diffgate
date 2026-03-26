import { describe, it, expect } from "vitest";
import { calculateStats, formatStats } from "../src/stats.js";
import { parseDiff } from "../src/parser.js";

const MULTI_FILE_DIFF = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,5 @@
 import express from "express";
+import cors from "cors";
+import helmet from "helmet";
 const app = express();
-app.listen(3000);
+app.listen(8080);
diff --git a/config.json b/config.json
--- a/config.json
+++ b/config.json
@@ -1,3 +1,3 @@
 {
-  "port": 3000
+  "port": 8080
 }
diff --git a/tests/app.test.ts b/tests/app.test.ts
new file mode 100644
--- /dev/null
+++ b/tests/app.test.ts
@@ -0,0 +1,5 @@
+import { test } from "vitest";
+test("app starts", () => {
+  expect(true).toBe(true);
+});
+// end
`;

describe("calculateStats", () => {
  it("counts total files", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.totalFiles).toBe(3);
  });

  it("counts total additions and deletions", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.totalAdditions).toBeGreaterThan(0);
    expect(stats.totalDeletions).toBeGreaterThan(0);
  });

  it("calculates total churn", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.totalChurn).toBe(stats.totalAdditions + stats.totalDeletions);
  });

  it("groups by category", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.byCategory["source"]).toBeDefined();
    expect(stats.byCategory["config"]).toBeDefined();
    expect(stats.byCategory["test"]).toBeDefined();
  });

  it("counts files per category", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.byCategory["source"]!.fileCount).toBe(1);
    expect(stats.byCategory["config"]!.fileCount).toBe(1);
  });

  it("groups by status", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.byStatus["modified"]).toBe(2);
    expect(stats.byStatus["added"]).toBe(1);
  });

  it("identifies largest file", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.largestFile).toBeDefined();
    expect(stats.largestFile!.churn).toBeGreaterThan(0);
  });

  it("calculates average churn", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    expect(stats.averageChurn).toBe(stats.totalChurn / stats.totalFiles);
  });

  it("handles empty diff", () => {
    const stats = calculateStats({ files: [], totalAdditions: 0, totalDeletions: 0 });
    expect(stats.totalFiles).toBe(0);
    expect(stats.largestFile).toBeNull();
    expect(stats.averageChurn).toBe(0);
  });

  it("categorizes file additions and deletions", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    const source = stats.byCategory["source"]!;
    expect(source.additions).toBeGreaterThan(0);
    expect(source.churn).toBe(source.additions + source.deletions);
  });
});

describe("formatStats", () => {
  it("includes file count", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    const output = formatStats(stats);
    expect(output).toContain("3 files changed");
  });

  it("includes insertions and deletions", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    const output = formatStats(stats);
    expect(output).toContain("insertions(+)");
    expect(output).toContain("deletions(-)");
  });

  it("includes category breakdown", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    const output = formatStats(stats);
    expect(output).toContain("source:");
    expect(output).toContain("config:");
  });

  it("includes top files", () => {
    const diff = parseDiff(MULTI_FILE_DIFF);
    const stats = calculateStats(diff);
    const output = formatStats(stats);
    expect(output).toContain("Top files by churn");
  });
});
