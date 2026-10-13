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

## Modes

| Arguments | What you do |
|-----------|-------------|
| `install <pack> [dir]` | Follow `references/install.md`: detect, confirm the settings with the operator, install, wire the lint, show what the existing code breaks. |
| `update` | `node "$S" update`; relay the report. A file listed as *not replaced* has its new version in `.claude/standards/incoming/`: show the operator the difference, merge it by hand with their agreement, then `node "$S" resolve <file>`. |
| `status` | `node "$S" status`; relay it. Point out what needs action: an update, a merge pending, lint not wired, promotions waiting. |
| `check` | `node "$S" check` over the whole project, then the project's own lint command; report both. Fix nothing unless the operator asks. |
| `disable <rule> <reason>` | Only on the operator's words, with their reason: `node "$S" disable <rule> --reason "<reason>"`. |
| `enable <rule>` | `node "$S" enable <rule>`. |
| `review [--staged \| --base <ref>]` | Follow `references/review.md`: the reviewer reads the change, the operator decides each finding, the decisions are recorded, and promotions are proposed. |
| `promote` | `node "$S" promote` lists what waits; then `review.md › Promotion`. |
| *(none)* | `status`, then offer the mode that fits what it shows. |

`node "$S" packs` lists the packs the plugin has.

## Rules that never bend

- **The script is the only writer** of `.claude/standards/standards.json`, `.claude/standards/findings.json`
  and the files a pack installs. Settings change through `install <pack> --set key=value`, a rule through
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
