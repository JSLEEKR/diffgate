import { describe, it, expect } from "vitest";
import {
  parseCodeowners,
  findOwners,
  analyzeOwnership,
} from "../src/ownership.js";
import { parseDiff } from "../src/parser.js";

const SAMPLE_CODEOWNERS = `# Global owners
* @global-owner

# Frontend
src/frontend/ @frontend-team
*.tsx @frontend-team @ui-reviewer

# Backend
src/api/ @backend-team
src/db/ @dba-team @backend-team

# Infrastructure
*.tf @infra-team
Dockerfile @infra-team

# Docs
docs/ @docs-team
`;

describe("parseCodeowners", () => {
  it("parses entries with single owner", () => {
    const entries = parseCodeowners("*.ts @typescript-team");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.pattern).toBe("*.ts");
    expect(entries[0]!.owners).toEqual(["@typescript-team"]);
  });

  it("parses entries with multiple owners", () => {
    const entries = parseCodeowners("src/api/ @backend @lead");
    expect(entries[0]!.owners).toEqual(["@backend", "@lead"]);
  });

  it("skips comments", () => {
    const entries = parseCodeowners("# comment\n*.ts @team");
    expect(entries).toHaveLength(1);
  });

  it("skips empty lines", () => {
    const entries = parseCodeowners("\n\n*.ts @team\n\n");
    expect(entries).toHaveLength(1);
  });

  it("parses full CODEOWNERS file", () => {
    const entries = parseCodeowners(SAMPLE_CODEOWNERS);
    expect(entries.length).toBeGreaterThan(3);
  });

  it("handles email owners", () => {
    const entries = parseCodeowners("*.ts user@example.com");
    expect(entries[0]!.owners).toEqual(["user@example.com"]);
  });
});

describe("findOwners", () => {
  const entries = parseCodeowners(SAMPLE_CODEOWNERS);

  it("matches wildcard global owner", () => {
    const owners = findOwners("random-file.txt", entries);
    // Should match * @global-owner at minimum
    expect(owners.length).toBeGreaterThan(0);
  });

  it("matches directory pattern", () => {
    const owners = findOwners("src/frontend/app.tsx", entries);
    // Frontend dir + tsx pattern should match
    expect(owners).toContain("@frontend-team");
  });

  it("matches glob pattern", () => {
    const owners = findOwners("src/components/Button.tsx", entries);
    expect(owners).toContain("@frontend-team");
  });

  it("last match wins", () => {
    // src/db/ should match @dba-team @backend-team, not just @global-owner
    const owners = findOwners("src/db/schema.sql", entries);
    expect(owners).toContain("@dba-team");
  });

  it("matches terraform files", () => {
    const owners = findOwners("infra/main.tf", entries);
    expect(owners).toContain("@infra-team");
  });
});

describe("analyzeOwnership", () => {
  const diff = parseDiff(`diff --git a/src/frontend/app.tsx b/src/frontend/app.tsx
--- a/src/frontend/app.tsx
+++ b/src/frontend/app.tsx
@@ -1 +1,2 @@
 export default App;
+// updated
diff --git a/src/api/routes.ts b/src/api/routes.ts
--- a/src/api/routes.ts
+++ b/src/api/routes.ts
@@ -1 +1,2 @@
 export const routes = [];
+// updated
diff --git a/unknown.xyz b/unknown.xyz
--- a/unknown.xyz
+++ b/unknown.xyz
@@ -1 +1,2 @@
 data
+more data
`);

  it("maps files to owners", () => {
    const report = analyzeOwnership(diff, SAMPLE_CODEOWNERS);
    expect(report.fileOwners.size).toBe(3);
  });

  it("lists affected owners", () => {
    const report = analyzeOwnership(diff, SAMPLE_CODEOWNERS);
    expect(report.affectedOwners.length).toBeGreaterThan(0);
  });

  it("counts files per owner", () => {
    const report = analyzeOwnership(diff, SAMPLE_CODEOWNERS);
    expect(report.ownerFileCount.size).toBeGreaterThan(0);
  });

  it("identifies unowned files when no CODEOWNERS", () => {
    const report = analyzeOwnership(diff, "");
    expect(report.unownedFiles).toHaveLength(3);
  });

  it("handles empty diff", () => {
    const emptyDiff = parseDiff("");
    const report = analyzeOwnership(emptyDiff, SAMPLE_CODEOWNERS);
    expect(report.fileOwners.size).toBe(0);
    expect(report.affectedOwners).toHaveLength(0);
  });
});
