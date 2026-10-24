# pattern-reviewer

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:pattern-reviewer` | [/standards](../skills/standards.md) — `review`, one per change | Read, Glob, Grep | 0.12.0 |

Files: [agents/patternReviewer.md](../../agents/patternReviewer.md) (the definition). Its brief is in
[review.md](../../skills/standards/references/review.md).

## Why

The lint and the script checks of a standards pack catch what shows in syntax and in folders. What is left
needs judgement: whether a component is meant to be reused, whether a new one is a near-copy of a shared one,
whether a subcomponent has outgrown its single file, whether a token is used against its meaning, and whatever
the project's `CLAUDE.md` asks that no tool can see. A reviewer in its own context reads the change against
exactly those rules, and the main conversation gets back a short list instead of every file it read.

A review must not fix what it finds: each fix is the operator's to accept. So the reviewer has no tool that
writes.

## What it does

1. Gets a brief with the diff file, the changed and untracked files, the project's rules files and `CLAUDE.md`,
   and the rules to review — each id with what the review looks for.
2. Reads the diff, the rules (each applied only to the files its `paths:` covers) and every changed file whole;
   looks at the neighbours a rule needs — the shared folder for a near-copy, the same markup elsewhere for
   "meant to be reused".
3. Returns findings — rule id (or `no rule`), file and line, what is wrong, the evidence, the fix — or one
   `PASS` line, then the files it read.

The skill puts every finding to the operator, makes the chosen fixes, records the decisions and proposes
promotions.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| Changes no file, runs nothing | **The tools.** There is no `Write`, `Edit` or `Bash`. |
| No web | **The tools.** |
| The change only, every finding with its rule, evidence and fix, nothing a lint already reports | **Its instructions.** |
| A finding that fits no rule is still reported, as `no rule` | **Its instructions** — it feeds the proposal of a new rule. |

## Limitations

- **A finding is as good as the reading.** A missed near-copy stays missed; that is why everything a tool can
  see is moved to the lint or a check, and the review keeps only judgement.
- **It cannot run git.** The skill writes the diff to a file and passes its path.
- **It reviews the change, not the codebase.** Old code that breaks a rule is out of scope; `/standards check`
  and the lint cover the whole project.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its rows in the
  [agents index](README.md) and in the root README, and that the skill delegates only to agents that exist.
- The behaviour is exercised through `/standards review`. There is no automated test of a reviewer's findings.
