import { describe, it, expect } from "vitest";
import {
  calculateScore,
  calculateBlastRadius,
  buildSummary,
  filterBySeverity,
  sortFindings,
} from "../src/scorer.js";
import type { Finding, ParsedDiff } from "../src/types.js";

function makeFinding(
  severity: Finding["severity"],
  category = "test"
): Finding {
  return {
    ruleId: "TEST001",
    ruleName: "Test",
    severity,
    message: "test finding",
    file: "test.ts",
    category,
  };
}

describe("calculateScore", () => {
  it("scores critical findings at 25 points", () => {
    const score = calculateScore([makeFinding("critical")]);
    expect(score.total).toBe(25);
  });

  it("scores high findings at 15 points", () => {
    const score = calculateScore([makeFinding("high")]);
    expect(score.total).toBe(15);
  });

  it("scores medium findings at 8 points", () => {
    const score = calculateScore([makeFinding("medium")]);
    expect(score.total).toBe(8);
  });

  it("scores low findings at 3 points", () => {
    const score = calculateScore([makeFinding("low")]);
    expect(score.total).toBe(3);
  });

  it("scores info findings at 1 point", () => {
    const score = calculateScore([makeFinding("info")]);
    expect(score.total).toBe(1);
  });

  it("sums multiple findings", () => {
    const score = calculateScore([
      makeFinding("critical"),
      makeFinding("high"),
      makeFinding("low"),
    ]);
    expect(score.total).toBe(43); // 25+15+3
  });

  it("groups breakdown by category", () => {
    const score = calculateScore([
      makeFinding("critical", "security"),
      makeFinding("high", "security"),
      makeFinding("medium", "config"),
    ]);
    expect(score.breakdown["security"]).toBe(40); // 25+15
    expect(score.breakdown["config"]).toBe(8);
  });

  it("returns safe level for score < 10", () => {
    const score = calculateScore([makeFinding("low")]);
    expect(score.level).toBe("safe");
  });

  it("returns caution level for score 10-29", () => {
    const score = calculateScore([makeFinding("high")]);
    expect(score.level).toBe("caution");
  });

  it("returns warning level for score 30-59", () => {
    const score = calculateScore([
      makeFinding("critical"),
      makeFinding("medium"),
    ]);
    expect(score.level).toBe("warning");
  });

  it("returns danger level for score 60-99", () => {
    const score = calculateScore([
      makeFinding("critical"),
      makeFinding("critical"),
      makeFinding("high"),
    ]);
    expect(score.level).toBe("danger");
  });

  it("returns critical level for score >= 100", () => {
    const findings = Array.from({ length: 4 }, () =>
      makeFinding("critical")
    );
    const score = calculateScore(findings);
    expect(score.level).toBe("critical");
  });

  it("handles empty findings", () => {
    const score = calculateScore([]);
    expect(score.total).toBe(0);
    expect(score.level).toBe("safe");
  });
});

describe("calculateBlastRadius", () => {
  function makeFiles(count: number, linesEach: number): ParsedDiff {
    return {
      files: Array.from({ length: count }, (_, i) => ({
        oldPath: `src/file${i}.ts`,
        newPath: `src/file${i}.ts`,
        status: "modified" as const,
        hunks: [],
        additions: linesEach,
        deletions: 0,
        isBinary: false,
      })),
      totalAdditions: count * linesEach,
      totalDeletions: 0,
    };
  }

  it("returns tiny for 1 file with few changes", () => {
    const br = calculateBlastRadius(makeFiles(1, 10));
    expect(br.scope).toBe("tiny");
  });

  it("returns small for 3 files", () => {
    const br = calculateBlastRadius(makeFiles(3, 20));
    expect(br.scope).toBe("small");
  });

  it("returns medium for 6 files", () => {
    const br = calculateBlastRadius(makeFiles(6, 10));
    expect(br.scope).toBe("medium");
  });

  it("returns large for >10 files", () => {
    const br = calculateBlastRadius(makeFiles(11, 10));
    expect(br.scope).toBe("large");
  });

  it("returns massive for >20 files", () => {
    const br = calculateBlastRadius(makeFiles(21, 10));
    expect(br.scope).toBe("massive");
  });

  it("returns massive for >1000 lines", () => {
    const br = calculateBlastRadius(makeFiles(1, 1001));
    expect(br.scope).toBe("massive");
  });

  it("counts categories affected", () => {
    const diff: ParsedDiff = {
      files: [
        { oldPath: "src/a.ts", newPath: "src/a.ts", status: "modified", hunks: [], additions: 1, deletions: 0, isBinary: false },
        { oldPath: "config.json", newPath: "config.json", status: "modified", hunks: [], additions: 1, deletions: 0, isBinary: false },
      ],
      totalAdditions: 2,
      totalDeletions: 0,
    };
    const br = calculateBlastRadius(diff);
    expect(br.categoriesAffected).toContain("source");
    expect(br.categoriesAffected).toContain("config");
  });
});

describe("filterBySeverity", () => {
  const findings = [
    makeFinding("critical"),
    makeFinding("high"),
    makeFinding("medium"),
    makeFinding("low"),
    makeFinding("info"),
  ];

  it("filters to critical only", () => {
    const result = filterBySeverity(findings, "critical");
    expect(result).toHaveLength(1);
  });

  it("filters to high and above", () => {
    const result = filterBySeverity(findings, "high");
    expect(result).toHaveLength(2);
  });

  it("filters to medium and above", () => {
    const result = filterBySeverity(findings, "medium");
    expect(result).toHaveLength(3);
  });

  it("includes all for info", () => {
    const result = filterBySeverity(findings, "info");
    expect(result).toHaveLength(5);
  });
});

describe("sortFindings", () => {
  it("sorts critical first", () => {
    const findings = [
      makeFinding("low"),
      makeFinding("critical"),
      makeFinding("medium"),
    ];
    const sorted = sortFindings(findings);
    expect(sorted[0]!.severity).toBe("critical");
    expect(sorted[1]!.severity).toBe("medium");
    expect(sorted[2]!.severity).toBe("low");
  });

  it("does not mutate original", () => {
    const findings = [makeFinding("low"), makeFinding("high")];
    const sorted = sortFindings(findings);
    expect(findings[0]!.severity).toBe("low");
    expect(sorted[0]!.severity).toBe("high");
  });
});

describe("buildSummary", () => {
  it("counts findings by severity", () => {
    const findings = [
      makeFinding("critical"),
      makeFinding("critical"),
      makeFinding("high"),
    ];
    const diff: ParsedDiff = { files: [], totalAdditions: 0, totalDeletions: 0 };
    const summary = buildSummary(findings, diff);
    expect(summary.bySeverity.critical).toBe(2);
    expect(summary.bySeverity.high).toBe(1);
    expect(summary.bySeverity.medium).toBe(0);
  });

  it("counts findings by category", () => {
    const findings = [
      makeFinding("high", "security"),
      makeFinding("medium", "security"),
      makeFinding("low", "config"),
    ];
    const diff: ParsedDiff = { files: [], totalAdditions: 0, totalDeletions: 0 };
    const summary = buildSummary(findings, diff);
    expect(summary.byCategory["security"]).toBe(2);
    expect(summary.byCategory["config"]).toBe(1);
  });
});
