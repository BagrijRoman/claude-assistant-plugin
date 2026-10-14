# blueprint-resume

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `SessionStart` | `startup\|clear\|compact` | [bin/blueprintResume.mjs](../../bin/blueprintResume.mjs) | 0.14.0 |

## Why

Every turn of a session sends its whole context again. A `/blueprint` run that goes through its phases in
one session pays, on every step of phase 5, for the extracts of phase 1, the question rounds of phase 3 and
the writers' replies of phase 4 — none of which phase 5 reads. Everything a phase needs is on disk, so the
skill hands the operator a fresh context before every phase that runs agents: `/clear`, then `/blueprint`
([mechanics.md › A fresh context](../../skills/blueprint/references/mechanics.md#a-fresh-context)).

A plugin cannot clear the context itself: no hook, skill or command runs `/clear` for the operator. So this
hook makes the fresh start cheap instead. When a session starts, is cleared or is compacted, it finds every
unfinished blueprint under the session's folder and says where each one stands — one line to the operator,
a short note to the model — so the new session resumes from `STATE.json` instead of re-reading what is done,
and the operator does not have to remember where they stopped.

It is a notice, not a guard: it blocks nothing and writes nothing.

## Says

| Found under the session's folder | The operator sees |
|----------------------------------|-------------------|
| a blueprint whose `phase` is not `done` | `▸ /blueprint · 6/8 Capabilities (L3) · not started · docs/blueprint — /blueprint resumes it` |
| a phase at its gate | `… · 5/8 Modules (L2) · waits for the operator at its gate · …` |
| modules whose agent failed | `… · failed: DAT l2, ORG l3 · …` |
| several unfinished blueprints | one line each |

## Stays silent

| Found | Why |
|-------|-----|
| no `STATE.json` of kind `blueprint` | nothing to resume |
| a blueprint whose `phase` is `done` | nothing to resume; its later modes are the operator's choice |
| the skill's own template (`{{…}}` placeholders) | not a blueprint — it sits in the plugin's repository |
| another skill's state (`kind: research`, `backlog`) | not this hook's business |
| a `STATE.json` that does not parse | the skill's `continue` reports it; a notice would only guess |
| a `STATE.json` in a dot-folder, `node_modules`, `dist`, `build`, `out`, `coverage`, `vendor`, or more than four folders down | outside where a blueprint lives, and kept out so the hook stays fast |

## How it decides

1. Reads the payload's `cwd` (the session's folder; the process's own when it is missing).
2. Walks the folders under it breadth-first, at most four levels and 2,000 folders, skipping dot-folders and
   build or dependency folders, and collects every `STATE.json`.
3. Keeps those of kind `blueprint` without template placeholders whose `phase` is one of the eight phases
   (anything else — `done`, a broken file — is left out).
4. For each: the phase's number and stage name (the `init`, `continue` row of `SKILL.md › Progress`), its
   status from `phases`, and the modules whose `l2` or `l3` is `failed`, removed modules left out.
5. Prints one JSON object — `systemMessage` for the operator, `hookSpecificOutput.additionalContext` for the
   model — and exits `0`. With nothing found it prints nothing. Any error also means silence (fail open).

## What the model sees

```
[dev-assistant] blueprint-resume: unfinished blueprints in this project —
- docs/blueprint: phase "capabilities" (6/8 Capabilities (L3)), not started
When the operator runs /blueprint, resume from that STATE.json as the skill says (mechanics.md › A fresh context): read only what the current phase needs, not the documents of the phases already approved.
```

## Limitations

- **It cannot start the blueprint.** `/blueprint` is human-invoked only (`disable-model-invocation`), so the
  operator still types it after `/clear`; the hook only tells both of them where things stand.
- **It does not clear anything.** The fresh context still depends on the operator typing `/clear` when the
  gate suggests it.
- **A startup notice in unrelated work.** A session started in a project with an unfinished blueprint shows
  the line even when the session is about something else. It is one line, and the blueprint is unfinished.
- **Four levels down.** A blueprint deeper than four folders below the session's folder is not found; the
  skill's own search (`**/STATE.json`) still is.
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

- [tests/blueprintResume.test.mjs](../../tests/blueprintResume.test.mjs) — throwaway folders with blueprints
  in every state: silence for none, a finished one, a template, another skill's state and a broken file; the
  line and the context for an unfinished one; a gate, failed units, several blueprints; the folders it does
  not search; the stage names checked against `SKILL.md`; a payload it cannot read.
