# Skills

A skill is a procedure the model follows: a `SKILL.md` file, invoked as `/name` by a human or picked by the
model when the task matches its description. It is guidance, not enforcement — the model can misread it or
skip a step — which is why this plugin keeps every *mandatory* rule in a hook and lets a skill only
describe the steps and call the tools.

## Skills in this plugin

| Skill | Command | What it does | Since |
|-------|---------|--------------|-------|
| [setup-permissions](setupPermissions.md) | `/setup-permissions [dir]` | Writes the plugin's permission `deny` rules into the project's `.claude/settings.json` through a script | 0.5.0 |
| [blueprint](blueprint.md) | `/blueprint [init \| continue \| status \| module <name> \| decide \| restructure \| feedback \| export]` | Turns raw project input into English product-design documents (brief, architecture, modules, capabilities) through eight gated phases, asking the operator at every structural fork and logging each decision; its bookkeeping is a script, its workers are agents with narrowed tools | 0.8.0 |
| [backlog](backlog.md) | `/backlog [init \| continue \| status \| next \| detail <batch> \| done <id> \| add \| plan <action> \| resync]` | Cuts a finished blueprint into vertical batches of tasks and subtasks, citing capabilities by id, then keeps the list true while the work happens — re-planning, and resyncing from the blueprint's changelog | 0.8.0 |
| [showcase](showcase.md) | `/showcase [init \| continue \| status \| section <id> \| flow <id> \| pick \| add \| audit \| open]` | Builds the project's design showcase — a static site with logo, sign-in and app layouts, key screens, flows with a step player, emails, illustrations, states, 404, components, icons, tokens, microcopy, technology and decisions — from the whole documentation folder, with the operator deciding every fork; theme and language switch everywhere | 0.9.0 |
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
| `allowed-tools` | the tools the skill may use while it runs |
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
- **What it will not do** — the boundaries written into the skill.
- **The script** — arguments, behaviour, report, exit codes (when there is one).
- **Limitations** — what it cannot do, stated plainly.
- **Tests** — where the cases live.
