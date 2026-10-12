# blueprint-reviewer

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:blueprint-reviewer` | [/blueprint](../skills/blueprint.md) — phase 6, one per module and one across modules (also when `restructure` reruns it); phase 7, one per walk | Read, Glob, Grep | 0.9.0 |

Files: [agents/blueprintReviewer.md](../../agents/blueprintReviewer.md) (the definition). Its briefs are
in [reviews.md](../../skills/blueprint/references/reviews.md), under the rules of
[mechanics.md › Subagents](../../skills/blueprint/references/mechanics.md#subagents).

## Why

A blueprint is reviewed twice before it is done. Phase 6 asks whether the documents agree with each
other — a module against the brief, the architecture, the decisions and the glossary; the modules
against each other. Phase 7 asks whether the product they describe would work — every actor walked to
their goals on their surfaces, every main flow step by step, the goals, the lifecycles, the
non-functional requirements, and what a product of this kind usually has. One reader cannot hold a
large blueprint, so both reviews are split: a reviewer per module, one across modules, one per flow or
group of actors.

A review must not fix what it finds. A fix is a decision, decisions belong to the operator, and the
skill puts each finding to them — accept, reject as intentional, or defer. Until 0.9.0 "read-only" was
an instruction to a general-purpose agent (and it is again in the skill's fallback, when this agent is
not available); now it is the tool list.

## What it does

1. Gets a brief naming the checks or the walk, the files to read, and for a module the depth and its row
   of the depth table.
2. Reads those files whole; on a walk, opens only the module files the walk passes through.
3. Runs every check over every item it applies to — every capability, relationship row, flow step and
   entity state — and for each problem finds both sides: the text that is wrong and what shows it.
4. Returns, for each check in the brief's order, its findings — the kind, the file and heading (with the
   capability id), what is wrong, the evidence and a suggested resolution, each tagged `[?pending]` — or
   `no findings`, so the skill can tell the check ran. Then the files it read, and at most five lines
   on anything serious that no check covered.

The skill numbers the findings (`R-nn` in `04-review.md` for phase 7), asks the operator and applies
what is accepted.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| Changes no file | **The tools.** There is no `Write`, `Edit` or `Bash`. |
| No web | **The tools.** There is no `WebSearch` or `WebFetch`; a competitor is compared only through a profile on disk. |
| Every check over every item, evidence for each finding, no findings of taste | **Its instructions.** |
| Stays inside its walk, assigns no ids, cites the sources' decisions instead of re-deciding them | **Its instructions.** |

Of the four blueprint agents, this is the one whose defining rule — it changes nothing — rests on the
tool list alone.

## Limitations

- **A finding is as good as the reading.** The tools make the reviewer harmless, not right: a missed
  contradiction stays missed. That is why the mechanical half of consistency — dangling references,
  duplicate ids, coverage — belongs to the skill's `validate`, not to a reviewer.
- **It cannot run anything.** With no `Bash` it cannot call `validate` or any other script; the skill
  does.
- **A walk sees only what it passes through.** A problem in a module that no walk reaches is found by
  phase 6 or by no one.
- **It cannot confirm a fix.** After the skill applies findings, a quick phase 6 again is the check.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README.
- The behaviour is exercised through the skill — phases 6 and 7 of a `/blueprint` run. There is no
  automated test of a reviewer's findings.
