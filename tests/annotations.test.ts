import { describe, it, expect } from "vitest";
import {
  toAnnotations,
  formatAnnotations,
  toReviewComments,
  formatReviewBody,
} from "../src/annotations.js";
import type { Finding } from "../src/types.js";

function makeFinding(
  ruleId: string,
  severity: Finding["severity"] = "high",
  file = "src/app.ts",
  line = 10
): Finding {
  return {
    ruleId,
    ruleName: `Rule ${ruleId}`,
    severity,
    message: `Finding from ${ruleId}`,
    file,
    line,
    snippet: `const x = "test";`,
    category: "security",
  };
}

describe("toAnnotations", () => {
  it("converts findings to annotations", () => {
    const annotations = toAnnotations([makeFinding("SEC001")]);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.file).toBe("src/app.ts");
    expect(annotations[0]!.line).toBe(10);
  });

  it("maps critical to error", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "critical")]);
    expect(annotations[0]!.level).toBe("error");
  });

  it("maps high to error", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "high")]);
    expect(annotations[0]!.level).toBe("error");
  });

  it("maps medium to warning", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "medium")]);
    expect(annotations[0]!.level).toBe("warning");
  });

  it("maps low to notice", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "low")]);
    expect(annotations[0]!.level).toBe("notice");
  });

  it("maps info to notice", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "info")]);
    expect(annotations[0]!.level).toBe("notice");
  });

  it("skips findings without line numbers", () => {
    const finding: Finding = {
      ruleId: "BR002",
      ruleName: "Many Files",
      severity: "medium",
      message: "test",
      file: "(global)",
      category: "blast-radius",
    };
    const annotations = toAnnotations([finding]);
    expect(annotations).toHaveLength(0);
  });

  it("includes snippet in message", () => {
    const annotations = toAnnotations([makeFinding("SEC001")]);
    expect(annotations[0]!.message).toContain("test");
  });

  it("includes title with rule ID", () => {
    const annotations = toAnnotations([makeFinding("SEC001")]);
    expect(annotations[0]!.title).toContain("SEC001");
  });
});

describe("formatAnnotations", () => {
  it("formats as GitHub Actions commands", () => {
    const annotations = toAnnotations([makeFinding("SEC001", "critical")]);
    const output = formatAnnotations(annotations);
    expect(output).toContain("::error");
    expect(output).toContain("file=src/app.ts");
    expect(output).toContain("line=10");
  });

  it("formats warning level", () => {
    const annotations = toAnnotations([makeFinding("CFG001", "medium")]);
    const output = formatAnnotations(annotations);
    expect(output).toContain("::warning");
  });

  it("formats notice level", () => {
    const annotations = toAnnotations([makeFinding("CQ001", "info")]);
    const output = formatAnnotations(annotations);
    expect(output).toContain("::notice");
  });

  it("handles multiple annotations", () => {
    const annotations = toAnnotations([
      makeFinding("SEC001", "critical", "a.ts", 5),
      makeFinding("SEC002", "high", "b.ts", 15),
    ]);
    const output = formatAnnotations(annotations);
    expect(output.split("\n")).toHaveLength(2);
  });
});

describe("toReviewComments", () => {
  it("converts findings to review comments", () => {
    const comments = toReviewComments([makeFinding("SEC001")]);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.path).toBe("src/app.ts");
    expect(comments[0]!.line).toBe(10);
    expect(comments[0]!.side).toBe("RIGHT");
  });

  it("includes severity emoji", () => {
    const critical = toReviewComments([makeFinding("SEC001", "critical")]);
    expect(critical[0]!.body).toContain(":no_entry:");

    const high = toReviewComments([makeFinding("SEC001", "high")]);
    expect(high[0]!.body).toContain(":red_circle:");
  });

  it("includes code block for snippet", () => {
    const comments = toReviewComments([makeFinding("SEC001")]);
    expect(comments[0]!.body).toContain("```");
  });

  it("includes fix suggestion when available", () => {
    const comments = toReviewComments([makeFinding("SEC001")]);
    expect(comments[0]!.body).toContain("**Fix:**");
  });

  it("skips findings without line numbers", () => {
    const finding: Finding = {
      ruleId: "BR002",
      ruleName: "Many Files",
      severity: "medium",
      message: "test",
      file: "(global)",
      category: "blast-radius",
    };
    expect(toReviewComments([finding])).toHaveLength(0);
  });
});

describe("formatReviewBody", () => {
  it("includes header", () => {
    const output = formatReviewBody([], "SAFE (0)");
    expect(output).toContain("## diffgate Review");
  });

  it("shows clean message when no comments", () => {
    const output = formatReviewBody([], "SAFE (0)");
    expect(output).toContain("No inline findings");
  });

  it("shows comment count", () => {
    const comments = toReviewComments([makeFinding("SEC001")]);
    const output = formatReviewBody(comments, "WARNING (25)");
    expect(output).toContain("1 inline issue");
  });

  it("includes score summary", () => {
    const output = formatReviewBody([], "DANGER (75)");
    expect(output).toContain("DANGER (75)");
  });
});
