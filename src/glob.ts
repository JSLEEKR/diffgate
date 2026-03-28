/**
 * Simple glob pattern matching (no external deps)
 * Supports: *, **, ?, {a,b}
 */
export function globToRegex(pattern: string): RegExp {
  let regex = "";
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i]!;

    if (char === "*") {
      if (pattern[i + 1] === "*") {
        // ** matches any path depth
        if (pattern[i + 2] === "/") {
          regex += "(?:.+/)?";
          i += 3;
        } else {
          regex += ".*";
          i += 2;
        }
      } else {
        // * matches anything except /
        regex += "[^/]*";
        i++;
      }
    } else if (char === "?") {
      regex += "[^/]";
      i++;
    } else if (char === "{") {
      const end = pattern.indexOf("}", i);
      if (end !== -1) {
        const options = pattern.slice(i + 1, end).split(",");
        regex += `(?:${options.map(escapeRegex).join("|")})`;
        i = end + 1;
      } else {
        regex += "\\{";
        i++;
      }
    } else if (".|+^$()[]\\".includes(char)) {
      regex += "\\" + char;
      i++;
    } else {
      regex += char;
      i++;
    }
  }

  return new RegExp(`^${regex}$`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Test if a file path matches a glob pattern
 */
export function matchGlob(filePath: string, pattern: string): boolean {
  return globToRegex(pattern).test(filePath);
}

/**
 * Test if a file matches any of the given patterns
 */
export function matchAny(filePath: string, patterns: string[]): boolean {
  return patterns.some((p) => matchGlob(filePath, p));
}
