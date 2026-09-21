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
- Project config comes from the plugin through a script, not by hand: templates live in `templates/`,
  `bin/setupPermissions.mjs` merges them into the project (idempotent, never deletes foreign entries, prints what it
  added), and the `/setup-permissions` skill runs it. A SessionStart hook never edits project files on its own.
- Secret protection is two hooks, because they fire on different events: `secret-files-guard` (file access) and
  `secret-commit-guard` (staged diff at commit time). The permission `deny` list covers Read/Edit as a hard boundary
  once `/setup-permissions` has written it into the project; whether Claude Code honours a plugin's own `settings.json`
  is unverified.

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

Follow-up (0.7.1), found on the first real use: publishing `template-backend` to a fresh GitHub repository was blocked,
because `git push -u origin main` looked like a push to main. Added the second exception: a push to a protected branch
passes when the remote confirms (`git ls-remote --heads --exit-code`) that it has no such branch yet. An unreachable
remote still blocks; `--all` still blocks. `tests/helpers.mjs` gained `addBareRemote(repo, { branches })`; three cases added.

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

## T4 — `secret-commit-guard` hook · `done`

No token reaches a commit. Runs only when the command is `git commit`; scans the diff the commit would record.

What was done:
- `bin/secretCommitGuard.mjs`, registered as `PreToolUse` on `Bash`.
- Patterns in `bin/lib/secretPatterns.mjs`: private key blocks, AWS access key ids, JWTs, GitHub, Slack, Stripe live,
  OpenAI and Google keys, connection strings with a real password, and clear-text assignments to `SECRET`/`PASSWORD`/
  `TOKEN`/`API_KEY`-like names. Placeholders, references (`process.env.X`, `${VAR}`, calls, constants) and words that
  merely sound like secrets pass. A staged secret file (the T3 list) blocks on its own.
- Reads `git diff --cached --unified=0`, or `git diff HEAD` with `-a`/`--all` (also inside `-am`), in the repository
  the command really runs in. Only added lines are read, so removing a secret always passes.
- The block names the file, the line and the kind of secret, never the value.
- `allow-secret: <reason>` on a line lets it through; lines inside example env files are skipped.
- `bin/lib/gitCommands.mjs` extracted from `main-branch-guard` (`cd`, `pushd`, `git -C` tracking) and shared by both.
- `tests/helpers.mjs` gained `writeFiles(dir, files, { stage })` and `commit(dir)`.

Done when:
- `npm test` covers a blocked case per pattern, a passing clean diff, and the `allow-secret` exception.
- A page `docs/hooks/secretCommitGuard.md`, a row in the index and a row in the root README.

Result: released as 0.4.0; 85 tests pass. Known gaps on the hook's page: only known shapes are recognised, only
`git commit` is checked, and a secret already in the history is not found.

## T5 — `/setup-permissions` skill and the merge script · `done`

The first skill, and the one way plugin permissions reach a project. Deliberately narrow: it writes the `deny`
list and nothing else. Later it grows into an interactive setup (choose rule groups, fill the command map,
create `CLAUDE.md`); the script is written so that adding a second template is a small change.

What was done:
- `bin/lib/permissionRules.mjs`: builds the `deny` list in code from the T3 secret-file globs — `Read(./**/…)` and
  `Edit(./**/…)` per glob, the home-directory files as `~/…`, and the irreversible commands (`git push --force`,
  `git push -f`, `gh pr merge`, `gh release create`, `npm|pnpm|yarn publish`, `eas submit`). 58 rules.
  `Bash(cat …)` shapes were dropped: a `Bash` permission matches text by prefix, so they would catch nothing
  useful; shell reads stay with the hook.
- `templates/permissions.json`: the generated, readable copy (`node bin/setupPermissions.mjs --template`); a test
  fails when it drifts from the builder.
- `bin/setupPermissions.mjs [dir] [--dry-run] [--template]`: merges into `.claude/settings.json`, adds missing
  `deny` entries only, keeps every other key and entry in order, records `devAssistant.version`, prints a report.
  A file that is not valid JSON is reported (exit 1) and left untouched.
- `skills/setupPermissions/SKILL.md` (`name: setup-permissions`, human-only, `allowed-tools: Bash(node:*), Read`):
  runs the script, relays the report unchanged, reminds to commit and restart; says what it must not do.
- `docs/skills/README.md` (how skills run, the rules, how to add one) and `docs/skills/setupPermissions.md`;
  `tests/structure.test.mjs` now requires, per skill: a camelCase directory, a kebab-case `name:`, a page, an index
  row and a root README row.

Done when:
- `npm test` runs the script against a throwaway project twice and proves the second run changes nothing, and
  against a project with an existing `settings.json` and proves foreign entries survive.
- `/setup-permissions` in a fresh project writes `.claude/settings.json`, and after a restart `Read(./.env)` is denied.

Result: released as 0.5.0; 97 tests pass; `claude plugin details` lists the skill. The second done criterion is
checked by the script tests and by `claude plugin validate`; the end-to-end run in a real session is still to
be tried once the plugin is put to use.

Later (not in this task): interactive mode via `AskUserQuestion` to pick rule groups; `CLAUDE.md` template with
the command map; `.claude/rules/` files.

## T6 — `format-changed` hook · `done` → merged into T7

> Superseded in 0.7.0: hooks on one event run in parallel with no ordering, so a formatting hook and a linting hook
> writing and reading the same file would race. Formatting became the first stage of `lint-feedback` (T7);
> `bin/formatChanged.mjs` and its page were removed, the detection logic moved to `bin/lib/projectTools.mjs`.

Formatting never costs the model a turn: the project's own formatter and lint fixer run on the one file the
model just wrote.

What was done:
- `bin/formatChanged.mjs`, registered as `PostToolUse` on `Edit|Write|MultiEdit`, timeout 60 s.
- Runs, in order, Prettier (`--write`), ESLint (`--fix --quiet`) and oxlint (`--fix --quiet`) on the file — each
  only when the project configures it (config file or `package.json` key/dependency) **and** has it installed
  under `node_modules/.bin`, searching upwards for a hoisted install. Nothing is downloaded.
- Project root is the nearest `package.json` above the file, so in a monorepo the package's own config applies.
- Skips generated and vendored directories and every extension outside the formattable list; lints source
  extensions only.
- Always exits 0: no output, no block, nothing shown to the model; a failing or slow tool leaves the file as it was.

Done when:
- `npm test` proves the right tool is called from the right directory on the right file, and that nothing runs
  without a config or without an install.
- A page `docs/hooks/formatChanged.md`, a row in the index and a row in the root README.

Result: released as 0.6.0; 108 tests pass. Tests use fake tools under `node_modules/.bin` that record their calls,
so the plugin stays dependency-free. Limitations on the page: only files written through the file tools, only the
changed file, only what the fixers can autofix; a `format` command from the command map (T7) can take precedence later.

## T7 — `lint-feedback` hook · `done`

The linter's verdict reaches the model in the same turn as the edit, so a pattern the linter can express is
fixed before the next step, not discovered later by a lint run or a reviewer.

What was done:
- `bin/lintFeedback.mjs`, registered as `PostToolUse` on `Edit|Write|MultiEdit`, timeout 90 s. Three stages in one
  process, because parallel hooks cannot share a file: Prettier `--write`, then ESLint and oxlint with `--fix --format
  json`, then the errors that remain are relayed to the model (exit 2, stderr) as `line · rule · message` with the
  way out: fix the code, never disable the rule. Warnings are not reported; a clean file is silent.
- Capped at 20 lines, with a count of the rest and a pointer to the lint command.
- ESLint's JSON (`severity: 2`, `ruleId`, a null rule is a parse error) and oxlint's JSON (`diagnostics`,
  `severity: "error"`, `code`, first label's line) are both parsed; unreadable output is treated as no errors.
- `bin/lib/projectTools.mjs`: `detectTools(file, cwd)` (nearest `package.json`, config or `package.json` key or
  dependency, executable under `node_modules/.bin` searching upwards) and `runTool`.
- `bin/lib/hookIo.mjs` gained `warn(hook, message, alternative)`: the PostToolUse shape of `block`.
- Verified on `template-backend` with the real Prettier and oxlint: the probe file came back formatted and the two
  errors without an autofix (`no-explicit-any`, `func-style`) were reported with their lines.

Done when:
- `npm test` proves errors are relayed in the fixed shape, warnings are not, a clean file is silent, the cap holds,
  and a project without a linter stays silent.
- A page `docs/hooks/lintFeedback.md`, a row in the index and a row in the root README.

Result: released as 0.7.0; 113 tests pass. Project conventions that a lint rule can express (`no-restricted-imports`,
`no-restricted-syntax`) are the cheapest way to teach the model a pattern; the page shows how.

## T8 — Pattern rules in `.claude/rules/` and the `/derive-rules` skill · `todo`

What the linter cannot express — layering, where business logic lives, how errors are thrown, naming from the
glossary — lives in `.claude/rules/*.md` files with `paths:` frontmatter, loaded when the model touches a
matching file. The rules are derived from the code that exists, confirmed one by one, not imported from a
generic list.

What to do:
- `templates/rules/`: a rule-file template (frontmatter with `description` and `paths`, numbered rules, each with
  the reason) and a short example for one layer.
- `skills/deriveRules/SKILL.md` (`name: derive-rules`, human-only): reads 5–10 representative files per area of the
  project, lists conventions that are consistent, opinionated or unusual, asks the human to confirm, edit or skip
  each, and writes the confirmed ones into `.claude/rules/<area>.md`. Never writes a convention it merely inferred.
- The setup script (`bin/setupPermissions.mjs`, or a sibling) learns to install a rule file without overwriting a
  project's edits.

Done when:
- Running `/derive-rules` on `template-backend` yields a `.claude/rules/backend.md` the human recognises as true.
- A page `docs/skills/deriveRules.md`, a row in the index and a row in the root README.

## T9 — `pattern-reviewer` agent · `todo`

A read-only subagent that reviews a diff against `CLAUDE.md` and the `.claude/rules/*.md` files matching the
touched paths, and reports what a linter cannot see: logic in a controller, a swallowed error, a second pattern
where the neighbouring module already has one.

What to do:
- `agents/patternReviewer.md`: read-only tools (`Read`, `Grep`, `Glob`, `Bash(git diff:*)`), a turn limit, a fixed
  report shape — findings by severity, each with file, line, the rule it breaks (by name) and the concrete fix;
  a clean diff gets a one-line PASS.
- Reviews the diff, not the files: findings about untouched code are out of scope.
- `docs/agents/README.md` (how agents run, the rules, how to add one) and `docs/agents/patternReviewer.md`;
  `tests/structure.test.mjs` extended to require a page per agent, as for hooks and skills.
- Feeds `/self-review` (T13) later; usable on its own as `@pattern-reviewer` meanwhile.

Done when:
- The agent, run on a diff with a planted layering violation and a swallowed error, reports both with the rule
  name and the fix, and reports PASS on a clean diff.
- A page per agent, a row in the index and a row in the root README.

## Draft of the next tasks

Order and contents are still being refined.

| # | Task | Essence |
|---|------|---------|
| T10 | "Done = verified" | `/verify` skill, `track` hook, `done-gate` Stop hook; needs the command map in `CLAUDE.md` |
| T11 | `guard-bash` | the other git rules and dangerous commands, on top of `bin/lib/shell.mjs` |
| T12 | `guard-files` | protected paths and plan approval |
| T13 | `/self-review` | diff review through `pattern-reviewer` and `security-reviewer`, plus scope, bypass and docs checks |
| T14 | `/feature` | plan, check, approval, implementation, review, draft PR |
| T15 | `/fix` | reproduce, root cause, minimal fix, test |
| T16 | `/commit`, `/handoff` | commit message from the diff; session summary into WORKLOG.md |
| T17 | `security-reviewer` agent | authz gaps, injections, PII in logs, on the diff |
