# Tasks

Task list for our own Claude Code assistant plugin.
Based on: [apiko-agent-research.md](apiko-agent-research.md).

Statuses: `todo` · `in progress` · `done`.

## Decisions

- Plugin name: **dev-assistant**. Commands look like `/dev-assistant:verify`, or just `/verify` when the name is not taken.
- The repository is its own local marketplace, `bagrijroman`; the install id is `dev-assistant@bagrijroman`.
- Every hook ships with its own page in [hooks/](hooks/README.md) and a row in its index; `npm test` fails otherwise.
- apiko-agent is disabled (2026-09-11) so its hooks do not fire alongside ours. Re-enable with `claude plugin enable apiko-agent@apiko`.

## Open questions

- (none yet)

## T1 — Empty plugin · `done`

A skeleton that installs into Claude Code and does nothing yet. Everything else is added on top of it.

What to do:
- `.claude-plugin/plugin.json`: name, version `0.1.0`, description, author.
- `.claude-plugin/marketplace.json`: a local marketplace, so the plugin installs from this folder.
- Empty folders with `.gitkeep`: `skills/`, `agents/`, `hooks/`, `bin/`, `tests/`.
- `README.md`: how to install, and how to update after changes.

Done when:
- `claude plugin validate ./` passes with no errors.
- The plugin is installed via `claude plugin marketplace add` and `claude plugin install`, and shows up in `/plugin`.

Result: both manifests pass `claude plugin validate --strict`; the local marketplace is named `bagrijroman`, and
`dev-assistant@bagrijroman` was installed at user scope and enabled (0.1.0, before the hook).

## T2 — `main-branch-guard` hook and the hook test harness · `done`

The first hook: main changes only through a pull request, so the agent may neither commit on it nor push to it.
It carries the base every later hook reuses. Absorbs the former "Hook test harness" task.

What was done:
- `bin/main-branch-guard.mjs`, registered in `hooks/hooks.json` as `PreToolUse` on `Bash`.
- Blocks `git commit` while on `main` or `master`, and `git push` that updates them: `dev:main`, `+HEAD:refs/heads/main`,
  `origin main`, a bare `git push` while on main, `--all` / `--branches` / `--mirror`.
- Allows the root commit on an unborn main: a new repository needs its first commit somewhere.
- Follows `cd`, `git -C` and `bash -c "…"` to the repository the command really runs in.
- `bin/lib/shell.mjs`: a quote-, heredoc- and substitution-aware command reader. A commit message that mentions
  `git push origin main` never trips a guard (weak spot 6 in the research).
- `bin/lib/hook-io.mjs`: one block format for every hook, naming the hook and the allowed alternative. Hooks fail open.
- `bin/lib/git.mjs`: current branch and "has commits" lookups.
- Harness: `npm test` (`node --test`); `tests/helpers.mjs` builds throwaway repositories with git isolated from the
  machine's config and runs a hook with the payload Claude Code sends.

Done when:
- `npm test` passes: 25 cases, parser and hook.
- The installed plugin lists the hook: `claude plugin details dev-assistant@bagrijroman` shows `Hooks (1) PreToolUse`.

Result: released as 0.2.0; both done criteria hold.

## Draft of the next tasks

Order and contents are still being refined.

| # | Task | Essence |
|---|------|---------|
| T3 | CLAUDE.md template with a command map | the contract with a project: typecheck, lint, test, build |
| T4 | "Done = verified" | `/verify` skill, `track` hook, `done-gate` Stop hook |
| T5 | `guard-bash` | the other git rules and dangerous commands, on top of `bin/lib/shell.mjs` |
| T6 | `guard-files` | protected paths and plan approval |
| T7 | `/feature` | plan, check, approval, implementation, review, draft PR |
| T8 | `/fix` | reproduce, root cause, minimal fix, test |
| T9 | `/self-review` | diff review by a subagent |
| T10 | `/setup` | connecting the plugin to a new repository |
