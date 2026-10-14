---
name: standards
description: Installs the plugin's standards packs (first `react`, for React and React Native) into a project and keeps them working — every rule with an id, enforced by lint, a script check or review; reviews a change against the rules only judgement can check, records what the operator decided, and proposes a stronger layer for a rule the review keeps catching. Human-invoked only.
argument-hint: "[install <pack> [dir] | update | status | check | disable <rule> <reason> | enable <rule> | review [--staged | --base <ref>] | promote]"
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Bash(npm:*), Bash(npx:*), Read, Edit, Glob, Grep, Agent, AskUserQuestion
---

# Standards

A practice the operator wants in every project is written once, as a rule with an id in a pack, and reaches the
code through every layer that can carry it: the rules file Claude reads while it writes (`.claude/rules/<pack>.md`),
the lint rules `lint-feedback` reports after every edit, the script checks the `standards-check` hook runs when
a turn ends and at commit, and the review of what only judgement can tell. A rule the review keeps catching moves
to a stronger layer — the operator decides how.

The script does every write to the project's standards files; you run it and relay what it says:

```bash
S="${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs"
node "$S" <command> --dir <project>
```

`<project>` is the folder with the project's `package.json` — the argument, or the current directory. When the
current directory holds several projects (a folder of repositories), ask which one first.

## The working folder

The working folder is `docs/standards/` in the project: `standards.json` (the packs, their settings, the rules
switched off), `findings.json` (findings and promotions), `incoming/` (new versions waiting for a merge) and a
`.gitignore`.

Writes stay in the working folder: nothing is created outside it, not even for a moment.

- Temporary files live there too, and the skill removes them: the review diff, `docs/standards/review.diff`, is
  written by `review-context` and removed by `finding`, or by `review-done` when the review recorded nothing. The
  `.gitignore` keeps it out of a commit if a review is interrupted.
- `/tmp`, `os.tmpdir()`, the session scratchpad and the project root are never written to.
- Exempt are the files that are the point of the skill, because tools read them from a fixed place:
  `.claude/rules/*.md`, `eslint/standards/*.mjs` and the wiring of the lint file into the ESLint config.

A project installed by an older version keeps these files in `.claude/standards/`; the script's next write moves
the folder to `docs/standards/` and its report says so. Relay that line, and run `update` when it asks for it.

## Modes

| Arguments | What you do |
|-----------|-------------|
| `install <pack> [dir]` | Follow `references/install.md`: detect, confirm the settings with the operator, install, wire the lint, show what the existing code breaks. |
| `update` | `node "$S" update`; relay the report. A file listed as *not replaced* has its new version in `docs/standards/incoming/`: show the operator the difference, merge it by hand with their agreement, then `node "$S" resolve <file>`. |
| `status` | `node "$S" status`; relay it. Point out what needs action: an update, a merge pending, lint not wired, promotions waiting. |
| `check` | `node "$S" check` over the whole project, then the project's own lint command; report both. Fix nothing unless the operator asks. |
| `disable <rule> <reason>` | Only on the operator's words, with their reason: `node "$S" disable <rule> --reason "<reason>"`. |
| `enable <rule>` | `node "$S" enable <rule>`. |
| `review [--staged \| --base <ref>]` | Follow `references/review.md`: `review-context` collects the change, the reviewer reads it, the operator decides each finding, the decisions are recorded with `finding` (or, with nothing to record, `review-done`), either of which removes the review diff, and promotions are proposed. |
| `promote` | `node "$S" promote` lists what waits; then `review.md › Promotion`. |
| *(none)* | `status`, then offer the mode that fits what it shows. |

`node "$S" packs` lists the packs the plugin has. The script's commands: `packs`, `install`, `update`, `status`,
`check`, `disable`, `enable`, `resolve`, `finding`, `promote`, `review-context`, `review-done`.

## Progress

The operator always sees which stage the run is in, what is done and what comes next.

- **The checklist.** When a mode starts, show its stages from the table below, one per line: `✓` done, `▸` the
  current one, `·` still to come, `–` skipped by this run, `✗` failed. Show it again at every question to the
  operator and at the end, with the marks brought up to date and what changed in the project. When the session has
  a task-list tool (`TaskCreate` and `TaskUpdate`, or `TodoWrite`), mirror the stages there, one item per stage, and
  keep the items current; without one, the checklist in the chat is enough.
- **The line.** At every change of stage or step, one line: `▸ /standards · <n>/<N> <stage> · <step>`, plus
  `· <k>/<m>` while units are counted — `▸ /standards · 3/6 The operator decides · finding · 2/5`. The marks, the
  numbers and the command are fixed; the stage and the step are in the operator's language.
- **Units.** A stage that works through units — settings to confirm, files installed, findings decided,
  promotions proposed — counts them in the line, and the task list gets an item per unit while there are twelve or
  fewer.
- **Waits.** Before the reviewer or a long check (the project's lint over the whole code) starts, say what runs and
  that you wait for it. At a question, the line says the run waits for the operator, and for what.
- **Resume.** A review cut off between its stages leaves `docs/standards/review.diff` behind: `status` names it,
  and the next `review` starts again from the beginning — or `review-done` removes it.

| Mode | Stages |
|------|--------|
| `install <pack> [dir]` | Detect → Confirm the settings → Install → Wire the lint → What the existing code breaks → Hand over |
| `update` | Update → Merges pending → Resolve |
| `status` | Status → What needs action |
| `check` | Script checks → Project lint → Report |
| `disable <rule> <reason>` | The operator's reason → Disable → Report |
| `enable <rule>` | Enable → Report |
| `review [--staged \| --base <ref>]` | Collect the change → The reviewer reads → The operator decides → Record → Remove the diff → Promotions |
| `promote` | What waits → Options → The operator chooses → Record |
| *(none)* | Status → The mode that fits |

## Rules that never bend

- **The script is the only writer** of `docs/standards/standards.json`, `docs/standards/findings.json`, the
  review diff and the files a pack installs. Settings change through `install <pack> --set key=value`, a rule through
  `disable` / `enable` — never by editing those files by hand. The one hand edit is the wiring of the lint
  file into the ESLint config, and a merge of `incoming/` the operator agreed to.
- **A rule is switched off by the operator only**, with a reason, through `disable`. Never an
  `eslint-disable` comment, never a rule removed from a config or from a rules file.
- **Every finding is the operator's to decide**: fix, waive with a reason, or reject. A finding is recorded
  only after that decision, with what it was.
- **`Standards-skipped: <rule> <reason>`** goes into a commit message only when the operator said so for that
  rule, with their reason.
- **Promotions are proposals.** The script says what waits; you lay out the options; the operator picks;
  `promote` records the choice.

## Done when

- The mode's steps are done and the script's report was shown unchanged.
- Nothing in the project's standards files was written except by the script (and the wiring or merge the
  operator agreed to).
- Every finding of a review has the operator's decision recorded, and every promotion it raised was put to them.
- After a review, `docs/standards/review.diff` is gone: `finding` or `review-done` removed it.
- Nothing was created outside `docs/standards/` apart from the exempt files.
