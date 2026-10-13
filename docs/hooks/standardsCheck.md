# standards-check

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `Stop` · `PreToolUse` | — · `Bash` (`git commit`) | [bin/standardsCheck.mjs](../../bin/standardsCheck.mjs) | 0.12.0 |

## Why

A standards pack (see [/standards](../skills/standards.md)) enforces each rule at the strongest layer that can
carry it. Lint runs on every edit through [lint-feedback](lintFeedback.md). Some rules show in files and folders
instead of syntax: RCT-02 says every component is a folder with an `index.ts` that only re-exports, a component
file of the folder's name, its hook, and its subcomponents in `components/`. No linter sees a folder, so a script
checks it: `componentLayout` in [bin/lib/componentLayout.mjs](../../bin/lib/componentLayout.mjs).

That check cannot run on every edit, because a component is created file by file and is incomplete in between.
It runs at the two moments when the work should be whole: when a turn ends, so the operator reviews a component
that already has its layout right, and at commit, so a broken layout does not enter the history.

## Blocks

| Moment | Outcome |
|--------|---------|
| a turn ends, and a component written in it breaks a check | the turn is held once: the model gets the findings and fixes them before handing over |
| `git commit` (also `-a`, after `cd`, through `git -C`) whose recorded files touch a component that breaks a check | the commit is cancelled with the findings |

## Allows

| Case | Why |
|------|-----|
| a turn whose written files break nothing, or wrote them before the operator's last message | nothing of this turn to fix |
| a turn already held once by a Stop hook (`stop_hook_active`) | a turn is held at most once; what is left is the operator's to see |
| a commit whose message carries `Standards-skipped: RCT-02 <reason>` | the operator let that rule go for this commit, with a reason |
| a rule switched off in the project (`/standards disable`) | it no longer applies there |
| a project without `.claude/standards/standards.json` | no pack installed, nothing to check |
| any command that is not `git commit`, an unreadable transcript, any internal error | fails open |

## How it decides

1. **Stop:** reads the transcript, finds the operator's last message (a user entry with text — not a tool
   result, not a harness message), and collects the `file_path` of every `Write`, `Edit`, `MultiEdit` and
   `NotebookEdit` after it. **Commit:** for each `git commit` in the command, the files it records
   (`git diff --cached --name-only`, or against `HEAD` with `-a`), in the repository the command runs in.
2. Groups the files by project: the nearest folder above each with `.claude/standards/standards.json`.
3. For each project, runs the checks its installed packs name in `Enforced by: check …` over the touched
   folders only: for a file in a component, its outermost component folder (so a subcomponent's parent is
   checked too); for a file in a group folder (`components/`, `ui/`, a feature), that folder's loose files.
4. Drops the rules switched off and, at commit, the ids in `Standards-skipped:` lines.
5. Nothing left: exit `0`. Otherwise exit `2` with the findings — at Stop as feedback, at commit as a block.

## What the model sees

```
[dev-assistant] standards-check: the components written this turn break the project's standards. 2 standards findings:
  RCT-02 · src/components/Card · no index.ts → add src/components/Card/index.ts that re-exports Card and nothing else
  RCT-02 · src/components/Card · "helpers.ts" does not fit the layout → name it Card.<role>.ts, or move it out of the component
Do this instead: fix them before handing the work over, so the operator reviews code that already keeps the standards. If one should stay as it is, tell the operator which rule and why; letting a rule go is their decision.
```

At commit the first line reads `standards-check blocked this command: the components this commit records …`,
and the way out is to fix and stage, or — on the operator's word — `Standards-skipped: <rule id> <reason>`.

## componentLayout

| In a component folder `Name/` | Finding |
|-------------------------------|---------|
| no `index.ts` (or `.tsx`, `.js`, `.jsx`) | `no index.ts` |
| an index with anything besides `export … from` lines, comments and a `'use client'` directive | `index.ts holds code besides re-exports` |
| no `Name.tsx` (or `.jsx`) | `no Name.tsx` |
| a file that is not `index.*`, `Name.*`, `useName*.*`, an asset or a dotfile | `"file" does not fit the layout` |
| a PascalCase folder beside the files | `the subcomponent "X" sits outside components/` |
| `components/` holding anything but PascalCase folders (checked as components), PascalCase files with their `X.<role>.*` files, or an index | `"file" is not a subcomponent` |
| a PascalCase `.tsx` loose in a group folder | `the component "X.tsx" is a loose file` |

`__tests__`, `__mocks__`, `__snapshots__`, `__fixtures__`, `assets`, `images` and `icons` are left alone.

## Limitations

- **It reads the working tree.** At commit, a file staged in one state and changed again after is checked as it
  is on disk now.
- **Only file-tool writes are seen at Stop.** A file created by a Bash command (`/scaffold` is one, and it lays
  the folder out right) is checked at commit, not at Stop.
- **`Standards-skipped:` is trusted as written.** That only the operator puts it there is a rule of the skill
  and of the hook's message, not something the hook can verify.
- **The operator's own commits** in a terminal are not seen; Claude Code hooks see only Claude's tool calls.

## Turning it off

Switch a rule off in one project with `/standards disable <rule> <reason>`. To silence the whole plugin in one
repository, add `{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }` to its `.claude/settings.local.json`.

## Tests

- [tests/standardsCheck.test.mjs](../../tests/standardsCheck.test.mjs) — `componentLayout` case by case, the
  Stop entry with transcript fixtures (this turn only, relative paths, held once, rule switched off), the commit
  entry on throwaway repositories (`cd`, `-a`, `Standards-skipped:`, a clean component, a project without
  standards), and the scaffold's output passing the check.
