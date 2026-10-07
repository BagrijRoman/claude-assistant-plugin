# blueprint

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/blueprint [init [dir] \| continue \| status \| module <name> \| decide]` | a human only (`disable-model-invocation`) | none yet — see [The script](#the-script) | 0.8.0 |

Files: [skills/blueprint/SKILL.md](../../skills/blueprint/SKILL.md) (the entry point),
[skills/blueprint/references/phases.md](../../skills/blueprint/references/phases.md) (the
procedure per phase), [templates/blueprint/](../../templates/blueprint/) (one template per output
file).

## Why

Before a product is built someone has to say what it does — and usually that knowledge is spread
over an idea in somebody's head, a few documents of varying age, a competitor everyone points at
and a list of requirements nobody has reconciled. Turning that into documentation a team can build
from is slow, and the slow part is not writing: it is finding the forks (two sources disagree, a
feature could work three ways) and getting a human to decide each one.

The skill does that work as a procedure: it reads everything the operator gives it, surfaces every
fork as a question with a recommended answer, records every decision, and writes the result as a
set of English Markdown files at three levels of depth — the product, its modules, their
capabilities. It is a skill rather than a hook because nothing here is mechanical; it is a
multi-session, phase-gated skill because the work is too large for one context window and too
consequential to run without approval between phases.

## What it does

### Modes

`$ARGUMENTS` picks the mode; with no argument the skill continues the blueprint it finds in the
project, or starts one when there is none — so `/blueprint` is both the first and every later call.

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when a blueprint exists, `init` when none does |
| `init [dir]` | choose the output folder, scaffold it, run Intake |
| `continue` | find the blueprint by its `STATE.json`, resume the phase it is in |
| `status` | report phase, counts and what waits for the operator; change nothing |
| `module <name>` | re-run the module and capability phases for one module |
| `decide` | walk through the open questions only |

### The output folder

Default `docs/blueprint/`, proposed in a dialog as the recommended option together with one or
two alternatives; the operator can type any path. A directory given in the argument becomes the
recommended option. The skill never scaffolds into a non-empty folder without the operator
confirming that folder.

```
docs/blueprint/
├── STATE.json          phase, modules, depth, research consent — the resume point
├── README.md           index, regenerated at every gate
├── 00-sources.md       every input as S-NN with its extract; gaps after research
├── 01-brief.md         idea, actors, goals, out of scope, non-functional requirements
├── 02-architecture.md  L1: module map, relationships, main flows, cross-cutting concerns
├── 03-roadmap.md       MVP / next / later per module
├── 04-review.md        adequacy findings and what was done with each
├── modules/<name>.md   L2 (module) above, L3 (capabilities) below
├── references/competitors/<name>.md
├── DECISIONS.md        D-NNN · ASSUMPTIONS.md  A-NNN · OPEN-QUESTIONS.md  Q-NNN · GLOSSARY.md
```

### The phases

Each phase ends with a gate: a short summary, the new assumptions and open questions, and an
explicit approval before the next phase starts.

| # | Phase | Produces | How |
|---|-------|----------|-----|
| 0 | Intake | `00-sources.md`, `STATE.json`, depth (`quick` / `standard` / `deep`) | the operator lists files, folders, URLs, the idea in their words, similar products |
| 1 | Research of input | an extract per source (facts, requirements, constraints, actors, terms, unclear points, not covered), glossary seed, gap report | one subagent per source; the gap report says which gaps the operator must answer and which research could close |
| 2 | Brief | `01-brief.md` | idea, actors, goals, out of scope, non-functional requirements — every statement referenced to a source, decision or assumption |
| 3 | Architecture | `02-architecture.md`, `03-roadmap.md`, empty module files | module map (5–12 areas of behaviour, not technical layers), relationships, 3–7 main flows, cross-cutting concerns; most questions happen here; the map is frozen after the gate |
| 4 | Modules (L2) | top half of each module file | purpose, users, sub-modules, key entities with states, receives/provides, integrations — one subagent per module, in parallel |
| 5 | Capabilities (L3) | bottom half of each module file | what actors and the system *do*: who, what, rules, edge cases, states, dependencies, refs; depth per roadmap and `depth` setting |
| 6 | Consistency review | fixes, or open questions | a read-only subagent finds contradictions, dangling relationships, unreferenced statements, glossary drift, stale markers |
| 7 | Adequacy review | `04-review.md`, improvements as decisions, modules updated | would the product work for the people in the brief? walks actors, goals, flows, lifecycles, non-functional requirements, and the standard behaviours of this kind of product; every finding ends with an outcome |

### Decisions with the operator

A fork that changes structure — the module map, an actor, the scope, a relationship, how a core
capability behaves — is asked, in batches of two to four related questions, with the skill's
recommendation first and labelled, a "like *competitor*" option when a profile covers the point,
and *Defer*. The operator can always type their own answer. Every outcome becomes a `D-NNN` record
(context, options, choice, reason, consequences) and the documents cite it inline.

A fork that does not change structure is resolved by the skill, marked `[A-NNN]` and listed at
the next gate, where the operator can promote any assumption into a question.

Every statement in a document is a fact (`S-`), a decision (`D-`) or an assumption (`A-`). A
statement that is none of these is the skill inventing a requirement, which is the failure the
whole mechanism exists to prevent.

### Surfaces

Where actors meet the product — the web application, the mobile application, an email, a partner
API — is one dimension running through every document, not a module and not a separate blueprint.
The brief decides the surfaces (always a question, in phase 2; what the operator said in Intake is
a source for it) and fixes a default rule for modules on several surfaces. The module map has a
`Surfaces` column, the roadmap stages each module per surface ("web MVP, mobile next" is two rows
of one module), and every capability carries a `Surfaces:` line inherited from its module. The
skill asks about a capability's surface only when the module is on several surfaces, the
capability's nature does not tell and the brief's rule does not settle it; otherwise it assumes
and shows the assumption at the gate. Flow steps name their surface, a *Surface parity* concern
says what a user sees when a capability lives on another surface, and the adequacy review walks
every actor on every surface (`surface gap` findings). Platforms — native, cross-platform,
installable web — are not decided here; the backlog derives them from the constraints the brief
records per surface.

### Competitor and market research

The web is allowed, but only after a question. Two triggers: the phase-1 gap report says research
could close some gaps (the skill names the gaps and the products and asks), or the operator wants
a "like competitor X" option and no profile covers it (the skill asks to research exactly that).
Consent and scope are recorded in `STATE.json`; a subagent writes
`references/competitors/<name>.md` and registers each page as an `S-` source with reliability
`web`; facts from the web carry `[web]` in the text. Reading a URL the operator gave in Intake is
their input, not research.

## What it will not do

- Invent facts: no source, decision or assumption behind a statement → a question or an assumption
  instead.
- Go to the web uninvited; consent is per scope and recorded.
- Decide structure silently; the operator can defer a fork, the skill cannot.
- Describe implementation — no code, API shapes, schemas, libraries or hosting.
- Overwrite a file the operator edited without showing the change.
- Start a phase before the previous one is approved.
- Write anything but English inside the blueprint folder (the conversation stays in the operator's
  language).

## The script

None yet. The skill does by hand what the plugin normally gives to a script in `bin/`:
scaffolding the folder from the templates, assigning the next `S-`/`D-`/`A-`/`Q-` id by reading
the logs, regenerating `README.md`, and validating that every reference resolves and every module
in the map has a file. These are the parts to move into `bin/blueprint.mjs` once the procedure has
been run on a real project and the shape is stable (task T18 in [TASKS.md](../TASKS.md)).

## Limitations

- **Guidance, not enforcement.** The skill is prose; the model can skip a gate or assign a wrong
  id. The script will make the mechanical parts deterministic; the gates stay a matter of the
  model following the procedure.
- **Long.** A real blueprint spans several sessions; the operator must expect to say `continue`
  many times and to read the files between sessions.
- **Question fatigue is real.** Batches of 2–4 and the assumption mechanism are mitigations, not a
  cure; a project with a thin brief will still produce many rounds in phase 3.
- **Subagents do not share context.** Module files written in parallel can disagree; phase 6
  exists for this and must not be skipped.
- **Web research is only as good as the pages found.** Profiles are marked `[web]` so a reader can
  weigh them, but the skill cannot verify a competitor's behaviour beyond what the page says.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows.
- Script tests arrive with the script.
