import { describe, it, expect } from "vitest";
import {
  summarizeByCategory,
  analyzeRuleFrequency,
  formatCategorySummary,
  formatRuleFrequency,
} from "../src/summary.js";
import { analyze } from "../src/analyzer.js";

const MULTI_RISK_DIFF = `diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -1,2 +1,5 @@
 import { Pool } from "pg";
+const password = "supersecret123";
+eval("dangerous");
+// TODO: fix this
 const pool = new Pool();
diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1 @@
+SECRET=abc
`;

describe("summarizeByCategory", () => {
  it("groups findings by category", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.every((s) => s.category)).toBe(true);
  });

  it("counts findings per category", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    const totalCount = summary.reduce((sum, s) => sum + s.findingCount, 0);
    expect(totalCount).toBe(result.findings.length);
  });

  it("identifies top severity", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    const securityCat = summary.find((s) => s.category === "security");
    expect(securityCat?.topSeverity).toBe("critical");
  });

  it("lists unique rule IDs per category", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    for (const s of summary) {
      expect(s.ruleIds.length).toBeGreaterThan(0);
      expect(new Set(s.ruleIds).size).toBe(s.ruleIds.length);
    }
  });

  it("sorts by score descending", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    for (let i = 1; i < summary.length; i++) {
      expect(summary[i]!.score).toBeLessThanOrEqual(summary[i - 1]!.score);
    }
  });

  it("handles empty findings", () => {
    const result = analyze(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe
+also safe
`);
    const summary = summarizeByCategory(result);
    expect(summary).toHaveLength(0);
  });
});

describe("analyzeRuleFrequency", () => {
  it("counts rule hits", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    expect(freq.length).toBeGreaterThan(0);
    expect(freq[0]!.count).toBeGreaterThan(0);
  });

  it("tracks affected files", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    for (const f of freq) {
      expect(f.files.length).toBeGreaterThan(0);
    }
  });

  it("sorts by count descending", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    for (let i = 1; i < freq.length; i++) {
      expect(freq[i]!.count).toBeLessThanOrEqual(freq[i - 1]!.count);
    }
  });

  it("deduplicates files", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    for (const f of freq) {
      expect(new Set(f.files).size).toBe(f.files.length);
    }
  });
});

describe("formatCategorySummary", () => {
  it("includes category names", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    const output = formatCategorySummary(summary);
    expect(output).toContain("security");
  });

  it("includes finding counts", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const summary = summarizeByCategory(result);
    const output = formatCategorySummary(summary);
    expect(output).toContain("findings");
  });

  it("handles empty", () => {
    expect(formatCategorySummary([])).toContain("No findings");
  });
});

describe("formatRuleFrequency", () => {
  it("includes rule IDs", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    const output = formatRuleFrequency(freq);
    expect(output).toContain("SEC");
  });

  it("includes hit counts", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const freq = analyzeRuleFrequency(result);
    const output = formatRuleFrequency(freq);
    expect(output).toContain("hit(s)");
  });

  it("handles empty", () => {
    expect(formatRuleFrequency([])).toContain("No rule frequencies");
  });
});
