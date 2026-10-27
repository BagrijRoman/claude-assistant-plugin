# Skills

A skill is a procedure the model follows: a `SKILL.md` file, invoked as `/name` by a human or picked by the
model when the task matches its description. It is guidance, not enforcement — the model can misread it or
skip a step — which is why this plugin keeps every *mandatory* rule in a hook and lets a skill only
describe the steps and call the tools.

## Skills in this plugin

| Skill | Command | What it does | Since |
|-------|---------|--------------|-------|
| [setup-permissions](setupPermissions.md) | `/setup-permissions [dir]` | Writes the plugin's permission `deny` rules and routine-git `allow` rules into the project's `.claude/settings.json` through a script | 0.5.0 |
| [blueprint](blueprint.md) | `/blueprint [init \| continue \| status \| module <name> [full] \| decide \| restructure \| feedback \| export]` | Turns raw project input into English product-design documents (brief, architecture, modules, capabilities) through eight gated phases, asking the operator at every structural fork and logging each decision; its bookkeeping is a script, its workers are agents with narrowed tools | 0.8.0 |
| [backlog](backlog.md) | `/backlog [init \| continue \| status \| next \| detail <batch> \| done <id> \| add \| plan <action> \| resync]` | Cuts a finished blueprint into vertical batches of tasks and subtasks, numbered under the operator's prefix (`ABC-012`) and split by repository under parent tasks, citing capabilities by id, then keeps the list true while the work happens — re-planning, and resyncing from the blueprint's changelog | 0.8.0 |
| [showcase](showcase.md) | `/showcase [init \| continue \| status \| section <id> \| flow <id> \| pick \| add \| audit \| open]` | Builds the project's design showcase — a static site with logo, sign-in and app layouts, key screens, flows with a step player, emails, illustrations, states, 404, components, icons, tokens, technology, architecture, security and decisions — from the whole documentation folder, with the operator deciding every fork; theme and language switch everywhere | 0.9.0 |
| [standards](standards.md) | `/standards [install <pack> \| update \| status \| check \| disable \| enable \| review \| promote]` | Installs a standards pack (first `react`) — every rule with an id, enforced by its rules file, lint, script checks and review — reviews a change against the rules only judgement can check, records the operator's decisions, and proposes a stronger layer for a rule the review keeps catching | 0.12.0 |
| [scaffold](scaffold.md) | `/scaffold component <Name> (--feature \| --shared \| --in) [--hook] [--styles] [--single]` | Creates a component folder laid out as RCT-02 says, through a script; the model uses it whenever it needs a new component | 0.12.0 |
| [research](research.md) | `/research [<topic> \| continue [run] \| status \| extend <run>]` | Researches a market, competitors or a domain as a wrapper over the `deep-research` skill: a brief of 3–7 questions the operator approves first, the search by deep-research (or the plugin's scouts when it is absent), then a curator without web tools writes an answer per question, dated sources and competitor profiles that `/blueprint` can take as sources | 0.10.0 |

Every skill has its own page here; `npm test` fails if one is missing (`tests/structure.test.mjs`).

## How a skill runs

```
a human types /setup-permissions            (or the model picks a skill whose description matches the task)
  │
  ▼
Claude Code loads skills/<dir>/SKILL.md into the conversation
  │  the frontmatter says what the skill may use and who may start it
  ▼
the model follows the steps, calling tools as the skill says
```

Skills are loaded when a session starts; a change to a `SKILL.md` reaches a session after a restart.

### Frontmatter

| Field | Meaning |
|-------|---------|
| `name` | the command: `/name`, or `/dev-assistant:name` when another plugin owns the bare name |
| `description` | when the skill applies; the model reads it to decide whether to pick the skill on its own |
| `argument-hint` | shown in the command palette; the text after the command arrives as `$ARGUMENTS` |
| `disable-model-invocation: true` | only a human may start it; the model never picks it on its own |
| `allowed-tools` | the tools the skill may use without a permission prompt while it runs; it pre-approves them and takes no other tool away |
| `context: fork` | runs the skill in a fresh context, so the conversation so far cannot bias it |

`${CLAUDE_PLUGIN_ROOT}` inside a skill expands to the folder the plugin is loaded from, which is how a skill
reaches the plugin's own scripts in `bin/` and its own files in `skills/<dirName>/`.

## Rules every skill follows

1. **Deterministic work goes into a script.** A skill that must produce the same result every time
   (merging a config, generating a file) runs a script in `bin/` and relays its report; the model does not
   perform the merge by hand. Scripts are tested; prose is not.
2. **Say what the skill must not do.** The model fills gaps with initiative; a skill names the initiative
   that is unwelcome (editing a generated file, loosening a rule, touching another directory).
3. **Human-only when the effect is durable.** A skill that writes project config, commits, or publishes
   carries `disable-model-invocation: true`.
4. **Narrow `allowed-tools`.** A setup skill that only runs one script needs Bash for that script and
   nothing else.
5. **A definition of done.** The last section lists what must be true when the skill ends, so the model
   can check itself and the human can check the model.
6. **Documented like a hook.** A page in `docs/skills/`, a row in the index above and a row in the root
   README's map — the structure test requires all three.
7. **Writes stay in the working folder.** A skill that writes files has a working folder, and nothing
   is created outside it, not even for a moment: results, state, raw material, intermediate and
   temporary files all live there, and a temporary file is removed by the skill once it has served.
   Never the project root, `docs/` above the folder, `/tmp` or `os.tmpdir()`, the session's scratchpad,
   or an "outputs" folder. A folder the operator picked outside `docs/` follows the same rule.

   | Skill | Working folder |
   |-------|----------------|
   | `/research` | `docs/research/` (the runs index); a run's material only in `docs/research/<YYYY-MM-DD>-<slug>/` |
   | `/blueprint` | the folder chosen at Intake (default `docs/blueprint/`) |
   | `/backlog` | the folder chosen at `init` (default `docs/backlog/`) |
   | `/showcase` | the folder chosen at Intake (default `docs/showcase/`) |
   | `/standards` | `docs/standards/` |

   Exempt are the files that are the whole point of a skill and that tools read from a fixed place:
   `/scaffold`'s components, `/setup-permissions`' `.claude/settings.json`, `/standards`'
   `.claude/rules/*.md`, `eslint/standards/*.mjs` and the ESLint config wiring; none of these skills
   creates a temporary file. Each `SKILL.md` above carries the sentence *Writes stay in the working
   folder: nothing is created outside it, not even for a moment.* The structure test checks it, that no
   script in `bin/` reaches for the system's temporary folder, and that no skill or agent names `/tmp`,
   `mktemp`, `$TMPDIR` or the scratchpad except to forbid it.
8. **Progress is visible.** The operator always sees which stage the run is in, what is done and what
   comes next. Each `SKILL.md` has a `## Progress` section with the stages of every mode and the same
   procedure:
   - **the checklist** — the mode's stages, one per line, `✓` done, `▸` the current one, `·` still to
     come, `–` skipped, `✗` failed; shown when a mode starts, at every gate, and at the end with where
     the result is; mirrored into the session's task list (`TaskCreate`/`TaskUpdate`, or `TodoWrite`)
     when the session has one;
   - **the line** — at every change of stage or step, `▸ /<command> · <n>/<N> <stage> · <step>`, plus
     `· <k>/<m>` while units are counted; the marks, numbers and command are fixed, the words are in the
     operator's language;
   - **waits** — before agents, an engine or a long script start, what runs and how many; a line as
     each returns; at a gate or a question, that the run waits for the operator, and for what;
   - **resume** — `continue` and `status` show the checklist rebuilt from `STATE.json` before anything
     else.

   The chat checklist is the guarantee and the task list a mirror: Claude Code gives the task-list
   tools by default only on some models (on others they need `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`), and
   they need no permission, so no skill lists them in `allowed-tools`. Each skill's page repeats its
   stage table under *Progress*. The structure test checks the section, that every mode of the
   arguments table has a row, and that the page's table is the same as the skill's.

## Adding a skill

1. `skills/<dirName>/SKILL.md` — the directory in camelCase, `name:` in kebab-case (the command).
2. Everything else the skill reads or copies, in the same folder, so the skill travels whole: a long procedure in
   `skills/<dirName>/references/*.md`, the files it writes into a project in `skills/<dirName>/templates/`. The
   skill names them as `templates/…` (from its own folder) or `${CLAUDE_PLUGIN_ROOT}/skills/<dirName>/…`;
   `npm test` fails when a skill names a file that does not exist.
3. Any script it runs in `bin/<scriptName>.mjs`, with tests in `tests/<scriptName>.test.mjs`.
4. A page `docs/skills/<dirName>.md` in the layout below, plus a row in the table at the top of this file and
   in the root `README.md`.
5. A task entry in [../TASKS.md](../TASKS.md); bump the plugin version in both manifests.

### Page layout

- **Summary table** — command, who may invoke it, script, version it shipped in.
- **Why** — the job and the reason it is a skill.
- **What it does** — the steps, as the human will see them.
- **Progress** — the skill's stage table, the same as in its `SKILL.md`.
- **What it will not do** — the boundaries written into the skill.
- **The script** — arguments, behaviour, report, exit codes (when there is one).
- **Limitations** — what it cannot do, stated plainly.
- **Tests** — where the cases live.
