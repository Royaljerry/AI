---
name: git-commit-branch
description: 'Execute git commit with branch-prefixed conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Prefixing messages with the current branch name in square brackets, (2) Auto-detecting type and scope from changes, (3) Generating conventional commit messages from diff, (4) Interactive commit with optional type/scope/description overrides, (5) Intelligent file staging for logical grouping'
license: MIT
allowed-tools: Bash
---

# Git Commit with Conventional Commits

## Overview

Create standardized, semantic git commits using the Conventional Commits specification, prefixed with the current branch name. Analyze the actual diff to determine appropriate type, scope, and message.

## Conventional Commit Format

```
[branch-name] <type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Always prefix the commit subject with the current git branch name in square brackets. Example:

```
[feature/login-flow] feat(auth): add password reset
```

## Commit Types

| Type       | Purpose                        |
| ---------- | ------------------------------ |
| `feat`     | New feature                    |
| `fix`      | Bug fix                        |
| `docs`     | Documentation only             |
| `style`    | Formatting/style (no logic)    |
| `refactor` | Code refactor (no feature/fix) |
| `perf`     | Performance improvement        |
| `test`     | Add/update tests               |
| `build`    | Build system/dependencies      |
| `ci`       | CI/config changes              |
| `chore`    | Maintenance/misc               |
| `revert`   | Revert commit                  |

## Breaking Changes

```
# Exclamation mark after type/scope
[feature/api-v2] feat!: remove deprecated endpoint

# BREAKING CHANGE footer
[feature/config-extends] feat: allow config to extend other configs

BREAKING CHANGE: `extends` key behavior changed
```

## Workflow

### 1. Detect Branch

```bash
git branch --show-current
```

Use the exact current branch name as the commit message prefix: `[branch-name]`. If the repository is in a detached HEAD state, stop and ask the user what branch name to use.

### 2. Analyze Diff

```bash
# If files are staged, use staged diff
git diff --staged

# If nothing staged, use working tree diff
git diff

# Also check status
git status --porcelain
```

### 3. Stage Files (if needed)

If nothing is staged or you want to group changes differently:

```bash
# Stage specific files
git add path/to/file1 path/to/file2

# Stage by pattern
git add *.test.*
git add src/components/*

# Interactive staging
git add -p
```

**Never commit secrets** (.env, credentials.json, private keys).

### 4. Generate Commit Message

Analyze the diff to determine:

- **Branch prefix**: Current branch name wrapped in square brackets, e.g. `[feature/login-flow]`
- **Type**: What kind of change is this?
- **Scope**: What area/module is affected?
- **Description**: One-line summary of what changed (present tense, imperative mood, <72 chars)

### 5. Execute Commit

```bash
# Single line
git commit -m "[branch-name] <type>[scope]: <description>"

# Multi-line with body/footer
git commit -m "$(cat <<'EOF'
[branch-name] <type>[scope]: <description>

<optional body>

<optional footer>
EOF
)"
```

## Best Practices

- One logical change per commit
- Present tense: "add" not "added"
- Imperative mood: "fix bug" not "fixes bug"
- Reference issues: `Closes #123`, `Refs #456`
- Keep description under 72 characters

## Git Safety Protocol

- NEVER update git config
- NEVER run destructive commands (--force, hard reset) without explicit request
- NEVER skip hooks (--no-verify) unless user asks
- NEVER force push to main/master
- If commit fails due to hooks, fix and create NEW commit (don't amend)
