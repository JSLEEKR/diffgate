import type { ParsedDiff, FileDiff, DiffHunk, DiffLine } from "./types.js";

const FILE_HEADER_RE = /^diff --git a\/(.+?) b\/(.+?)$/;
const OLD_FILE_RE = /^--- (?:a\/)?(.+)$/;
const NEW_FILE_RE = /^\+\+\+ (?:b\/)?(.+)$/;
const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const BINARY_RE = /^Binary files/;
const NEW_FILE_MODE_RE = /^new file mode/;
const DELETED_FILE_MODE_RE = /^deleted file mode/;
const RENAME_FROM_RE = /^rename from (.+)$/;
const RENAME_TO_RE = /^rename to (.+)$/;
const SIMILARITY_RE = /^similarity index/;

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(input: string): ParsedDiff {
  const lines = input.split("\n");
  const files: FileDiff[] = [];
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  let isNewFile = false;
  let isDeletedFile = false;
  let isRenamed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // File header
    const fileMatch = FILE_HEADER_RE.exec(line);
    if (fileMatch) {
      if (currentFile) {
        files.push(currentFile);
      }
      isNewFile = false;
      isDeletedFile = false;
      isRenamed = false;
      currentFile = {
        oldPath: fileMatch[1]!,
        newPath: fileMatch[2]!,
        status: "modified",
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // New/deleted file markers
    if (NEW_FILE_MODE_RE.test(line)) {
      isNewFile = true;
      continue;
    }
    if (DELETED_FILE_MODE_RE.test(line)) {
      isDeletedFile = true;
      continue;
    }
    if (SIMILARITY_RE.test(line)) {
      isRenamed = true;
      continue;
    }
    if (RENAME_FROM_RE.test(line) || RENAME_TO_RE.test(line)) {
      isRenamed = true;
      continue;
    }

    // Binary files
    if (BINARY_RE.test(line)) {
      currentFile.isBinary = true;
      continue;
    }

    // Old file path
    const oldMatch = OLD_FILE_RE.exec(line);
    if (oldMatch) {
      if (oldMatch[1] === "/dev/null") {
        isNewFile = true;
      }
      continue;
    }

    // New file path
    const newMatch = NEW_FILE_RE.exec(line);
    if (newMatch) {
      if (newMatch[1] === "/dev/null") {
        isDeletedFile = true;
      }
      // Determine file status
      if (isNewFile) currentFile.status = "added";
      else if (isDeletedFile) currentFile.status = "deleted";
      else if (isRenamed) currentFile.status = "renamed";
      continue;
    }

    // Hunk header
    const hunkMatch = HUNK_HEADER_RE.exec(line);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]!, 10);
      newLine = parseInt(hunkMatch[3]!, 10);
      currentHunk = {
        oldStart: oldLine,
        oldCount: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: newLine,
        newCount: parseInt(hunkMatch[4] ?? "1", 10),
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    // Diff lines
    if (line.startsWith("+")) {
      const diffLine: DiffLine = {
        type: "add",
        content: line.substring(1),
        newLineNumber: newLine,
      };
      currentHunk.lines.push(diffLine);
      currentFile.additions++;
      newLine++;
    } else if (line.startsWith("-")) {
      const diffLine: DiffLine = {
        type: "remove",
        content: line.substring(1),
        oldLineNumber: oldLine,
      };
      currentHunk.lines.push(diffLine);
      currentFile.deletions++;
      oldLine++;
    } else if (line.startsWith(" ")) {
      const diffLine: DiffLine = {
        type: "context",
        content: line.substring(1),
        oldLineNumber: oldLine,
        newLineNumber: newLine,
      };
      currentHunk.lines.push(diffLine);
      oldLine++;
      newLine++;
    }
    // Skip "\ No newline at end of file" and other markers
  }

  if (currentFile) {
    files.push(currentFile);
  }

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return { files, totalAdditions, totalDeletions };
}

/**
 * Classify a file path into a category
 */
export function classifyFile(filePath: string): string {
  const lower = filePath.toLowerCase();
  const basename = lower.split("/").pop() ?? lower;

  // CI/CD (check before config, since CI files often end in .yml)
  if (
    lower.includes(".github/") ||
    lower.includes(".gitlab-ci") ||
    basename === "jenkinsfile" ||
    lower.includes(".circleci") ||
    lower.includes(".travis")
  ) {
    return "ci-cd";
  }

  // Infrastructure (check before config, since infra files can end in .yml)
  if (
    basename === "dockerfile" ||
    basename.startsWith("docker-compose") ||
    lower.includes("terraform") ||
    lower.includes("kubernetes") ||
    lower.includes("k8s") ||
    lower.endsWith(".tf") ||
    lower.endsWith(".hcl")
  ) {
    return "infrastructure";
  }

  // Dependencies (check before config, since package.json ends in .json)
  if (
    basename === "package.json" ||
    basename === "package-lock.json" ||
    basename === "yarn.lock" ||
    basename === "go.mod" ||
    basename === "go.sum" ||
    basename === "requirements.txt" ||
    basename === "poetry.lock" ||
    basename === "cargo.lock" ||
    basename === "cargo.toml" ||
    basename === "gemfile" ||
    basename === "gemfile.lock"
  ) {
    return "dependencies";
  }

  // Database/migrations
  if (
    lower.includes("migration") ||
    lower.includes("schema") ||
    lower.endsWith(".sql")
  ) {
    return "database";
  }

  // Tests
  if (
    lower.includes("test") ||
    lower.includes("spec") ||
    lower.includes("__tests__")
  ) {
    return "test";
  }

  // Security-related
  if (
    lower.includes("auth") ||
    lower.includes("security") ||
    lower.includes("permission") ||
    lower.includes("role") ||
    lower.includes("crypto") ||
    lower.includes("cert")
  ) {
    return "security";
  }

  // Documentation
  if (
    lower.endsWith(".md") ||
    lower.endsWith(".rst") ||
    lower.endsWith(".txt") ||
    lower.includes("docs/")
  ) {
    return "documentation";
  }

  // Config files (general catch-all for config-like files)
  if (
    lower.endsWith(".json") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".toml") ||
    lower.endsWith(".ini") ||
    /\.env(\.|$)/.test(basename) ||
    lower.includes("config")
  ) {
    return "config";
  }

  return "source";
}
