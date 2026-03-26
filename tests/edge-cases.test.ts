import { describe, it, expect } from "vitest";
import { parseDiff, classifyFile } from "../src/parser.js";
import { analyze, gate } from "../src/analyzer.js";
import { calculateScore } from "../src/scorer.js";
import { formatText, formatJSON, formatOneline, formatMarkdown } from "../src/reporter.js";
import { matchGlob } from "../src/glob.js";

describe("Parser edge cases", () => {
  it("handles diff with only context lines", () => {
    const diff = parseDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,3 +1,3 @@
 line1
 line2
 line3
`);
    expect(diff.files[0]!.additions).toBe(0);
    expect(diff.files[0]!.deletions).toBe(0);
  });

  it("handles diff with no newline at end marker", () => {
    const diff = parseDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,2 +1,2 @@
-old
+new
\\ No newline at end of file
`);
    expect(diff.files[0]!.additions).toBe(1);
    expect(diff.files[0]!.deletions).toBe(1);
  });

  it("handles file paths with spaces", () => {
    const diff = parseDiff(`diff --git a/my file.ts b/my file.ts
--- a/my file.ts
+++ b/my file.ts
@@ -1 +1,2 @@
 x
+y
`);
    expect(diff.files[0]!.newPath).toBe("my file.ts");
  });

  it("handles very long lines", () => {
    const longLine = "a".repeat(10000);
    const diff = parseDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 x
+${longLine}
`);
    expect(diff.files[0]!.additions).toBe(1);
  });

  it("handles many files in a single diff", () => {
    const files = Array.from({ length: 50 }, (_, i) =>
      `diff --git a/file${i}.ts b/file${i}.ts
--- a/file${i}.ts
+++ b/file${i}.ts
@@ -1 +1,2 @@
 line
+added
`
    ).join("");
    const result = parseDiff(files);
    expect(result.files).toHaveLength(50);
    expect(result.totalAdditions).toBe(50);
  });

  it("handles empty file content diff", () => {
    const diff = parseDiff(`diff --git a/empty.ts b/empty.ts
new file mode 100644
--- /dev/null
+++ b/empty.ts
`);
    expect(diff.files[0]!.status).toBe("added");
    expect(diff.files[0]!.additions).toBe(0);
  });

  it("handles unicode content", () => {
    const diff = parseDiff(`diff --git a/i18n.ts b/i18n.ts
--- a/i18n.ts
+++ b/i18n.ts
@@ -1 +1,2 @@
 const msg = "hello";
+const korean = "\ud55c\uad6d\uc5b4";
`);
    expect(diff.files[0]!.additions).toBe(1);
    const addedLine = diff.files[0]!.hunks[0]!.lines.find(l => l.type === "add");
    expect(addedLine!.content).toContain("\ud55c\uad6d\uc5b4");
  });
});

describe("classifyFile edge cases", () => {
  it("handles deeply nested paths", () => {
    expect(classifyFile("a/b/c/d/e/f/test.spec.ts")).toBe("test");
  });

  it("handles uppercase extensions", () => {
    expect(classifyFile("README.MD")).toBe("documentation");
  });

  it("handles mixed case config", () => {
    expect(classifyFile("AppConfig.json")).toBe("config");
  });

  it("handles dotfiles", () => {
    expect(classifyFile(".eslintrc.json")).toBe("config");
  });

  it("handles paths without extension", () => {
    expect(classifyFile("Makefile")).toBe("source");
  });

  it("handles CODEOWNERS", () => {
    // Not classified as anything special — just source
    const result = classifyFile("CODEOWNERS");
    expect(typeof result).toBe("string");
  });
});

describe("Analyzer edge cases", () => {
  it("handles diff with only whitespace changes", () => {
    const result = analyze(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1 @@
-  const x = 1;
+    const x = 1;
`);
    expect(result.score.total).toBeLessThanOrEqual(10);
  });

  it("handles very large diff", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `+const line${i} = ${i};`);
    const diff = `diff --git a/big.ts b/big.ts
--- a/big.ts
+++ b/big.ts
@@ -1 +1,501 @@
 header
${lines.join("\n")}
`;
    const result = analyze(diff);
    expect(result.summary.filesAnalyzed).toBe(1);
    expect(result.findings.length).toBeGreaterThanOrEqual(0);
  });

  it("gate with score exactly at threshold passes", () => {
    const result = analyze("");
    const { passed } = gate("", { maxScore: 0 });
    expect(passed).toBe(true); // score 0 <= maxScore 0
  });
});

describe("Scorer edge cases", () => {
  it("handles single finding", () => {
    const score = calculateScore([{
      ruleId: "X",
      ruleName: "X",
      severity: "info",
      message: "m",
      file: "f",
      category: "c",
    }]);
    expect(score.total).toBe(1);
  });

  it("handles 100+ findings", () => {
    const findings = Array.from({ length: 100 }, () => ({
      ruleId: "X",
      ruleName: "X",
      severity: "info" as const,
      message: "m",
      file: "f",
      category: "c",
    }));
    const score = calculateScore(findings);
    expect(score.total).toBe(100);
    expect(score.level).toBe("critical");
  });
});

describe("Reporter edge cases", () => {
  const emptyResult = {
    findings: [],
    score: { total: 0, breakdown: {}, level: "safe" as const },
    summary: {
      filesAnalyzed: 0,
      totalFindings: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: {},
      blastRadius: { filesChanged: 0, linesChanged: 0, categoriesAffected: [], scope: "tiny" as const },
    },
  };

  it("formatText handles empty result", () => {
    const output = formatText(emptyResult);
    expect(output).toContain("SAFE");
  });

  it("formatJSON handles empty result", () => {
    const output = formatJSON(emptyResult);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("formatOneline handles empty result", () => {
    const output = formatOneline(emptyResult);
    expect(output).toContain("SAFE");
    expect(output).toContain("0 findings");
  });

  it("formatMarkdown handles empty result", () => {
    const output = formatMarkdown(emptyResult);
    expect(output).toContain("SAFE");
  });
});

describe("Glob edge cases", () => {
  it("matches exact filename", () => {
    expect(matchGlob("Dockerfile", "Dockerfile")).toBe(true);
  });

  it("handles patterns with no wildcards", () => {
    expect(matchGlob("src/app.ts", "src/app.ts")).toBe(true);
    expect(matchGlob("src/app.ts", "src/other.ts")).toBe(false);
  });

  it("** at end matches everything", () => {
    expect(matchGlob("src/deep/file.ts", "src/**")).toBe(true);
  });

  it("handles curly brace with single option", () => {
    expect(matchGlob("file.ts", "*.{ts}")).toBe(true);
  });
});
