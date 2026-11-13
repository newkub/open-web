# Stats Workflow

> Referenced from `open-in-web diff` `### 2. Report Diff`. Read-only: never stage, commit, or edit.

## 1. Determine Diff Scope

| Target | Command |
|--------|---------|
| Unstaged | `git diff` |
| Staged | `git diff --cached` |
| All changes | `git diff HEAD` |
| Between commits | `git diff <commit-a> <commit-b>` |
| Between branches | `git diff <branch-a>..<branch-b>` |
| Specific file | `git diff <file>` |

Unspecified scope → `git diff HEAD`.

## 2. Collect Statistics

1. `git diff --stat` — per-file additions and deletions
2. `git diff --shortstat` — overall totals
3. `git diff --name-status` — change type per file (A/M/D/R)
4. `git status --porcelain` — working tree state

## 3. Categorize Changes

1. By change type: Added, Modified, Deleted, Renamed
2. By category:
   - docs: `*.md`, `docs/`
   - config: `*.json`, `*.jsonc`, `*.yml`, `*.yaml`, `*.toml`, `.env*`
   - code: `src/`, `lib/`, `packages/`, `*.ts`, `*.tsx`, `*.js`, `*.jsx`
   - test: `*.test.*`, `*.spec.*`, `tests/`
   - chore: `scripts/`, `tools/`, build files
3. Count files and changed lines per group

## 4. Format The Report

1. Order: Summary → Statistics Table → Changes by Category → Key Diffs
2. Statistics table columns: `No.` | `File` | `Type` | `+/-` | `Category`
3. Format tables with `/report`; put diffs in `diff` code fences
4. Use symbols: ✅ added, ✏️ modified, ❌ deleted, 📝 renamed

## 5. Highlight Key Changes

1. Top 5 files by lines changed
2. Breaking changes or anything impacting API, schema, or config
3. Newly added files
4. Deleted files
5. A file with more than 100 changed lines → summary only, not the full diff

## 6. Provide Insights

1. Classify the change: feature, fix, refactor, config, docs
2. Impact on each part of the system
3. Risks the change may introduce
4. Recommended next actions (tests to run, breaking changes to review) → `/dot suggest`

## Caps

- Total diff over 500 lines → summary plus top 5 files only
- Never show unrelated files
- State the diff scope used at the top of the report
