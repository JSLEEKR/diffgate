import type { ParsedDiff, FileDiff } from "./types.js";
import { classifyFile } from "./parser.js";

/** File-level statistics */
export interface FileStats {
  path: string;
  additions: number;
  deletions: number;
  total: number;
  category: string;
  status: string;
  churn: number; // additions + deletions, measures volatility
}

/** Overall diff statistics */
export interface DiffStats {
  files: FileStats[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  totalChurn: number;
  byCategory: Record<string, CategoryStats>;
  byStatus: Record<string, number>;
  largestFile: FileStats | null;
  averageChurn: number;
}

/** Per-category statistics */
export interface CategoryStats {
  fileCount: number;
  additions: number;
  deletions: number;
  churn: number;
}

/**
 * Calculate detailed statistics from a parsed diff
 */
export function calculateStats(diff: ParsedDiff): DiffStats {
  const files: FileStats[] = diff.files.map((f) => ({
    path: f.newPath,
    additions: f.additions,
    deletions: f.deletions,
    total: f.additions + f.deletions,
    category: classifyFile(f.newPath),
    status: f.status,
    churn: f.additions + f.deletions,
  }));

  const byCategory: Record<string, CategoryStats> = {};
  const byStatus: Record<string, number> = {};

  for (const file of files) {
    // Category aggregation
    if (!byCategory[file.category]) {
      byCategory[file.category] = {
        fileCount: 0,
        additions: 0,
        deletions: 0,
        churn: 0,
      };
    }
    const cat = byCategory[file.category]!;
    cat.fileCount++;
    cat.additions += file.additions;
    cat.deletions += file.deletions;
    cat.churn += file.churn;

    // Status aggregation
    byStatus[file.status] = (byStatus[file.status] ?? 0) + 1;
  }

  const totalChurn = files.reduce((sum, f) => sum + f.churn, 0);
  const largestFile =
    files.length > 0
      ? files.reduce((max, f) => (f.churn > max.churn ? f : max))
      : null;

  return {
    files,
    totalFiles: files.length,
    totalAdditions: diff.totalAdditions,
    totalDeletions: diff.totalDeletions,
    totalChurn,
    byCategory,
    byStatus,
    largestFile,
    averageChurn: files.length > 0 ? totalChurn / files.length : 0,
  };
}

/**
 * Format statistics as a text summary
 */
export function formatStats(stats: DiffStats): string {
  const lines: string[] = [];

  lines.push(
    `${stats.totalFiles} files changed, ${stats.totalAdditions} insertions(+), ${stats.totalDeletions} deletions(-), churn: ${stats.totalChurn}`
  );
  lines.push("");

  // By category
  lines.push("By category:");
  for (const [cat, s] of Object.entries(stats.byCategory).sort(
    (a, b) => b[1].churn - a[1].churn
  )) {
    lines.push(
      `  ${cat}: ${s.fileCount} files, +${s.additions} -${s.deletions}`
    );
  }
  lines.push("");

  // Top files by churn
  const topFiles = [...stats.files].sort((a, b) => b.churn - a.churn).slice(0, 5);
  if (topFiles.length > 0) {
    lines.push("Top files by churn:");
    for (const f of topFiles) {
      lines.push(`  ${f.path}: +${f.additions} -${f.deletions} (${f.churn})`);
    }
  }

  return lines.join("\n");
}
