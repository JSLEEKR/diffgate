import { describe, it, expect } from "vitest";
import { batchAnalyze, formatBatchResult } from "../src/batch.js";

const SAFE_DIFF = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe
+also safe
`;

const RISKY_DIFF = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,3 @@
 code
+const password = "secret123";
+eval("bad");
`;

describe("batchAnalyze", () => {
  it("analyzes multiple diffs", () => {
    const result = batchAnalyze([
      { id: "pr-1", diff: SAFE_DIFF },
      { id: "pr-2", diff: RISKY_DIFF },
    ]);
    expect(result.entries).toHaveLength(2);
  });

  it("calculates aggregate totals", () => {
    const result = batchAnalyze([
      { id: "pr-1", diff: SAFE_DIFF },
      { id: "pr-2", diff: RISKY_DIFF },
    ]);
    expect(result.aggregate.totalEntries).toBe(2);
    expect(result.aggregate.totalFindings).toBeGreaterThan(0);
    expect(result.aggregate.totalScore).toBeGreaterThan(0);
  });

  it("calculates average score", () => {
    const result = batchAnalyze([
      { id: "pr-1", diff: SAFE_DIFF },
      { id: "pr-2", diff: RISKY_DIFF },
    ]);
    expect(result.aggregate.averageScore).toBe(
      Math.round(result.aggregate.totalScore / 2)
    );
  });

  it("counts passed and failed with maxScore", () => {
    const result = batchAnalyze(
      [
        { id: "pr-1", diff: SAFE_DIFF },
        { id: "pr-2", diff: RISKY_DIFF },
      ],
      { maxScore: 5 }
    );
    expect(result.aggregate.passedCount).toBe(1);
    expect(result.aggregate.failedCount).toBe(1);
  });

  it("identifies worst and best entries", () => {
    const result = batchAnalyze([
      { id: "safe", diff: SAFE_DIFF },
      { id: "risky", diff: RISKY_DIFF },
    ]);
    expect(result.aggregate.worstEntry).toBe("risky");
    expect(result.aggregate.bestEntry).toBe("safe");
  });

  it("all pass with no maxScore", () => {
    const result = batchAnalyze([
      { id: "pr-1", diff: SAFE_DIFF },
      { id: "pr-2", diff: RISKY_DIFF },
    ]);
    expect(result.aggregate.passedCount).toBe(2);
    expect(result.aggregate.failedCount).toBe(0);
  });

  it("handles empty batch", () => {
    const result = batchAnalyze([]);
    expect(result.entries).toHaveLength(0);
    expect(result.aggregate.totalEntries).toBe(0);
    expect(result.aggregate.averageScore).toBe(0);
    expect(result.aggregate.worstEntry).toBeNull();
  });

  it("applies config to all entries", () => {
    const result = batchAnalyze(
      [{ id: "pr-1", diff: RISKY_DIFF }],
      { excludeRules: ["SEC001", "SEC002"] }
    );
    const hasExcluded = result.entries[0]!.result.findings.some(
      (f) => f.ruleId === "SEC001" || f.ruleId === "SEC002"
    );
    expect(hasExcluded).toBe(false);
  });

  it("preserves entry IDs", () => {
    const result = batchAnalyze([
      { id: "my-pr-123", diff: SAFE_DIFF },
    ]);
    expect(result.entries[0]!.id).toBe("my-pr-123");
  });
});

describe("formatBatchResult", () => {
  it("includes entry count", () => {
    const result = batchAnalyze([
      { id: "pr-1", diff: SAFE_DIFF },
    ]);
    const output = formatBatchResult(result);
    expect(output).toContain("1 entries");
  });

  it("includes pass/fail status", () => {
    const result = batchAnalyze(
      [
        { id: "pr-1", diff: SAFE_DIFF },
        { id: "pr-2", diff: RISKY_DIFF },
      ],
      { maxScore: 5 }
    );
    const output = formatBatchResult(result);
    expect(output).toContain("PASS");
    expect(output).toContain("FAIL");
  });

  it("includes entry IDs", () => {
    const result = batchAnalyze([
      { id: "pr-123", diff: SAFE_DIFF },
    ]);
    const output = formatBatchResult(result);
    expect(output).toContain("pr-123");
  });

  it("includes worst/best", () => {
    const result = batchAnalyze([
      { id: "safe", diff: SAFE_DIFF },
      { id: "risky", diff: RISKY_DIFF },
    ]);
    const output = formatBatchResult(result);
    expect(output).toContain("Worst:");
    expect(output).toContain("Best:");
  });
});
