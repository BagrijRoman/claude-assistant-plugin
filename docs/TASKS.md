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
- A way to deepen one module of the blueprint to full L3 (an option of `/blueprint module`, say), so that
  `/backlog detail` can send list-only capabilities somewhere better than `/blueprint feedback`.
- Run `/blueprint` end to end on a real project (ETC.V2 with `initialDocs/` as sources), then `/backlog init` on the
  result; adjust the procedures from what the run shows (question rhythm, structural-vs-assumption boundary, gate
  friction on small phases, module drift between parallel subagents, the cost of regenerating views by hand).
- `bin/backlog.mjs`: `init`, `next-id` (from `lastTask`), `render` (the regenerated parts of
  `mechanics.md › Views` only — outline rows and capability rows are stored), `tick`, `validate` (no dependency
  cycles, no forward-batch edges, no dependency on a dropped task, every task's batch has its row), with tests.

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
- `bin/showcase.mjs`: `scaffold` (the copy with placeholders filled, genPages, build), `check` (pages exist, build
  idempotent, no values outside `tokens.css`, every `data-i18n` key in every dictionary), `screenshots` (Playwright,
  every page × theme). Tests in `tests/showcase.test.mjs`.
- `assets/illustrations.js` conventions and `--ill-*` tokens as a template once the first set is drawn.
- A root's chevron and title in the menu are two focus stops with one name.
- `check` should also compare the two dark blocks of `tokens.css` (media query and `[data-theme='dark']`), which the
  audit now checks by eye.

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
