# dev-assistant

A personal Claude Code plugin. Mechanical guards live in hooks, procedures in skills, noisy work in
subagents. The task list is in [docs/TASKS.md](docs/TASKS.md).

## What is in the plugin

Every hook, skill and agent has its own page with the full description: what it blocks or does, how it
decides, its limitations and its tests. The tables below are the map; the pages are the detail.

### Hooks — run on an event, cannot be skipped by the model

How hooks work in general, the rules every hook follows and how to add one: [docs/hooks/](docs/hooks/README.md).

| Hook | Event | What it does | Page |
|------|-------|--------------|------|
| `main-branch-guard` | `PreToolUse` · `Bash` | Blocks commits on `main` and pushes that update `main`; main changes only through a pull request | [mainBranchGuard.md](docs/hooks/mainBranchGuard.md) |
| `secret-files-guard` | `PreToolUse` · file tools and `Bash` | Blocks reading, editing, printing or copying `.env`, key material and credential files; example files pass | [secretFilesGuard.md](docs/hooks/secretFilesGuard.md) |
| `secret-commit-guard` | `PreToolUse` · `Bash` (`git commit`) | Blocks a commit whose diff adds a token, a private key, a password in a connection string or a secret file; names the file and line, never the value | [secretCommitGuard.md](docs/hooks/secretCommitGuard.md) |
| `lint-feedback` | `PostToolUse` · `Edit\|Write\|MultiEdit` | After every edit: formats the file with the project's Prettier, applies ESLint and oxlint auto-fixes, and tells the model which lint errors remain, with line and rule, in the same turn | [lintFeedback.md](docs/hooks/lintFeedback.md) |
| `standards-check` | `Stop` · `PreToolUse` `Bash` (`git commit`) | Runs the script checks of the project's standards packs (first RCT-02's component layout) on what the turn wrote, holding the turn once, and on what a commit records, blocking it; `Standards-skipped: <rule> <reason>` is the operator's way out | [standardsCheck.md](docs/hooks/standardsCheck.md) |
| `skill-resume` | `SessionStart` · `startup\|clear\|compact` | Tells a new, cleared or compacted session where every unfinished blueprint and showcase, every backlog mode left half-way and every research run past its brief stands — one line to the operator, a note to the model — so that `/blueprint`, `/showcase`, `/backlog` and `/research` resume from their state after the `/clear` their gates recommend, with the reason | [skillResume.md](docs/hooks/skillResume.md) |

### Skills — procedures the model follows, invoked as `/name`

How skills work in general, the rules every skill follows and how to add one: [docs/skills/](docs/skills/README.md).

| Skill | Command | What it does | Page |
|-------|---------|--------------|------|
| `setup-permissions` | `/setup-permissions [dir]` | Writes the plugin's permission `deny` rules (secret files, irreversible git and publish commands) and `allow` rules (routine local git commands) into the project's `.claude/settings.json` through an idempotent script; human-invoked only | [setupPermissions.md](docs/skills/setupPermissions.md) |
| `blueprint` | `/blueprint [init \| continue \| status \| module <name> [full] \| decide \| restructure \| feedback [file] \| export]` | Turns whatever the operator has — an idea, documents, requirements, similar products — into English product-design documents at three depths (brief and architecture, modules, capabilities) over eight gated phases; every structural fork is a question to the operator, every answer a logged decision; web research only with consent, by the one agent that has web search; ids, timestamps and reference checks done by a script; takes a customer's feedback and exports one document to send; resumable from its own files, in a fresh context before every phase that runs agents, with readers and writers on Sonnet and full capabilities only for the modules the operator picks; human-invoked only | [blueprint.md](docs/skills/blueprint.md) |
| `backlog` | `/backlog [init [dir] \| continue \| status \| next \| detail <batch> \| done <id> [note] \| add [text] \| plan <action> \| resync]` | Cuts a finished blueprint into vertical batches — each leaves something working end to end — of tasks and subtasks with acceptance criteria, citing capabilities by id and skipping what the code already does, detailing lazily; then keeps the list true: next task, mark done, add manual work, re-plan, resync from the blueprint's changelog; reads the blueprint, never writes it; what is ready and blocked, the ids, the ticks and the views done by a script, so the daily loop reads one report; resumable from its own files; human-invoked only | [backlog.md](docs/skills/backlog.md) |
| `showcase` | `/showcase [init [dir] \| continue \| status \| section <id> \| flow <id> \| pick <section> <variant> \| add \| audit \| open]` | Builds the project's design showcase in `docs/showcase/`: a static site that shows the customer the product before it exists — logo, sign-in and app layouts, key screens, flows with a step player, emails, illustrations, states, 404, the architecture in diagrams and what keeps the data safe in the customer's words — and gives the team what every screen is drawn with — color scheme and tokens, components, icons, technology, decisions. Reads the whole documentation folder; color scheme and stack decided first; every fork a question, variants picked by the operator; light / dark / system theme and interface languages switch everywhere; a fresh context for every step, builders on Sonnet where an approved plan decides, the audit's mechanical checks by a script; human-invoked only | [showcase.md](docs/skills/showcase.md) |
| `standards` | `/standards [install <pack> \| update \| status \| check \| disable <rule> <reason> \| enable <rule> \| review \| promote]` | Brings the operator's practices into a project as a pack of rules with ids (first `react`: shared components, component layout, design tokens), each enforced at every layer that can carry it — a rules file Claude reads, lint rules reported after each edit, script checks at the end of a turn and at commit, a review of what needs judgement — and proposes a stronger layer for a rule the review keeps catching; settings confirmed by the operator, project edits never overwritten; human-invoked only | [standards.md](docs/skills/standards.md) |
| `scaffold` | `/scaffold component <Name> (--feature <f> \| --shared [<group>] \| --in <parent>) [--hook] [--styles] [--single]` | Creates a React or React Native component folder laid out as the standards say — index, component, hook, styles — through a script; model-invocable | [scaffold.md](docs/skills/scaffold.md) |
| `research` | `/research [<topic> \| continue [run] \| status \| extend <run>]` | Researches a market, competitors or a business domain for the project as a wrapper over the `deep-research` skill: turns the topic into a brief of 3–7 questions the operator approves before any search, runs deep-research (or the plugin's scouts when it is absent), and lays the result out in `docs/research/<run>/` — an answer per question with its status, a register of dated sources, a profile per product — by a curator that has no web tools; `/blueprint` takes a run as a source; resumable, extendable by rounds; human-invoked only | [research.md](docs/skills/research.md) |

### Agents — workers with their own context, delegated to by the model

How agents work in general, why their tool lists are the guarantee, and how to add one: [docs/agents/](docs/agents/README.md).

| Agent | Used by | Tools | What it does | Page |
|-------|---------|-------|--------------|------|
| `blueprint-reader` | `/blueprint` — one per source | Read, Glob, Grep, WebFetch | Reads one source the operator gave and returns its extract under fixed labels; cannot write, run a command or search the web; runs on Sonnet | [blueprintReader.md](docs/agents/blueprintReader.md) |
| `blueprint-writer` | `/blueprint` — one per module | Read, Glob, Grep, Write, Edit | Writes one module file from the module's sources read in full and the sections of the brief and architecture it needs, leaving its forks in the file as open points; has no web tools; runs on Sonnet | [blueprintWriter.md](docs/agents/blueprintWriter.md) |
| `blueprint-reviewer` | `/blueprint` — reviews | Read, Glob, Grep | Returns findings for the consistency checks and adequacy walks in its brief; cannot change a file | [blueprintReviewer.md](docs/agents/blueprintReviewer.md) |
| `blueprint-researcher` | `/blueprint` — consented research | Read, Write, WebSearch, WebFetch | Researches one comparable product for named gaps, writes only its profile, returns the pages it used | [blueprintResearcher.md](docs/agents/blueprintResearcher.md) |
| `research-curator` | `/research` — one per round | Read, Glob, Grep, Write | Writes a run's summary, sources and profiles from the round's raw material; has no web tools, so adds nothing the research did not bring back | [researchCurator.md](docs/agents/researchCurator.md) |
| `research-scout` | `/research` — fallback without deep-research | Read, Write, WebSearch, WebFetch | Researches one group of approved questions on public pages, writes only its notes file | [researchScout.md](docs/agents/researchScout.md) |
| `pattern-reviewer` | `/standards review` | Read, Glob, Grep | Reviews a change against the project's standards rules that need judgement and its `CLAUDE.md`; returns findings with rule id, file, line and fix, or PASS; cannot change a file | [patternReviewer.md](docs/agents/patternReviewer.md) |

Planned: `security-reviewer` (task T14 in [docs/TASKS.md](docs/TASKS.md)).

## Install

The repository is its own local marketplace (`bagrijroman`), so the plugin installs straight from this folder:

```bash
claude plugin marketplace add /path/to/assistant
claude plugin install dev-assistant@bagrijroman
```

Restart Claude Code and check that `dev-assistant` is listed in `/plugin`.

## Update after changes

How a change reaches Claude Code depends on where the plugin was installed from.

**From this folder** (a local `directory` marketplace, as on the author's machine): the hooks run straight
from the working copy, so a change is live after a Claude Code restart, with no version bump. The flip side:
an unfinished edit is live in every session too, so run `npm test` before restarting.

**From a git marketplace** (any other machine): the plugin is copied to
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`, and a change arrives only with a new version:

1. Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, and publish it.
2. Each user refreshes the marketplace and the plugin, then restarts Claude Code:

```bash
claude plugin marketplace update bagrijroman
claude plugin update dev-assistant@bagrijroman
```

To try a change without touching the installed plugin, `claude --plugin-dir /path/to/assistant` loads the
working copy for one session.

## Validate

`npm install` once (it brings ESLint, which only the lint rules' tests use), then `npm test`.

```bash
claude plugin validate --strict ./.claude-plugin/plugin.json
claude plugin validate --strict ./
```

## How Claude Code can be configured

Claude Code can be shaped by five layers. They differ in *what* they hold, *when* they fire, and, most
importantly, *how strong the guarantee is*.

### 1. Mental model

| Layer | What it is | When it fires | Guarantee |
|-------|------------|---------------|-----------|
| **CLAUDE.md** | Facts and rules | Always in context | The model *may* ignore it |
| **Skills** | Procedures and instructions | On demand (Claude decides, or a human types `/name`) | The model *may* ignore it |
| **Subagents** | A separate "worker" with its own context | When Claude delegates | Context isolation |
| **Hooks** | Your code, run on events | Deterministic, always | **Guaranteed** |
| **Permissions** | What is allowed and what is forbidden | On every tool call | **Hard boundary** |

**The main rule:** what is *desirable*, write in a skill or in CLAUDE.md. What is *mandatory*, do with a
hook. What is *forbidden*, set through permissions.

### 2. The layers in detail

#### CLAUDE.md

A Markdown file loaded into the context at the start of every session. It holds project facts (stack,
command map, where things live) and rules of conduct. Because it is plain instruction text, the model
reads it and usually follows it, but nothing enforces it. Keep it short; move depth into `.claude/rules/`.

#### Skills

A `SKILL.md` file, optionally with `references/`, that describes a procedure: how to plan a feature, how
to fix a bug, how to review a PR. A skill is loaded only when needed, either because Claude decides it
matches the task or because a human invokes it as a slash command. Frontmatter controls the behaviour:
`name` sets the command, `allowed-tools` limits what the skill may use, `disable-model-invocation` makes
it human-only, `context: fork` runs it in a fresh context. Like CLAUDE.md, a skill is guidance, not
enforcement.

#### Subagents

A Markdown definition under `agents/` that describes a worker with its own system prompt, tool list,
model and turn limit. When Claude delegates to it, the subagent works in an isolated context and returns
only its report. The guarantee is isolation: noisy output (build logs, test runs, long reviews) never
fills the main context, and the subagent cannot use tools it was not given.

#### Hooks

Shell commands or scripts bound to lifecycle events: `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`
and others. They run every time the event happens, outside the model, so they are deterministic. A
`PreToolUse` hook can block a tool call (exit code 2, message on stderr) or ask the user for a decision.
A `Stop` hook can refuse to end the turn until a condition is met. This is the layer for anything that
must happen, for example "never commit to a protected branch" or "no code change is done without tests".

#### Permissions

Allow, ask and deny rules in `settings.json`, matched against every tool call: reading certain files,
running certain commands, calling certain MCP tools. A denied call never reaches the model's judgement.
This is the hard boundary: use it for secrets, destructive commands and irreversible actions such as
force pushes, merges and publishing.

### 3. Choosing the layer

| You want to... | Use |
|----------------|-----|
| Tell Claude how the project is built and which commands to run | CLAUDE.md |
| Give Claude a repeatable procedure for a kind of task | Skill |
| Keep long or noisy work out of the main context | Subagent |
| Make something happen on every event, no matter what | Hook |
| Make something impossible | Permission |

The weaker layers are cheaper and more flexible; the stronger layers are stricter and need code or
config. Start with the weakest layer that does the job and move up only when the model keeps ignoring
the guidance.
