# blueprint

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/blueprint [init [dir] \| continue \| status \| module <name> \| decide \| restructure \| feedback [file] \| export]` | a human only (`disable-model-invocation`) | [bin/blueprint.mjs](../../bin/blueprint.mjs) — see [The script](#the-script) | 0.8.0 |

Files: [skills/blueprint/SKILL.md](../../skills/blueprint/SKILL.md) (the entry point),
[skills/blueprint/references/](../../skills/blueprint/references/) (the procedure, one file per stretch
of work: `mechanics.md` — state, gates, ids, the script, subagents, depth — then `intake.md`,
`design.md`, `modules.md`, `reviews.md`, `modes.md`), [skills/blueprint/templates/](../../skills/blueprint/templates/)
(one template per output file), [bin/blueprint.mjs](../../bin/blueprint.mjs) (the bookkeeping), and
the four agents it delegates to (see [Agents](#agents)).

## Why

Before a product is built someone has to say what it does — and usually that knowledge is spread
over an idea in somebody's head, a few documents of varying age, a competitor everyone points at
and a list of requirements nobody has reconciled. Turning that into documentation a team can build
from is slow, and the slow part is not writing: it is finding the forks (two sources disagree, a
feature could work three ways) and getting a human to decide each one.

The skill does that work as a procedure: it reads everything the operator gives it, surfaces every
fork as a question with a recommended answer, records every decision, and writes the result as a
set of English Markdown files at three levels of depth — the product, its modules, their
capabilities. It is a skill rather than a hook because the judgement cannot be mechanical; it is a
multi-session, phase-gated skill because the work is too large for one context window and too
consequential to run without approval between phases. What *is* mechanical — ids, timestamps,
counts, reference checks, the export — is done by a script, and what a subagent must never do is
taken away from it by its tool list.

## What it does

### Modes

`$ARGUMENTS` picks the mode; with no argument the skill continues the blueprint it finds in the
project, or starts one when there is none — so `/blueprint` is both the first and every later call.

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when a blueprint exists, `init` when none does |
| `init [dir]` | choose the output folder, scaffold it, run Intake |
| `continue` | find the blueprint by its `STATE.json`, list what was edited by hand, resume the phase it is in — units whose agent failed last time first; on a finished blueprint, log the hand edits in `CHANGELOG.md` and offer the other modes |
| `status` | report phase, counts, hand edits, failed units, what `validate` finds and what waits for the operator; change nothing |
| `module <name>` | re-run the module and capability phases for one module, keeping its capability ids |
| `decide` | walk through the open questions only |
| `restructure` | add, split, merge, rename or remove a module after the map is frozen: a decision, then the map, roadmap, state and files, then a consistency check |
| `feedback [file]` | take a customer's or a colleague's comments: registered verbatim as a source, split into items; questions answered, every requested change put to the operator (accept / accept with a change / decline / defer) and recorded with who asked for it |
| `export` | write the whole blueprint as one Markdown document, `export/blueprint.md`, for readers who will not open the folder |

### The output folder

Default `docs/blueprint/`, proposed in a dialog as the recommended option together with one or
two alternatives; the operator can type any path. A directory given in the argument becomes the
recommended option. The skill checks version control too: when the folder would sit outside any git
repository — a project root that only holds repositories — it recommends a folder inside the
repository that keeps the documentation instead. It never scaffolds into a non-empty folder without
the operator confirming that folder.

```
docs/blueprint/
├── STATE.json          phase, modules, depth, research consent — the resume point
├── README.md           index, regenerated at every gate
├── 00-sources.md       every input as S-NN with its extract; decisions the sources took; gaps; coverage of their items
├── 01-brief.md         idea, actors, surfaces, goals G-NN, out of scope, non-functional N-NN, risks RK-NN, decided outside
├── 02-architecture.md  L1: module map, relationships, main flows, domain model (personal data marked), roles and access, cross-cutting
├── 03-roadmap.md       stage per module and surface
├── 04-review.md        adequacy findings and what was done with each
├── modules/<slug>.md   L2 (module) above, L3 (capabilities with ids, access) below
├── references/competitors/<name>.md
├── DECISIONS.md        D-NNN (with who decided) · ASSUMPTIONS.md  A-NNN · OPEN-QUESTIONS.md  Q-NNN · GLOSSARY.md
├── CHANGELOG.md        every change after the blueprint is done
└── export/blueprint.md the whole blueprint as one document — generated, never edited
```

### The phases

Each phase ends with a gate: `validate` run and its errors fixed, a short summary, the new
assumptions and open questions, and an explicit approval before the next phase starts.

| # | Phase | Produces | How |
|---|-------|----------|-----|
| 0 | Intake | `00-sources.md`, `STATE.json`, depth (`quick` / `standard` / `deep`) | the operator lists files, folders, URLs, the idea in their words, similar products |
| 1 | Reading the input | an extract per source (facts, requirements, constraints, actors, terms, unclear points, not covered), the decisions it records, an index of its items when it is a catalogue; glossary seed; gap report | one reader agent per document, reading only that document; when the input is little more than an idea, an eight-question discovery interview (problem, today's workaround, why now, success, who pays, what is fixed, closest products, what it must never do); the gap report says which gaps the operator must answer and which research could close |
| 2 | Brief | `01-brief.md` | idea, actors, surfaces, goals (`G-`), out of scope, non-functional requirements (`N-`), risks (`RK-`) — every statement referenced to a source, decision or assumption |
| 3 | Architecture | `02-architecture.md`, `03-roadmap.md`, empty module files | module map (the sources' own when they have one; otherwise 5–12 areas of behaviour, not technical layers), relationships, 3–7 main flows, domain model with the personal data each entity holds, roles and access, the sources mapped to modules; most questions happen here, after the draft is on disk; frozen after the gate, changed later through `restructure` |
| 4 | Modules (L2) | top half of each module file | purpose, users, sub-modules, key entities with states, receives/provides, integrations — one writer agent per module, in waves, each reading the module's sources in full |
| 5 | Capabilities (L3) | bottom half of each module file | what actors and the system *do*, each with a stable id (`ORG-C03`) and the source items it delivers: who, what, rules, edge cases, states, dependencies, refs to goals and requirements; the module's access table; as deep as one depth × stage table says |
| 6 | Consistency review | fixes, or open questions; coverage of the sources | `validate` for the mechanical half (references, ids, markers, counts, coverage); read-only reviewers per module and one across modules for contradictions, dangling relationships, unreferenced statements, glossary drift; every item of the sources traced to where the blueprint deals with it |
| 7 | Adequacy review | `04-review.md`, improvements as decisions, modules updated | would the product work for the people in the brief? walks actors, goals, flows, lifecycles, non-functional requirements and personal data, the standard behaviours of this kind of product, and the risks nobody named; every finding ends with an outcome |

### Decisions with the operator

A fork that changes structure — the module map, an actor, the scope, a relationship, how a core
capability behaves — is asked, in batches of two to four related questions, within the limits of the
question tool (four options, a 12-character header, a free-text *Other* always added): the skill's
recommendation first, one or two real alternatives (marked "like *competitor*" when a profile shows
one), and *Defer* when a slot is left. A choice wider than four options goes into the question text
as a list. When one merge raises more than four forks, the skill first asks how to take them — one
by one, all its recommendations at once, or all deferred. Every outcome becomes a `D-NNN` record
(context, options, choice, who decided, reason, consequences) and the documents cite it inline.

What the sources already decided is not a fork: a decision log, a module map, roles and feature ids
in the documentation are cited and built on (`S-01 §D23`, `Source: ORG-06`), and one is challenged
only through a single *Revisit?* question with *Keep* recommended, whose answer is recorded either
way. Choices an earlier version made stay reference material, not decisions. Implementation
decisions found there (the stack, an app or no app) are listed in the brief under *Decided outside
this blueprint*.

A fork that does not change structure is resolved by the skill and marked `[A-NNN]`; a capability's
unstated edge cases are one assumption for the whole capability. Each gate shows how many new
assumptions there are and the ten that matter most; the operator can promote any into a question,
and approving the gate accepts the rest.

Every statement in a document is a fact (`S-`), a decision (`D-`) or an assumption (`A-`). A
statement that is none of these is the skill inventing a requirement, which is the failure the
whole mechanism exists to prevent.

### Surfaces

Where actors meet the product — the web application, the mobile application, an email, a partner
API — is one dimension running through every document, not a module and not a separate blueprint.
The brief decides the surfaces (always explicitly, in phase 2 — asked with no *Defer*, or cited when
a source already decided them; what the operator said in Intake is a source for it) and fixes a
default rule for modules on several surfaces. The module map has a `Surfaces` column, the roadmap
stages each module per surface ("web MVP, mobile next" is two rows of one module), and every
capability carries a `Surfaces:` line inherited from its module. The skill asks about a capability's
surface only when the module is on several surfaces, the capability's nature does not tell and the
brief's rule does not settle it; otherwise it assumes and shows the assumption at the gate. Flow
steps name their surface, a *Surface parity* concern says what a user sees when a capability lives
on another surface, and the adequacy review walks every actor on every surface (`surface gap`
findings). Platforms — native, cross-platform, installable web — are not decided here; the backlog
derives them from the constraints the brief records per surface.

### Competitor and market research

The web is allowed, but only after a question. Two triggers: the phase-1 gap report says research
could close some gaps (the skill names the gaps and the products and asks), or the operator wants
a "like competitor X" option and no profile covers it (the skill asks to research exactly that).
Consent and scope are recorded in `STATE.json`; a researcher agent per product — the only role with
web search — writes `references/competitors/<name>.md` and returns the pages it used, which the skill
registers as `S-` sources with reliability `web`; facts from the web carry `[web]` in the text.
Reading a URL the operator gave in Intake is their input, not research, and the reader does it.

### Agents

Noisy or parallel work goes to four agent types, defined in [agents/](../../agents/) and documented
in [docs/agents/](../agents/README.md); each has only the tools its role needs, so a rule its role
must never break is a tool it does not have.

| Role | Agent | Tools | What the tool list guarantees |
|------|-------|-------|-------------------------------|
| reader | [blueprint-reader](../agents/blueprintReader.md) | Read, Glob, Grep, WebFetch | cannot write, run a command or search the web |
| writer | [blueprint-writer](../agents/blueprintWriter.md) | Read, Glob, Grep, Write, Edit | no web tools (that it writes only its one file is a rule) |
| reviewer | [blueprint-reviewer](../agents/blueprintReviewer.md) | Read, Glob, Grep | cannot change a file |
| researcher | [blueprint-researcher](../agents/blueprintResearcher.md) | Read, Write, WebSearch, WebFetch | the only role that can search the web |

The skill itself is not granted web tools: a web search from the main conversation stops at a
permission prompt. When the plugin's agents are not available, the skill uses `general-purpose`
with the same brief and says in the gate summary that the rules held by instruction only. Before
each wave it tells the operator how many agents will run; an agent that fails leaves its unit marked
`failed` — a source's *Read as*, a module's `l2` or `l3` — which the next `continue` retries first.

## What it will not do

- Invent facts: no source, decision or assumption behind a statement → a question or an assumption
  instead.
- Go to the web uninvited; consent is per scope and recorded, and only a researcher searches.
- Decide structure silently; the operator can defer a fork, the skill cannot.
- Re-ask what the sources already decided; a doubt is one *Revisit?* question.
- Apply a customer's feedback on its own word; every requested change is the operator's decision.
- Describe implementation — no code, API shapes, schemas, libraries or hosting.
- Overwrite a file the operator edited without showing the change.
- Start a phase before the previous one is approved.
- Write anything but English inside the blueprint folder (the conversation stays in the operator's
  language).

## The script

[bin/blueprint.mjs](../../bin/blueprint.mjs) does the bookkeeping the same way every time; the skill
calls it as `node "${CLAUDE_PLUGIN_ROOT}/bin/blueprint.mjs" <command> <blueprint dir>`.

| Command | What it does |
|---------|--------------|
| `stamp` | sets `updated` to the local time (`YYYY-MM-DDTHH:MM`) and recounts `counts` — sources, decisions, assumptions, open questions, goals, non-functional requirements, risks, capabilities; every other key keeps its value and place. Ends every operation that wrote anything |
| `next <kind> [code] [--count N]` | prints the next id of a kind (`source`, `decision`, `assumption`, `question`, `goal`, `nfr`, `risk`) from the highest in its file, or the next capability ids of a module (`capability ORG`), reserving them by raising the module's `lastCapability` — so ids never collide and are never reused |
| `changed [--root <dir>]` | lists the folder's files and the document sources modified after `STATE.json` was last written — the operator's hand edits, read before anything else on `continue` — and the document sources it cannot find (moved, deleted, or a wrong `--root`) |
| `validate` | errors (exit 1): a broken `STATE.json`, an id twice in a log, a reference no log defines, a capability named that no module has as a heading, a `[?Q-NNN]` marker of a closed question, a capability heading twice, a placeholder id (`ORG-C??`, `[A-??: …]`, a researcher's `S-??`) left, a module without its file or a file without its module, a `lastCapability` below an id in use, stale counts, and — once the consistency review has started — a source item nothing covers. Warnings: `[?pending]` markers, template placeholders, coverage rows for unknown items, an index that lists one item twice, a decision or question section without its index row |
| `export [--out <file>] [--with-sources]` | writes one Markdown document — README (as *Contents*), brief, architecture, roadmap, modules, review, the logs, the glossary, the competitor profiles — with headings shifted, comments removed and links to local files turned into their text, so it reads the same wherever it is sent; default `export/blueprint.md` |

What stays the model's: reading, judging, asking, writing the documents, regenerating `README.md`
and filling the coverage table — the script only checks that the table is complete.

## Limitations

- **Gates are still prose.** The script makes ids, counts, timestamps and reference checks
  deterministic, and the agents' tool lists make some rules impossible to break; whether a gate is
  held, a fork asked or a statement referenced is still the model following the procedure.
- **Some agent rules are rules, not tools.** Write in the writer and the researcher is not limited
  to one path, and WebFetch in the reader takes any address. The agents' pages say which rule holds
  by instruction only. In the `general-purpose` fallback every rule is instruction.
- **Word files need macOS.** The skill converts a `.docx` once, with `textutil`, into a copy in
  `.sources/` that the agents read; elsewhere the operator is asked for a PDF or Markdown export.
- **Long.** A real blueprint spans several sessions; the operator must expect to say `continue`
  many times and to read the files between sessions.
- **Question fatigue is real.** Batches of 2–4, the *how to take them* question, one assumption per
  capability and the sources' own decisions being cited instead of asked are mitigations, not a
  cure; a project with a thin brief will still produce many rounds in phase 3.
- **Subagents do not share context.** Module files written in parallel can disagree; phase 6
  exists for this and must not be skipped.
- **Web research is only as good as the pages found.** Profiles are marked `[web]` so a reader can
  weigh them, but the skill cannot verify a competitor's behaviour beyond what the page says.

## Tests

- [tests/blueprint.test.mjs](../../tests/blueprint.test.mjs) — the script on a small complete
  blueprint: every command, every `validate` error, the export.
- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows; every template and reference the skill names exists;
  every `file.md › Heading` it points to resolves; every agent it delegates to is defined and
  documented.
