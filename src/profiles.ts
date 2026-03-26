import type { DiffGateConfig, Severity } from "./types.js";

/** Named profile for common use cases */
export interface Profile {
  name: string;
  description: string;
  config: DiffGateConfig;
}

/** Built-in profiles */
export const profiles: Record<string, Profile> = {
  strict: {
    name: "strict",
    description: "Maximum security — all rules, critical threshold",
    config: {
      maxScore: 25,
      severityThreshold: "low",
    },
  },
  security: {
    name: "security",
    description: "Security-focused — only security and config rules",
    config: {
      rules: [
        "SEC001", "SEC002", "SEC003", "SEC004",
        "SEC005", "SEC006", "SEC007", "SEC008", "SEC009", "SEC010",
        "CFG003",
      ],
      maxScore: 50,
    },
  },
  relaxed: {
    name: "relaxed",
    description: "Relaxed — only critical findings, high threshold",
    config: {
      severityThreshold: "high",
      maxScore: 100,
      excludeRules: ["CQ001", "CQ002", "DEP002", "SEC009"],
    },
  },
  ci: {
    name: "ci",
    description: "CI pipeline — balanced for automated checks",
    config: {
      severityThreshold: "medium",
      maxScore: 60,
      excludeRules: ["CQ001"],
    },
  },
  review: {
    name: "review",
    description: "Code review — all findings visible, no gate",
    config: {
      severityThreshold: "info",
    },
  },
};

/**
 * Get a profile by name
 */
export function getProfile(name: string): Profile | null {
  return profiles[name] ?? null;
}

/**
 * List all available profiles
 */
export function listProfiles(): Profile[] {
  return Object.values(profiles);
}

/**
 * Apply a profile, merging with optional overrides
 */
export function applyProfile(
  profileName: string,
  overrides?: DiffGateConfig
): DiffGateConfig {
  const profile = getProfile(profileName);
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`);
  }

  if (!overrides) return { ...profile.config };

  return {
    rules: overrides.rules ?? profile.config.rules,
    excludeRules: [
      ...(profile.config.excludeRules ?? []),
      ...(overrides.excludeRules ?? []),
    ],
    excludeFiles: [
      ...(profile.config.excludeFiles ?? []),
      ...(overrides.excludeFiles ?? []),
    ],
    severityThreshold:
      overrides.severityThreshold ?? profile.config.severityThreshold,
    maxScore: overrides.maxScore ?? profile.config.maxScore,
    customRules: overrides.customRules,
  };
}

/**
 * Severity override map (rule ID -> new severity)
 */
export type SeverityOverrides = Record<string, Severity>;

/**
 * Apply severity overrides to findings
 */
export function applySeverityOverrides(
  findings: Array<{ ruleId: string; severity: Severity }>,
  overrides: SeverityOverrides
): void {
  for (const finding of findings) {
    if (overrides[finding.ruleId]) {
      finding.severity = overrides[finding.ruleId]!;
    }
  }
}
