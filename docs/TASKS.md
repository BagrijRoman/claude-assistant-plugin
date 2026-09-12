# Tasks

Task list for our own Claude Code assistant plugin.
Based on: [apikoAgentResearch.md](apikoAgentResearch.md).

Statuses: `todo` · `in progress` · `done`.

## Decisions

- Plugin name: **dev-assistant**. Commands look like `/dev-assistant:verify`, or just `/verify` when the name is not taken.
- The repository is its own local marketplace, `bagrijroman`; the install id is `dev-assistant@bagrijroman`.
- Every hook ships with its own page in [hooks/](hooks/README.md) and a row in its index; `npm test` fails otherwise.
- apiko-agent is disabled (2026-09-11) so its hooks do not fire alongside ours. Re-enable with `claude plugin enable apiko-agent@apiko`.
- Files are named in camelCase; a hook keeps its kebab-case name in messages and docs. `TASKS.md` and `README.md` stay upper-case.
- Project config comes from the plugin through a script, not by hand: templates live in `templates/`, `bin/setup.mjs`
  merges them into the project (idempotent, never deletes foreign entries, prints what it added), and the `/setup`
  skill runs it. A SessionStart hook never edits project files on its own.
- Secret protection is two hooks, because they fire on different events: `secret-files-guard` (file access) and
  `secret-commit-guard` (staged diff at commit time). The permission `deny` list covers Read/Edit as a hard boundary
  once `/setup` has written it into the project; whether Claude Code honours a plugin's own `settings.json` is unverified.

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
- `bin/mainBranchGuard.mjs`, registered in `hooks/hooks.json` as `PreToolUse` on `Bash`.
- Blocks `git commit` while on `main` or `master`, and `git push` that updates them: `dev:main`, `+HEAD:refs/heads/main`,
  `origin main`, a bare `git push` while on main, `--all` / `--branches` / `--mirror`.
- Allows the root commit on an unborn main: a new repository needs its first commit somewhere.
- Follows `cd`, `git -C` and `bash -c "…"` to the repository the command really runs in.
- `bin/lib/shell.mjs`: a quote-, heredoc- and substitution-aware command reader. A commit message that mentions
  `git push origin main` never trips a guard (weak spot 6 in the research).
- `bin/lib/hookIo.mjs`: one block format for every hook, naming the hook and the allowed alternative. Hooks fail open.
- `bin/lib/git.mjs`: current branch and "has commits" lookups.
- Harness: `npm test` (`node --test`); `tests/helpers.mjs` builds throwaway repositories with git isolated from the
  machine's config and runs a hook with the payload Claude Code sends.

Done when:
- `npm test` passes: 25 cases, parser and hook.
- The installed plugin lists the hook: `claude plugin details dev-assistant@bagrijroman` shows `Hooks (1) PreToolUse`.

Result: released as 0.2.0; both done criteria hold.

## T3 — `secret-files-guard` hook · `done`

No secret file is read, edited, printed or copied. `.env`, `.env.*`, key material (`*.pem`, `*.key`, `*.p8`,
`*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `*.mobileprovision`, `*.ppk`), ssh private keys and everything in `.ssh/`,
`*credentials*.json`, `*service-account*.json`, `.aws/credentials`, `.netrc`, `.pgpass`.

What was done:
- `bin/secretFilesGuard.mjs`, registered as `PreToolUse` on `Read|Edit|Write|MultiEdit|NotebookEdit|Grep` and on `Bash`.
- File tools: blocks when the target path (`file_path`, `notebook_path`, `path`) is a secret file.
- Bash: through `listCommands`; blocks readers (`cat`, `head`, `grep`, `sed`, `base64`, …) given a secret file and
  copiers (`cp`, `mv`, `scp`, `rsync`, …) whose source is one. Every other program passes, so `ls -la .env`,
  `rm .env`, `cp .env.example .env` and a commit message that mentions `.env` are never blocked.
- Example files pass: `.env*.example|sample|template|dist`, `.ssh/*.pub`, `.ssh/config`, `.ssh/known_hosts*`.
- `bin/lib/secretPaths.mjs`: the glob lists and `isSecretFile(path)`, shared with the T5 template.
- `tests/helpers.mjs` gained `runHook(script, payload)` and `runFileHook(...)`.

Done when:
- `npm test` covers a blocked and a passing case per rule, plus the example-file exception.
- A page `docs/hooks/secretFilesGuard.md` and a row in the index.

Result: released as 0.3.0; 50 tests pass. Known gaps are listed on the hook's page: redirections (`cat < .env`,
`echo … >> .env`) and programs outside the reader/copier lists (`source .env`, `node -e`) are not seen.

## T4 — `secret-commit-guard` hook · `todo`

No token reaches a commit. Runs only when the command is `git commit`; scans the staged diff.

What to do:
- `bin/secretCommitGuard.mjs`, registered as `PreToolUse` on `Bash`.
- Patterns: JWT (`eyJ…`), AWS access keys, private key blocks (`-----BEGIN … PRIVATE KEY-----`), connection strings
  with a password (`mongodb://user:pass@`, `postgres://…`), GitHub/Slack/Stripe token prefixes, and `.env` files staged by mistake.
- Reads `git diff --cached` in the repository the command really runs in (follows `cd` and `git -C`, as `main-branch-guard` does).
- The block message names the file and the line, never prints the secret itself.
- A line carrying `# allow-secret: <reason>` passes, so a test fixture can hold a fake token on purpose.

Done when:
- `npm test` covers a blocked case per pattern, a passing clean diff, and the `allow-secret` exception.
- A page `docs/hooks/secretCommitGuard.md` and a row in the index.

## T5 — `/setup-permissions` skill and the merge script · `todo`

The first skill, and the one way plugin permissions reach a project. Deliberately narrow: it writes the `deny`
list and nothing else. Later it grows into an interactive setup (choose rule groups, fill the command map,
create `CLAUDE.md`); the script is written so that adding a second template is a small change.

What to do:
- `templates/permissions.json`: the `deny` list for secret files, built from the same list as T3
  (`Read(…)`, `Edit(…)` and the `Bash(cat …)` shapes), plus the irreversible git and publish commands
  (`git push --force`, `gh pr merge`, `npm publish`).
- `bin/setupPermissions.mjs`: merges the template into `.claude/settings.json` of the project it runs in
  (`cwd`, or the path given as an argument). Adds missing `deny` entries only, keeps the file's other keys and
  order, never removes an entry it did not add, records `"devAssistant": { "version": … }`, and prints a report:
  added, already present, file created or updated. Idempotent.
- `skills/setupPermissions/SKILL.md` with `name: setup-permissions` and `disable-model-invocation: true`: runs
  `node "${CLAUDE_PLUGIN_ROOT}/bin/setupPermissions.mjs"`, shows the report, and reminds that the project's
  `.claude/settings.json` is meant to be committed.
- A doc page `docs/skills/setupPermissions.md` and a `docs/skills/README.md` index, in the same spirit as the hooks
  docs; `tests/structure.test.mjs` extended to require a page per skill.

Done when:
- `npm test` runs the script against a throwaway project twice and proves the second run changes nothing, and
  against a project with an existing `settings.json` and proves foreign entries survive.
- `/setup-permissions` in a fresh project writes `.claude/settings.json`, and after a restart `Read(./.env)` is denied.

Later (not in this task): interactive mode via `AskUserQuestion` to pick rule groups; `CLAUDE.md` template with
the command map; `.claude/rules/` files.

## Draft of the next tasks

Order and contents are still being refined.

| # | Task | Essence |
|---|------|---------|
| T6 | `format-changed` hook | Prettier and oxlint --fix on the edited file (PostToolUse); a convenience, after the guards |
| T7 | "Done = verified" | `/verify` skill, `track` hook, `done-gate` Stop hook |
| T8 | `guard-bash` | the other git rules and dangerous commands, on top of `bin/lib/shell.mjs` |
| T9 | `guard-files` | protected paths and plan approval |
| T10 | `/feature` | plan, check, approval, implementation, review, draft PR |
| T11 | `/fix` | reproduce, root cause, minimal fix, test |
| T12 | `/self-review` | diff review by a subagent |
| T13 | `/commit`, `/handoff` | commit message from the diff; session summary into WORKLOG.md |
| T14 | `security-reviewer` agent | authz gaps, injections, PII in logs, on the diff |
