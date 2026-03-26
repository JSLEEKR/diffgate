import { matchGlob } from "./glob.js";
import type { ParsedDiff } from "./types.js";

/** Owner entry from CODEOWNERS */
export interface OwnerEntry {
  pattern: string;
  owners: string[];
}

/** Ownership analysis for a diff */
export interface OwnershipReport {
  fileOwners: Map<string, string[]>;
  affectedOwners: string[];
  ownerFileCount: Map<string, number>;
  unownedFiles: string[];
}

/**
 * Parse CODEOWNERS file content
 */
export function parseCodeowners(content: string): OwnerEntry[] {
  const entries: OwnerEntry[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const pattern = parts[0]!;
    const owners = parts.slice(1).filter((p) => p.startsWith("@") || p.includes("@"));

    if (owners.length > 0) {
      entries.push({ pattern, owners });
    }
  }

  return entries;
}

/**
 * Find owners for a specific file path
 */
export function findOwners(
  filePath: string,
  entries: OwnerEntry[]
): string[] {
  // Last matching entry wins (CODEOWNERS convention)
  let matchedOwners: string[] = [];

  for (const entry of entries) {
    let pattern = entry.pattern;

    // Handle leading / (root-relative)
    if (pattern.startsWith("/")) {
      pattern = pattern.slice(1);
    }

    // Handle directory patterns (ending with /)
    if (pattern.endsWith("/")) {
      if (filePath.startsWith(pattern) || filePath.includes("/" + pattern)) {
        matchedOwners = entry.owners;
      }
      continue;
    }

    // Handle glob patterns
    if (pattern.includes("*")) {
      if (matchGlob(filePath, pattern) || matchGlob(filePath, "**/" + pattern)) {
        matchedOwners = entry.owners;
      }
      continue;
    }

    // Exact match or directory prefix
    if (
      filePath === pattern ||
      filePath.startsWith(pattern + "/") ||
      filePath.endsWith("/" + pattern)
    ) {
      matchedOwners = entry.owners;
    }
  }

  return matchedOwners;
}

/**
 * Analyze ownership impact across a diff
 */
export function analyzeOwnership(
  diff: ParsedDiff,
  codeownersContent: string
): OwnershipReport {
  const entries = parseCodeowners(codeownersContent);
  const fileOwners = new Map<string, string[]>();
  const ownerFileCount = new Map<string, number>();
  const unownedFiles: string[] = [];

  for (const file of diff.files) {
    const owners = findOwners(file.newPath, entries);
    fileOwners.set(file.newPath, owners);

    if (owners.length === 0) {
      unownedFiles.push(file.newPath);
    } else {
      for (const owner of owners) {
        ownerFileCount.set(owner, (ownerFileCount.get(owner) ?? 0) + 1);
      }
    }
  }

  const affectedOwners = [...ownerFileCount.keys()].sort();

  return {
    fileOwners,
    affectedOwners,
    ownerFileCount,
    unownedFiles,
  };
}
