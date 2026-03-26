import { createHash } from "node:crypto";
import type { ParsedDiff, FileDiff, Finding } from "./types.js";

/** Fingerprint for a diff */
export interface DiffFingerprint {
  hash: string;
  fileHashes: Map<string, string>;
  findingHash: string;
}

/**
 * Create a content hash
 */
function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Generate a fingerprint for a parsed diff
 */
export function fingerprintDiff(diff: ParsedDiff): DiffFingerprint {
  const fileHashes = new Map<string, string>();

  for (const file of diff.files) {
    const content = serializeFileDiff(file);
    fileHashes.set(file.newPath, hash(content));
  }

  // Overall hash is hash of all file hashes
  const allHashes = [...fileHashes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, h]) => `${path}:${h}`)
    .join("\n");

  return {
    hash: hash(allHashes),
    fileHashes,
    findingHash: "", // Set after analysis
  };
}

/**
 * Generate a fingerprint for findings
 */
export function fingerprintFindings(findings: Finding[]): string {
  const content = findings
    .map((f) => `${f.ruleId}:${f.file}:${f.line ?? ""}:${f.severity}`)
    .sort()
    .join("\n");
  return hash(content);
}

/**
 * Check if two diffs are identical (same changes)
 */
export function diffsEqual(a: DiffFingerprint, b: DiffFingerprint): boolean {
  return a.hash === b.hash;
}

/**
 * Find files that changed between two fingerprints
 */
export function changedFiles(
  before: DiffFingerprint,
  after: DiffFingerprint
): { added: string[]; removed: string[]; modified: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Find added and modified
  for (const [path, h] of after.fileHashes) {
    const beforeHash = before.fileHashes.get(path);
    if (!beforeHash) {
      added.push(path);
    } else if (beforeHash !== h) {
      modified.push(path);
    }
  }

  // Find removed
  for (const path of before.fileHashes.keys()) {
    if (!after.fileHashes.has(path)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
}

/**
 * Serialize a file diff for hashing
 */
function serializeFileDiff(file: FileDiff): string {
  const parts = [
    file.oldPath,
    file.newPath,
    file.status,
    String(file.isBinary),
  ];

  for (const hunk of file.hunks) {
    parts.push(
      `@@ ${hunk.oldStart},${hunk.oldCount} ${hunk.newStart},${hunk.newCount}`
    );
    for (const line of hunk.lines) {
      const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
      parts.push(`${prefix}${line.content}`);
    }
  }

  return parts.join("\n");
}
