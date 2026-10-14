# skill-resume

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `SessionStart` | `startup\|clear\|compact` | [bin/skillResume.mjs](../../bin/skillResume.mjs) | 0.14.0 as `blueprint-resume`; 0.15.0 for every skill |

## Why

Every turn of a session sends its whole context again. A `/blueprint` run that goes through its phases in
one session pays, on every step of phase 5, for the extracts of phase 1, the question rounds of phase 3 and
the writers' replies of phase 4 — none of which phase 5 reads; a `/showcase` pays, while it builds its flows,
for the components, pictures and layouts of the steps before. Everything a phase or a step needs is on disk,
so the skills recommend a fresh context at their gates — `/clear`, then the command — and say why: what the
conversation carries that the next phase does not read, that nothing is lost, and why not `/compact`
([blueprint](../../skills/blueprint/references/mechanics.md#a-fresh-context),
[showcase](../../skills/showcase/references/phases.md#a-fresh-context),
[backlog](../../skills/backlog/references/mechanics.md#a-fresh-context),
[research](../../skills/research/references/phases.md#a-fresh-context) › A fresh context).

A plugin cannot clear or compact the context itself: no hook, skill, agent or command runs `/clear` or
`/compact` for the operator. So this hook makes the fresh start cheap instead. When a session starts, is
cleared or is compacted, it finds the work under the session's folder that is not finished and says where
each piece stands — one line to the operator, a short note to the model — so the new session resumes from
`STATE.json` instead of re-reading what is done, and the operator does not have to remember where they
stopped. After an automatic compaction the same note reaches the model, which then knows to trust the files
over the summary.

It is a notice, not a guard: it blocks nothing and writes nothing.

## Says

| Found under the session's folder | The operator sees |
|----------------------------------|-------------------|
| a blueprint whose `phase` is not `done` | `▸ /blueprint · 6/8 Capabilities (L3) · not started · docs/blueprint — /blueprint resumes it` |
| a phase at its gate | `… · 5/8 Modules (L2) · waits for the operator at its gate · …` |
| modules whose agent failed | `… · failed: DAT l2, ORG l3 · …` |
| a showcase whose `step` is not `done` | `▸ /showcase · 8/21 Components · waits for the operator at its gate · docs/showcase — /showcase resumes it` |
| a showcase with an unanswered question (`pending`) | `… · a question waits for the operator · …` |
| a backlog whose `pending` names a mode | `▸ /backlog · detail stopped at gate · docs/backlog — /backlog continue resumes it` |
| a research run past its brief (`research`, `curate`, `review`) | `▸ /research · 2/4 Research · round 2 cut off while running · docs/research/2026-10-14-fleet — /research resumes it` |
| several | one line each: blueprints, then showcases, backlogs and research runs |

## Stays silent

| Found | Why |
|-------|-----|
| no `STATE.json` of kind `blueprint`, `showcase` or `backlog` | nothing to resume |
| a blueprint or a showcase that is `done` | nothing to resume; its later modes are the operator's choice |
| a backlog with `pending: null` | a backlog in daily use is not unfinished; `/backlog next` is the operator's to run |
| a research run in `frame` | a brief not approved yet — possibly one the operator cancelled; a notice at every start would nag |
| a skill's own template (`{{…}}` placeholders) | not a run — it sits in the plugin's repository |
| another skill's state (`kind: standards`, …) | its skill does not recommend a fresh context |
| a `STATE.json` that does not parse | the skill's `continue` reports it; a notice would only guess |
| a `STATE.json` in a dot-folder, `node_modules`, `dist`, `build`, `out`, `coverage`, `vendor`, or more than four folders down | outside where the work lives, and kept out so the hook stays fast |

## How it decides

1. Reads the payload's `cwd` (the session's folder; the process's own when it is missing).
2. Walks the folders under it breadth-first, at most four levels and 2,000 folders, skipping dot-folders and
   build or dependency folders, and collects every `STATE.json`.
3. Keeps those of a kind it knows, without template placeholders:
   - **blueprint** — whose `phase` is one of the eight phases: the phase's number and stage name (the
     `init`, `continue` row of its `SKILL.md › Progress`), its status from `phases`, and the modules whose
     `l2` or `l3` is `failed`, removed modules left out;
   - **showcase** — whose `step` is one of its steps: the stage's number and name (the `init [dir]`,
     `continue` row of its `SKILL.md › Progress`; step 19's two keys share a stage), its status from
     `steps`, and whether `pending` holds a question;
   - **backlog** — whose `pending` names a mode: the mode and the step it stopped at;
   - **research** — whose `phase` is `research`, `curate` or `review`: the phase's number and stage name
     (the `<topic>`, `continue [run]` row of its `SKILL.md › Progress`) and the status of its last round.
4. Prints one JSON object — `systemMessage` for the operator, `hookSpecificOutput.additionalContext` for the
   model, which also names the section that says how to resume — and exits `0`. With nothing found it prints
   nothing. Any error also means silence (fail open).

## What the model sees

```
[dev-assistant] skill-resume: unfinished work in this project —
- /blueprint in docs/blueprint: phase "capabilities" (6/8 Capabilities (L3) · not started); see mechanics.md › A fresh context
- /showcase in docs/showcase: step "components" (8/21 Components · in progress); see phases.md › A fresh context
When the operator runs the command, resume from that STATE.json as the skill says: read only what the current phase, step or mode needs, not the documents of the ones already approved.
```

## Limitations

- **It cannot start the skill.** The skills are human-invoked only (`disable-model-invocation`), so the
  operator still types the command after `/clear`; the hook only tells both of them where things stand.
- **It does not clear anything.** The fresh context still depends on the operator typing `/clear` when the
  gate suggests it. `/compact` is not a substitute: it costs one more request over the whole context and
  keeps a summary the next phase does not need.
- **A startup notice in unrelated work.** A session started in a project with unfinished work shows the
  line even when the session is about something else. It is one line per run, and the run is unfinished.
- **Four levels down.** A run deeper than four folders below the session's folder is not found; the
  skills' own search (`**/STATE.json`) still is.
- **How the operator's line is shown** is up to Claude Code: `systemMessage` is documented as a message to
  the user, not specifically for `SessionStart`.

## Turning it off

The plugin is enabled per scope; to switch it off where it does not fit, add to the repository's
`.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/skillResume.test.mjs](../../tests/skillResume.test.mjs) — throwaway folders with runs in every
  state: silence for none, finished ones, a backlog in daily use, a research brief not approved, another
  skill's state, the templates and a broken file; the line and the context for an unfinished blueprint,
  showcase, backlog mode and research run; a gate, failed units, a question waiting, a round cut off,
  several runs in order; the folders it does not search; the stage names of three skills checked against
  their `SKILL.md`; a payload it cannot read.
- [tests/structure.test.mjs](../../tests/structure.test.mjs) — every skill with gates has its
  *A fresh context* section, with the recommendation, the reason and the word on `/compact`, and is a
  kind this hook knows.
