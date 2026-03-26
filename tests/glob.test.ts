import { describe, it, expect } from "vitest";
import { globToRegex, matchGlob, matchAny } from "../src/glob.js";

describe("globToRegex", () => {
  it("matches exact string", () => {
    const re = globToRegex("hello.txt");
    expect(re.test("hello.txt")).toBe(true);
    expect(re.test("other.txt")).toBe(false);
  });

  it("matches * wildcard", () => {
    const re = globToRegex("*.ts");
    expect(re.test("app.ts")).toBe(true);
    expect(re.test("test.ts")).toBe(true);
    expect(re.test("app.js")).toBe(false);
  });

  it("* does not match path separators", () => {
    const re = globToRegex("*.ts");
    expect(re.test("src/app.ts")).toBe(false);
  });

  it("matches ** for any depth", () => {
    const re = globToRegex("**/*.ts");
    expect(re.test("app.ts")).toBe(true);
    expect(re.test("src/app.ts")).toBe(true);
    expect(re.test("src/deep/app.ts")).toBe(true);
  });

  it("matches ? for single char", () => {
    const re = globToRegex("file?.ts");
    expect(re.test("file1.ts")).toBe(true);
    expect(re.test("fileA.ts")).toBe(true);
    expect(re.test("file12.ts")).toBe(false);
  });

  it("matches {a,b} alternatives", () => {
    const re = globToRegex("*.{ts,js}");
    expect(re.test("app.ts")).toBe(true);
    expect(re.test("app.js")).toBe(true);
    expect(re.test("app.py")).toBe(false);
  });

  it("escapes dots", () => {
    const re = globToRegex("*.ts");
    expect(re.test("Xts")).toBe(false);
  });
});

describe("matchGlob", () => {
  it("matches simple patterns", () => {
    expect(matchGlob("src/app.ts", "src/*.ts")).toBe(true);
    expect(matchGlob("src/app.ts", "lib/*.ts")).toBe(false);
  });

  it("matches deep patterns", () => {
    expect(matchGlob("src/deep/app.ts", "src/**/*.ts")).toBe(true);
  });

  it("matches exact files", () => {
    expect(matchGlob("package.json", "package.json")).toBe(true);
  });
});

describe("matchAny", () => {
  it("matches if any pattern matches", () => {
    expect(matchAny("app.ts", ["*.ts", "*.js"])).toBe(true);
    expect(matchAny("app.py", ["*.ts", "*.js"])).toBe(false);
  });

  it("handles empty patterns", () => {
    expect(matchAny("app.ts", [])).toBe(false);
  });

  it("matches multiple patterns", () => {
    expect(
      matchAny("src/test.spec.ts", ["**/*.test.ts", "**/*.spec.ts"])
    ).toBe(true);
  });
});
