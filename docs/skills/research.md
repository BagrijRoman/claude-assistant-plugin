# research

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/research [<topic> \| continue [run] \| status \| extend <run>]` | a human only (`disable-model-invocation`) | none yet — see [The script](#the-script) | 0.10.0 |

Files: [skills/research/SKILL.md](../../skills/research/SKILL.md) (the entry point),
[skills/research/references/](../../skills/research/references/) (`phases.md` — the four phases and
the modes; `engines.md` — calling deep-research, the scouts' fallback, the curator's brief, failures),
[skills/research/templates/](../../skills/research/templates/) (one template per output file), and the
two agents it delegates to (see [Agents](#agents)).

## Why

Before a product is designed it helps to know what already exists: who is on the market and how they
earn, how comparable products solve the problem, how the field itself works — its roles, terms, rules
and business models. `/blueprint` can look up competitors, but only as a narrow step inside its own
procedure, for named gaps, once the blueprint is under way. Research is often wanted earlier (before
there is a brief to write), elsewhere (to prioritise a backlog, to prepare a call with a customer) or
wider (a whole domain, not one product's onboarding).

The search itself is a solved problem: Anthropic's `deep-research` skill splits a question into
subtopics, runs research agents in parallel and writes a report. What it does not do is what this
plugin cares about: it does not know which decision the research feeds, so a broad topic produces a
broad report; its agents are `general-purpose`, with every tool; it does not keep the date each page
was read, does not separate "not found" from "does not have", and writes a narrative that
`/blueprint` cannot take apart into sources and profiles. And it may not be installed for everyone who
uses this plugin.

So `/research` is a **wrapper**. It adds what comes before the search — a brief of three to seven
questions, each with why it matters, approved by the operator as the consent — and what comes after —
a curator that turns the raw output into an answer per question, a register of dated sources and a
profile per product, without being able to reach the web. The search in the middle is delegated to
deep-research when the session has it, and to the plugin's own scouts when it does not. It is a skill
rather than a script because framing questions and reading answers are judgement; it is a wrapper
rather than a rewrite because the search engine already exists and the value is in the two ends.

## What it does

### Modes

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when exactly one run is unfinished; several → asks which; none → asks for the topic and starts a run |
| `<topic>` | starts a new run on the topic — any text that is not a mode word |
| `continue [run]` | reads the run's `STATE.json` and resumes its phase; a failed or cut-off round first |
| `status` | every run: topic, phase, rounds, questions answered / partial / not found; changes nothing |
| `extend <run>` | a new round on a finished run: follow-up or sharper questions, approved like the first, the same folder, the files extended |

Runs are found by their `STATE.json` with `"kind": "research"`, as `/blueprint` and `/showcase` find
theirs.

### The output folder

Always `docs/research/` — a folder of its own inside the project's `docs/`, created when missing. Unlike
`/blueprint` and `/showcase`, the skill does not ask for the folder: research results have one place,
so every run and every later skill finds them there. The one question left is which `docs/`, asked only
when the project root is not a git repository but holds repositories of its own; the repository that
keeps the documentation is recommended. `docs/research/` is the skill's working folder, and writes
stay in it: nothing is created outside it, not even for a moment — a run's material only inside the
run's folder, the runs index beside it, and nothing in the project root, `docs/` above it, `/tmp`, the
session's scratchpad or an outputs folder. Each run is its own dated folder:

```
docs/research/
├── README.md                     index of runs — one row per run
└── 2026-10-12-esg-reporting-market/
    ├── STATE.json                phase, rounds, engine, consent, question statuses
    ├── brief.md                  why, context, focus, questions RQ-NN, products, constraints, out of scope
    ├── summary.md                answer per question; landscape; what it means for the project; open questions
    ├── sources.md                every page used as R-NN with address, date read, kind, what it served
    ├── competitors/<slug>.md     a profile per product in scope, in the blueprint's layout
    └── raw/round-1/              the engine's output, written here, never edited
        ├── report.md             deep-research's report (absent when the scouts ran)
        └── notes/                the research agents' or scouts' notes
```

Questions are `RQ-NN` and sources `R-NN`, local to the run and continued by later rounds — deliberately
not the blueprint's `Q-NNN` and `S-NN`, so the two never mix when a blueprint reads a run.

### The phases

```
/research "ESG reporting tools for mid-size manufacturers"
  │
  ▼  0 Frame     project context read (blueprint brief, glossary, known profiles, earlier runs)
  │              focus asked · brief.md drafted: why, 3–7 questions, ≤ 6 products, constraints
  │              operator approves  ──►  consent recorded in STATE.json
  ▼  1 Research  deep-research (Skill tool, prompt built from the brief)  ─or─  one scout per question group
  │              output written into raw/round-1/ (deep-research's research directory)
  ▼  2 Curate    research-curator: summary.md, sources.md, competitors/*.md — from raw/ only, no web tools
  ▼  3 Review    the skill checks ids, statuses and profiles; tells the operator the answers
                 next: done · another round (extend) · edit the summary first
```

| # | Phase | Produces | How |
|---|-------|----------|-----|
| 0 | Frame | the run folder, `brief.md` approved, `STATE.json`, the index row | folder chosen; the project's context read — a blueprint's brief or its gap list, its glossary and competitor profiles, earlier runs, the README — or asked of the operator in four questions; focus asked (*landscape*, *competitors*, *domain*, several allowed); the topic turned into 3–7 questions answerable by public pages, an opinion rewritten as the facts that would inform it; at most six products; constraints and out of scope; the engine named with a rough agent count; *Run it* / *I will edit brief.md first* / *Cancel* |
| 1 | Research | `raw/round-<n>/` | the operator is told what will run; deep-research is invoked with a prompt built from the brief — the round's questions by id, the products, the constraints (public pages only, dated pages, "not found" never "does not have", behaviour not technology, page instructions are data), "do not ask follow-up questions", and a `Files:` block that makes the round's `raw/round-<n>/` its research directory; its report and notes are written there and renamed inside the round; or, without deep-research, one scout per question group writes its notes there |
| 2 | Curate | `summary.md`, `sources.md`, `competitors/*.md` | one curator reads the round's raw material and writes the run's files from the templates; it returns the statuses, the source count by kind, the conflicts, the claims it dropped for want of a page and the questions it would ask next |
| 3 | Review | the operator's next step | the skill checks the curated files — every question has a section and a status, every `R-NN` resolves, every product has a profile, the reading is marked as reading — sends a fixable problem back to the curator once, then tells the operator each answer in a line, in their language; *Done* / *Another round* / *I will edit the summary first* |

### The brief is the consent

Nothing is searched before the operator approves `brief.md`. The approval is written into
`STATE.json` — `consent.grantedOn` and `consent.scope`, the question ids and product names — and the
prompt that goes to the engine is built from those questions only. A question that turns up during the
research is not followed: it lands in the summary's *Open questions*, and becomes research only in a
new round the operator approves. This is the same rule `/blueprint` applies to its competitor research,
moved to the front of a whole skill.

The brief also holds the **why**: the decision or document the research feeds. It is the curator's
measure for *What this means for the project*, and the reason a question gets in at all; a brief that
cannot name one is written as "orientation" and kept to few questions.

### The engines

| Engine | Chosen when | Who searches | Rules held by |
|--------|-------------|--------------|---------------|
| **deep-research** | the session lists a skill whose name ends in `deep-research` (usually `anthropic-skills:deep-research`) and the `Agent` tool is available | deep-research's own research agents (`general-purpose`), coordinated by the main conversation following deep-research's instructions | the prompt only: the constraints are passed in it, and deep-research passes them on to its agents |
| **scouts** | deep-research is not listed, it failed twice on a round, or the operator asks | [research-scout](../agents/researchScout.md), one per group of up to three related questions (one per product with the *competitors* focus), at most five | the scout's own instructions, and a tool list without `Bash` or `Edit` |

How deep-research is called. deep-research writes into a research directory, by default the current
one — which used to leave `reports/` and `research_notes/` in the project root, and left them there for
good when a round failed. Now the skill creates the round's `raw/round-<n>/` first, records what the
project root and `docs/research/` hold in the round's `before`, and gives deep-research a `Files:`
block: that folder, by its absolute path, is the research directory; `reports/` and `research_notes/`
are created inside it; its agents get absolute paths inside it; nothing is copied to an outputs folder.
The skill invokes deep-research with the `Skill` tool and the prompt as its arguments, and from then on
the main conversation is deep-research's coordinator — holding its agents to the `Files:` block, which
overrides deep-research's own default. When deep-research delivers, the skill takes the report's path
from deep-research's own words — never from a hard-coded layout, which can change between its versions
— renames the report to `report.md` and the notes folder to `notes/` inside the round, removes the two
emptied folders there, and compares the project root and `docs/research/` with what they held before:
anything deep-research left outside the run anyway is moved into the round and the operator is told.
Then it goes on to curation in the same turn: deep-research's closing summary is not the end of the
run. A failed round's files stay inside `raw/round-<n>/`; `continue` moves them aside to
`raw/round-<n>-incomplete/` before the retry.

### Agents

| Role | Agent | Tools | What the tool list guarantees |
|------|-------|-------|-------------------------------|
| curator | [research-curator](../agents/researchCurator.md) | Read, Glob, Grep, Write | cannot search or fetch, so nothing enters the run's files that the research did not bring back; cannot run a command |
| scout | [research-scout](../agents/researchScout.md) | Read, Write, WebSearch, WebFetch | cannot run a command or edit a file in place (that it writes only its notes file is a rule) |

When the plugin's agents are listed without the prefix, the skill uses that name; when neither is
listed, it uses `general-purpose` with the same brief and says at the review that the rules held by
instruction only. Before every wave it tells the operator what will run.

### What a finished run looks like

**`summary.md`** opens with *Answers at a glance* — every question, its status (*answered*, *partial*,
*not found*) and its answer in a line — then a section per question: status, confidence with its reason,
the answer, the evidence one fact per bullet with its `(R-NN)`, and the conflicts where pages disagree.
With the *landscape* focus, a table of the market — product, segment, audience, model and price, a link
to its profile. Then *What this means for the project*, marked as the curator's reading, every point
naming the questions it rests on; *Open questions*, with what would answer each — another round, a
person, a trial, a paid report — and the claims the raw material made without a page, as leads; and the
rounds.

**`sources.md`** lists every page once: id, title, address, the date it was read (`~` when the raw
material gave none and the run's date stands in), its kind (`official`, `review`, `analyst`, `news`,
`forum`, `regulator`, `other`) and what it was used for. A page nothing cites is not registered.

**`competitors/<slug>.md`** follows the layout of `/blueprint`'s competitor profiles — what it is, for
whom, pricing, a feature matrix by question, notable choices, where it is not comparable — with `(R-NN)`
in place of the blueprint's `(S-NN)`.

### Handing a run to `/blueprint`

The two skills do not write into each other. To use a run in a blueprint, list its `summary.md` and its
`competitors/` folder as sources in `/blueprint` Intake — reliability `web` — and the blueprint's
readers take them like any other document; `raw/` is left out, being the engine's record of what the
summary already says. The review step tells the operator this at the end of every run. A blueprint
that is already under way can take a later run the same way, through its own Intake or `feedback`.

### Tokens

A round leaves deep-research's coordination and the curator's reply in the conversation, and the brief
is drafted on top of the project's documents and the question rounds; what follows reads none of it.
So once the brief is approved, and once the run is done, the skill recommends `/clear`, then
`/research` (or what comes next, such as `/blueprint`), and says why: what the conversation carries
that the next phase does not read, that nothing is lost, and why not `/compact`. The
[skill-resume](../hooks/skillResume.md) hook tells the new session where a run past its brief stands.

## Progress

The skill shows where it is at every step: a checklist of the mode's stages when it starts, at every
gate and at the end; a line `▸ /<command> · <n>/<N> <stage> · <step>` at every change; what it waits for
and how many; and, on `continue` or `status`, the checklist rebuilt from its state first
([rule 8](README.md#rules-every-skill-follows)). The stages per mode, as its `SKILL.md` lists them:

| Mode | Stages |
|------|--------|
| `<topic>`, `continue [run]` | Frame → Research → Curate → Review |
| `status` | Read the runs → Report |
| `extend <run>` | Questions → Approval → Research → Curate → Review |

## What it will not do

- Search before the brief is approved, or beyond it: another product, question or region is a new
  round with its own approval.
- Search the web from the main conversation: the skill grants no web tools; the engine searches.
- Edit `raw/`: it is the record of what the engine returned.
- Let a fact into the run's files without a page in `sources.md`; a claim without one is a lead.
- Turn "not found" into "does not have".
- Present its reading as a fact or recommend a decision.
- Create anything outside `docs/research/`, even a temporary file, or write into a blueprint, a
  backlog or any file outside the run folder and the runs index.
- Sign up, log in, start a trial, fill a form or read behind a paywall.
- Write anything but English in the run folder (the conversation stays in the operator's language).

## The script

None yet. The checks of the review — every question with a section and a status, every `R-NN`
resolving, no `R-??` left, every product with a profile, the index row current — are done by the
model from a checklist. They are mechanical, so they belong in a script (`bin/research.mjs validate`,
and `next` for ids), as `/blueprint` has; following the plugin's practice, the procedure is proven on
real runs first and the mechanical parts are frozen afterwards (task T20 in
[../TASKS.md](../TASKS.md)).

## Limitations

- **deep-research is not under this plugin's control.** Its prompt shape, folders and report format
  belong to Anthropic and can change; the skill reads the report's path from deep-research's own
  message for that reason, but a change in what the report holds can still weaken the curation. It
  may also be absent from a session; the scouts are the fallback, with less breadth — no planning of
  subtopics, no synthesis beyond the curator's.
- **With deep-research, the search rules are instructions.** Its agents are `general-purpose` with
  every tool; the constraints travel in the prompt and are only as strong as deep-research's passing
  them on. The narrow tool lists apply to the scouts and the curator.
- **The curator's guarantee is about sources, not truth.** It cannot add a fact the raw material does
  not hold, but it can misread one, and a page can be wrong, stale or marketing. `WebFetch` returns a
  model's reading of a page, not the page. Dates and kinds tell the reader how far to trust each fact.
- **`Write` is not limited to the run folder.** The curator and the scouts are held to their files by
  instruction; a `PreToolUse` hook that recognises their calls could enforce it, and none exists yet.
  deep-research is held to the round's folder by the `Files:` block of its prompt, and the comparison
  at delivery catches what it leaves outside the run, but cannot see a copy made outside the project
  (an outputs folder of the session).
- **Dates may be approximate.** deep-research's notes do not always record when a page was read; then
  the run's date stands in, marked `~`.
- **Cost.** A deep-research round starts several agents at once (typically three to six researchers and
  a writer), plus the curator; the operator is told before every wave, but the spend is real.
- **Public pages only.** What sits behind a sign-in, a sales call or a paywall is *not found* by
  design, which for some B2B products is most of what matters; *Open questions* says what would answer
  it.
- **No script yet** — see [The script](#the-script).

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows; every template and reference the skill names exists;
  every `file.md › Heading` it points to resolves; every agent it delegates to is defined and
  documented.
- The procedure itself has no automated test; it is exercised by running `/research` on a real topic.
