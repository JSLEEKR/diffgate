import { describe, it, expect } from "vitest";
import {
  parseDiff,
  analyze,
  gate,
  format,
  calculateStats,
  assessAllComplexity,
  compare,
  fingerprintDiff,
  generateSuggestions,
  batchAnalyze,
  applyProfile,
  summarizeByCategory,
  analyzeRuleFrequency,
  toSarif,
  toAnnotations,
  toReviewComments,
  createSnapshot,
  analyzeTrend,
  analyzeOwnership,
  builtinRules,
} from "../src/index.js";

const REALISTIC_PR = `diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,5 +1,12 @@
 import { hash } from "./crypto";
+import { Pool } from "pg";
+
+const DB_PASSWORD = "prod-password-123";
+
 export async function login(username: string, password: string) {
-  return hash(password) === storedHash;
+  const pool = new Pool({ password: DB_PASSWORD });
+  const query = "SELECT * FROM users WHERE name='" + username + "'";
+  // TODO: add rate limiting
+  console.log("login attempt", username);
+  return pool.query(query);
 }
diff --git a/Dockerfile b/Dockerfile
--- a/Dockerfile
+++ b/Dockerfile
@@ -1,3 +1,4 @@
 FROM node:18-alpine
 COPY . .
+RUN npm install
 CMD ["node", "dist/index.js"]
diff --git a/migrations/002_add_sessions.sql b/migrations/002_add_sessions.sql
new file mode 100644
--- /dev/null
+++ b/migrations/002_add_sessions.sql
@@ -0,0 +1,3 @@
+CREATE TABLE sessions (id SERIAL PRIMARY KEY, user_id INT);
+DROP TABLE old_sessions;
+DELETE FROM logs;
diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1,2 @@
+DATABASE_URL=postgresql://user:pass@localhost/db
+SECRET_KEY=my-secret-key-12345
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,6 +5,7 @@
   "dependencies": {
     "express": "^4.18.0",
+    "pg": "^8.0.0",
     "cors": "^2.8.5"
   }
 }
diff --git a/tests/login.test.ts b/tests/login.test.ts
deleted file mode 100644
--- a/tests/login.test.ts
+++ /dev/null
@@ -1,8 +0,0 @@
-import { login } from "../src/auth/login";
-import { describe, it, expect } from "vitest";
-
-describe("login", () => {
-  it("rejects wrong password", async () => {
-    expect(await login("user", "wrong")).toBe(false);
-  });
-});
`;

describe("End-to-end integration", () => {
  it("full pipeline: parse -> analyze -> format -> all formats", () => {
    const diff = parseDiff(REALISTIC_PR);
    expect(diff.files.length).toBeGreaterThan(3);

    const result = analyze(REALISTIC_PR);
    expect(result.findings.length).toBeGreaterThan(5);
    expect(result.score.total).toBeGreaterThan(50);

    // All output formats work
    expect(format(result, "text")).toContain("diffgate");
    expect(() => JSON.parse(format(result, "json"))).not.toThrow();
    expect(format(result, "oneline").split("\n")).toHaveLength(1);
    expect(format(result, "markdown")).toContain("##");
  });

  it("detects all expected risk categories", () => {
    const result = analyze(REALISTIC_PR);
    const ruleIds = new Set(result.findings.map((f) => f.ruleId));

    // Should detect:
    expect(ruleIds.has("SEC001")).toBe(true); // hardcoded password
    expect(ruleIds.has("SEC003")).toBe(true); // SQL injection
    expect(ruleIds.has("CQ001")).toBe(true);  // TODO
    expect(ruleIds.has("CQ002")).toBe(true);  // console.log
    expect(ruleIds.has("CQ003")).toBe(true);  // deleted test
    expect(ruleIds.has("CFG003")).toBe(true);  // .env file
    expect(ruleIds.has("DB002")).toBe(true);  // DROP TABLE
  });

  it("gate mode correctly fails high-risk PR", () => {
    const { passed, result } = gate(REALISTIC_PR, { maxScore: 30 });
    expect(passed).toBe(false);
    expect(result.score.total).toBeGreaterThan(30);
  });

  it("statistics cover all files", () => {
    const diff = parseDiff(REALISTIC_PR);
    const stats = calculateStats(diff);
    expect(stats.totalFiles).toBe(diff.files.length);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(2);
  });

  it("complexity analysis ranks files", () => {
    const diff = parseDiff(REALISTIC_PR);
    const complexity = assessAllComplexity(diff.files);
    expect(complexity.length).toBe(diff.files.length);
    // Sorted by score descending
    for (let i = 1; i < complexity.length; i++) {
      expect(complexity[i]!.score).toBeLessThanOrEqual(
        complexity[i - 1]!.score
      );
    }
  });

  it("comparison detects regression", () => {
    const safeDiff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe
+also safe
`;
    const before = analyze(safeDiff);
    const after = analyze(REALISTIC_PR);
    const comp = compare(before, after);
    expect(comp.degraded).toBe(true);
    expect(comp.newFindings.length).toBeGreaterThan(0);
  });

  it("fingerprinting produces stable hashes", () => {
    const diff = parseDiff(REALISTIC_PR);
    const fp1 = fingerprintDiff(diff);
    const fp2 = fingerprintDiff(diff);
    expect(fp1.hash).toBe(fp2.hash);
  });

  it("suggestions cover security findings", () => {
    const result = analyze(REALISTIC_PR);
    const suggestions = generateSuggestions(result.findings);
    expect(suggestions.length).toBeGreaterThan(3);
  });

  it("batch analysis works across multiple PRs", () => {
    const safeDiff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe
+code
`;
    const batch = batchAnalyze(
      [
        { id: "safe-pr", diff: safeDiff },
        { id: "risky-pr", diff: REALISTIC_PR },
      ],
      { maxScore: 30 }
    );
    expect(batch.aggregate.totalEntries).toBe(2);
    expect(batch.aggregate.failedCount).toBe(1);
    expect(batch.aggregate.worstEntry).toBe("risky-pr");
  });

  it("profiles apply correctly", () => {
    const config = applyProfile("security");
    const result = analyze(REALISTIC_PR, config);
    // Only security rules should fire
    const nonSecurity = result.findings.filter(
      (f) => !f.ruleId.startsWith("SEC") && f.ruleId !== "CFG003"
    );
    expect(nonSecurity).toHaveLength(0);
  });

  it("category summary aggregates correctly", () => {
    const result = analyze(REALISTIC_PR);
    const summary = summarizeByCategory(result);
    const totalFindings = summary.reduce(
      (sum, s) => sum + s.findingCount,
      0
    );
    expect(totalFindings).toBe(result.findings.length);
  });

  it("rule frequency tracks cross-file hits", () => {
    const result = analyze(REALISTIC_PR);
    const freq = analyzeRuleFrequency(result);
    expect(freq.length).toBeGreaterThan(0);
    expect(freq[0]!.count).toBeGreaterThan(0);
  });

  it("SARIF output is valid", () => {
    const result = analyze(REALISTIC_PR);
    const sarif = toSarif(result);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]!.results.length).toBe(result.findings.length);
  });

  it("annotations generated for line-level findings", () => {
    const result = analyze(REALISTIC_PR);
    const annotations = toAnnotations(result.findings);
    expect(annotations.length).toBeGreaterThan(0);
  });

  it("review comments include fix suggestions", () => {
    const result = analyze(REALISTIC_PR);
    const comments = toReviewComments(result.findings);
    const withFix = comments.filter((c) => c.body.includes("**Fix:**"));
    expect(withFix.length).toBeGreaterThan(0);
  });

  it("trend analysis with multiple snapshots", () => {
    const result1 = analyze(REALISTIC_PR);
    const safeDiff = `diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe
+code
`;
    const result2 = analyze(safeDiff);

    const snapshots = [
      createSnapshot(result1.score.total, result1.score.level,
        result1.findings.length, result1.summary.bySeverity, "risky"),
      createSnapshot(result2.score.total, result2.score.level,
        result2.findings.length, result2.summary.bySeverity, "safe"),
    ];
    const trend = analyzeTrend(snapshots);
    expect(trend.direction).toBe("improving");
  });

  it("ownership analysis with CODEOWNERS", () => {
    const diff = parseDiff(REALISTIC_PR);
    const report = analyzeOwnership(diff, `
* @global
src/auth/ @security-team
*.sql @dba
`);
    expect(report.fileOwners.size).toBe(diff.files.length);
    expect(report.affectedOwners.length).toBeGreaterThan(0);
  });

  it("all builtin rules have unique IDs", () => {
    const ids = builtinRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all builtin rules have required fields", () => {
    for (const rule of builtinRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(typeof rule.check).toBe("function");
    }
  });
});
