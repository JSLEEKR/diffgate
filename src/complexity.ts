import type { FileDiff, DiffHunk } from "./types.js";

/** Complexity assessment for a file diff */
export interface FileComplexity {
  file: string;
  hunkCount: number;
  hunkSpread: number; // max line distance between hunks
  interleaveRatio: number; // add/remove interleaving
  uniqueOperations: number; // distinct change patterns
  score: number;
  level: "trivial" | "simple" | "moderate" | "complex" | "very-complex";
}

/**
 * Assess the complexity of changes in a file diff
 */
export function assessComplexity(file: FileDiff): FileComplexity {
  const hunkCount = file.hunks.length;
  const hunkSpread = calculateHunkSpread(file.hunks);
  const interleaveRatio = calculateInterleave(file.hunks);
  const uniqueOperations = countUniqueOperations(file);

  // Score: weighted combination
  let score = 0;
  score += Math.min(hunkCount * 5, 30); // max 30 from hunks
  score += Math.min(hunkSpread / 20, 25); // max 25 from spread
  score += interleaveRatio * 25; // max 25 from interleaving
  score += Math.min(uniqueOperations * 5, 20); // max 20 from operations
  score = Math.round(score);

  let level: FileComplexity["level"];
  if (score >= 80) level = "very-complex";
  else if (score >= 60) level = "complex";
  else if (score >= 35) level = "moderate";
  else if (score >= 15) level = "simple";
  else level = "trivial";

  return {
    file: file.newPath,
    hunkCount,
    hunkSpread,
    interleaveRatio: Math.round(interleaveRatio * 100) / 100,
    uniqueOperations,
    score,
    level,
  };
}

/**
 * Calculate the spread (line distance) between hunks
 */
function calculateHunkSpread(hunks: DiffHunk[]): number {
  if (hunks.length <= 1) return 0;

  let maxSpread = 0;
  for (let i = 1; i < hunks.length; i++) {
    const prevEnd = hunks[i - 1]!.newStart + hunks[i - 1]!.newCount;
    const currStart = hunks[i]!.newStart;
    const spread = currStart - prevEnd;
    if (spread > maxSpread) maxSpread = spread;
  }

  return maxSpread;
}

/**
 * Calculate interleaving ratio (how mixed add/remove operations are)
 * Higher = more complex edits (refactoring), Lower = simple additions
 */
function calculateInterleave(hunks: DiffHunk[]): number {
  let transitions = 0;
  let total = 0;

  for (const hunk of hunks) {
    let lastType: string | null = null;
    for (const line of hunk.lines) {
      if (line.type === "context") continue;
      total++;
      if (lastType && lastType !== line.type) {
        transitions++;
      }
      lastType = line.type;
    }
  }

  return total > 1 ? transitions / (total - 1) : 0;
}

/**
 * Count unique operation patterns in the diff
 */
function countUniqueOperations(file: FileDiff): number {
  const ops = new Set<string>();

  for (const hunk of file.hunks) {
    let hasAdd = false;
    let hasRemove = false;

    for (const line of hunk.lines) {
      if (line.type === "add") hasAdd = true;
      if (line.type === "remove") hasRemove = true;
    }

    if (hasAdd && hasRemove) ops.add("modify");
    else if (hasAdd) ops.add("add");
    else if (hasRemove) ops.add("remove");
  }

  // Check for specific patterns
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type !== "add") continue;
      if (/import\s/.test(line.content)) ops.add("import");
      if (/export\s/.test(line.content)) ops.add("export");
      if (/function\s|const\s.*=>|class\s/.test(line.content)) ops.add("definition");
    }
  }

  return ops.size;
}

/**
 * Assess complexity for all files in a diff
 */
export function assessAllComplexity(
  files: FileDiff[]
): FileComplexity[] {
  return files
    .map(assessComplexity)
    .sort((a, b) => b.score - a.score);
}
