import { describe, it, expect } from "vitest";
import {
  generateSuggestions,
  formatSuggestions,
  getSuggestionTemplate,
} from "../src/suggestions.js";
import type { Finding } from "../src/types.js";

function makeFinding(ruleId: string, file = "test.ts"): Finding {
  return {
    ruleId,
    ruleName: ruleId,
    severity: "high",
    message: `Finding from ${ruleId}`,
    file,
    line: 10,
    category: "test",
  };
}

describe("generateSuggestions", () => {
  it("generates suggestion for SEC001", () => {
    const suggestions = generateSuggestions([makeFinding("SEC001")]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.fix).toContain("environment variable");
  });

  it("generates suggestion for SEC002", () => {
    const suggestions = generateSuggestions([makeFinding("SEC002")]);
    expect(suggestions[0]!.fix).toContain("safe alternative");
  });

  it("generates suggestion for SEC003", () => {
    const suggestions = generateSuggestions([makeFinding("SEC003")]);
    expect(suggestions[0]!.fix).toContain("parameterized");
  });

  it("generates suggestion for SEC004", () => {
    const suggestions = generateSuggestions([makeFinding("SEC004")]);
    expect(suggestions[0]!.fix).toContain("Re-enable");
  });

  it("generates suggestion for SEC005", () => {
    const suggestions = generateSuggestions([makeFinding("SEC005")]);
    expect(suggestions[0]!.fix).toContain("path");
  });

  it("generates suggestion for SEC006", () => {
    const suggestions = generateSuggestions([makeFinding("SEC006")]);
    expect(suggestions[0]!.fix).toContain("argument list");
  });

  it("generates suggestion for SEC007", () => {
    const suggestions = generateSuggestions([makeFinding("SEC007")]);
    expect(suggestions[0]!.fix).toContain("SHA-256");
  });

  it("generates suggestion for CFG003", () => {
    const suggestions = generateSuggestions([makeFinding("CFG003")]);
    expect(suggestions[0]!.fix).toContain(".gitignore");
  });

  it("marks CQ002 as auto-fixable", () => {
    const suggestions = generateSuggestions([makeFinding("CQ002")]);
    expect(suggestions[0]!.autoFixable).toBe(true);
  });

  it("generates suggestion for DB002", () => {
    const suggestions = generateSuggestions([makeFinding("DB002")]);
    expect(suggestions[0]!.fix).toContain("IF EXISTS");
  });

  it("skips rules without suggestions", () => {
    const suggestions = generateSuggestions([makeFinding("UNKNOWN")]);
    expect(suggestions).toHaveLength(0);
  });

  it("handles mixed known and unknown rules", () => {
    const suggestions = generateSuggestions([
      makeFinding("SEC001"),
      makeFinding("UNKNOWN"),
      makeFinding("CQ002"),
    ]);
    expect(suggestions).toHaveLength(2);
  });

  it("handles empty findings", () => {
    expect(generateSuggestions([])).toHaveLength(0);
  });

  it("preserves finding reference", () => {
    const finding = makeFinding("SEC001", "secret.ts");
    const suggestions = generateSuggestions([finding]);
    expect(suggestions[0]!.finding).toBe(finding);
  });
});

describe("formatSuggestions", () => {
  it("formats suggestions with fix and explanation", () => {
    const suggestions = generateSuggestions([makeFinding("SEC001")]);
    const output = formatSuggestions(suggestions);
    expect(output).toContain("Fix:");
    expect(output).toContain("Why:");
  });

  it("includes file and line", () => {
    const suggestions = generateSuggestions([makeFinding("SEC001", "db.ts")]);
    const output = formatSuggestions(suggestions);
    expect(output).toContain("db.ts:10");
  });

  it("marks auto-fixable", () => {
    const suggestions = generateSuggestions([makeFinding("CQ002")]);
    const output = formatSuggestions(suggestions);
    expect(output).toContain("auto-fixable");
  });

  it("handles empty suggestions", () => {
    expect(formatSuggestions([])).toContain("No suggestions");
  });
});

describe("getSuggestionTemplate", () => {
  it("returns template for known rule", () => {
    const t = getSuggestionTemplate("SEC001");
    expect(t).not.toBeNull();
    expect(t!.fix).toBeTruthy();
    expect(t!.explanation).toBeTruthy();
  });

  it("returns null for unknown rule", () => {
    expect(getSuggestionTemplate("UNKNOWN")).toBeNull();
  });
});
