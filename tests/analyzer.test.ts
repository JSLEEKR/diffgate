import { describe, it, expect } from "vitest";
import { analyze, gate } from "../src/analyzer.js";

const CLEAN_DIFF = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import express from "express";
+import helmet from "helmet";
 const app = express();
 app.listen(3000);
`;

const RISKY_DIFF = `diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -1,3 +1,6 @@
 import { Pool } from "pg";
+const password = "supersecret123";
+eval("dangerous code");
+// TODO: remove hardcoded password
 const pool = new Pool();
 export default pool;
`;

const MULTI_RISK_DIFF = `diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1,2 @@
+DB_PASSWORD=secret123
+API_KEY=sk-test-abc123456
diff --git a/migrations/drop.sql b/migrations/drop.sql
new file mode 100644
--- /dev/null
+++ b/migrations/drop.sql
@@ -0,0 +1 @@
+DROP TABLE users;
diff --git a/Dockerfile b/Dockerfile
--- a/Dockerfile
+++ b/Dockerfile
@@ -1 +1,2 @@
 FROM node:18
+RUN npm install
`;

describe("analyze", () => {
  it("returns clean result for safe diff", () => {
    const result = analyze(CLEAN_DIFF);
    expect(result.score.level).toBe("safe");
    expect(result.summary.filesAnalyzed).toBe(1);
  });

  it("detects multiple risks in risky diff", () => {
    const result = analyze(RISKY_DIFF);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.score.total).toBeGreaterThan(0);
  });

  it("finds hardcoded secrets", () => {
    const result = analyze(RISKY_DIFF);
    const secretFindings = result.findings.filter(
      (f) => f.ruleId === "SEC001"
    );
    expect(secretFindings.length).toBeGreaterThan(0);
  });

  it("finds dangerous functions", () => {
    const result = analyze(RISKY_DIFF);
    const evalFindings = result.findings.filter((f) => f.ruleId === "SEC002");
    expect(evalFindings.length).toBeGreaterThan(0);
  });

  it("detects .env file exposure", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const envFindings = result.findings.filter((f) => f.ruleId === "CFG003");
    expect(envFindings.length).toBeGreaterThan(0);
  });

  it("detects destructive SQL", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const sqlFindings = result.findings.filter((f) => f.ruleId === "DB002");
    expect(sqlFindings.length).toBeGreaterThan(0);
  });

  it("detects infrastructure changes", () => {
    const result = analyze(MULTI_RISK_DIFF);
    const infraFindings = result.findings.filter(
      (f) => f.ruleId === "CFG002"
    );
    expect(infraFindings.length).toBeGreaterThan(0);
  });

  it("sorts findings by severity (critical first)", () => {
    const result = analyze(MULTI_RISK_DIFF);
    if (result.findings.length >= 2) {
      const severities = result.findings.map((f) => f.severity);
      const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      for (let i = 1; i < severities.length; i++) {
        expect(order[severities[i]!]).toBeLessThanOrEqual(
          order[severities[i - 1]!]
        );
      }
    }
  });

  it("respects severity threshold", () => {
    const result = analyze(RISKY_DIFF, { severityThreshold: "high" });
    const lowFindings = result.findings.filter(
      (f) => f.severity === "low" || f.severity === "info"
    );
    expect(lowFindings).toHaveLength(0);
  });

  it("respects exclude rules", () => {
    const result = analyze(RISKY_DIFF, { excludeRules: ["SEC001"] });
    const secretFindings = result.findings.filter(
      (f) => f.ruleId === "SEC001"
    );
    expect(secretFindings).toHaveLength(0);
  });

  it("respects only rules filter", () => {
    const result = analyze(RISKY_DIFF, { rules: ["SEC001"] });
    expect(result.findings.every((f) => f.ruleId === "SEC001")).toBe(true);
  });

  it("respects exclude files", () => {
    const result = analyze(MULTI_RISK_DIFF, { excludeFiles: ["*.sql"] });
    const sqlFindings = result.findings.filter((f) => f.file.endsWith(".sql"));
    expect(sqlFindings).toHaveLength(0);
  });

  it("handles empty diff", () => {
    const result = analyze("");
    expect(result.findings).toHaveLength(0);
    expect(result.score.total).toBe(0);
    expect(result.score.level).toBe("safe");
  });

  it("provides blast radius info", () => {
    const result = analyze(MULTI_RISK_DIFF);
    expect(result.summary.blastRadius.filesChanged).toBe(3);
    expect(result.summary.blastRadius.categoriesAffected.length).toBeGreaterThan(0);
  });

  it("deduplicates global findings", () => {
    // BR002 and BR003 should only appear once each
    const result = analyze(MULTI_RISK_DIFF);
    const br002 = result.findings.filter((f) => f.ruleId === "BR002");
    expect(br002.length).toBeLessThanOrEqual(1);
  });
});

describe("gate", () => {
  it("passes when score is below threshold", () => {
    const { passed } = gate(CLEAN_DIFF, { maxScore: 100 });
    expect(passed).toBe(true);
  });

  it("fails when score exceeds threshold", () => {
    const { passed } = gate(MULTI_RISK_DIFF, { maxScore: 5 });
    expect(passed).toBe(false);
  });

  it("returns analysis result", () => {
    const { result } = gate(RISKY_DIFF, { maxScore: 100 });
    expect(result.findings).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it("uses default max score of 100", () => {
    const { passed } = gate(CLEAN_DIFF);
    expect(passed).toBe(true);
  });
});
