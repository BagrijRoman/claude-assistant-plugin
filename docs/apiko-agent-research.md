# Research: apiko-agent v0.3.2 and a plan for our own workflows

Source: `/Users/romanbagrij/Apiko/agent` (plugin `apiko-agent@apiko`, previously enabled globally in `~/.claude/settings.json`).
Date: 2026-09-11.

## 1. In one paragraph

apiko-agent is a Claude Code plugin that turns the agent's work into a pipeline:
**plan → human approval → plan check → implementation one requirement at a time → self-review → draft PR**.
It uses all five layers from our README: a CLAUDE.md constitution with rule IDs, skills as procedures,
subagents for noisy work, hooks for what is mandatory, and permissions for what is forbidden.
The main architectural trick: **every hook and agent learns the repository's commands from a single table in CLAUDE.md**,
so the core knows nothing about npm or make.

## 2. The flows at a glance

### Main flow: a feature from ticket to PR

```
/setup (once)          → CLAUDE.md with command map, .claude/rules, docs/, CI
/feature TICKET
  1. /plan             → spec.md + plan.md (Approved-by empty)
  2. human             → AskUserQuestion: Approve / Change / Cancel → writes Approved-by   ← guard-plan-approval
  3. /analyze (fork)   → PASS | BLOCK (BLOCK returns to step 2)
  4. /implement        → R1..Rn: code → test → gate → commit                  ← guard-*, format, record-activity
  5. /review-pr        → code-reviewer + manual scope/bypass/docs checks
  6. draft PR          → evidence block                                        ← verify-dod (Stop), CI agent-checks
```

| Stage | What happens | Output |
|-------|--------------|--------|
| `/setup` | Once per repository. Reads the project, fills CLAUDE.md and the command table, creates templates in `docs/`, installs only the stack rules the project needs. | CLAUDE.md, `.claude/`, `docs/`, a PR |
| `/plan` | Reads the code and docs first, then asks at most two rounds of questions. Writes no code. | `spec.md` with acceptance criteria, `plan.md` with requirements R1..Rn |
| Approval | A human picks Approve, Change or Cancel. On Approve the plan gets `Approved-by: name · date`. Without that line a hook refuses code writes. | signature in `plan.md` |
| `/analyze` | A read-only gate. Checks the plan against the rules and the architecture. On BLOCK the plan is fixed, never the rules. | PASS or BLOCK verdict |
| `/implement` | One requirement at a time: code, test, typecheck, lint, tests, real execution, scope check, a separate commit. Ends with a draft PR. | commits + a draft PR with evidence |
| `/review-pr` | Reviews only the diff, through a subagent. Separately looks for disabled checks, extra changes and missing docs. | findings by severity |
| `/feature` | A wrapper over the whole chain. Does nothing itself, only invokes the stages in order. | — |

### Supporting flows

- **`/fix-bug`**: reproduce the bug with a failing test, state the root cause in one sentence, make the minimal fix, show the test now passes.
- **`/write-tests`** and **`/write-docs`**: how to pick a test level, and where each kind of document goes.
- **Stack skills** (`backend-feature`, `react-feature`, `rn-screen`, `db-migration`, `api-contract`, `graphql-resolver`, `react-data-layer`, `rn-verify-on-device`): reference procedures for a specific kind of code.

### What runs in the background, with no command

- **Session start**: the agent gets a briefing with the branch, the ticket and the available commands.
- **Before every action**: hooks block commits to main, force pushes, recursive deletes, DROP, deploys, and writes to `.env`, lockfiles or generated code.
- **Before ending a turn**: a Stop hook holds the agent if code changed and no checks were run.
- **Subagents**: build, tests and review run in a separate context, so long logs never fill the main one.

## 3. Inventory

| Layer | What is inside | Strength of guarantee |
|-------|----------------|-----------------------|
| CLAUDE.md (template) | command map + 37 rules with IDs: A git/PR, B definition of done, C scope, D code, E docs, F collaboration, G confidentiality, T tooling | the model may ignore it |
| `.claude/rules/` | `testing.md`, `protected-paths.md` + 11 stack files with `paths:` (NestJS, Express, Fastify, REST, GraphQL, React, RN) | loaded when the agent touches a file matching the glob |
| Skills | 17: 9 core (`setup`, `feature`, `plan`, `analyze`, `implement`, `review-pr`, `fix-bug`, `write-tests`, `write-docs`) + 8 stack | the model may ignore it |
| Subagents | `build-validator` (sonnet), `test-runner` (sonnet), `code-reviewer` (opus, read-only) | context isolation, no write tools |
| Hooks | 9 Node scripts on 4 events (table below) | deterministic |
| Permissions | deny reading secrets, `gh pr merge/review/ready`, `git push --force`, `* publish`, `eas submit` | hard boundary |
| Templates | `docs/*` (ARCHITECTURE, BUSINESS_MODEL, GLOSSARY, RUNBOOK, ADR), PR template, CI `agent-checks.yml` | CI gate on the PR |
| MCP | `context7` (library docs), `serena` (code navigation) + stack fragments | — |
| Self-tests | `hooks.test.mjs` (30 cases), `structure.test.mjs` | the plugin's own CI |

### Hooks

| Script | Event | What it does |
|--------|-------|--------------|
| `session-context` | SessionStart | injects ≤30 lines: branch, ticket from the branch name, pinned runtime, dirty files, MCP, commands |
| `guard-git` | PreToolUse Bash | blocks commit/push to protected branches, `--force`, `--no-verify`, amending pushed commits, `gh pr merge/ready/review`, `reset --hard`, `git add .env` |
| `guard-destructive` | PreToolUse Bash | recursive force delete outside build folders, `git clean`, DROP/TRUNCATE, schema resets, `docker volume rm`, infra CLIs, publish/deploy, non-local DSNs, `curl \| sh`, plus regexes from `.claude/rules/destructive-commands.txt` |
| `guard-dependency-manager` | PreToolUse Bash | wrong package manager, global installs, `--force`, deleting the lockfile; asks before a runtime dependency |
| `guard-protected-paths` | PreToolUse Edit/Write | never-list and ask-list globs from `.claude/rules/protected-paths.md` |
| `guard-plan-approval` | PreToolUse Edit/Write | blocks code writes when the branch's ticket has a `plan.md` without an `Approved-by:` line |
| `format-changed` | PostToolUse Edit/Write | prettier + eslint --fix on the changed file, never blocks |
| `record-activity` | PostToolUse | writes to `.claude/.state/session-<id>.json` which files changed and which checks ran |
| `verify-dod` | Stop | refuses to end the turn if code changed and typecheck/lint/tests/execution were not recorded; gives up after 2 blocks |

## 4. Mechanisms worth taking

1. **The command map as the single contract.** A `| Task | \`command\` |` table in CLAUDE.md. Hooks parse it with a regex,
   the briefing shows it, the Stop gate quotes its commands when it blocks, subagents run them. No tool name is hardcoded.
   The plugin's test fails if a core hook mentions a specific tool.

2. **A feature lives in files, not in the chat.** `docs/features/<TICKET>/spec.md` (problem, scope, acceptance criteria, out-of-scope)
   and `plan.md` (ordered requirements R1..Rn; for each: files, layer, test, **how it will be executed**, risk, size S/M/L).
   A plan stays under 150 lines.

3. **Approval is a line in a file.** `Approved-by: <name> · <date>` in `plan.md`. A hook blocks any code write until it exists.
   Why: the signature is durable, visible in the PR diff, and there is no hidden env bypass. A deliberate exception is written
   as the same line with a reason. The hook stays silent when the branch has no ticket or there is no plan:
   it guarantees "approved before code", not "a plan is mandatory".

4. **The plan gate runs in a clean context.** `/analyze` has read-only `allowed-tools` and returns a PASS/BLOCK verdict.
   Every finding carries a rule ID, the plan line and a concrete fix. The golden rule: when the plan and the constitution disagree,
   the plan is wrong. Two BLOCKs in a row mean hand it to a human.

5. **One requirement per loop.** For each R: re-read the precedent → implement only R → test → typecheck → lint → tests →
   **execute** → `git diff --stat` for scope → a separate commit.

6. **Definition of done is mechanical.** A PostToolUse hook records what ran; a Stop hook will not let go until the checks exist.
   So a human never gets stuck, the gate gives up after two blocks.

7. **"Executed" is not "tested".** For each kind of change there is a table of what counts as execution:
   an endpoint called (happy and failure path), a page opened with screenshots of its states, a job run with a real payload.
   The result is an evidence block with a mandatory "Not verified" section. CI fails when the block is missing.

8. **Every block explains what to do instead.** Format: `BLOCKED by rule C4: ... Do this instead: ...`.
   Exit code 2 and stderr go back to the model as feedback. For grey areas the hook returns `permissionDecision: ask`.

9. **Extension without editing the plugin.** A repository adds its own protected globs and destructive regexes in `.claude/rules/`.

10. **Subagents return conclusions, not logs.** `build-validator` and `test-runner` return only errors with a likely cause;
    `code-reviewer` returns findings by severity with rule IDs. None of them has write tools.

11. **A thin orchestrator.** `/feature` only invokes other skills and does not duplicate their content. The reason Apiko gives:
    after compaction only the beginning of recently invoked skills is re-attached, so a fat wrapper loses detail.
    `disable-model-invocation: true` on `/feature` and `/setup`, so the model never starts them on its own.

12. **Stack rules are installed selectively.** Their `paths:` overlap (`**/routes/**` is in Express, Fastify and REST),
    so installing all of them at once produces contradictory instructions.

13. **The plugin tests itself.** A skill's name matches the command map, no collisions with built-in commands,
    docs never reference a command that does not exist, every hook has a test case.

## 5. Weak spots (do not copy as is)

1. **The Stop gate cannot see failures.** `record-activity` reads the `tool_result` field, but Claude Code sends `tool_response` in PostToolUse.
   So the "failed/error" check always looks at an empty string, and a failed command counts as a successful check.
   The plugin's tests feed `tool_result` too, which is why they pass.
2. **False checks through the fallback.** When the command map is empty, any Bash command with the word test/lint/format/build counts.
   Even with a map, a match is a substring, so `echo "npm test"` counts too. Evidence from `pet/.claude/.state/`:
   `sed -n '1,60p' tests/hooks.test.mjs` was recorded as test, and a `cat` loop over the file `evidence-format.md` was recorded as lint.
3. **In `pet/` the gates work blind.** `pet` is not a git repository and has no CLAUDE.md, while the hooks read CLAUDE.md from the project root.
   On top of that, `template-backend/CLAUDE.md` lists its commands as bullets, not a table, so the parser would not find them there either.
4. **The Stop block counter never resets.** After two blocks the done gate stays silent for the rest of the session, even for later tasks.
5. **References to things that do not exist.** `/review-pr` calls `@security-auditor` **mandatory** for auth/SQL/uploads, but there is no such agent.
   There is also no `@ui-reviewer`, `@code-simplifier` or `explain-codebase` skill.
   The session briefing recommends `/review → /pr`, but `/review` is a built-in command and `/pr` does not exist.
   The structure test scans only `.md` files, so a mismatch in `bin/` goes unnoticed.
6. **Shell parsing ignores quotes.** `segments()` splits on `;`, `&&`, `|` even inside quotes.
   A commit message that merely mentions a recursive force delete produces a false block.
   A live example while writing this document: a script inserting text into markdown through a heredoc
   was blocked by rule C4 because the text mentioned that command in backticks. The hook splits a heredoc by lines and treats each line as a command.
7. **The ticket regex catches too much.** `[A-Za-z][A-Za-z0-9]+-\d+` finds a "ticket" UTF-8 in the branch `fix/utf-8-parsing`.
8. **High entry cost.** 17 skills, two paths (`/feature`, or `/plan` + `/analyze` + `/implement`), 37 abstract IDs,
   and the step order differs: `/plan` runs the check before approval, `/feature` runs it after.

## 6. Proposal for our own workflows

### Principles

- **One workflow = one entry point + one state file on disk + explicit stages with outputs.**
- The rule from our README: what is desirable goes into a skill or CLAUDE.md, what is mandatory into a hook, what is forbidden into permissions.
- **Rules with human names** instead of A1..G3: `no-commit-to-main`, `verify-before-done`, `plan-approved-first`.
  The name itself says what was violated.
- **Status in the plan's frontmatter** instead of a free-form line: `status: draft | approved | building | review | done`.
  The hook and the skills read one field, and a human sees the feature's state at a glance.
- **Automated plan check first, then the human.** The human spends time only on a plan that already passed the gate.
- Stack knowledge stays in `.claude/rules/` with `paths:`, instead of multiplying into separate skills.

### The workflows

| Command | Stages | State file | Guaranteed by |
|---------|--------|------------|---------------|
| `/setup` | detect the stack → fill the command map, running each command once → protected paths → docs skeleton | `CLAUDE.md` | a human reviews the PR |
| `/feature <TICKET>` | plan → check → approve → build (R1..Rn) → review → draft PR | `docs/features/<T>/plan.md` (`status:`) | the `plan-approved-first` hook |
| `/fix <issue>` | reproduce with a failing test → root cause in one sentence → minimal fix → test green → `/verify` | `docs/bugs/<id>.md` or the PR body | 2 failed hypotheses = stop |
| `/verify` | run the command map through a subagent → execute the change → build the evidence block | `evidence.md` next to the plan | the `verify-before-done` Stop hook |
| `/self-review` | diff → reviewer subagent → grep for check bypasses → scope → docs | — | a human |

`/verify` is a separate command on purpose. It is the one place where "done" is defined; `/feature` calls it after every requirement,
`/fix` at the end, and the Stop hook points to it when it blocks.

### Minimal hook set

| Hook | Event | Changes compared to Apiko |
|------|-------|---------------------------|
| `brief` | SessionStart | the same, plus the status of the active feature from `plan.md` |
| `guard-bash` | PreToolUse Bash | git + destructive in one file; quote and heredoc aware parsing |
| `guard-files` | PreToolUse Edit/Write | protected paths + plan approval; reads `status:` from the frontmatter |
| `track` | PostToolUse | reads `tool_response`; counts only commands that **start with** a command from the map; no word-based fallback |
| `done-gate` | Stop | the block counter resets on `UserPromptSubmit`, i.e. on every new task |

### Subagents

| Agent | Role | Difference from Apiko |
|-------|------|-----------------------|
| `checker` | runs typecheck, lint and tests from the command map, returns only errors | merges `build-validator` and `test-runner` |
| `plan-checker` | read-only plan gate, PASS/BLOCK | a separate agent instead of a skill, so a clean context is guaranteed |
| `reviewer` | diff review by severity | the same, but with rule names instead of IDs |

### Build order

1. Command map, `/verify`, the `track` and `done-gate` hooks. This is the core value: the agent cannot say "done" without evidence.
2. `guard-bash` and `guard-files`, with a test for every rule.
3. `/feature` with `plan-checker` and the status in the frontmatter.
4. `/fix` and `/self-review`.
5. `/setup` last, once it is clear what exactly it should generate.

### Mapping

| Apiko mechanism | Our version | What changes |
|-----------------|-------------|--------------|
| Command map in CLAUDE.md | the same | exact prefix match instead of a substring |
| `Approved-by:` in plan.md | `status: approved` + `approved-by:` in the frontmatter | one machine-readable status for the whole feature |
| `/analyze` as a skill | `plan-checker` as a subagent | isolation guaranteed by mechanism, not by request |
| `/plan` + `/analyze` + `/implement` + `/feature` | one `/feature` with stages | one path instead of two |
| `record-activity` + `verify-dod` | `track` + `done-gate` + `/verify` | sees failures, resets between tasks |
| 37 rule IDs | named rules | a message reads without a lookup table |
| `@security-auditor` (does not exist) | remove or create it | no references to things that do not exist |
