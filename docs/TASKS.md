# Tasks

Task list for our own Claude Code assistant plugin.
Based on: [referencePluginResearch.md](referencePluginResearch.md).

Statuses: `todo` · `in progress` · `done`.

## Decisions

- Plugin name: **dev-assistant**. Commands look like `/dev-assistant:verify`, or just `/verify` when the name is not taken.
- The repository is its own local marketplace, `bagrijroman`; the install id is `dev-assistant@bagrijroman`.
- Every hook ships with its own page in [hooks/](hooks/README.md) and a row in its index; `npm test` fails otherwise.
- The reference plugin is disabled (2026-09-11) so its hooks do not fire alongside ours.
- Files are named in camelCase; a hook keeps its kebab-case name in messages and docs. `TASKS.md` and `README.md` stay upper-case.
- Project config comes from the plugin through a script, not by hand: templates live in the skill's folder
  (`skills/setupPermissions/templates/`), `bin/setupPermissions.mjs` merges them into the project (idempotent, never deletes foreign entries, prints what it
  added), and the `/setup-permissions` skill runs it. A SessionStart hook never edits project files on its own.
- Secret protection is two hooks, because they fire on different events: `secret-files-guard` (file access) and
  `secret-commit-guard` (staged diff at commit time). The permission `deny` list covers Read/Edit as a hard boundary
  once `/setup-permissions` has written it into the project; whether Claude Code honours a plugin's own `settings.json`
  is unverified.
- A skill keeps everything it reads or copies in its own folder, so it travels whole: `skills/<name>/SKILL.md` holds
  the entry point and the rules that never bend, `skills/<name>/references/*.md` the step-by-step procedure loaded per
  phase or mode, `skills/<name>/templates/` one template per output file. Until 0.9.0 the templates sat in a shared
  root `templates/`; they moved so that each skill is self-contained once the plugin is published, and `npm test`
  fails when a skill names a file that is not there. The product-design skills (`/blueprint`, `/backlog`,
  `/showcase`) write into `docs/<name>/` by default; the folder is proposed in a dialog and is the operator's to
  change. Each of them is used from the plugin while still script-less, so the procedure is proven before the
  mechanical parts are frozen in `bin/`.
- A skill that writes files has a working folder, and nothing is created outside it, not even for a moment —
  temporary files included; never the project root, `/tmp`, the session's scratchpad or an outputs folder
  (T25, rule 7 in [skills/README.md](skills/README.md)). `/standards` keeps its state in `docs/standards/`.
- Every skill shows the operator where it is: a checklist of the mode's stages, a progress line, the waits and the
  resume point; the chat checklist is the guarantee, the session's task list a mirror (T26, rule 8).

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
- `templates/permissions.json` (since 0.9.0 in `skills/setupPermissions/templates/`): the generated, readable copy (`node bin/setupPermissions.mjs --template`); a test
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

## T9 — `pattern-reviewer` agent · `done` (0.12.0, with T24)

A read-only subagent that reviews a diff against `CLAUDE.md` and the `.claude/rules/*.md` files matching the
touched paths, and reports what a linter cannot see: logic in a controller, a swallowed error, a second pattern
where the neighbouring module already has one.

What to do:
- `agents/patternReviewer.md`: read-only tools (`Read`, `Grep`, `Glob`, `Bash(git diff:*)`), a turn limit, a fixed
  report shape — findings by severity, each with file, line, the rule it breaks (by name) and the concrete fix;
  a clean diff gets a one-line PASS.
- Reviews the diff, not the files: findings about untouched code are out of scope.
- Also reviews against the rules marked `review` in the installed standards packs (T24); every finding cites its rule
  id, or says it fits no rule, and is recorded for T24's promotion.
- `docs/agents/README.md` (how agents run, the rules, how to add one) and `docs/agents/patternReviewer.md`;
  `tests/structure.test.mjs` extended to require a page per agent, as for hooks and skills.
- Feeds `/self-review` (T13) later; usable on its own as `@pattern-reviewer` meanwhile.

Done when:
- The agent, run on a diff with a planted layering violation and a swallowed error, reports both with the rule
  name and the fix, and reports PASS on a clean diff.
- A page per agent, a row in the index and a row in the root README.

## T18 — `/blueprint` and `/backlog` skills · `in progress`

Two skills that take a project from raw input to a list of work. `/blueprint` reads everything the operator has
(documents, an idea, requirements, similar products) and writes English product-design documents at three depths —
brief and architecture, modules, capabilities — through eight gated phases, asking the operator at every structural
fork and logging each decision; web research only after consent. `/backlog` cuts a finished blueprint into vertical
batches of tasks and subtasks (each batch leaves something working end to end), details lazily, and keeps the list
true while the work happens (`next`, `done`, `add`, `resync`). The backlog reads the blueprint and never writes it.

What was done (0.8.0):
- `skills/blueprint/SKILL.md` + `references/phases.md` + `templates/` (13 files: STATE.json, README index,
  sources, brief, architecture, roadmap, adequacy review, module with L2/L3 capability block, competitor profile,
  decisions, assumptions, open questions, glossary).
- `skills/backlog/SKILL.md` + `references/slicing.md` + `references/modes.md` + `templates/` (STATE.json,
  BACKLOG overview, PLANNING, COVERAGE, batch, task with subtask checklist).
- Pages `docs/skills/blueprint.md` and `docs/skills/backlog.md`, rows in the index and the root README.
- Both skills are human-only, write English only, keep state on disk (`STATE.json` with a `kind`), find each other
  by that `kind`, and share one decision mechanism: 2–4 questions per round, recommendation first, "Other" always
  possible, every outcome logged with an id the documents cite.
- Surfaces and platforms. The blueprint carries **surfaces** (where an actor meets the product: web, mobile, …) as
  one dimension through every document — decided in the brief (always a question; the Intake answer is a source),
  a column on the module map, a row per module × surface in the roadmap, a `Surfaces:` line per capability that
  inherits from its module so that only exceptions are asked, a *Surface parity* concern, and a surface walk in the
  adequacy review. The backlog turns surfaces into **platforms** (`web`, `ios`, `android`, cross-platform `mobile`)
  through a platform map decided at `init` from the brief's constraints; a task carries `platforms:`, a capability on
  surfaces with different platforms becomes a task per platform.
- Review of `/blueprint` (0.9.0, 2026-10-08), from two independent readings checked against ETC.V2's documentation:
  the module and capability writers read the module's sources in full; decisions, module maps and feature ids already
  in the sources are cited and built on, not asked again, and implementation decisions go to the brief's *Decided
  outside this blueprint*; questions keep within the tool's limits; `STATE.json.updated` is a timestamp written on
  every change, with `counts`, and `CHANGELOG.md` after done; capabilities have stable ids (`ORG-C03`) in one block
  format; one depth × stage table; subagents write only their own file and leave open points on disk; the output
  folder is checked for git; folders are expanded file by file at intake; a coverage table traces every source item;
  reviews are split by module, flow and actor; one assumption per capability, and gates show counts and the top ten;
  a domain model and a roles × modules matrix in the architecture, an access table per module; a `restructure` mode.
- Mechanisms for `/blueprint` (0.9.0, 2026-10-09). `bin/blueprint.mjs` does the bookkeeping — `next` (every id;
  capability ids reserved through `lastCapability`), `stamp` (`updated` and `counts`), `changed` (hand edits),
  `validate` (references, ids, markers, module files, counts, coverage), `export` (one document to send) — tested
  in `tests/blueprint.test.mjs`. Four agents with narrowed tools — `blueprint-reader` (no web search),
  `blueprint-writer`, `blueprint-reviewer` (read-only), `blueprint-researcher` (the only one with web search) —
  documented in `docs/agents/`; the skill no longer grants itself web tools. A failed agent leaves its unit
  `failed` for the next `continue`, and the operator hears the size of every wave first. Goals, non-functional
  requirements and risks have ids (`G-`, `N-`, `RK-`) that capabilities cite; a *Risks* section in the brief and a
  *risk* kind in the adequacy review; *Decided by* on every decision; personal data marked in the domain model and
  walked in the adequacy review; a discovery interview for thin input; `feedback` and `export` modes; phase 1
  renamed *Reading the input*. `references/phases.md` split into `mechanics.md`, `intake.md`, `design.md`,
  `modules.md`, `reviews.md` and `modes.md`; the structure test checks `references/` paths, `file.md › Heading`
  cross-references and agents.
- Review of `/backlog` (0.9.0, 2026-10-09), from six independent readings — the contract with the blueprint,
  internal consistency, the data model, a dry run of `init`/`detail` and of the daily loop on ETC.V2's documentation,
  authoring and method — each finding checked by an adversarial verifier. Aligned with the blueprint: capabilities
  cited by id, never by heading anchor; an inventory of the 0.9.0 capability block (own stage, R/E/S counts, access
  row, open markers, list-only) from the module files `STATE.json` lists, never `modules/removed/` or `export/`; a
  fingerprint that copies `updated`, `counts`, `phase`, `depth`, open questions and the module entries; the blueprint's
  `changed` before `status`, `detail` and `resync`; `resync` from `CHANGELOG.md`, following ids through renames,
  moves and restructures, stages, surfaces, opened and closed questions, and closing *Feedback* rows that go to
  `/blueprint feedback`; effective stage per capability and surface, *in scope* as the first stage with a *first
  release* question; list-only capabilities as outline rows, not gaps; *Decided outside this blueprint* settles the
  platform map and mandates foundation work; `N-`, access rows and states reach acceptance criteria through
  *Standing criteria*. Data model: `references/mechanics.md` split out; outline rows numbered at the outline gate
  from `lastTask` and stored in the batch tables, `COVERAGE.md` rows stored, only the listed parts regenerated; four
  stored statuses, *ready* and *blocked* computed; batch completion and closing with the operator, `currentBatch`
  derived; `pending` with `continue`; hand edits listed by `find -newer STATE.json`; the output folder checked for
  git and the blueprint path relative to it. Method: what the code already does is read at `init`; batch 1 exempt
  from the batch size; an open question blocks only a core path; thin-batch capabilities leave their rules to the
  widening batch; cross-cutting concerns arrive with the first batch that touches them; task types `bug`, `chore`,
  `spike`, `polish` defined; operational requirements are tasks; a `plan` mode for moves, drops, reordering and
  renumbering. `tests/backlogContract.test.mjs` checks the fields, phases and modes the backlog reads.

What is left:
- ~~A way to deepen one module of the blueprint to full L3~~ — done in T30 (0.14.0): `/blueprint module <name>
  full`, which `/backlog` now points to.
- Run `/blueprint` end to end on a real project (ETC.V2 with `initialDocs/` as sources), then `/backlog init` on the
  result; adjust the procedures from what the run shows (question rhythm, structural-vs-assumption boundary, gate
  friction on small phases, module drift between parallel subagents, the cost of regenerating views by hand).
- ~~`bin/backlog.mjs`: `next-id`, `render`, `tick`, `validate`~~ — done in T31 (0.15.0), with `status` and `next`
  as well. Still open: `init` (the scaffold of the folder from the templates).

Done when:
- A blueprint and a backlog exist for ETC.V2 that the operator recognises as true and can work from.
- `npm test` covers both scripts; the skills call the scripts instead of counting ids and regenerating views by hand.
- Pages, index rows and README rows exist (already true; the structure test holds).

## T19 — `/showcase` skill · `in progress`

The design showcase the author has built by hand for several products (valere-poc `initialDemo`, AssistiaV2
`Docs/design`, ETC.V2 `initialDocs/initialDemo`), as a skill: a static site in `docs/showcase/` that shows the
customer the product before it exists and gives the team what every screen is drawn with. Reads the whole
documentation folder; the color scheme is decided first, then the stack, then the frame is laid and the sections
are made in dependency order with a gate each; variants (logo, sign-in, app layout, 404) are picked by the operator;
flows take two approvals (the list, then each description) and get a step player; theme (light / dark / system) and
interface languages (default English) switch the whole site.

What was done (0.9.0):
- `skills/showcase/SKILL.md` + `references/phases.md` (the 21 steps and the other modes), `references/sections.md`
  (what every section contains), `references/site.md` (how the frame works, the audit checklist).
- `skills/showcase/templates/frame/`: the frame, taken from the ETC.V2 demo site and generalised — `build.mjs` rewritten for
  the new menu model (bands → root sections → sections or child pages, i18n keys on every label, fonts and language
  scripts in `<head>`, the language switch), `open.mjs`, `assets/nav.js` (root-title clicks, presentation mode,
  `pageswap` event), new `assets/i18n.js`, `assets/flow.js`, `assets/site.css`, `tools/lib/html.mjs` (page shell and
  blocks: `renderPage`, `section`, `block`, `variant`, `flowPlayer`, `device`, `mail`), `tools/genPages.mjs`;
  `assets/showcase.css`, `assets/showcase.js`, `base.css` copied as they were.
- `skills/showcase/templates/`: `site.mjs`, the standard `pages.mjs` (20 root sections in customer order), neutral
  `tokens.css`, starter `components.css`, `sample.mjs`, `i18n/lang.js`, `STATE.json`, `DECISIONS.md`, `README.md`,
  `tools/gen.example.mjs`.
- Smoke test by hand: scaffold with two languages, `genPages` for 19 pages, `build.mjs` idempotent, Playwright pass
  (root-title click, language and theme switches, presentation mode, scroll-spy) with no console errors.
- The menu keeps one root section open at a time: every root's `<details>` shares `name="sc-side"` (the browser's
  exclusive accordion), `nav.js` folds the others where that is unsupported and no longer scrolls the menu to a link
  inside a folded root. `tests/showcaseFrame.test.mjs` scaffolds the frame and checks the build. A browser check
  (Chromium, ten scenarios and a control run without the scroll guard) confirmed it; what it found was fixed: a swap
  to a page whose root is a plain link folds every root, as a reload does; keyboard focus stays in the menu when a fold
  would hide it; a folded root still marks the page on show (`aria-current="true"` on a flow's root); the starter
  `components.css` gained the brand tile and the navigation link the frame's menu uses. Two pre-existing accessibility
  issues it found — the closed narrow-screen drawer stays in the tab order, and a root's chevron and title are two
  focus stops with one name — were left for the review of `/showcase` (below).
- Page `docs/skills/showcase.md`, rows in the index and the root README.
- Review (2026-10-09): a fresh scaffold driven through Playwright, the procedure read for gaps. Frame fixes: presentation
  mode (the page fell into the menu's 240 px column); the Flows index (laid once by genPages, it never listed a flow added
  later — build.mjs now writes it from `children`); a flow's i18n key colliding with the root section of the same id
  (`signIn`; a child is now `nav.<root>.<child>`, and build.mjs refuses two entries on one key); the empty
  `data-go="end"` note; the breadcrumb falling back to the first section after a language round trip; frame words that
  could not be translated (flow step titles, the starting pages, contrast and switch words); markup lost in translated
  text; empty live values for `oklch()` and `color-mix()` tokens; `--lg-ground` undefined in the brand tile; the closed
  narrow drawer in the Tab order (now inert); a malformed address stopping `open.mjs`. Procedure fixes: Microcopy is step
  6, before Components, as the source of every string; approved plans and flow descriptions live in `plans/`;
  `CHANGELOG.md` is the Changelog page's source; the overview is written in the Frame step; SC-001…008 are reserved rows;
  the charts library is asked once (step 2); subagents never write a shared file; step 1's scheme page stands alone, as
  the frame is not laid yet; `STATE.json` keys follow the steps and `pending` is documented. Four tests added.
- Step highlights in flows (2026-10-09, the operator's idea): what the user acts on in a step carries
  `data-flow-target="1"`, `"2"`, … — ringed and numbered while the step is on show, the emphasis walking through them in
  order; the note names them with `flowMark(n)`; a Hints button turns it off. Flow descriptions name the controls of each
  step in order, so the build knows what to mark.

What is left:
- Run `/showcase` end to end on a real project (ETC.V2, after its blueprint), adjust the procedure from what the run
  shows: the scheme proposals, the plan-then-build rhythm, the generators' shape, the dictionaries.
- `bin/showcase.mjs`: `scaffold` (the copy with placeholders filled, genPages, build) and `screenshots` (Playwright,
  every page × theme). `check` is done in T31 (0.15.0).
- `assets/illustrations.js` conventions and `--ill-*` tokens as a template once the first set is drawn.
- A root's chevron and title in the menu are two focus stops with one name.
- ~~`check` should also compare the two dark blocks of `tokens.css`~~ — done in T31 (0.15.0).

Done when:
- A showcase exists for ETC.V2 that the operator would show a customer.
- `npm test` covers the script; the skill calls it instead of copying and checking by hand.
- Page, index row and README row exist (already true; the structure test holds).

## T20 — `/research` skill · `in progress`

Market, competitor and domain research for a project, as a wrapper over Anthropic's `deep-research` skill rather than a
search engine of our own. deep-research already plans subtopics, runs research agents in parallel and writes a report;
what it lacks is what the plugin cares about — a scope the operator approves before anything is searched, a question
each finding answers, dated sources, "not found" kept apart from "does not have", output `/blueprint` can take apart,
and a way to work when deep-research is not installed. `/research` adds those at both ends and delegates the middle.

What was done (0.10.0):
- `skills/research/SKILL.md` + `references/phases.md` (Frame, Research, Curate, Review; `continue`, `status`,
  `extend`) and `references/engines.md` (choosing the engine, the deep-research prompt and collecting its output from
  the project root into `raw/round-<n>/`, the scouts' fallback, the curator's brief, failures).
- `skills/research/templates/`: `STATE.json`, the runs index `README.md`, `brief.md`, `summary.md`, `sources.md`,
  `competitors/competitor.md` (the blueprint's profile layout with `R-NN` ids).
- Agents: `research-curator` (Read, Glob, Grep, Write — no web tools, so the curated files hold only what the research
  brought back) and `research-scout` (Read, Write, WebSearch, WebFetch — the fallback engine, one per question group).
- Pages `docs/skills/research.md`, `docs/agents/researchCurator.md`, `docs/agents/researchScout.md`; rows in the
  skills and agents indexes and the root README.

Decisions:
- A wrapper, not a rewrite: the value is the brief before and the curation after; the search is deep-research's.
- The approved brief is the consent, recorded in `STATE.json`; questions found along the way become a new round.
- Run ids `RQ-NN` and `R-NN` are local and differ from the blueprint's `Q-NNN` and `S-NN`; a blueprint takes a run
  through its own Intake (`summary.md` and `competitors/`, reliability `web`). Neither skill writes into the other.
- Results always go to `docs/research/`, a folder of their own inside the project's `docs/`; the folder is not asked
  (the operator's request, 2026-10-12). Only which repository's `docs/` is asked, when the project root holds several.
- deep-research's report path is read from its own message, never assumed, since its layout is not ours.
- Output file names are lower-case (`brief.md`, `summary.md`, `sources.md`) per the camelCase rule; `STATE.json` and
  `README.md` keep the form the other skills use.

What is left:
- Run `/research` end to end on a real topic with deep-research, and once without it (scouts); adjust the prompt, the
  question count and the curator's layout from what the runs show.
- `bin/research.mjs`: `next` (RQ and R ids), `validate` (every question with a section and status, every `R-NN`
  resolving, no `R-??`, every product with a profile, the index row current), `stamp`. Tests in
  `tests/research.test.mjs`.
- Consider a pointer from `/blueprint`'s research offer to `/research` for research wider than one product's gaps.
- A `PreToolUse` hook that keeps the curator's and the scouts' `Write` inside their run folder.

Done when:
- Two real runs (deep-research and scouts) produce summaries the operator would hand to a blueprint.
- `npm test` covers the script; the skill calls it instead of checking by hand.
- Page, index rows and README rows exist (already true; the structure test holds).

## T21 — `allow` rules for routine git commands in `/setup-permissions` · `done`

Every `git status`, `git diff` or `git commit` asked for approval, and the approvals piled up as one-off rules in
each machine's `settings.local.json`. The plugin now carries one reviewed `allow` list and `/setup-permissions`
writes it next to the `deny` list, so a project gets it in the committed `.claude/settings.json`. This lifts T5's
"deny only" limit by the human's decision (2026-10-12).

What was done:
- `bin/lib/permissionRules.mjs`: `buildAllowRules()` — `Bash(git <command>:*)` for `status`, `diff`, `log`,
  `show`, `branch`, `rev-parse`, `ls-files`, `ls-remote`, `blame`, `grep`, `describe`, `fetch`, `pull`, `add`,
  `commit`, `switch`. Left out: `push` (publishes), `reset`, `restore`, `checkout`, `clean`, `stash` (can discard
  work), `rebase` and `filter-branch` (rewrite history). Commits still pass through `main-branch-guard` and
  `secret-commit-guard`.
- `bin/setupPermissions.mjs`: merges `allow` the same way as `deny` (adds what is missing, keeps foreign entries and
  their order); the report has counts per list; `--template` prints both lists.
- `skills/setupPermissions/templates/permissions.json` regenerated; `SKILL.md`, the skill page, both index rows
  updated.

Done when:
- `npm test` proves the allow list holds no command that publishes, discards work or rewrites history, that no rule
  is both allowed and denied, and that a project's own `allow` entries survive the merge.

Result: 0.11.0; 224 tests pass. Not yet tried in a real project after a restart.

## T22 — Test gate: tests planned before the code, checked before review and at commit · `todo`

New functionality reaches the operator's review, and then a commit, only with the tests that matter, or with the
operator's reason for going without. "Covered" is judged by risk, not by a percentage: the most important scenarios,
each at the cheapest level that proves it, so the suite stays small and fast. A test is never deleted or weakened to
get a green run: a failing test is investigated. Agreed with the operator on 2026-10-12.

What to do:
- Test plan before the code: each acceptance criterion → test level (unit, component, API, e2e) → file, or "no test,
  because …". The operator approves it together with the plan of the code. A `/backlog` task keeps it in a
  `## Test plan` section (the `TASK.md` template gains it).
- `bin/testGate.mjs`: one check, two entry points.
  - `Stop`: when code changed, blocks at most once per operator message with the gaps, so the operator reviews code
    and tests together.
  - `PreToolUse` on `Bash`, for `git commit` (the staged diff): blocks while a gap remains, and the message sends
    Claude to `/test-plan gaps`. A hook cannot start a skill itself; a commit retried without the fix is blocked again.
- Gaps the script finds on its own, with no model involved:
  - a test-plan item without its test, or with a red one;
  - new code that no test runs: the tests related to the changed files, with coverage, through the project's own
    command (nothing hardcoded; e2e suites are not run here);
  - a new endpoint without an API test: a new method + path in the diff of a committed `openapi.json`, the documented
    statuses as candidate cases (`template-backend` gains the snapshot and a test that fails when it is stale);
  - a new screen without an e2e spec;
  - a weakened test: a deleted test or test file, a new `.skip`/`.only`/`.todo`, a test without an assertion, a
    changed expected value in an existing test.
- `/test-plan` skill, invocable by the model as well as the operator: `plan` writes the test plan; `gaps` proposes the
  few most important missing tests, each with one line on what breaks without it, and asks the operator: write all ·
  choose some · commit without tests (then asks the reason).
- Priorities live in the project's `.claude/rules/testing.md`: always (business rules; access, money, data deletion;
  each new endpoint's success and main error; a bug fix's reproducing test), when there is logic (branches, edge
  cases), never (trivial code, markup without logic, types, config, what another test already covers). Playwright
  only for key user flows.
- Going without tests is the operator's choice only: the commit message carries `Tests-skipped: <reason>`, which the
  commit hook accepts. A deleted test is refused even then, unless the code it tests goes in the same commit (a
  feature removed on purpose, decided 2026-10-12) and the message carries `Tests-removed: <reason>`. A changed
  assertion passes with `Tests-changed: <cause>`, written after the skill has found whether the code or the test was
  wrong and the operator agreed.
- Pages `docs/hooks/testGate.md` and `docs/skills/testPlan.md`, rows in both indexes and the root README.

Done when:
- `npm test` proves, on throwaway repositories: every kind of gap blocks; a clean change passes; `Tests-skipped:`
  passes; a deleted test is refused even with it, and passes with `Tests-removed:` when the code it tests goes too;
  the Stop hook blocks at most once per operator message.
- On `template-backend`, a new endpoint without an API test blocks the commit, and `/test-plan gaps` proposes its
  success and main error cases.

Later (not in this task):
- `/fix` (T15): the new test fails on the code before the fix and passes with it, checked by the script.
- T10's `done-gate` takes over the Stop entry point and adds typecheck, lint and build.
- The operator's own commits are not seen by Claude Code hooks; a husky `pre-commit` could run the mechanical part.

Open:
- Where the test plan lives for work that does not come from `/backlog`.
- Whether the commit hook confirms from the session transcript that a skip reason came from the operator.

## T23 — Design gate: UI planned from the design system, checked before review and at commit · `todo`

Added UI is built from the project's design system and uses each token for what it means. The shape is T22's:
scripts find what is certain and block, the `/design-review` skill judges the rest and proposes fixes, the operator
decides. Agreed with the operator on 2026-10-12: variant B (the code is reviewed; screenshots come later), semantic
tokens only, no raw HTML controls outside the UI kit.

What to do:
- UI plan before the code, in `/feature`'s plan (T14): the components and tokens a screen is built from, and what the
  system lacks. A missing token or component is added to the design system first (raw value, light and dark, the
  `@theme` mapping, shown on `/design-system`), then used.
- Lint rules in the project, next to `eslint/noRawVisualValues.mjs`, so that CI runs them too and `lint-feedback`
  relays them in the same turn; the plugin keeps them as templates for the setup script:
  - semantic tokens only: no default Tailwind radius or shadow utility where the system has its own (`rounded-lg`
    → `rounded-control`); `rounded-full` stays, as a shape;
  - UI-kit components only: no raw `<button>`, `<input>`, `<a>`, `<select>`, `<textarea>`, `<table>` outside
    `src/components/ui/` (none today); no `Button` whose `onClick` pushes a route (that is a `ButtonLink`).
- `bin/designGate.mjs`, on T22's entry points (`Stop`, `git commit`):
  - every token on `:root` has a dark value and a `@theme` mapping; every token and every UI-kit component is shown
    on `/design-system`;
  - every text-on-background token pair reaches 4.5:1 in both themes;
  - when UI files changed, the message sends Claude to `/design-review`.
- `design-reviewer` agent (read-only) behind the `/design-review` skill: reads the diff, the token guide and the UI
  kit, and reports per finding the file, the line, the rule and the fix — a token used against its meaning
  (`text-danger` as a red accent), a missing state (focus, disabled, loading, empty, error), the dark theme,
  accessibility. The operator chooses: fix all · choose some · skip with `Design-skipped: <reason>` in the commit
  message.
- Token guide in the project, `.claude/rules/designSystem.md` with `paths:` on the UI sources, so that Claude reads it
  whenever it edits UI: every semantic token, what it is for and where it must not be used; every UI-kit component and
  when to use it. Derived from `globals.css`, `/design-system` and `CLAUDE.md`, confirmed by the operator line by line
  (the `/derive-rules` mechanism, T8).
- Pages for the hook, the skill and the agent, rows in the indexes and the root README.

Done when:
- `npm test` proves every rule and check on fixtures — a raw `<button>`, `rounded-lg`, a token without a dark value, a
  token missing from `/design-system`, a low-contrast pair — and that a clean change passes.
- On `template-next-admin`, a planted misuse (`text-danger` as decoration, a form without a loading state) is reported
  by `/design-review` with the rule and the fix, and stays as a `claude plugin eval` case.

Later (not in this task):
- Variant C: screenshots in light and dark through the e2e setup (`mockApi`), visual comparison in CI, axe.
- The mobile template: the same gate with React Native rules.

Open:
- Typography: the system has no type-scale tokens, and the code uses Tailwind's (`text-sm` ×36, `font-semibold` ×16,
  `text-xs` ×12, …). Either semantic text tokens and a migration of about 80 places, or the default type scale stays.
- Spacing stays on Tailwind's scale, which is a token scale already, unless decided otherwise.

## T14 — `/feature` skill: one feature from plan to commit · `todo`

The way a feature gets built: its code, tests and UI are planned before any code is written, the operator approves
the plan, the work goes in small steps, the test and design gates hold, and the change is handed over for review.
The home of T22's test plan and T23's UI plan. Asked for by the operator on 2026-10-12.

What to do:
- Input: a `/backlog` task (its acceptance criteria and *How to verify*) or a request in the operator's words; a thin
  request gets questions first.
- Plan, before any code: the steps (files, layer, order), the test plan (T22), the UI plan (T23). A `/backlog` task
  keeps them in its file; other work keeps them where T22 decides.
- The operator approves, changes or drops the plan; nothing is written before the approval.
- Build one step at a time: the code, its tests, the related tests run; `lint-feedback` works on every edit.
- Done means the T22 and T23 gates hold; `/test-plan gaps` and `/design-review` run when a gate sends Claude there.
- The project's `WORKLOG.md` gets the feature row and its `Tests:` row in the same change.
- Hand-over: what was done, how to verify it, what was left out and why.
- A commit only on the operator's word, through the commit gates; a `/backlog` task is then closed with `/backlog done`.
- Page `docs/skills/feature.md`, rows in the index and the root README.

Done when:
- One endpoint on `template-backend` and one screen on `template-next-admin` go through `/feature` from plan to
  commit, and the operator recognises the plan, the tests and the UI as right.

Open:
- A draft pull request at the end, or commits on `dev` only.
- Whether a plan-approval hook (T12) refuses edits before the plan is approved.

## T24 — Standards: a practice written once, enforced at every stage · `done`

A practice the operator wants in every project is written once, as a rule with an id, and reaches the code through
every layer that can carry it: the rule text while the code is written, a lint rule or a script check when it is
checked, the reviewer where only judgement can tell. A rule the review keeps catching moves to a stronger layer.
Agreed with the operator on 2026-10-13; the first pack is React and React Native.

What to do:
- Rule packs in the plugin, `skills/standards/templates/packs/<pack>.md`, one source for generation, checks and
  review, so they cannot drift apart. `paths:` frontmatter; per rule: an id (`RCT-01`), the rule, the reason, a good
  and a bad example, web and native notes where they differ, and `Enforced by:` — `lint <rule>`, `check <name>`,
  `review`, or several.
- `/standards` skill, human-invoked:
  - `install <pack>` writes the pack into the project as `.claude/rules/<pack>.md`, with the project's own paths
    filled in (the shared components folder, the tokens file, a reference component), and the pack's lint rules into
    the project's `eslint/` with their config entries, so that CI runs them and `lint-feedback` relays them in the
    same turn. Through a script, idempotent, never overwriting the project's edits (T8's install mechanism).
  - `status`: installed packs, their versions, the project's edits, findings per rule.
  - `update`: merges a newer pack, keeping the project's edits.
  - A rule the project does not want is switched off in its file with the reason, never deleted silently.
- First pack, `react` (React web and React Native):
  - **RCT-01 Shared components.** A component used in more than one feature, or meant to be, lives in the project's
    shared folder (`src/components/`), not inside a feature. Lint: a feature never imports another feature's
    `components/` (`import/no-restricted-paths` zones, or a rule of our own). Review: "meant to be reused", and a
    near-copy of a shared component that already exists.
  - **RCT-02 Component and screen layout.** A folder per component: `index.ts` (export only), `Name.tsx` (markup),
    `useName.ts` (business logic: data, effects, handlers), `Name.styles.ts` when it has styles, `components/` for
    the subcomponents of a complex component; a small subcomponent may be a single file. Check `componentLayout`:
    the folder and the component file share a name, `index.ts` only re-exports, a `components/` subfolder holds
    only subcomponents. Lint: no `useEffect`, data hooks (`useQuery`, `useMutation`, …), `fetch` or API calls in
    `Name.tsx`. Review: a subcomponent that has outgrown its single file, a component complex enough to split.
  - **RCT-03 Design tokens.** Every visual value comes from the project's tokens, kept in one place at the top of
    the project: colors always, font families, font sizes and line heights, radii, shadows. Lint, web: the
    `noRawVisualValues` rule of `template-next-admin`, generalised; native: no color literals in styles, no raw
    `fontSize` or `fontFamily`, no inline style objects with raw values, outside the tokens file. Check: every token
    has a light and a dark value (shared with T23). Review: a token used against its meaning (T23).
- `bin/standardsCheck.mjs`: the `check` rules of the installed packs (first `componentLayout`), on T22's entry points
  — `Stop` and `git commit` — not on every edit, because a component is created file by file and is incomplete in
  between. Reports file, rule id and the fix. The operator may pass a commit with
  `Standards-skipped: <rule id> <reason>`.
- Generation: `.claude/rules/<pack>.md` loads when Claude touches a matching file; each rule names a reference in the
  project to copy (`src/components/ui/Button/` and `features/users/components/UsersScreen/` on
  `template-next-admin`). `bin/scaffold.mjs component <Name> [--shared | --feature <f>] [--hook] [--styles]`
  creates the folder right by construction, and the rule tells Claude to use it.
- Review: `pattern-reviewer` (T9) reviews the diff against the rules marked `review`; `/self-review` (T13) runs it
  before a commit. Every finding cites its rule id, or says it fits no rule.
- Promotion: every review finding is recorded in the project's `.claude/standards/findings.json` (rule id, file,
  date, fixed or waived). When a rule collects its second finding, or a finding fits no rule, the review ends with
  a proposal to the operator: a lint rule if the pattern is syntactic, a script check if it is structural, a sharper
  rule text or a better example if it needs judgement, a new rule for a finding without one. The operator chooses;
  the rule's `Enforced by:` moves up. A change meant for every project goes back into the plugin's pack.
- Pages `docs/skills/standards.md` and `docs/hooks/standardsCheck.md`, rows in both indexes and the root README.

Done when:
- `npm test` proves on fixtures: each lint rule of the pack (a cross-feature import, `fetch` in `Name.tsx`, a hex
  color and a raw `fontSize` in native styles, a raw palette class on web); `componentLayout` (no `index.ts`, logic
  in `index.ts`, a folder and file name mismatch); a clean component passes; `Standards-skipped:` passes; a second
  `install` changes nothing and keeps the project's edits; a second finding on one rule yields a promotion proposal.
- On `template-next-admin`, `/standards install react` writes rules the operator recognises as true for the project,
  and the existing code passes or its violations are real.

Decided (2026-10-13):
- Next.js App Router fixes the names `page.tsx` and `layout.tsx`: RCT-02 applies to the screen a route renders
  (`features/<f>/components/<Name>Screen/`), and the route file only renders it. `src/app/` is not checked.
- A subcomponent may stay one file while it has no logic and no parts of its own; the size is the review's call.
- View-only `useState` (open, hovered, the active tab) may stay in `Name.tsx`; the lint does not report it.
- Spacing has no tokens of its own: Tailwind's scale on web, plain numbers on native (the operator: not needed).
- The plugin has one devDependency, `eslint` 9, for the lint rules' tests only (the operator's choice); hooks and
  scripts stay dependency-free, and projects lint with their own ESLint.

What was done (0.12.0):
- Pack `react` in `skills/standards/templates/packs/react/`: `pack.json`, `rules.md` (RCT-01…03, platform blocks,
  `{{settings}}`, references, good and bad examples, `Enforced by:` lines), `eslint.mjs` (four rules —
  `no-cross-feature-imports`, `no-logic-in-component-file`, `no-raw-visual-values`, `no-raw-style-values` — and
  `reactStandards`, which reads its settings from `standards.json` when ESLint loads it).
- `bin/standards.mjs` (`packs`, `install`, `update`, `status`, `check`, `disable`, `enable`, `resolve`, `finding`,
  `promote`, `review-context`) over `bin/lib/standards.mjs`; settings detected (platform, folders, token file,
  `tsconfig.json` aliases, a lint rule the project already has, reference component and screen) and confirmed
  through `--set`; an install keeps a project's edit and puts a conflicting new version in
  `.claude/standards/incoming/`.
- `bin/lib/componentLayout.mjs` (the `componentLayout` check) and the `standards-check` hook on `Stop` (files
  written since the operator's last message, from the transcript; held once) and on `git commit` (blocks;
  `Standards-skipped: <rule> <reason>` passes). `parseCommit` moved to `bin/lib/gitCommands.mjs`, `commitFiles`
  added to `bin/lib/git.mjs`.
- `bin/scaffold.mjs` and the model-invocable `/scaffold` skill: a component folder right by construction, web or
  native.
- `/standards` skill (`references/install.md`, `references/review.md` with the promotion procedure) and the
  `pattern-reviewer` agent (T9).
- Findings and promotions in `.claude/standards/findings.json`; a project's own rules in `.claude/rules/*.md`
  (`## PRJ-01 …`) take part too.
- Pages `docs/skills/standards.md`, `docs/skills/scaffold.md`, `docs/hooks/standardsCheck.md`,
  `docs/agents/patternReviewer.md`; rows in the indexes and the root README.

Result: 0.12.0; 297 tests pass (60 new). On a copy of `template-next-admin` the install detected the right settings,
the real ESLint ran the pack's rules, and two real breaks were found — `components/ui/Toast/` (the component is
`Toaster.tsx`, with `toast.store.ts` beside it) and `components/layout/Header/Header.tsx` (calls
`useSignOutMutation`, no hook file). Not yet done: `/standards install react` in the real template, in a session
after a restart, with the operator confirming the rules as true.

Later:
- `/derive-rules` (T8) derives a project's own rules from its code; `/standards` installs the portable ones. Both
  write `.claude/rules/`; whether they become one skill.
- A `react` pack check that every token has a light and a dark value (shared with T23).

## T25 — Skills write only inside their working folder · `done` (0.13.0, with T26)

Every skill that writes files has a working folder, and everything it creates stays inside it: results, state, raw
material, intermediate and temporary files. Nothing is created outside it: not in the project root, not in `docs/`
above the folder, not in `/tmp`, `os.tmpdir()`, the session scratchpad or an "outputs" folder. A folder the operator
picked outside `docs/` follows the same rule: nothing is created outside it, not even for a moment. Agreed with the
operator on 2026-10-13.

Why: after `/research`, the project root gains `reports/` and `research_notes/`. deep-research writes into the
current directory. `/research` moves its output into the run afterwards, but when a round fails the folders stay in the
root. deep-research may also copy the report to an outputs folder that nobody cleans up. Other skills leak in the same
way, as listed below.

Decisions:
- `/blueprint`, `/backlog` and `/showcase` keep asking for their folder. Whatever is chosen, nothing is written outside
  it.
- `/standards` keeps its state in `docs/standards/` instead of `.claude/standards/`.
- The rule is enforced by instructions and a structure test, not by a hook. T20's idea of a hook for the research
  agents stays separate.
- Some files are exempt: those that are the whole point of a skill and that tools read from a fixed place. These are
  `/scaffold`'s components, `/setup-permissions`' `.claude/settings.json`, and `/standards`' `.claude/rules/*.md`,
  `eslint/standards/*.mjs` and the ESLint config wiring. None of these skills creates temporary files.

| Skill | Working folder |
|-------|----------------|
| `/research` | `docs/research/` (the runs index); a run's material only in `docs/research/<YYYY-MM-DD>-<slug>/` |
| `/blueprint` | the folder chosen at Intake (default `docs/blueprint/`) |
| `/backlog` | the folder chosen (default `docs/backlog/`) |
| `/showcase` | the folder chosen (default `docs/showcase/`) |
| `/standards` | `docs/standards/` |

What to do:
- `/research`:
  - `engines.md › Calling deep-research`:
    - Drop step 1, "note what exists in the project root".
    - Instead, `mkdir -p "<run>/raw/round-<n>"` and make it deep-research's research directory. The prompt gains a
      `Files:` block:
      - use `<absolute run path>/raw/round-<n>/` as the research directory;
      - create `research_notes/` and `reports/` inside it, not in the current directory and not in one used earlier
        in the conversation;
      - give the subagents absolute paths inside it;
      - do not copy the report to an outputs folder or send it as a file.
    - Say that the skill is deep-research's coordinator. This instruction therefore overrides deep-research's "same
      directory or current working directory" rule (its SKILL.md, steps 2 and 7).
  - On delivery, files move only inside the round:
    - `reports/<title>.md` → `report.md`;
    - `research_notes/<title>/` → `notes/` (the notes are not "beside" the report; fix that wording);
    - `rmdir` the emptied `reports/` and `research_notes/`.

    No `rmdir` happens in the project root any more.
  - A safeguard: `ls` the project root and `docs/research/` before the call, and compare after delivery. If
    deep-research still created anything outside the run, move it into `raw/round-<n>/`, remove the empty folders it
    made, and tell the operator.
  - `engines.md › When something fails`: a failed round's files stay inside `raw/round-<n>/`. `continue` already moves
    them aside to `raw/round-<n>-incomplete/`.
  - `phases.md › Phase 0 — Frame`, step 7: replace the undefined `<root>/README.md` with `docs/research/README.md`, in
    the `docs/` chosen at step 1.
  - `SKILL.md`:
    - *The output folder* states the invariant.
    - *What this skill does not do* loses the exception for "moving deep-research's output out of the project root",
      and forbids creating anything outside `docs/research/`.
    - *Done when*: nothing is created outside the run folder and the runs index.
  - `agents/researchScout.md` and `agents/researchCurator.md` say explicitly: never `/tmp`, the scratchpad or the
    project root.
  - `docs/skills/research.md` mirrors all of this.
- `/blueprint`:
  - `intake.md` step 1 and `mechanics.md` state the invariant, including `.sources/`.
  - `bin/blueprint.mjs export --out` refuses a path that resolves outside the blueprint folder, with a test in
    `tests/blueprint.test.mjs`.
  - `docs/skills/blueprint.md` mirrors this.
- `/backlog`: the invariant goes into *The output folder* and *Done when*. `docs/skills/backlog.md` mirrors it.
- `/showcase`:
  - The invariant goes into *The output folder*.
  - The scratch page `scheme.html` (`phases.md › Step 1`) is never deleted today, because `allowed-tools` has no
    `rm`. The site's `build.mjs` template removes `scheme.html` from its folder once `STATE.json` records the chosen
    scheme. The step says "run `node build.mjs`" instead of "delete the scratch page".
  - Test in `tests/showcaseFrame.test.mjs`. `docs/skills/showcase.md` mirrors this.
- `/standards`:
  - `bin/lib/standards.mjs`: `STATE_FILE`, `FINDINGS_FILE` and `INCOMING_DIR` move under `docs/standards/`. New:
    `REVIEW_DIFF = 'docs/standards/review.diff'`.
  - `findProjectRoot` looks for the new path. A project that has only `.claude/standards/standards.json` is migrated
    on the next write: the folder moves to `docs/standards/`, the empty `.claude/standards/` is removed, and the move
    is reported.
  - The review diff:
    - `review-context` writes it to `docs/standards/review.diff` instead of `os.tmpdir()`;
    - `record` deletes it, or a new `review-done` command when nothing is recorded;
    - `install` writes `docs/standards/.gitignore` with `review.diff`, so a diff left by an interrupted review is
      never committed;
    - `references/review.md` gains the step.
  - Replace the old path in `SKILL.md`, `references/install.md`, `references/review.md`, the `react` pack's
    `rules.md` and `eslint.mjs`, `docs/skills/standards.md` and `docs/hooks/standardsCheck.md`, and in the comments
    of `bin/scaffold.mjs` and `bin/standardsCheck.mjs`.
  - `tests/standards.test.mjs`: the expected paths follow the new spec. New tests:
    - the diff lands in `docs/standards/`, and nothing in `os.tmpdir()`;
    - `record` and `review-done` remove the diff;
    - the legacy migration works;
    - `install` writes the `.gitignore`.
- The shared rule:
  - `docs/skills/README.md › Rules every skill follows` gains rule 7, **Writes stay in the working folder**: the
    invariant, temporary files kept in the folder and removed by the skill, the places never written to, and the
    exemptions.
  - `docs/agents/README.md`: an agent writes only into the folder its brief names, never into `/tmp` or the
    scratchpad.
  - `tests/structure.test.mjs`:
    - no `tmpdir(` or `os.tmpdir` in `bin/**/*.mjs`;
    - no `/tmp`, `mktemp` or `scratchpad` as a place to write in `skills/**/*.md` and `agents/*.md`;
    - the `SKILL.md` of research, blueprint, backlog, showcase and standards contains the invariant's fixed sentence.
  - The top *Decisions* gain one line on the rule. Bump the version in `.claude-plugin/plugin.json`.

Done when:
- `npm test` passes, including the new tests above.
- Two real `/research` runs on a `template-*` project, one with deep-research and one with the scouts, after a
  `touch` of a marker:
  - `find <project root> -newer <marker> -not -path '*/docs/research/*' -not -path '*/node_modules/*'` lists nothing;
  - the root has no `reports/` or `research_notes/`;
  - the run has `raw/round-1/report.md` and `notes/`.
- `/standards review-context` on a project with a pack: the diff is in `docs/standards/review.diff`, nothing matches
  `$TMPDIR/dev-assistant-review-*`, and the diff is gone after `record`.
- `/showcase init`: no `scheme.html` remains once the scheme is chosen and `node build.mjs` has run.
- `node bin/blueprint.mjs export --out ../x.md` is refused with the reason.

Started on the operator's word on 2026-10-14.

What was done (0.13.0):
- `/research`: deep-research gets the round's `raw/round-<n>/` as its research directory through a `Files:` block in
  its prompt, which overrides its own default of the current directory; the report and the notes are renamed inside
  the round, and the emptied `reports/` and `research_notes/` are removed there. The project root and
  `docs/research/` are listed into the round's new `before` field and compared at delivery; anything left outside
  the run is moved into the round and reported. A failed round's files stay in the round; `continue` moves them to
  `raw/round-<n>-incomplete/` (`-incomplete-2` and on). Phase 0 step 7 names `docs/research/README.md`. The scout and
  the curator create nothing but their files.
- `/blueprint`: the invariant in `SKILL.md`, `intake.md` step 1 and a new `mechanics.md › The working folder`;
  `bin/blueprint.mjs export --out` refuses a path outside the folder (a sibling sharing the folder's name prefix
  included).
- `/backlog`: the invariant in *The output folder* and *Done when*.
- `/showcase`: the invariant in *The output folder*; `build.mjs` exports `removeSchemeScratch()`, which removes the
  Color scheme step's `scheme.html` once `STATE.json` has `steps.scheme: "done"`; `node build.mjs` and `open.mjs` run
  it, and step 1 leaves the page to the build.
- `/standards`: the state, the findings, `incoming/` and the review diff in `docs/standards/`; `review-context`
  writes `docs/standards/review.diff`, `finding` removes it, the new `review-done` removes it when nothing was
  recorded, and `status` names one an interrupted review left. `install` writes `docs/standards/.gitignore`
  (`review.diff`, the project's lines kept). A project with only `.claude/standards/` is still found and read, and
  the next command that writes moves the folder (`.claude/` stays), reports it and names the installed files that
  still point to the old path; when both exist, `docs/standards/` wins and the old one is left. The `react` pack
  reads `docs/standards/standards.json` and is 1.1.0.
- Rule 7 in `docs/skills/README.md`, with the table of working folders and the exemptions; `docs/agents/README.md`:
  an agent creates nothing but what its brief names. `tests/structure.test.mjs`: no `tmpdir` in `bin/` or the skills'
  scripts; no `/tmp`, `mktemp`, `$TMPDIR` or scratchpad in a skill or an agent except in a sentence that forbids it;
  the invariant's sentence in the five `SKILL.md`.
- Tests: `tests/blueprint.test.mjs` (the refusal; the export to another folder now goes to `export/share/` inside
  the blueprint, as the rule requires), `tests/showcaseFrame.test.mjs` (the scratch page kept, then removed),
  `tests/standards.test.mjs` (the new paths, the diff, `review-done`, the `.gitignore`, the migration in its cases).

Result: 0.13.0; 334 tests pass. The real-run criteria — two `/research` runs with a marker file, `/standards
review-context` on a project, `/showcase init` — are still to be tried after a restart.

## T26 — Every skill shows where it is · `done` (0.13.0, with T25)

While a skill runs, the operator always knows which stage it is at, what has been done, what comes next and whether
it is working or waiting for them. Today a long skill (`/blueprint`'s eight phases, `/showcase`'s 21 steps, a wave of
agents, a deep-research round) runs for minutes with no sign of where it is, and the stages exist only in
`references/*.md` and `STATE.json`, which the operator does not see. Asked for by the operator on 2026-10-13.

What to do:
- Every skill names its stages per mode in a `## Progress` section of its `SKILL.md`: the fixed list the operator
  will see, taken from the procedure that already exists (`/blueprint`'s phases, `/research`'s Frame, Research, Curate,
  Review, `/showcase`'s steps, `/backlog`'s and `/standards`' modes). A short skill (`/scaffold`,
  `/setup-permissions`) has a short list, but still has one.
- At the start, the stages go into Claude Code's task list, so the UI shows the checklist: done, the current one
  in progress, the rest pending. A stage the run skips is marked so, not left pending. Each skill's `allowed-tools`
  gains the task-list tool if it needs to be listed.
- On every stage change, one line in the chat in a fixed shape, for example:
  `▸ /blueprint · phase 3 of 8 — Modules · step 2 of 5: module files (4 of 9 written)`.
  Inside a long stage, the line names the step and the count of units done against the total.
- Waiting is visible:
  - before agents, deep-research or a long script start: what runs, how many units, and that the skill waits for
    them (the wave size is already said for `/blueprint`; now every skill says it);
  - as each unit returns: the count, and any failure by name;
  - at a gate or a question: the line says the skill is waiting for the operator, and on what.
- A resumed run (`continue`, `status`) rebuilds the task list and the line from `STATE.json`, so the operator sees
  where the previous session stopped before anything new happens.
- At the end, a closing line: the stages done, skipped and failed, and where the result is.
- The shared rule: `docs/skills/README.md › Rules every skill follows` gains rule 8, **Progress is visible**: the
  stage list, the task list, the line's shape, waits, resume, the closing line. Each skill's page in `docs/skills/`
  shows its stage list.
- `tests/structure.test.mjs`: every `SKILL.md` has a `## Progress` section with at least one stage per mode it
  documents.

Done when:
- `npm test` passes, including the new structure check.
- A real run of `/blueprint` (or `/showcase`) and of `/scaffold`: at any moment the task list and the last line show
  the stage, what is done and what is next; a wave of agents shows its count as they return; a gate says it waits for
  the operator; a `continue` in a new session shows the same place before going on.

Decided (2026-10-14):
- The checklist in the chat is the guarantee; the task list only mirrors it. Claude Code 2.1.268 gives `TaskCreate`,
  `TaskUpdate`, `TaskList` and `TaskGet` by default only on some models (`TodoWrite` instead with
  `CLAUDE_CODE_ENABLE_TASKS=0`); on the others, Claude 5 models among them, none of them exists unless
  `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`. The tools need no permission, and `allowed-tools` only pre-approves, so no skill
  lists them. A plain subagent's access to the parent's list is undocumented; the skill, not its agents, keeps it.
- The model writes the checklist and the line from the `## Progress` table and `STATE.json`; no script. It is a
  report of where the run is, not a result that must come out the same every time.
- The line's skeleton is language-neutral (`▸ /blueprint · 5/8 Modules (L2) · writers, wave 1 · 4/9`): the marks,
  the numbers and the command are fixed, the stage and the step are in the operator's language, like the rest of
  the chat.
- Marks: `✓` done, `▸` the current one, `·` still to come, `–` skipped, `✗` failed. The numbers count the mode's
  stages from 1, so `/blueprint`'s phase 4 is `5/8`.

What was done (0.13.0):
- A `## Progress` section in every `SKILL.md` (blueprint, research, backlog, showcase, standards, scaffold,
  setup-permissions): the fixed sentence, the checklist, the line, units, waits, resume, and a `| Mode | Stages |`
  table with a row for every mode of the arguments table. `/scaffold` and `/setup-permissions` have the short form
  (checklist, line, final checklist).
- `docs/skills/README.md`: rule 8, **Progress is visible**; the page layout gains *Progress*; the `allowed-tools` row
  says it pre-approves and takes nothing away. Every skill's page has a `## Progress` section with the same table.
- `tests/structure.test.mjs`: per skill, the section with the sentence and a non-empty stage table, a row for every
  mode the arguments table documents, and the page's table equal to the skill's.

Result: the procedure is in place and `npm test` holds it; the second done criterion (a real run of `/blueprint` or
`/showcase` and of `/scaffold`, and a `continue` in a new session) is still to be tried after a restart.

Later:
- The current skill and stage in Claude Code's status line, read from the active `STATE.json`.
- A `progress` command in `bin/blueprint.mjs` (and the other skills' scripts once they exist), if the model's
  checklist drifts from `STATE.json` in real runs.

## T27 — `/blueprint` progress that shows without relying on the model · `todo`

The first real run after 0.13.0 (`/blueprint init`, 2026-10-14) showed none of T26's progress: the skill was loaded
with its `## Progress` section, yet through the whole Intake the operator saw no checklist, no `▸` line and no task
list. The rule sits at the end of `SKILL.md`, while the model works step by step from `references/*.md`, which never
mention progress; the session had no task-list tool; and nothing outside the model shows anything. Asked for by the
operator on 2026-10-14.

What to do:
- `bin/blueprint.mjs progress <dir> [--mode <mode>] [--step <text>] [--units <k>/<m>]`: prints the checklist and the
  line from `STATE.json` (`phases`, the modules' `l2` and `l3`, the failed units). The marks and the numbers are
  computed by the script; the stage names come from the `| Mode | Stages |` table in `SKILL.md`. This reverses T26's
  "no script" decision.
- `progress-notice` hook (`bin/progressNotice.mjs`), `PostToolUse` on `Write|Edit|Bash`: when a blueprint's
  `STATE.json` was written, or `blueprint.mjs stamp` ran, it renders the checklist and returns it as `systemMessage`,
  shown to the operator whatever the model does. Silent when the marks did not change.
- First, a spike: does the VS Code extension show a hook's `systemMessage`? If it does not, the hook returns
  `additionalContext` that asks the model to show the checklist now.
- The procedures carry the progress points. The rule moves to the top of `SKILL.md`, as the first thing a run does.
  Each phase in `intake.md`, `design.md`, `modules.md`, `reviews.md` and each mode in `modes.md` gets explicit steps:
  run `progress` and show its output when the phase starts; before a wave, the number of agents; as each returns, the
  line with the count; every gate summary starts with the checklist.
- `continue` and `status` run `progress` before anything else.
- Tests: `tests/blueprint.test.mjs` covers `progress` on fixtures (fresh, mid-phase, a failed unit, finished); the
  hook has its own tests; `tests/structure.test.mjs` checks that every phase in `references/` names `progress` at its
  start and at its gate.
- Page `docs/hooks/progressNotice.md`, rows in the index and the root README; `docs/skills/blueprint.md` and rule 8
  in `docs/skills/README.md` updated; version bump.

Done when:
- `npm test` passes.
- A real `/blueprint` run shows the checklist at the start, at every gate and after every `STATE.json` change, and a
  wave of agents shows its count, without the operator asking.

Open:
- `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` in the operator's `~/.claude/settings.json`, so that the task list appears; a
  plugin cannot set it.

## T28 — Progress that shows, for the other skills · `todo`

T27's mechanism for every other skill with stages. Asked for by the operator on 2026-10-14.

What to do:
- `bin/lib/progress.mjs`: the shared renderer. Stage names come from the skill's `| Mode | Stages |` table; the state
  comes from the skill's state file through an adapter per `kind`: `/backlog` (`pending`), `/research` (`phase`),
  `/showcase` (`steps`, `flows`), `/standards` (its state in `docs/standards/`). `blueprint.mjs progress` moves onto it.
- `bin/progress.mjs <dir>`: one command for every skill, so that `/research` and `/backlog`, which have no script of
  their own, get one too.
- `progress-notice` recognises every `kind`.
- The same progress points in each skill's `references/`: when a stage starts, around waves (research scouts, backlog
  detailers, showcase builds), at gates.
- `/scaffold` and `/setup-permissions` finish in seconds through one script: the script prints the final checklist in
  its report, and no lines are asked for in between.
- Tests per adapter; the structure check extends to every skill's `references/`; the skills' pages updated.

Done when:
- `npm test` passes.
- Real runs of `/research` and `/showcase` show the checklist without the operator asking; a `/scaffold` report ends
  with its checklist.

## T29 — One approval per web domain · `todo`

Claude Code keeps a `WebFetch` approval per host: "don't ask again" saves `WebFetch(domain:help.sweep.net)`, and the
next subdomain asks again. Research for one project on 2026-10-13 and 2026-10-14 left 174 such rules in its
`.claude/settings.local.json`, for 143 registrable domains; `sweep.net` alone was approved seven times (`www`, `www2`,
`help`, `school`, `trust`, `status` and the bare domain). The operator wants one approval to cover a whole domain with
its subdomains. Asked for by the operator on 2026-10-14.

What to do:
- First, a spike: does Claude Code accept a wildcard rule such as `WebFetch(domain:*.sweep.net)`? If it does, the hook
  below writes such rules instead of keeping its own list.
- `bin/lib/webDomain.mjs`: the registrable domain of a host (`help.sweep.net` → `sweep.net`, `zakon.rada.gov.ua` →
  `rada.gov.ua`, `www.capterra.co.uk` → `capterra.co.uk`), with a built-in list of multi-level suffixes and no
  dependency.
- `web-domain-gate` hook (`bin/webDomainGate.mjs`):
  - `PreToolUse` on `WebFetch`: an approved domain → `allow`, no prompt; any other → the usual prompt, its reason
    saying that the answer covers the domain and all its subdomains;
  - `PostToolUse` on `WebFetch`: the fetch ran, so it was approved, and the domain is recorded; a refusal records
    nothing;
  - a `deny` rule in the settings still wins.
- Approval up front: `/research` and `/blueprint` put the products' domains to the operator in one question before
  their researchers start, and record the approved ones at once.
- The approved domains are kept per project (where: see *Open*).
- Tests: the suffix cases; the hook's allow, ask and record; a `deny` rule wins. Page `docs/hooks/webDomainGate.md`,
  rows in the index and the root README; version bump.

Done when:
- `npm test` passes.
- In a real research run each domain is asked about at most once, whatever its subdomains.

Open:
- Whether the researcher agents (`blueprint-researcher`, `research-scout`) may fetch any domain while a research the
  operator consented to is running: almost no prompts, at the cost of pages read unchecked; they write only into
  their own folder.
- Where the list lives: the plugin's data folder (`${CLAUDE_PLUGIN_DATA}`, proposed, nothing in the repository) or the
  project's `.claude/` with a `.gitignore` entry.
- Several agents reaching a new domain at the same moment each still ask: acceptable, or serialised.

## T30 — `/blueprint` that spends fewer tokens · `done` (0.14.0)

A real run on 2026-10-14 spent most of its tokens where little was gained. Every agent ran on the parent model,
because none sets `model:`. The research's raw notes (`S-12`…`S-20`) were registered as sources next to the run's
summary and the competitor profiles they had already fed, so nine readers brought back almost nothing new. Depth
`standard` asks for full L3 on all ten MVP modules, about 130 capabilities. And the whole run lived in one session, so
every phase paid for the context of the phases before it. Asked for by the operator on 2026-10-14.

The rule for every change below: cut only what the next phase does not use. A saving that costs the quality of the
blueprint is not taken.

What to do:
- Models per agent: `model: sonnet` in `blueprintReader.md` and `blueprintWriter.md`; `blueprintReviewer.md` keeps the
  parent model, since its findings decide the gates. The reader is not put on Haiku: its extract feeds Intake, the gaps
  and the split into modules, so a requirement it drops or misattributes travels through the whole blueprint, and the
  saving on readers is small next to the writers'. `mechanics.md › Subagents` names the model, so that the
  `general-purpose` fallback passes it on the call.
- Narrow reading for writers: the brief names the sections of `01-brief.md` and `02-architecture.md` that concern the
  module (its entities, roles and flows), not the whole files; the module's own sources stay in full.
- No duplicated sources: a `/research` run given as a source is registered as its summary, source register and
  profiles; its `raw/` notes are not read and get no `S-NN` of their own. More generally, Intake does not read a source
  whose content another source already carries; it registers it with a pointer to that source.
- Depth chosen per module: at the start of phase 5 the operator sees how many capabilities each depth means and picks
  full L3 for the core modules only, with a capability list for the rest. The choice is kept in `STATE.json`, and T18's
  open *deepen one module later* takes the rest to full L3 when they are needed.
- A fresh context between phases:
  - First, a spike: can a plugin clear the context or start a new session itself (`/clear` from a skill or a hook)?
  - If it cannot: the gate of every heavy phase (Intake, phases 4 and 5) ends with "run `/clear`, then
    `/blueprint continue`", and a `SessionStart` hook with matcher `clear` (and `startup`) finds an unfinished
    blueprint's `STATE.json` and returns `additionalContext` that names the folder and the next phase, so that the new
    session picks it up without a re-read of what is done.
  - `continue` reads only `STATE.json`, the index and the files the next phase needs, never the whole blueprint.
- Tests: `tests/structure.test.mjs` checks the `model:` lines; `tests/blueprint.test.mjs` covers the per-module depth
  and a `raw/` note left out of the sources; the hook has its own tests. Page `docs/hooks/` for the hook, rows in the
  index and the root README; `docs/skills/blueprint.md` updated; version bump.

Done when:
- `npm test` passes.
- A real run reads each research run once, runs its readers and writers on Sonnet, starts every heavy phase in a fresh
  context, and phase 5 writes full L3 only where the operator chose it.
- Quality holds: the reviews of phases 6 and 7 on that run find nothing that traces back to a cut — no requirement
  of a source missing, no module short of what a later phase needed.

What was done (0.14.0):
- Spike: Claude Code documents no way for a plugin to clear the context or start a session — no hook, skill or
  command runs `/clear`. `SessionStart` fires with `source` `startup`, `resume`, `clear`, `compact` or `fork`, and
  takes `additionalContext` for the model and `systemMessage` for the user. A plugin agent's `model:` is honoured, and
  a `model` in the `Agent` call overrides it.
- Models: `model: sonnet` in `blueprintReader.md` and `blueprintWriter.md`; the reviewer and the researcher name
  none. `mechanics.md › Subagents` has a *Model* column, says why, and has the `general-purpose` fallback pass the
  model on the call.
- Narrow reading: `modules.md › What a writer reads` — per phase, the sections of `01-brief.md` and
  `02-architecture.md` a writer reads (phase 5 drops the module map, relationships, boundaries and the idea, which the
  L2 already carries); the writer finds them with `Grep` and reads the flows that name its module only. Its
  sources stay in full.
- No duplicated sources: `bin/blueprint.mjs expand <dir> <path>… [--root]` lists what Intake registers — dotfiles,
  build folders, the blueprint folder and assets counted by kind; a `/research` run as its summary and profiles, its
  `sources.md` as `register — not read`, its brief, state and `raw/` notes left out (a raw note too, when named
  outright). A source another one carries is registered as `carried by S-NN` and not read.
- Depth per module: the L2 writer returns the capabilities it foresees (`modules[].expected`); phase 5 starts with
  an `L3 depth` question — full L3 for the core only, as the table says, or a list everywhere — written as
  `modules[].l3Plan` (`full` / `list`), which `validate` holds `l3` to. `/blueprint module <name> full` deepens a
  module later; `/backlog` points there instead of a hand edit of `depth`.
- A fresh context: `mechanics.md › A fresh context`; the gate before every phase that runs agents (1, 4, 5, 6, 7 —
  wider than the Intake, 4 and 5 first planned, since phases 6 and 7 run agents too) stops after the stamp and asks for
  `/clear`, then `/blueprint`; `continue` reads `STATE.json`, `changed`, the phase's reference and the index, then
  only what the phase's steps name. The `blueprint-resume` hook (`SessionStart` · `startup|clear|compact`) tells the
  operator and the model where every unfinished blueprint stands; it skips the skill's own template.
- Pages: `docs/hooks/blueprintResume.md` and rows in the hooks index and the root README; `docs/skills/blueprint.md`
  (a *Tokens* section, the script's `expand`, the models), the reader's and the writer's pages, the agents index
  (`model` in the frontmatter table).
- Tests: `tests/blueprint.test.mjs` (`l3Plan` in `validate`; `expand` on a folder, a run, files named outright, the
  blueprint folder inside a named one), `tests/blueprintResume.test.mjs` (eight cases, the stage names checked against
  `SKILL.md`), `tests/structure.test.mjs` (every agent's model is an alias; the blueprint agents run on the models
  `mechanics.md` names).

Result: 0.14.0; 351 tests pass. The real-run criteria — readers and writers on Sonnet, phase 5 at the chosen depth,
each heavy phase in a fresh context, reviews that find nothing traced to a cut — wait for the next `/blueprint` run
after a restart.

Open:
- `SessionStart` also takes an `initialUserMessage`; whether it could start `/blueprint` by itself after `/clear` is
  undocumented, so the operator still types it.

## T31 — `/backlog`, `/showcase` that spend fewer tokens · `done` (0.15.0)

After T30 cut `/blueprint`'s cost, the other skills were reviewed for the same waste. Asked for by the operator on
2026-10-14. The rule is T30's: cut only what the next step does not use; a saving that costs quality is not taken.

Where the tokens went:
- `/backlog next`, `done` and `status` run many times a day, and each read every task file's frontmatter and
  checklist, computed ready and blocked, and regenerated `BACKLOG.md`, the batch tables and `COVERAGE.md` by hand —
  after reading the whole of `mechanics.md` at the start of every session.
- `/backlog` and `/showcase` delegate to `general-purpose` agents without a model, so every inventory reader,
  detailer, reader and builder ran on the session's model.
- `/showcase` runs twenty steps with a gate each in one session, every step paying for the context of the ones
  before; `init` of `/backlog` reads the whole blueprint before Gate 1 and then details in the same context.
- The `/showcase` audit greps the site for raw values and diffs the dictionaries by hand.

What was done (0.15.0):
- `bin/backlog.mjs` — `status` and `next` (the reports of those modes, the blueprint checks with `changed`
  included), `next-id`, `tick`, `render` (`BACKLOG.md` from the template; the batch rows with a file and the state
  line; `COVERAGE.md`'s *Task(s)*, the statuses task files can tell, the count line; `currentBatch`; `STATE.json`
  last), `validate` (the breaks of *Hand edits*). The procedures call it: the daily modes read only
  `mechanics.md › The script` and their own section; every writing mode ends with `render`.
- Models on the `Agent` call: `/backlog`'s inventory readers and detailers and `/showcase`'s readers and builders on
  Sonnet; the code reader keeps `Explore`'s own; the Logo's marks, the Illustrations and the variants of the
  sign-in, app-layout and not-found steps stay on the session's model, since the drawing is what the customer picks.
- A fresh context recommended at every gate, with the reason — asked for by the operator once it was clear that no
  plugin can run `/clear` or `/compact` itself: `/blueprint` at every gate (before, only before phases that run
  agents), `/showcase` at every step's gate, `/backlog` after Gate 1, Gate 2 and the gates of `detail` and
  `resync`, `/research` once the brief is approved and once the run is done. One message in each skill's
  *A fresh context*: what was saved, what comes next, `/clear` then the command, why — what the conversation now
  carries that the next step does not read, and that nothing is lost — and why not `/compact` (one more request
  over the whole context, to keep a summary nobody reads). The `blueprint-resume` hook became `skill-resume` and
  also reports an unfinished showcase (its step, a question waiting), a backlog mode left half-way and a research
  run past its brief (its phase and last round). `tests/structure.test.mjs` holds every gated skill to the section
  and the hook to its kind.
- `bin/showcase.mjs check` — pages, an idempotent build, raw colors, fonts and page radii, the two dark sets,
  the dictionaries; the audit runs it first.
- Tests: `tests/backlog.test.mjs` (32 cases), `tests/showcase.test.mjs` (8), `tests/skillResume.test.mjs` (the
  blueprint cases kept, showcase and backlog added, both stage tables checked); the frame's scaffold moved to
  `tests/showcaseFixture.mjs` for both showcase test files. Pages: `docs/hooks/skillResume.md`, the backlog and
  showcase pages (*The script*, *Tokens*), the indexes and the root README.

Not taken:
- `research-scout` and `blueprint-researcher` on Sonnet: T30 kept researchers on the session's model because they
  judge pages nobody checks, and a scout's notes are all the curator gets.
- `research-curator` and `pattern-reviewer` on Sonnet: one agent a round, and their output is the result or a gate.
- A lower auto-compaction threshold (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`): a plugin cannot set it, and an automatic
  compaction mid-phase keeps a summary instead of the files.

Done when:
- `npm test` passes.
- A real run of `/backlog next` and `done` relays the script's report without reading the task files, and a real
  `/showcase` run resumes a step after `/clear` from `STATE.json` and the step's plan.

## Draft of the next tasks

Order and contents are still being refined.

| # | Task | Essence |
|---|------|---------|
| T10 | "Done = verified" | `/verify` skill, `track` hook, `done-gate` Stop hook; needs the command map in `CLAUDE.md`; takes over T22's Stop entry point |
| T11 | `guard-bash` | the other git rules and dangerous commands, on top of `bin/lib/shell.mjs` |
| T12 | `guard-files` | protected paths and plan approval |
| T13 | `/self-review` | diff review through `pattern-reviewer` and `security-reviewer`, plus scope, bypass and docs checks; ends with T24's promotion proposals |
| T15 | `/fix` | reproduce, root cause, minimal fix, test; the new test must fail before the fix (from T22) |
| T16 | `/commit`, `/handoff` | commit message from the diff; session summary into WORKLOG.md |
| T17 | `security-reviewer` agent | authz gaps, injections, PII in logs, on the diff |

## T34 — `/showcase` Emails at every depth: a template and a picture per letter · `done` (0.18.0)

On ETC.V2 (depth essentials) the operator asked for a page of email templates for the cases the app
sends, and for the skill to make basic letters with pictures in the product's colors and theme on every
showcase.

What was done (0.18.0):
- Emails are in at every depth: the essentials list of `phases.md › Step 0` names them.
- Step 15 (`phases.md`): the plan goes to `plans/emails.md`; the **template** is drawn first (header with
  the mark, picture, heading, message, action, secondary detail, footer); every letter gets a **picture of
  its own** about its moment, in `--ill-*` tokens, reused from Illustrations or drawn into
  `assets/illustrations.js` (also when Illustrations is planned away); words from Microcopy or, when it is
  skipped, the requirements' tone; builders per group in `tools/parts/emails/`.
- `sections.md › Emails` gets the *Template* section (parts, sizes, what a mail client changes);
  `templates/pages.mjs` gets its menu item; SKILL.md's step table says so.

Done when:
- `npm test` passes.
- The ETC.V2 showcase has the Emails page and the operator approves its gate.

## T33 — `/showcase` Loaders: the picked logo in motion, a page of its own · `done` (0.17.0)

At the Logo gate on ETC.V2 the operator asked for loaders built on the picked mark, then for them to be
a page of their own under Design, and for the skill to make that page on every showcase.

What was done (0.17.0):
- Design gets a child page **Loaders** (`design/loaders.html`) after Logo, in `templates/pages.mjs`: While it
  waits · When the share is known · Where they stand · Rules.
- `sections.md › Loaders` says what it holds: 3–5 loaders from the mark's own parts at 64 / 32 / 16 px, the
  determinate form, each loader in place with its words, the rules (a delay, in place, words, reduced motion,
  `role="status"`); every animation ends on the mark at rest.
- Made in step 5 after the pick (`phases.md`, SKILL.md's table): a plan of loaders (`plans/loaders.md`),
  `tools/genLoaders.mjs`, one gate for both pages.
- `templates/tokens.css` gets `--duration-loader`; `templates/components.css` a Loader starter (`.ld`, sizes,
  `.ld__part`, the turn / fade / beat keyframes).

Done when:
- `npm test` passes.
- The ETC.V2 showcase has the Loaders page and the operator approves the Logo gate.

## T32 — `/showcase` menu: the product and its architecture first, design in pages · `done` (0.16.0)

Asked for by the operator on 2026-10-15, at the Frame gate of the first real run (ETC.V2): the menu should open on the
product, not on the site; the stack and the architecture should be there for the customer, the stack with the
official marks and links; the design should open into pages of its own; illustrations should be a section of their
own, for states and for the domain; the components should unfold into their list; changelog and next steps stay at
the end. The skill should lay the site that way from the start.

What was done (0.16.0):
- The menu: no band labels — a band is a group of roots set apart by a gap, and a heading of the catalog. Every
  root folds; under it its sections (anchors) and its child pages, for any root, not only Flows. The order: Product
  (the home page: what it is, who uses it, modules, how it works, sample company, about this site; child page
  Technology stack) · Architecture · Design (child pages Principles, Colors, Typography, Spacing and layout, Radius
  and shadows, Motion, Logo, Icons, Microcopy and tone, States, Charts) · Illustrations (for states, from the domain,
  in place, reserve) · Components · Screens (Sign-in layouts, App layout, Key screens, Emails, Not found page) ·
  Flows · Decisions · Changelog · Next steps.
- `build.mjs` writes a gap instead of a band label; `genPages.mjs` lays the Product page as the home page (the
  catalog and how to read the site in its `site` section), lists any root's child pages under "In this section",
  and gives the flow player only to the pages under Flows.
- `tools/fetchTechMarks.mjs`: the official marks of the stack from Simple Icons, or a project's own site, into
  `assets/tech/` with `marks.json`; `.tech-mark` in `site.css` (`--mono` turns white on dark, `--initials` for a
  technology with no mark). The one exception to "every value in tokens.css", stated in SKILL.md.
- The Frame step writes the Product page and the Technology stack page; step 18 is Architecture (`architecture`
  in STATE.json), diagrams for the customer; Illustrations plan two lists, for states and from the domain.
- `SKILL.md`, `phases.md`, `sections.md`, `site.md`, the skill page and `bin/skillResume.mjs` follow; the frame tests
  check the gap, the Product root open on the home page, Design open on a design page, child lists and the player.
- The frame brings the generators of the first two pages, `tools/genProduct.mjs` and `tools/genStack.mjs`: the
  rendering is fixed, the content is arrays marked `FILL`, so the next run lays them the way the operator approved on
  ETC.V2 instead of writing them anew. A test runs both on a fresh scaffold.
- *Show, do not describe* in `phases.md › Common mechanics` and in SKILL.md: whatever the operator chooses or
  approves is opened and its screenshots sent (`SendUserFile` added to the allowed tools) — at the scheme step the
  operator had asked to see the samples rather than read them.

Done when:
- `npm test` passes.
- The ETC.V2 showcase is moved to the new menu and the operator approves its Frame gate.
