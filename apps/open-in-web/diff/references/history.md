# History Workflow

> Referenced from `open-in-web diff` `### 4. Trace File History`. Read-only analysis from git.

## 1. Trace File History

1. `git log --follow --oneline -- <path>` — includes rename history via `--follow`
2. Identify when the file was created, renamed from what, and last modified
3. Flag long gaps (abandoned file?) versus very frequent changes (hotspot?)

## 2. Measure Evolution

1. Line count per commit: `git show <sha>:<path> | wc -l` — growth trend
2. Authors per file — primary owners
3. Classify commits (feature, fix, refactor) from messages and diff nature

## 3. Find Key Changes

1. Major rewrites: commits with unusually large diffs (over 50% of the file)
2. Regression candidates: given a current bug, bisect-style search for the introducing commit
3. `git log -S"<pattern>"` — when a string or symbol entered or left (pickaxe)
4. Detailed diffs of commits of interest → `/git file-history` or `/review-codebase`

## 4. Report Evolution

1. Table columns: `No.` | `Commit` | `Date` | `Author` | `Lines Δ` | `Type` | `Significance`
2. Timeline summary: created → major changes → current state
3. Insights: hotspot (split or refactor?), stable (long untouched), regression point (if found)
4. Format tables with `/report`

## Rules

1. Always use `--follow` so history stays continuous across renames
2. Every claim cites a real commit SHA; measure line counts and diff sizes — never infer from messages alone
3. Answer the question asked (regression hunt, context, ownership); do not dump raw history
4. State limitations: shallow clones and history rewrites make history incomplete
5. Range argument limits the window, e.g. `history src/app.ts v1.0..HEAD`
