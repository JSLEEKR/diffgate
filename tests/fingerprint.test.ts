import { describe, it, expect } from "vitest";
import {
  fingerprintDiff,
  fingerprintFindings,
  diffsEqual,
  changedFiles,
} from "../src/fingerprint.js";
import { parseDiff } from "../src/parser.js";
import type { Finding } from "../src/types.js";

const DIFF_A = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,3 @@
 import express from "express";
+import cors from "cors";
 const app = express();
`;

const DIFF_B = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,3 @@
 import express from "express";
+import helmet from "helmet";
 const app = express();
`;

describe("fingerprintDiff", () => {
  it("produces consistent hash for same diff", () => {
    const a = fingerprintDiff(parseDiff(DIFF_A));
    const b = fingerprintDiff(parseDiff(DIFF_A));
    expect(a.hash).toBe(b.hash);
  });

  it("produces different hash for different diffs", () => {
    const a = fingerprintDiff(parseDiff(DIFF_A));
    const b = fingerprintDiff(parseDiff(DIFF_B));
    expect(a.hash).not.toBe(b.hash);
  });

  it("generates file-level hashes", () => {
    const fp = fingerprintDiff(parseDiff(DIFF_A));
    expect(fp.fileHashes.size).toBe(1);
    expect(fp.fileHashes.has("src/app.ts")).toBe(true);
  });

  it("hash is a 16-char hex string", () => {
    const fp = fingerprintDiff(parseDiff(DIFF_A));
    expect(fp.hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it("handles empty diff", () => {
    const fp = fingerprintDiff(parseDiff(""));
    expect(fp.fileHashes.size).toBe(0);
  });

  it("handles multi-file diff", () => {
    const multi = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1,2 @@
 x
+y
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1,2 @@
 a
+b
`;
    const fp = fingerprintDiff(parseDiff(multi));
    expect(fp.fileHashes.size).toBe(2);
  });
});

describe("fingerprintFindings", () => {
  it("produces consistent hash", () => {
    const findings: Finding[] = [
      { ruleId: "SEC001", ruleName: "Test", severity: "high", message: "msg", file: "a.ts", line: 5, category: "security" },
    ];
    const a = fingerprintFindings(findings);
    const b = fingerprintFindings(findings);
    expect(a).toBe(b);
  });

  it("produces different hash for different findings", () => {
    const f1: Finding[] = [
      { ruleId: "SEC001", ruleName: "Test", severity: "high", message: "msg", file: "a.ts", category: "security" },
    ];
    const f2: Finding[] = [
      { ruleId: "SEC002", ruleName: "Test", severity: "low", message: "msg", file: "b.ts", category: "security" },
    ];
    expect(fingerprintFindings(f1)).not.toBe(fingerprintFindings(f2));
  });

  it("is order-independent", () => {
    const f1: Finding = { ruleId: "A", ruleName: "A", severity: "high", message: "m", file: "a.ts", category: "s" };
    const f2: Finding = { ruleId: "B", ruleName: "B", severity: "low", message: "m", file: "b.ts", category: "s" };
    expect(fingerprintFindings([f1, f2])).toBe(fingerprintFindings([f2, f1]));
  });

  it("handles empty findings", () => {
    const h = fingerprintFindings([]);
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe("diffsEqual", () => {
  it("returns true for identical diffs", () => {
    const a = fingerprintDiff(parseDiff(DIFF_A));
    const b = fingerprintDiff(parseDiff(DIFF_A));
    expect(diffsEqual(a, b)).toBe(true);
  });

  it("returns false for different diffs", () => {
    const a = fingerprintDiff(parseDiff(DIFF_A));
    const b = fingerprintDiff(parseDiff(DIFF_B));
    expect(diffsEqual(a, b)).toBe(false);
  });
});

describe("changedFiles", () => {
  it("detects added files", () => {
    const before = fingerprintDiff(parseDiff(DIFF_A));
    const multi = `${DIFF_A}diff --git a/new.ts b/new.ts
--- /dev/null
+++ b/new.ts
@@ -0,0 +1 @@
+new file
`;
    const after = fingerprintDiff(parseDiff(multi));
    const changes = changedFiles(before, after);
    expect(changes.added).toContain("new.ts");
  });

  it("detects removed files", () => {
    const multi = `${DIFF_A}diff --git a/extra.ts b/extra.ts
--- a/extra.ts
+++ b/extra.ts
@@ -1 +1,2 @@
 x
+y
`;
    const before = fingerprintDiff(parseDiff(multi));
    const after = fingerprintDiff(parseDiff(DIFF_A));
    const changes = changedFiles(before, after);
    expect(changes.removed).toContain("extra.ts");
  });

  it("detects modified files", () => {
    const before = fingerprintDiff(parseDiff(DIFF_A));
    const after = fingerprintDiff(parseDiff(DIFF_B));
    const changes = changedFiles(before, after);
    expect(changes.modified).toContain("src/app.ts");
  });

  it("returns empty for identical fingerprints", () => {
    const fp = fingerprintDiff(parseDiff(DIFF_A));
    const changes = changedFiles(fp, fp);
    expect(changes.added).toHaveLength(0);
    expect(changes.removed).toHaveLength(0);
    expect(changes.modified).toHaveLength(0);
  });
});
