import { describe, it, expect } from "vitest";
import { parseConfig, mergeConfigs } from "../src/config.js";

describe("parseConfig", () => {
  it("parses empty config", () => {
    const config = parseConfig("{}");
    expect(config).toEqual({});
  });

  it("parses rules array", () => {
    const config = parseConfig('{"rules": ["SEC001", "SEC002"]}');
    expect(config.rules).toEqual(["SEC001", "SEC002"]);
  });

  it("parses excludeRules", () => {
    const config = parseConfig('{"excludeRules": ["CQ001"]}');
    expect(config.excludeRules).toEqual(["CQ001"]);
  });

  it("parses excludeFiles", () => {
    const config = parseConfig('{"excludeFiles": ["**/*.test.ts"]}');
    expect(config.excludeFiles).toEqual(["**/*.test.ts"]);
  });

  it("parses severityThreshold", () => {
    const config = parseConfig('{"severityThreshold": "medium"}');
    expect(config.severityThreshold).toBe("medium");
  });

  it("parses maxScore", () => {
    const config = parseConfig('{"maxScore": 50}');
    expect(config.maxScore).toBe(50);
  });

  it("parses full config", () => {
    const config = parseConfig(
      JSON.stringify({
        rules: ["SEC001"],
        excludeRules: ["CQ001"],
        excludeFiles: ["*.md"],
        severityThreshold: "high",
        maxScore: 30,
      })
    );
    expect(config.rules).toEqual(["SEC001"]);
    expect(config.excludeRules).toEqual(["CQ001"]);
    expect(config.excludeFiles).toEqual(["*.md"]);
    expect(config.severityThreshold).toBe("high");
    expect(config.maxScore).toBe(30);
  });

  it("ignores unknown fields", () => {
    const config = parseConfig('{"unknown": "value"}');
    expect(config).toEqual({});
  });

  it("throws on invalid JSON", () => {
    expect(() => parseConfig("not json")).toThrow();
  });
});

describe("mergeConfigs", () => {
  it("cli overrides file for scalar values", () => {
    const file = { maxScore: 50, severityThreshold: "low" as const };
    const cli = { maxScore: 30 };
    const merged = mergeConfigs(file, cli);
    expect(merged.maxScore).toBe(30);
    expect(merged.severityThreshold).toBe("low");
  });

  it("merges arrays", () => {
    const file = { excludeRules: ["CQ001"] };
    const cli = { excludeRules: ["CQ002"] };
    const merged = mergeConfigs(file, cli);
    expect(merged.excludeRules).toEqual(["CQ001", "CQ002"]);
  });

  it("cli overrides file for rules", () => {
    const file = { rules: ["SEC001", "SEC002"] };
    const cli = { rules: ["SEC001"] };
    const merged = mergeConfigs(file, cli);
    expect(merged.rules).toEqual(["SEC001"]);
  });

  it("merges excludeFiles", () => {
    const file = { excludeFiles: ["*.md"] };
    const cli = { excludeFiles: ["*.test.ts"] };
    const merged = mergeConfigs(file, cli);
    expect(merged.excludeFiles).toEqual(["*.md", "*.test.ts"]);
  });

  it("handles empty configs", () => {
    const merged = mergeConfigs({}, {});
    expect(merged.rules).toBeUndefined();
    expect(merged.excludeRules).toBeUndefined();
  });

  it("uses file config when cli is empty", () => {
    const file = { maxScore: 50, excludeRules: ["CQ001"] };
    const merged = mergeConfigs(file, {});
    expect(merged.maxScore).toBe(50);
    expect(merged.excludeRules).toEqual(["CQ001"]);
  });
});
