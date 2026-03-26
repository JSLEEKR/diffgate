import { describe, it, expect } from "vitest";
import { assessComplexity, assessAllComplexity } from "../src/complexity.js";
import { parseDiff } from "../src/parser.js";

function makeDiff(content: string) {
  return parseDiff(content);
}

describe("assessComplexity", () => {
  it("rates single addition as trivial/simple", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,2 +1,3 @@
 line1
+added
 line2
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.hunkCount).toBe(1);
    expect(["trivial", "simple"]).toContain(c.level);
  });

  it("rates multi-hunk diff as more complex", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,3 +1,4 @@
 line1
+added1
 line2
 line3
@@ -50,3 +51,4 @@
 line50
+added2
 line51
 line52
@@ -100,3 +102,4 @@
 line100
+added3
 line101
 line102
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.hunkCount).toBe(3);
    expect(c.hunkSpread).toBeGreaterThan(0);
    expect(c.score).toBeGreaterThan(10);
  });

  it("rates interleaved add/remove as complex", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,6 +1,6 @@
-old1
+new1
-old2
+new2
-old3
+new3
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.interleaveRatio).toBeGreaterThan(0);
  });

  it("rates pure additions as low interleave", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,1 +1,4 @@
 existing
+line1
+line2
+line3
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.interleaveRatio).toBe(0);
  });

  it("detects import operations", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,1 +1,3 @@
 existing
+import foo from "foo";
+const bar = () => {};
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.uniqueOperations).toBeGreaterThan(1);
  });

  it("handles empty hunks", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,1 +1,1 @@
 unchanged
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.score).toBeLessThanOrEqual(10);
  });

  it("calculates hunk spread", () => {
    const diff = makeDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,2 +1,3 @@
 line1
+added
 line2
@@ -200,2 +201,3 @@
 line200
+added
 line201
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.hunkSpread).toBeGreaterThan(100);
  });

  it("returns correct file path", () => {
    const diff = makeDiff(`diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,1 +1,2 @@
 x
+y
`);
    const c = assessComplexity(diff.files[0]!);
    expect(c.file).toBe("src/app.ts");
  });
});

describe("assessAllComplexity", () => {
  it("sorts by score descending", () => {
    const diff = makeDiff(`diff --git a/simple.ts b/simple.ts
--- a/simple.ts
+++ b/simple.ts
@@ -1,1 +1,2 @@
 x
+y
diff --git a/complex.ts b/complex.ts
--- a/complex.ts
+++ b/complex.ts
@@ -1,4 +1,4 @@
-old1
+new1
-old2
+new2
@@ -50,2 +50,3 @@
 line50
+added
 line51
`);
    const results = assessAllComplexity(diff.files);
    expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
  });

  it("handles empty list", () => {
    expect(assessAllComplexity([])).toHaveLength(0);
  });
});
