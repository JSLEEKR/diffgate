import { describe, it, expect } from "vitest";
import { parseDiff, classifyFile } from "../src/parser.js";

// ─── Helper ───
function makeDiff(files: string): string {
  return files;
}

const SIMPLE_DIFF = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import express from "express";
+import cors from "cors";
 const app = express();
-app.listen(3000);
+app.listen(8080);
`;

const MULTI_FILE_DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,3 @@
 line1
+added
 line2
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1,2 @@
 hello
+world
`;

const NEW_FILE_DIFF = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return "world";
+}
`;

const DELETED_FILE_DIFF = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function old() {
-  return "gone";
-}
`;

const RENAME_DIFF = `diff --git a/src/old.ts b/src/renamed.ts
similarity index 90%
rename from src/old.ts
rename to src/renamed.ts
--- a/src/old.ts
+++ b/src/renamed.ts
@@ -1,2 +1,2 @@
-export const name = "old";
+export const name = "renamed";
`;

const BINARY_DIFF = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ
`;

describe("parseDiff", () => {
  it("parses a simple single-file diff", () => {
    const result = parseDiff(SIMPLE_DIFF);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.oldPath).toBe("src/app.ts");
    expect(result.files[0]!.newPath).toBe("src/app.ts");
    expect(result.files[0]!.status).toBe("modified");
    expect(result.files[0]!.additions).toBe(2);
    expect(result.files[0]!.deletions).toBe(1);
    expect(result.totalAdditions).toBe(2);
    expect(result.totalDeletions).toBe(1);
  });

  it("parses hunks correctly", () => {
    const result = parseDiff(SIMPLE_DIFF);
    expect(result.files[0]!.hunks).toHaveLength(1);
    const hunk = result.files[0]!.hunks[0]!;
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldCount).toBe(3);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newCount).toBe(4);
  });

  it("classifies line types correctly", () => {
    const result = parseDiff(SIMPLE_DIFF);
    const lines = result.files[0]!.hunks[0]!.lines;
    expect(lines[0]!.type).toBe("context");
    expect(lines[1]!.type).toBe("add");
    expect(lines[2]!.type).toBe("context");
    expect(lines[3]!.type).toBe("remove");
    expect(lines[4]!.type).toBe("add");
  });

  it("parses multi-file diff", () => {
    const result = parseDiff(MULTI_FILE_DIFF);
    expect(result.files).toHaveLength(2);
    expect(result.files[0]!.newPath).toBe("src/a.ts");
    expect(result.files[1]!.newPath).toBe("src/b.ts");
    expect(result.totalAdditions).toBe(2);
  });

  it("detects new files", () => {
    const result = parseDiff(NEW_FILE_DIFF);
    expect(result.files[0]!.status).toBe("added");
    expect(result.files[0]!.additions).toBe(3);
    expect(result.files[0]!.deletions).toBe(0);
  });

  it("detects deleted files", () => {
    const result = parseDiff(DELETED_FILE_DIFF);
    expect(result.files[0]!.status).toBe("deleted");
    expect(result.files[0]!.deletions).toBe(3);
    expect(result.files[0]!.additions).toBe(0);
  });

  it("detects renamed files", () => {
    const result = parseDiff(RENAME_DIFF);
    expect(result.files[0]!.status).toBe("renamed");
    expect(result.files[0]!.oldPath).toBe("src/old.ts");
    expect(result.files[0]!.newPath).toBe("src/renamed.ts");
  });

  it("detects binary files", () => {
    const result = parseDiff(BINARY_DIFF);
    expect(result.files[0]!.isBinary).toBe(true);
  });

  it("handles empty input", () => {
    const result = parseDiff("");
    expect(result.files).toHaveLength(0);
    expect(result.totalAdditions).toBe(0);
  });

  it("tracks line numbers for added lines", () => {
    const result = parseDiff(SIMPLE_DIFF);
    const addedLines = result.files[0]!.hunks[0]!.lines.filter(
      (l) => l.type === "add"
    );
    expect(addedLines[0]!.newLineNumber).toBe(2);
    expect(addedLines[1]!.newLineNumber).toBe(4);
  });

  it("tracks line numbers for removed lines", () => {
    const result = parseDiff(SIMPLE_DIFF);
    const removedLines = result.files[0]!.hunks[0]!.lines.filter(
      (l) => l.type === "remove"
    );
    expect(removedLines[0]!.oldLineNumber).toBe(3);
  });

  it("parses hunk with single line count", () => {
    const diff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -5 +5,2 @@
 existing
+new line
`;
    const result = parseDiff(diff);
    const hunk = result.files[0]!.hunks[0]!;
    expect(hunk.oldCount).toBe(1);
    expect(hunk.newCount).toBe(2);
  });

  it("handles multiple hunks in a single file", () => {
    const diff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,3 +1,4 @@
 line1
+added1
 line2
 line3
@@ -10,3 +11,4 @@
 line10
+added2
 line11
 line12
`;
    const result = parseDiff(diff);
    expect(result.files[0]!.hunks).toHaveLength(2);
    expect(result.files[0]!.additions).toBe(2);
  });
});

describe("classifyFile", () => {
  it("classifies JSON config files", () => {
    expect(classifyFile("config.json")).toBe("config");
    expect(classifyFile("app.config.ts")).toBe("config");
  });

  it("classifies YAML files as config", () => {
    expect(classifyFile("values.yaml")).toBe("config");
    expect(classifyFile("config.yml")).toBe("config");
  });

  it("classifies env files as config", () => {
    expect(classifyFile(".env")).toBe("config");
    expect(classifyFile(".env.local")).toBe("config");
  });

  it("classifies CI/CD files", () => {
    expect(classifyFile(".github/workflows/ci.yml")).toBe("ci-cd");
    expect(classifyFile(".gitlab-ci.yml")).toBe("ci-cd");
    expect(classifyFile("Jenkinsfile")).toBe("ci-cd");
    expect(classifyFile(".circleci/config.yml")).toBe("ci-cd");
  });

  it("classifies infrastructure files", () => {
    expect(classifyFile("Dockerfile")).toBe("infrastructure");
    expect(classifyFile("docker-compose.yml")).toBe("infrastructure");
    expect(classifyFile("main.tf")).toBe("infrastructure");
    expect(classifyFile("kubernetes/deploy.yaml")).toBe("infrastructure");
  });

  it("classifies test files", () => {
    expect(classifyFile("src/app.test.ts")).toBe("test");
    expect(classifyFile("tests/unit.spec.js")).toBe("test");
    expect(classifyFile("__tests__/app.js")).toBe("test");
  });

  it("classifies dependency files", () => {
    expect(classifyFile("package.json")).toBe("dependencies");
    expect(classifyFile("yarn.lock")).toBe("dependencies");
    expect(classifyFile("requirements.txt")).toBe("dependencies");
    expect(classifyFile("go.mod")).toBe("dependencies");
    expect(classifyFile("Cargo.toml")).toBe("dependencies");
  });

  it("classifies documentation files", () => {
    expect(classifyFile("README.md")).toBe("documentation");
    expect(classifyFile("docs/guide.rst")).toBe("documentation");
  });

  it("classifies database files", () => {
    expect(classifyFile("migrations/001.sql")).toBe("database");
    expect(classifyFile("schema.sql")).toBe("database");
  });

  it("classifies security files", () => {
    expect(classifyFile("src/auth.ts")).toBe("security");
    expect(classifyFile("lib/permissions.py")).toBe("security");
    expect(classifyFile("crypto/hash.go")).toBe("security");
  });

  it("classifies source files as default", () => {
    expect(classifyFile("src/app.ts")).toBe("source");
    expect(classifyFile("lib/utils.py")).toBe("source");
    expect(classifyFile("main.go")).toBe("source");
  });
});
