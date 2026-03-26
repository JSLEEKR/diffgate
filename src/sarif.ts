import type { AnalysisResult, Finding, Severity } from "./types.js";
import { builtinRules } from "./rules.js";

/**
 * SARIF (Static Analysis Results Interchange Format) output
 * Compatible with GitHub Code Scanning
 */

interface SarifLevel {
  level: "error" | "warning" | "note" | "none";
}

const SEVERITY_TO_SARIF: Record<Severity, SarifLevel["level"]> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
  info: "none",
};

interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }>;
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: Array<{
        id: string;
        name: string;
        shortDescription: { text: string };
        defaultConfiguration: { level: string };
      }>;
    };
  };
  results: SarifResult[];
}

interface SarifReport {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

/**
 * Convert analysis result to SARIF format
 */
export function toSarif(result: AnalysisResult): SarifReport {
  // Collect unique rule IDs from findings
  const ruleIds = [...new Set(result.findings.map((f) => f.ruleId))];

  // Build rule descriptors
  const rules = ruleIds.map((id) => {
    const builtin = builtinRules.find((r) => r.id === id);
    const finding = result.findings.find((f) => f.ruleId === id)!;
    return {
      id,
      name: builtin?.name ?? finding.ruleName,
      shortDescription: {
        text: builtin?.description ?? finding.message,
      },
      defaultConfiguration: {
        level: SEVERITY_TO_SARIF[finding.severity],
      },
    };
  });

  // Build results
  const results: SarifResult[] = result.findings.map((f) => ({
    ruleId: f.ruleId,
    level: SEVERITY_TO_SARIF[f.severity],
    message: { text: f.message + (f.snippet ? `: ${f.snippet}` : "") },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          ...(f.line ? { region: { startLine: f.line } } : {}),
        },
      },
    ],
  }));

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "diffgate",
            version: "0.1.0",
            informationUri: "https://github.com/JSLEEKR/diffgate",
            rules,
          },
        },
        results,
      },
    ],
  };
}

/**
 * Format as SARIF JSON string
 */
export function formatSarif(result: AnalysisResult): string {
  return JSON.stringify(toSarif(result), null, 2);
}
