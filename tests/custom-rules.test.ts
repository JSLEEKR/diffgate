import { describe, it, expect } from "vitest";
import {
  buildCustomRule,
  parseCustomRules,
  validateCustomRuleDefinition,
} from "../src/custom-rules.js";
import { parseDiff } from "../src/parser.js";
import type { CustomRuleDefinition } from "../src/custom-rules.js";

function makeDiff(path: string, addedLines: string[]) {
  const additions = addedLines.map((l) => `+${l}`).join("\n");
  return parseDiff(`diff --git a/${path} b/${path}
--- a/${path}
+++ b/${path}
@@ -1,1 +1,${addedLines.length + 1} @@
 existing
${additions}
`);
}

describe("buildCustomRule", () => {
  it("creates a rule from definition", () => {
    const rule = buildCustomRule({
      id: "CUSTOM001",
      name: "No Console",
      pattern: "console\\.log",
      severity: "low",
    });
    expect(rule.id).toBe("CUSTOM001");
    expect(rule.name).toBe("No Console");
    expect(rule.severity).toBe("low");
  });

  it("matches pattern in added lines", () => {
    const rule = buildCustomRule({
      id: "C001",
      name: "No Foo",
      pattern: "\\bfoo\\b",
      severity: "medium",
    });
    const diff = makeDiff("src/app.ts", ["const foo = 1;", "const bar = 2;"]);
    const findings = rule.check(diff.files[0]!, diff);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.snippet).toContain("foo");
  });

  it("respects file patterns", () => {
    const rule = buildCustomRule({
      id: "C002",
      name: "TS Only",
      pattern: "\\bfoo\\b",
      filePatterns: ["**/*.ts"],
    });
    const tsDiff = makeDiff("src/app.ts", ["const foo = 1;"]);
    const pyDiff = makeDiff("src/app.py", ["foo = 1"]);

    expect(rule.check(tsDiff.files[0]!, tsDiff)).toHaveLength(1);
    expect(rule.check(pyDiff.files[0]!, pyDiff)).toHaveLength(0);
  });

  it("uses default severity when not specified", () => {
    const rule = buildCustomRule({ id: "C003", name: "Default" });
    expect(rule.severity).toBe("medium");
  });

  it("uses default category when not specified", () => {
    const rule = buildCustomRule({ id: "C004", name: "Default" });
    expect(rule.category).toBe("custom");
  });

  it("supports message template with {file}", () => {
    const rule = buildCustomRule({
      id: "C005",
      name: "File Alert",
      pattern: "alert",
      message: "Alert found in {file}",
    });
    const diff = makeDiff("src/ui.ts", ["alert('hi')"]);
    const findings = rule.check(diff.files[0]!, diff);
    expect(findings[0]!.message).toBe("Alert found in src/ui.ts");
  });

  it("file-level rule triggers on any change", () => {
    const rule = buildCustomRule({
      id: "C006",
      name: "File Changed",
      filePatterns: ["**/*.sql"],
      message: "SQL file changed: {file}",
    });
    const diff = makeDiff("migrations/001.sql", ["CREATE TABLE x;"]);
    const findings = rule.check(diff.files[0]!, diff);
    expect(findings).toHaveLength(1);
  });

  it("file-level rule skips non-matching files", () => {
    const rule = buildCustomRule({
      id: "C007",
      name: "SQL Only",
      filePatterns: ["**/*.sql"],
    });
    const diff = makeDiff("src/app.ts", ["hello"]);
    expect(rule.check(diff.files[0]!, diff)).toHaveLength(0);
  });

  it("does not match removed lines", () => {
    const rule = buildCustomRule({
      id: "C008",
      name: "No Foo",
      pattern: "\\bfoo\\b",
    });
    // Create diff with only removed lines
    const diff = parseDiff(`diff --git a/x.ts b/x.ts
--- a/x.ts
+++ b/x.ts
@@ -1,2 +1,1 @@
 existing
-const foo = 1;
`);
    expect(rule.check(diff.files[0]!, diff)).toHaveLength(0);
  });
});

describe("parseCustomRules", () => {
  it("creates multiple rules", () => {
    const defs: CustomRuleDefinition[] = [
      { id: "C001", name: "Rule 1" },
      { id: "C002", name: "Rule 2" },
    ];
    const rules = parseCustomRules(defs);
    expect(rules).toHaveLength(2);
    expect(rules[0]!.id).toBe("C001");
    expect(rules[1]!.id).toBe("C002");
  });

  it("handles empty array", () => {
    expect(parseCustomRules([])).toHaveLength(0);
  });
});

describe("validateCustomRuleDefinition", () => {
  it("validates correct definition", () => {
    const { valid, errors } = validateCustomRuleDefinition({
      id: "C001",
      name: "Test Rule",
      pattern: "\\bfoo\\b",
      severity: "high",
    });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("rejects missing id", () => {
    const { valid, errors } = validateCustomRuleDefinition({
      name: "Test",
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects missing name", () => {
    const { valid, errors } = validateCustomRuleDefinition({
      id: "C001",
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("rejects invalid severity", () => {
    const { valid } = validateCustomRuleDefinition({
      id: "C001",
      name: "Test",
      severity: "extreme",
    });
    expect(valid).toBe(false);
  });

  it("rejects invalid regex pattern", () => {
    const { valid } = validateCustomRuleDefinition({
      id: "C001",
      name: "Test",
      pattern: "([invalid",
    });
    expect(valid).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateCustomRuleDefinition(null).valid).toBe(false);
    expect(validateCustomRuleDefinition("string").valid).toBe(false);
    expect(validateCustomRuleDefinition(42).valid).toBe(false);
  });

  it("accepts definition without optional fields", () => {
    const { valid } = validateCustomRuleDefinition({
      id: "C001",
      name: "Minimal",
    });
    expect(valid).toBe(true);
  });
});
