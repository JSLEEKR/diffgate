import { describe, it, expect } from "vitest";
import { compare, formatComparison } from "../src/compare.js";
import type { AnalysisResult, Finding } from "../src/types.js";

function makeFinding(ruleId: string, file: string, message: string): Finding {
  return {
    ruleId,
    ruleName: ruleId,
    severity: "high",
    message,
    file,
    category: "test",
  };
}

function makeResult(
  findings: Finding[],
  score: number,
  level: AnalysisResult["score"]["level"] = "safe"
): AnalysisResult {
  return {
    findings,
    score: { total: score, breakdown: {}, level },
    summary: {
      filesAnalyzed: 1,
      totalFindings: findings.length,
      bySeverity: { critical: 0, high: findings.length, medium: 0, low: 0, info: 0 },
      byCategory: {},
      blastRadius: {
        filesChanged: 1,
        linesChanged: 10,
        categoriesAffected: ["source"],
        scope: "tiny",
      },
    },
  };
}

describe("compare", () => {
  it("detects new findings", () => {
    const before = makeResult([], 0);
    const after = makeResult(
      [makeFinding("SEC001", "app.ts", "secret found")],
      25,
      "caution"
    );
    const comp = compare(before, after);
    expect(comp.newFindings).toHaveLength(1);
    expect(comp.resolvedFindings).toHaveLength(0);
    expect(comp.degraded).toBe(true);
  });

  it("detects resolved findings", () => {
    const before = makeResult(
      [makeFinding("SEC001", "app.ts", "secret found")],
      25,
      "caution"
    );
    const after = makeResult([], 0);
    const comp = compare(before, after);
    expect(comp.resolvedFindings).toHaveLength(1);
    expect(comp.newFindings).toHaveLength(0);
    expect(comp.improved).toBe(true);
  });

  it("detects persisted findings", () => {
    const finding = makeFinding("SEC001", "app.ts", "secret found");
    const before = makeResult([finding], 25, "caution");
    const after = makeResult([finding], 25, "caution");
    const comp = compare(before, after);
    expect(comp.persistedFindings).toHaveLength(1);
    expect(comp.improved).toBe(false);
    expect(comp.degraded).toBe(false);
  });

  it("calculates score delta", () => {
    const before = makeResult([], 10, "caution");
    const after = makeResult([], 30, "warning");
    const comp = compare(before, after);
    expect(comp.scoreDelta).toBe(20);
  });

  it("detects level change", () => {
    const before = makeResult([], 10, "caution");
    const after = makeResult([], 30, "warning");
    const comp = compare(before, after);
    expect(comp.levelChanged).toBe(true);
  });

  it("no level change for same level", () => {
    const before = makeResult([], 10, "caution");
    const after = makeResult([], 15, "caution");
    const comp = compare(before, after);
    expect(comp.levelChanged).toBe(false);
  });

  it("handles empty before and after", () => {
    const comp = compare(makeResult([], 0), makeResult([], 0));
    expect(comp.scoreDelta).toBe(0);
    expect(comp.newFindings).toHaveLength(0);
    expect(comp.resolvedFindings).toHaveLength(0);
  });

  it("correctly separates new, resolved, and persisted", () => {
    const f1 = makeFinding("SEC001", "a.ts", "old issue");
    const f2 = makeFinding("SEC002", "b.ts", "persisted issue");
    const f3 = makeFinding("SEC003", "c.ts", "new issue");

    const before = makeResult([f1, f2], 30, "warning");
    const after = makeResult([f2, f3], 30, "warning");

    const comp = compare(before, after);
    expect(comp.newFindings).toHaveLength(1);
    expect(comp.newFindings[0]!.ruleId).toBe("SEC003");
    expect(comp.resolvedFindings).toHaveLength(1);
    expect(comp.resolvedFindings[0]!.ruleId).toBe("SEC001");
    expect(comp.persistedFindings).toHaveLength(1);
    expect(comp.persistedFindings[0]!.ruleId).toBe("SEC002");
  });
});

describe("formatComparison", () => {
  it("shows degradation arrow", () => {
    const comp = compare(
      makeResult([], 10, "caution"),
      makeResult([makeFinding("SEC001", "a.ts", "new")], 25, "caution")
    );
    const output = formatComparison(comp);
    expect(output).toContain(">>>");
  });

  it("shows improvement arrow", () => {
    const comp = compare(
      makeResult([makeFinding("SEC001", "a.ts", "old")], 25, "caution"),
      makeResult([], 0)
    );
    const output = formatComparison(comp);
    expect(output).toContain("<<<");
  });

  it("shows no change", () => {
    const comp = compare(makeResult([], 0), makeResult([], 0));
    const output = formatComparison(comp);
    expect(output).toContain("===");
  });

  it("lists new findings", () => {
    const comp = compare(
      makeResult([], 0),
      makeResult([makeFinding("SEC001", "a.ts", "found secret")], 25)
    );
    const output = formatComparison(comp);
    expect(output).toContain("New findings");
    expect(output).toContain("SEC001");
  });

  it("lists resolved findings", () => {
    const comp = compare(
      makeResult([makeFinding("SEC001", "a.ts", "secret")], 25),
      makeResult([], 0)
    );
    const output = formatComparison(comp);
    expect(output).toContain("Resolved findings");
  });

  it("includes delta", () => {
    const comp = compare(
      makeResult([], 10, "caution"),
      makeResult([], 30, "warning")
    );
    const output = formatComparison(comp);
    expect(output).toContain("+20");
  });
});
