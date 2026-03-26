import { describe, it, expect } from "vitest";
import { format, formatText, formatJSON, formatOneline, formatMarkdown } from "../src/reporter.js";
import type { AnalysisResult } from "../src/types.js";

function makeResult(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    findings: [
      {
        ruleId: "SEC001",
        ruleName: "Hardcoded Secrets",
        severity: "critical",
        message: "Potential hardcoded secret",
        file: "src/db.ts",
        line: 5,
        snippet: 'const key = "sk-abc123";',
        category: "security",
      },
      {
        ruleId: "CQ001",
        ruleName: "TODO/FIXME",
        severity: "info",
        message: "New TODO comment",
        file: "src/app.ts",
        line: 10,
        category: "code-quality",
      },
    ],
    score: {
      total: 26,
      breakdown: { security: 25, "code-quality": 1 },
      level: "caution",
    },
    summary: {
      filesAnalyzed: 2,
      totalFindings: 2,
      bySeverity: { critical: 1, high: 0, medium: 0, low: 0, info: 1 },
      byCategory: { security: 1, "code-quality": 1 },
      blastRadius: {
        filesChanged: 2,
        linesChanged: 15,
        categoriesAffected: ["source"],
        scope: "tiny",
      },
    },
    ...overrides,
  };
}

describe("formatText", () => {
  it("includes risk level", () => {
    const output = formatText(makeResult());
    expect(output).toContain("CAUTION");
  });

  it("includes score", () => {
    const output = formatText(makeResult());
    expect(output).toContain("26");
  });

  it("includes blast radius", () => {
    const output = formatText(makeResult());
    expect(output).toContain("tiny");
    expect(output).toContain("2 files");
  });

  it("includes finding details", () => {
    const output = formatText(makeResult());
    expect(output).toContain("SEC001");
    expect(output).toContain("src/db.ts");
    expect(output).toContain("Potential hardcoded secret");
  });

  it("includes snippet", () => {
    const output = formatText(makeResult());
    expect(output).toContain("sk-abc123");
  });

  it("includes score breakdown", () => {
    const output = formatText(makeResult());
    expect(output).toContain("security: 25");
  });

  it("shows clean message when no findings", () => {
    const output = formatText(
      makeResult({
        findings: [],
        score: { total: 0, breakdown: {}, level: "safe" },
        summary: {
          filesAnalyzed: 1,
          totalFindings: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: {},
          blastRadius: {
            filesChanged: 1,
            linesChanged: 5,
            categoriesAffected: ["source"],
            scope: "tiny",
          },
        },
      })
    );
    expect(output).toContain("Clean diff");
  });
});

describe("formatJSON", () => {
  it("returns valid JSON", () => {
    const output = formatJSON(makeResult());
    const parsed = JSON.parse(output);
    expect(parsed.score.total).toBe(26);
  });

  it("includes all fields", () => {
    const output = formatJSON(makeResult());
    const parsed = JSON.parse(output);
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.score).toBeDefined();
    expect(parsed.summary).toBeDefined();
  });
});

describe("formatOneline", () => {
  it("includes level and score", () => {
    const output = formatOneline(makeResult());
    expect(output).toContain("CAUTION");
    expect(output).toContain("26");
  });

  it("includes finding count", () => {
    const output = formatOneline(makeResult());
    expect(output).toContain("2 findings");
  });

  it("includes critical count when present", () => {
    const output = formatOneline(makeResult());
    expect(output).toContain("1 critical");
  });
});

describe("formatMarkdown", () => {
  it("includes markdown headers", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("## ");
    expect(output).toContain("diffgate");
  });

  it("includes summary table", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("| Metric | Value |");
    expect(output).toContain("Files changed");
  });

  it("includes findings section", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("### Findings");
    expect(output).toContain("SEC001");
  });

  it("includes code blocks for snippets", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("```");
  });
});

describe("format", () => {
  it("defaults to text format", () => {
    const output = format(makeResult());
    expect(output).toContain("diffgate");
    expect(output).toContain("CAUTION");
  });

  it("supports json format", () => {
    const output = format(makeResult(), "json");
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("supports oneline format", () => {
    const output = format(makeResult(), "oneline");
    expect(output.split("\n")).toHaveLength(1);
  });

  it("supports markdown format", () => {
    const output = format(makeResult(), "markdown");
    expect(output).toContain("##");
  });
});
