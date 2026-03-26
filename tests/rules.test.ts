import { describe, it, expect } from "vitest";
import { parseDiff } from "../src/parser.js";
import { builtinRules, getRules } from "../src/rules.js";
import type { FileDiff, ParsedDiff } from "../src/types.js";

function makeSingleFileDiff(path: string, addedLines: string[]): ParsedDiff {
  const additions = addedLines
    .map((l) => `+${l}`)
    .join("\n");
  const diff = `diff --git a/${path} b/${path}
--- a/${path}
+++ b/${path}
@@ -1,1 +1,${addedLines.length + 1} @@
 existing line
${additions}
`;
  return parseDiff(diff);
}

function findRule(id: string) {
  return builtinRules.find((r) => r.id === id)!;
}

describe("Security Rules", () => {
  describe("SEC001 - Hardcoded Secrets", () => {
    it("detects API key assignment", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        'const api_key = "sk-abc123456789";',
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("critical");
    });

    it("detects password assignment", () => {
      const diff = makeSingleFileDiff("src/db.ts", [
        'const password = "supersecret";',
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects AWS keys", () => {
      const diff = makeSingleFileDiff("src/aws.ts", [
        "const key = AKIAIOSFODNN7EXAMPLE;",
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects private key headers", () => {
      const diff = makeSingleFileDiff("certs/key.pem", [
        "-----BEGIN RSA PRIVATE KEY-----",
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects GitHub tokens", () => {
      const diff = makeSingleFileDiff("src/gh.ts", [
        'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";',
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("ignores normal code", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        'const name = "hello";',
        "const count = 42;",
      ]);
      const findings = findRule("SEC001").check(diff.files[0]!, diff);
      expect(findings).toHaveLength(0);
    });
  });

  describe("SEC002 - Dangerous Functions", () => {
    it("detects eval()", () => {
      const diff = makeSingleFileDiff("src/app.js", [
        'eval("alert(1)");',
      ]);
      const findings = findRule("SEC002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects innerHTML", () => {
      const diff = makeSingleFileDiff("src/ui.js", [
        'element.innerHTML = userInput;',
      ]);
      const findings = findRule("SEC002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects dangerouslySetInnerHTML", () => {
      const diff = makeSingleFileDiff("src/component.tsx", [
        "dangerouslySetInnerHTML={{ __html: content }}",
      ]);
      const findings = findRule("SEC002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects os.system", () => {
      const diff = makeSingleFileDiff("src/util.py", [
        'os.system("rm -rf /")',
      ]);
      const findings = findRule("SEC002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects document.write", () => {
      const diff = makeSingleFileDiff("src/app.js", [
        'document.write("<h1>hello</h1>");',
      ]);
      const findings = findRule("SEC002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("SEC003 - SQL Injection", () => {
    it("detects string concatenation in SQL", () => {
      const diff = makeSingleFileDiff("src/db.ts", [
        'const query = "SELECT * FROM users WHERE id=" + userId;',
      ]);
      const findings = findRule("SEC003").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("critical");
    });

    it("detects f-string SQL injection", () => {
      const diff = makeSingleFileDiff("src/db.py", [
        'query = f"SELECT * FROM users WHERE id={user_id}"',
      ]);
      const findings = findRule("SEC003").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("SEC004 - Disabled Security", () => {
    it("detects verify=false", () => {
      const diff = makeSingleFileDiff("src/http.py", [
        "requests.get(url, verify=false)",
      ]);
      const findings = findRule("SEC004").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects NODE_TLS_REJECT_UNAUTHORIZED=0", () => {
      const diff = makeSingleFileDiff("src/app.js", [
        "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
      ]);
      const findings = findRule("SEC004").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects disabled CSRF", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        "disable_csrf = true;",
      ]);
      const findings = findRule("SEC004").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});

describe("Blast Radius Rules", () => {
  describe("BR001 - Large File Change", () => {
    it("detects files with >300 changes", () => {
      const lines = Array.from({ length: 301 }, (_, i) => `line ${i}`);
      const diff = makeSingleFileDiff("src/big.ts", lines);
      const findings = findRule("BR001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("high");
    });

    it("detects files with >100 changes as medium", () => {
      const lines = Array.from({ length: 101 }, (_, i) => `line ${i}`);
      const diff = makeSingleFileDiff("src/med.ts", lines);
      const findings = findRule("BR001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("medium");
    });

    it("ignores small files", () => {
      const diff = makeSingleFileDiff("src/small.ts", ["one line"]);
      const findings = findRule("BR001").check(diff.files[0]!, diff);
      expect(findings).toHaveLength(0);
    });
  });

  describe("BR002 - Many Files Changed", () => {
    it("detects >10 files", () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        oldPath: `src/file${i}.ts`,
        newPath: `src/file${i}.ts`,
        status: "modified" as const,
        hunks: [],
        additions: 1,
        deletions: 0,
        isBinary: false,
      }));
      const diff: ParsedDiff = { files, totalAdditions: 11, totalDeletions: 0 };
      const findings = findRule("BR002").check(files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("only reports on first file", () => {
      const files = Array.from({ length: 12 }, (_, i) => ({
        oldPath: `src/file${i}.ts`,
        newPath: `src/file${i}.ts`,
        status: "modified" as const,
        hunks: [],
        additions: 1,
        deletions: 0,
        isBinary: false,
      }));
      const diff: ParsedDiff = { files, totalAdditions: 12, totalDeletions: 0 };
      const findings = findRule("BR002").check(files[1]!, diff);
      expect(findings).toHaveLength(0);
    });
  });

  describe("BR003 - Cross-Category Change", () => {
    it("detects changes across 3+ categories", () => {
      const files: FileDiff[] = [
        { oldPath: "src/app.ts", newPath: "src/app.ts", status: "modified", hunks: [], additions: 1, deletions: 0, isBinary: false },
        { oldPath: "config.json", newPath: "config.json", status: "modified", hunks: [], additions: 1, deletions: 0, isBinary: false },
        { oldPath: "Dockerfile", newPath: "Dockerfile", status: "modified", hunks: [], additions: 1, deletions: 0, isBinary: false },
      ];
      const diff: ParsedDiff = { files, totalAdditions: 3, totalDeletions: 0 };
      const findings = findRule("BR003").check(files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});

describe("Config Rules", () => {
  describe("CFG001 - Configuration Change", () => {
    it("detects config file changes", () => {
      const diff = makeSingleFileDiff("config.json", ['{"key": "value"}']);
      const findings = findRule("CFG001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("CFG002 - Infrastructure Change", () => {
    it("detects Dockerfile changes", () => {
      const diff = makeSingleFileDiff("Dockerfile", ["FROM node:18"]);
      const findings = findRule("CFG002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("high");
    });

    it("detects terraform changes", () => {
      const diff = makeSingleFileDiff("main.tf", ['resource "aws_instance" "web" {']);
      const findings = findRule("CFG002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("CFG003 - Env File Exposed", () => {
    it("detects .env file", () => {
      const diff = makeSingleFileDiff(".env", ["DB_PASSWORD=secret"]);
      const findings = findRule("CFG003").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("critical");
    });

    it("detects .env.production", () => {
      const diff = makeSingleFileDiff(".env.production", ["API_KEY=abc"]);
      const findings = findRule("CFG003").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("ignores .env.example", () => {
      const diff = makeSingleFileDiff(".env.example", ["API_KEY="]);
      const findings = findRule("CFG003").check(diff.files[0]!, diff);
      expect(findings).toHaveLength(0);
    });

    it("ignores .env.template", () => {
      const diff = makeSingleFileDiff(".env.template", ["API_KEY="]);
      const findings = findRule("CFG003").check(diff.files[0]!, diff);
      expect(findings).toHaveLength(0);
    });
  });
});

describe("Code Quality Rules", () => {
  describe("CQ001 - TODO/FIXME", () => {
    it("detects TODO comments", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        "// TODO: fix this later",
      ]);
      const findings = findRule("CQ001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("info");
    });

    it("detects FIXME comments", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        "// FIXME: broken logic",
      ]);
      const findings = findRule("CQ001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("CQ002 - Debug Code", () => {
    it("detects console.log", () => {
      const diff = makeSingleFileDiff("src/app.ts", [
        'console.log("debug");',
      ]);
      const findings = findRule("CQ002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects debugger statement", () => {
      const diff = makeSingleFileDiff("src/app.ts", ["debugger;"]);
      const findings = findRule("CQ002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("CQ003 - Tests Deleted", () => {
    it("detects deleted test files", () => {
      const diff = parseDiff(`diff --git a/tests/app.test.ts b/tests/app.test.ts
deleted file mode 100644
--- a/tests/app.test.ts
+++ /dev/null
@@ -1,5 +0,0 @@
-import { test } from "vitest";
-test("works", () => {
-  expect(true).toBe(true);
-});
-// end
`);
      const findings = findRule("CQ003").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("high");
    });
  });
});

describe("Database Rules", () => {
  describe("DB001 - Database Migration", () => {
    it("detects migration files", () => {
      const diff = makeSingleFileDiff("migrations/001_create_users.sql", [
        "CREATE TABLE users (id INT);",
      ]);
      const findings = findRule("DB001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("DB002 - Destructive SQL", () => {
    it("detects DROP TABLE", () => {
      const diff = makeSingleFileDiff("migrations/002.sql", [
        "DROP TABLE users;",
      ]);
      const findings = findRule("DB002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.severity).toBe("critical");
    });

    it("detects TRUNCATE", () => {
      const diff = makeSingleFileDiff("script.sql", [
        "TRUNCATE TABLE sessions;",
      ]);
      const findings = findRule("DB002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("detects DELETE without WHERE", () => {
      const diff = makeSingleFileDiff("script.sql", [
        "DELETE FROM users;",
      ]);
      const findings = findRule("DB002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });
});

describe("Dependency Rules", () => {
  describe("DEP001 - Dependency Change", () => {
    it("detects package.json changes", () => {
      const diff = makeSingleFileDiff("package.json", [
        '"express": "^4.18.0"',
      ]);
      const findings = findRule("DEP001").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe("DEP002 - Lockfile Without Manifest", () => {
    it("detects lockfile change without manifest", () => {
      const diff = makeSingleFileDiff("package-lock.json", [
        '"resolved": "https://registry..."',
      ]);
      const findings = findRule("DEP002").check(diff.files[0]!, diff);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("allows lockfile change with manifest", () => {
      const lockDiff = makeSingleFileDiff("package-lock.json", [
        '"resolved": "https://registry..."',
      ]);
      // Add a package.json file to the diff
      lockDiff.files.push({
        oldPath: "package.json",
        newPath: "package.json",
        status: "modified",
        hunks: [],
        additions: 1,
        deletions: 0,
        isBinary: false,
      });
      const findings = findRule("DEP002").check(lockDiff.files[0]!, lockDiff);
      expect(findings).toHaveLength(0);
    });
  });
});

describe("getRules", () => {
  it("returns all builtin rules by default", () => {
    const rules = getRules();
    expect(rules.length).toBe(builtinRules.length);
  });

  it("filters to specific rules", () => {
    const rules = getRules({ rules: ["SEC001", "SEC002"] });
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.id)).toContain("SEC001");
  });

  it("excludes specific rules", () => {
    const rules = getRules({ excludeRules: ["SEC001"] });
    expect(rules.find((r) => r.id === "SEC001")).toBeUndefined();
    expect(rules.length).toBe(builtinRules.length - 1);
  });

  it("adds custom rules", () => {
    const custom = {
      id: "CUSTOM001",
      name: "Custom",
      category: "custom",
      severity: "low" as const,
      description: "test",
      check: () => [],
    };
    const rules = getRules({ customRules: [custom] });
    expect(rules.find((r) => r.id === "CUSTOM001")).toBeDefined();
  });
});
