# Tasks

Task list for our own Claude Code assistant plugin.
Based on: [apiko-agent-research.md](apiko-agent-research.md).

Statuses: `todo` · `in progress` · `done`.

## Decisions

- Plugin name: **dev-assistant**. Commands look like `/dev-assistant:verify`, or just `/verify` when the name is not taken.
- The repository is its own local marketplace, `bagrijroman`; the install id is `dev-assistant@bagrijroman`.
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
`dev-assistant@bagrijroman` 0.1.0 is installed at user scope and enabled.

## Draft of the next tasks

Order and contents are still being refined.

| # | Task | Essence |
|---|------|---------|
| T2 | CLAUDE.md template with a command map | the contract with a project: typecheck, lint, test, build |
| T3 | Hook test harness | `node --test`, a fixture repository, the first test |
| T4 | "Done = verified" | `/verify` skill, `track` hook, `done-gate` Stop hook |
| T5 | `guard-bash` | git and dangerous commands, with quote and heredoc aware parsing |
| T6 | `guard-files` | protected paths and plan approval |
| T7 | `/feature` | plan, check, approval, implementation, review, draft PR |
| T8 | `/fix` | reproduce, root cause, minimal fix, test |
| T9 | `/self-review` | diff review by a subagent |
| T10 | `/setup` | connecting the plugin to a new repository |
