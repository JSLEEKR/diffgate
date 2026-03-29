---
name: review-diff
description: Review code changes for security risks and dangerous patterns. Use after making code changes, before committing, or during code review.
---

# Review Diff for Risks

Analyze recent code changes for dangerous patterns.

## What It Checks
- SQL injection patterns
- Command injection
- Hardcoded secrets/credentials
- Unsafe regex (ReDoS)
- Path traversal
- XSS patterns
- Insecure crypto

## Usage
```bash
# Review staged changes
npx diffgate --staged

# Review last commit
npx diffgate HEAD~1

# Review specific file
npx diffgate --file src/auth.ts
```
