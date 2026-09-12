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

### Skills — procedures the model follows, invoked as `/name`

How skills work in general, the rules every skill follows and how to add one: [docs/skills/](docs/skills/README.md).

| Skill | Command | What it does | Page |
|-------|---------|--------------|------|
| `setup-permissions` | `/setup-permissions [dir]` | Writes the plugin's permission `deny` rules (secret files, irreversible git and publish commands) into the project's `.claude/settings.json` through an idempotent script; human-invoked only | [setupPermissions.md](docs/skills/setupPermissions.md) |

### Agents — workers with their own context, delegated to by the model

None yet. Planned: `security-reviewer` (task T14 in [docs/TASKS.md](docs/TASKS.md)); its pages will live in
`docs/agents/`.

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
