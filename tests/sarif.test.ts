import { describe, it, expect } from "vitest";
import { toSarif, formatSarif } from "../src/sarif.js";
import { analyze } from "../src/analyzer.js";

const RISKY_DIFF = `diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -1,2 +1,4 @@
 import { Pool } from "pg";
+const password = "supersecret123";
+eval("dangerous");
 const pool = new Pool();
`;

describe("toSarif", () => {
  it("produces valid SARIF structure", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    expect(sarif.$schema).toContain("sarif-schema");
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
  });

  it("includes tool information", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const driver = sarif.runs[0]!.tool.driver;
    expect(driver.name).toBe("diffgate");
    expect(driver.version).toBe("0.1.0");
  });

  it("maps findings to results", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    expect(sarif.runs[0]!.results.length).toBe(result.findings.length);
  });

  it("includes rule descriptors", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const rules = sarif.runs[0]!.tool.driver.rules;
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]!.id).toBeTruthy();
    expect(rules[0]!.name).toBeTruthy();
  });

  it("maps critical severity to error", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const criticalResult = sarif.runs[0]!.results.find(
      (r) => r.ruleId === "SEC001"
    );
    expect(criticalResult?.level).toBe("error");
  });

  it("includes file locations", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const r = sarif.runs[0]!.results[0]!;
    expect(r.locations[0]!.physicalLocation.artifactLocation.uri).toBeTruthy();
  });

  it("includes line numbers when available", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const withLine = sarif.runs[0]!.results.find(
      (r) => r.locations[0]!.physicalLocation.region
    );
    if (withLine) {
      expect(
        withLine.locations[0]!.physicalLocation.region!.startLine
      ).toBeGreaterThan(0);
    }
  });

  it("handles empty findings", () => {
    const result = analyze(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1 +1,2 @@
 safe code
+more safe code
`);
    const sarif = toSarif(result);
    expect(sarif.runs[0]!.results).toHaveLength(0);
  });

  it("deduplicates rule IDs", () => {
    const result = analyze(RISKY_DIFF);
    const sarif = toSarif(result);
    const ruleIds = sarif.runs[0]!.tool.driver.rules.map((r) => r.id);
    const uniqueIds = [...new Set(ruleIds)];
    expect(ruleIds.length).toBe(uniqueIds.length);
  });
});

describe("formatSarif", () => {
  it("returns valid JSON string", () => {
    const result = analyze(RISKY_DIFF);
    const json = formatSarif(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("is pretty-printed", () => {
    const result = analyze(RISKY_DIFF);
    const json = formatSarif(result);
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });
});
