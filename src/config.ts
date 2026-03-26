import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DiffGateConfig } from "./types.js";

const CONFIG_FILES = [
  ".diffgaterc",
  ".diffgaterc.json",
  ".diffgate.json",
  "diffgate.config.json",
];

/**
 * Load config from file, searching up the directory tree
 */
export function loadConfig(startDir?: string): DiffGateConfig | null {
  const dir = startDir ?? process.cwd();
  return searchConfig(dir);
}

function searchConfig(dir: string): DiffGateConfig | null {
  for (const name of CONFIG_FILES) {
    const filePath = join(dir, name);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        return parseConfig(content);
      } catch {
        return null;
      }
    }
  }

  // Check parent directory
  const parent = resolve(dir, "..");
  if (parent !== dir) {
    return searchConfig(parent);
  }

  return null;
}

/**
 * Parse config JSON string
 */
export function parseConfig(content: string): DiffGateConfig {
  const raw = JSON.parse(content) as Record<string, unknown>;
  const config: DiffGateConfig = {};

  if (Array.isArray(raw["rules"])) {
    config.rules = raw["rules"] as string[];
  }
  if (Array.isArray(raw["excludeRules"])) {
    config.excludeRules = raw["excludeRules"] as string[];
  }
  if (Array.isArray(raw["excludeFiles"])) {
    config.excludeFiles = raw["excludeFiles"] as string[];
  }
  if (typeof raw["severityThreshold"] === "string") {
    config.severityThreshold = raw["severityThreshold"] as DiffGateConfig["severityThreshold"];
  }
  if (typeof raw["maxScore"] === "number") {
    config.maxScore = raw["maxScore"];
  }

  return config;
}

/**
 * Merge two configs (cli overrides file)
 */
export function mergeConfigs(
  fileConfig: DiffGateConfig,
  cliConfig: DiffGateConfig
): DiffGateConfig {
  return {
    rules: cliConfig.rules ?? fileConfig.rules,
    excludeRules: mergeArrays(fileConfig.excludeRules, cliConfig.excludeRules),
    excludeFiles: mergeArrays(fileConfig.excludeFiles, cliConfig.excludeFiles),
    severityThreshold:
      cliConfig.severityThreshold ?? fileConfig.severityThreshold,
    maxScore: cliConfig.maxScore ?? fileConfig.maxScore,
    customRules: [
      ...(fileConfig.customRules ?? []),
      ...(cliConfig.customRules ?? []),
    ],
  };
}

function mergeArrays(
  a: string[] | undefined,
  b: string[] | undefined
): string[] | undefined {
  if (!a && !b) return undefined;
  return [...(a ?? []), ...(b ?? [])];
}
