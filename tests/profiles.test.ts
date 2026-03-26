import { describe, it, expect } from "vitest";
import {
  getProfile,
  listProfiles,
  applyProfile,
  applySeverityOverrides,
  profiles,
} from "../src/profiles.js";

describe("getProfile", () => {
  it("returns strict profile", () => {
    const p = getProfile("strict");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("strict");
    expect(p!.config.maxScore).toBe(25);
  });

  it("returns security profile", () => {
    const p = getProfile("security");
    expect(p).not.toBeNull();
    expect(p!.config.rules!.length).toBeGreaterThan(5);
  });

  it("returns relaxed profile", () => {
    const p = getProfile("relaxed");
    expect(p).not.toBeNull();
    expect(p!.config.severityThreshold).toBe("high");
  });

  it("returns ci profile", () => {
    const p = getProfile("ci");
    expect(p).not.toBeNull();
    expect(p!.config.maxScore).toBe(60);
  });

  it("returns review profile", () => {
    const p = getProfile("review");
    expect(p).not.toBeNull();
    expect(p!.config.severityThreshold).toBe("info");
  });

  it("returns null for unknown profile", () => {
    expect(getProfile("nonexistent")).toBeNull();
  });
});

describe("listProfiles", () => {
  it("returns all profiles", () => {
    const list = listProfiles();
    expect(list.length).toBe(Object.keys(profiles).length);
  });

  it("each profile has name and description", () => {
    for (const p of listProfiles()) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
    }
  });
});

describe("applyProfile", () => {
  it("returns profile config with no overrides", () => {
    const config = applyProfile("strict");
    expect(config.maxScore).toBe(25);
  });

  it("overrides maxScore", () => {
    const config = applyProfile("strict", { maxScore: 50 });
    expect(config.maxScore).toBe(50);
  });

  it("merges excludeRules", () => {
    const config = applyProfile("relaxed", {
      excludeRules: ["BR001"],
    });
    expect(config.excludeRules).toContain("CQ001");
    expect(config.excludeRules).toContain("BR001");
  });

  it("overrides severity threshold", () => {
    const config = applyProfile("ci", {
      severityThreshold: "critical",
    });
    expect(config.severityThreshold).toBe("critical");
  });

  it("throws on unknown profile", () => {
    expect(() => applyProfile("fake")).toThrow("Unknown profile");
  });

  it("overrides rules completely", () => {
    const config = applyProfile("security", {
      rules: ["SEC001"],
    });
    expect(config.rules).toEqual(["SEC001"]);
  });
});

describe("applySeverityOverrides", () => {
  it("overrides matching rule severity", () => {
    const findings = [
      { ruleId: "SEC001", severity: "critical" as const },
      { ruleId: "CQ001", severity: "info" as const },
    ];
    applySeverityOverrides(findings, { CQ001: "high" });
    expect(findings[1]!.severity).toBe("high");
    expect(findings[0]!.severity).toBe("critical");
  });

  it("leaves non-matching rules unchanged", () => {
    const findings = [{ ruleId: "SEC001", severity: "critical" as const }];
    applySeverityOverrides(findings, { CQ001: "high" });
    expect(findings[0]!.severity).toBe("critical");
  });

  it("handles empty overrides", () => {
    const findings = [{ ruleId: "SEC001", severity: "critical" as const }];
    applySeverityOverrides(findings, {});
    expect(findings[0]!.severity).toBe("critical");
  });

  it("handles empty findings", () => {
    expect(() => applySeverityOverrides([], { SEC001: "low" })).not.toThrow();
  });
});
