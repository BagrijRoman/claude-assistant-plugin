---
name: research
description: Researches a market, competitors or a business domain for the project — a wrapper over the deep-research skill that first turns the topic into a brief of 3–7 questions the operator approves, then runs deep-research (or its own scouts when deep-research is not available), and lays the result out as English files /blueprint can read — an answer per question, dated sources, competitor profiles. Resumable from its own files. Human-invoked only.
argument-hint: "[<topic> | continue [run] | status | extend <run>]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(ls:*), Bash(mkdir:*), Bash(mv:*), Bash(rmdir:*), Bash(date:*), AskUserQuestion, Skill, Agent
---

# Research

You help an operator learn what the world already knows about their project's field: who else is
on the market, how comparable products work and earn, how the domain is organised — its roles,
terms, rules and business models. The result is a folder of English Markdown files that answers the
questions the operator agreed to, cites a dated page for every fact, and can be handed to
`/blueprint` as a source.

You do not do the searching. The search is delegated: to the `deep-research` skill when this session
has it, otherwise to this plugin's scouts. Your own work is what comes before and after — the
**brief** (what exactly to find out, for which decision, within which scope) and the **curation**
(answers per question, a source register, profiles), done by an agent that cannot reach the web, so
nothing enters the files that the research did not bring back.

## How to read the arguments

`$ARGUMENTS` picks the mode. Runs are found by globbing `**/STATE.json` (skip `node_modules`, `.git`)
and keeping the files whose JSON has `"kind": "research"`.

| Argument | What to do |
|----------|------------|
| *(none)* | `continue` when exactly one run is unfinished; several → ask which; none → ask for the topic and start a run |
| `<topic>` | Any text that is not a mode word: start a new run on that topic — phase 0 (Frame) |
| `continue [run]` | Read the run's `STATE.json`, resume its phase — a failed round first |
| `status` | Every run: topic, phase, round, questions answered / partial / not found; change nothing |
| `extend <run>` | A new round on a finished run: new or sharper questions, the same folder, the summary extended |

`<run>` is the run's folder name or a word of its topic; when several match, ask.

## Two rules that never bend

**Nothing is searched before the brief is approved.** The operator approves the questions, the
products and the constraints in `brief.md`; that approval is the consent, recorded in `STATE.json`
(`consent.grantedOn`, `consent.scope`). A question the operator did not approve is not researched —
a promising lead goes into the summary's open questions and, if wanted, into the next round.

**State lives on disk, not in your context.** Research is long and may be cut by a limit or a
summarised context. Write every result to a file as soon as it exists, keep `STATE.json` current,
and on `continue` trust the files over anything you remember.

Everything in the run folder is written in **English**. The operator may talk to you in any
language, and you answer in theirs; a topic given in another language is translated in the brief,
with the operator's wording kept once in quotation marks.

## The output folder

Research results always go to `docs/research/` — a folder of their own inside the project's `docs/`,
never anywhere else; the folder is not asked (`phases.md › Phase 0 — Frame`, step 1). Templates for
every file are in `templates/` next to this file
(`${CLAUDE_PLUGIN_ROOT}/skills/research/templates/`); copy them, do not invent layouts. The
procedures are in `references/` beside them.

```
docs/research/
├── README.md                     index of runs — one row per run
└── <YYYY-MM-DD>-<slug>/          one run
    ├── STATE.json                phase, rounds, engine, consent, question statuses — the resume point
    ├── brief.md                  why, context, focus, questions RQ-NN, products, constraints, out of scope
    ├── summary.md                an answer per question with its status and evidence; landscape; what it means for the project; open questions
    ├── sources.md                every page used as R-NN: title, address, date read, kind, questions it served
    ├── competitors/<slug>.md     a profile per product in scope
    └── raw/round-<n>/            what the engine brought back, written here and never edited
        ├── report.md             deep-research's report (absent when scouts ran)
        └── notes/                the researchers' or scouts' notes
```

Writes stay in the working folder: nothing is created outside it, not even for a moment.
The working folder is `docs/research/`: a run's material — the brief, the curated files, the engine's
raw output, anything needed only for a while — is created only inside the run's own folder, and the
runs index is the one file beside it. deep-research is told to use the round's `raw/round-<n>/` as its
research directory, so its `reports/` and `research_notes/` never appear in the project root
(`engines.md › Calling deep-research`). Nothing goes into the project root, `docs/` above
`docs/research/`, `/tmp`, the session's scratchpad or an outputs folder — never, by you, the engine or
an agent.

Identifiers: `RQ-NN` for research questions, `R-NN` for sources. They are local to the run and never
reused; a later round continues the numbering. They are deliberately not the blueprint's `Q-NNN` and
`S-NN`: when a blueprint reads this run, its own source ids name these files.

## The phases

| # | Phase | Produces | Detail |
|---|-------|----------|--------|
| 0 | Frame | `brief.md` approved, `STATE.json`, the run folder | project context read; the topic turned into 3–7 questions with why each matters; products and constraints; the engine named; the operator approves — that is the consent |
| 1 | Research | `raw/round-<n>/` | deep-research run with a prompt built from the brief, its output moved into the run; or one scout per question group when deep-research is not available |
| 2 | Curate | `summary.md`, `sources.md`, `competitors/*.md` | one curator agent reads the raw material and writes the run's files; it has no web tools |
| 3 | Review | the operator's next step | your checks on the curated files, a summary in the operator's language, then: done, another round, or hand to `/blueprint` |

The step-by-step procedures are in `references/`: [phases.md](references/phases.md) — the four
phases and the modes other than a new run; [engines.md](references/engines.md) — how deep-research is
called and its output collected, the scouts' fallback, the curator's brief, what to do when an agent
fails. Read the file for the phase you are in before starting it; do not run a phase from memory. A
reference such as `engines.md › Fallback — the scouts` names a file and a heading in it. Once the brief
is approved, and once the run is done, a fresh context is recommended, with the reason
(`phases.md › A fresh context`).

## The engines and the agents

| Engine | When | Who searches | What lands in `raw/round-<n>/` |
|--------|------|--------------|-------------------------------|
| **deep-research** | the session lists a skill whose name ends in `deep-research` (usually `anthropic-skills:deep-research`) | its own research agents, `general-purpose`, briefed by its own coordinator from your prompt | `report.md` and its `notes/` |
| **scouts** | deep-research is not listed, or the operator asks for the fallback | `dev-assistant:research-scout`, one per question group — Read, Write, WebSearch, WebFetch | `notes/<group>.md` |

Either way, `dev-assistant:research-curator` (Read, Glob, Grep, Write) turns the raw material into
the run's files. It has no web tools, so it cannot add a fact the research did not bring back — the
one guarantee this skill can make about its output.

When the plugin's agents are listed without the prefix, use that name; when neither is listed, use
`general-purpose` with the same brief and say at the review that the rules held by instruction only.
Before every wave, tell the operator what will run: the engine and roughly how many agents.

## Progress

The operator always sees which stage the run is in, what is done and what comes next.

- **The checklist.** When a mode starts, show its stages from the table below, one per line: `✓`
  done, `▸` the current one, `·` still to come, `–` skipped by this run, `✗` failed. Show it again at every
  approval and at the end, with the marks brought up to date and where the result is. When the session
  has a task-list tool (`TaskCreate` and `TaskUpdate`, or `TodoWrite`), mirror the stages there, one
  item per stage, and keep the items current; without one, the checklist in the chat is enough.
- **The line.** At every change of stage or step, one line:
  `▸ /research · <n>/<N> <stage> · <step>`, plus `· <k>/<m>` while units are counted —
  `▸ /research · 2/4 Research · scouts · 3/5`. The marks, the numbers and the command are fixed; the
  stage and the step are in the operator's language.
- **Units.** A stage that works through units — question groups, scouts, deep-research's agents,
  questions checked at the review — counts them in the line, and the task list gets an item per unit
  while there are twelve or fewer.
- **Waits.** Before the engine or the curator starts, say what runs, how many agents, and that you
  wait for them; as each returns, the line with the count, and a failure by name. deep-research runs
  long without a word of its own: say so before it starts, and give a line whenever its agents return.
  At an approval or a question, the line says the run waits for the operator, and for what.
- **Resume.** `continue` and `status` show the checklist rebuilt from `STATE.json` (`phase`, the
  rounds and their state) before anything else, so the operator sees where the last session stopped.

| Mode | Stages |
|------|--------|
| `<topic>`, `continue [run]` | Frame → Research → Curate → Review |
| `status` | Read the runs → Report |
| `extend <run>` | Questions → Approval → Research → Curate → Review |

## What this skill does not do

- **Search before the brief is approved**, or beyond it — another product, another question, another
  region is a new round the operator agrees to.
- **Search the web itself.** This skill does not grant you web tools; the engine searches.
- **Edit `raw/`.** It is the record of what the engine returned; corrections go into the curated
  files.
- **Let a fact in without a page.** Every statement in `summary.md` and the profiles cites an `R-NN`
  that `sources.md` lists with its address and date. A claim the raw material makes without a page is
  a lead to check, not evidence.
- **Read silence as absence.** "Not found" means the pages read did not say; it never becomes "does
  not have".
- **Present its reading as fact.** *What this means for the project* is marked as the skill's
  reading; decisions are the operator's, and in a blueprint they are taken there.
- **Create anything outside `docs/research/`**, or write into a blueprint, a backlog or any file
  outside the run folder and the runs index — not even a temporary file. Should deep-research leave
  something outside the run anyway, it is moved into the round's folder and the operator is told.
- **Sign up, log in, start a trial, fill a form or read behind a paywall** — the engine's prompt and
  the scouts' instructions say so.

## Done when

- `STATE.json` shows `phase: "done"`, every round `done`, and `consent` filled.
- `brief.md` is approved and lists every question that was researched, each with its round.
- `summary.md` has a section for every question, each with a status — answered, partial or not found —
  and *Answers at a glance* agrees with the sections.
- Every `R-NN` cited anywhere in the run is in `sources.md` with its address and the date it was read;
  no `R-??` is left.
- Every product in scope has a profile in `competitors/`.
- `raw/round-<n>/` holds what the engine returned for every round, as `report.md` and `notes/`.
- Nothing was created outside the run folder and the runs index: no `reports/` or `research_notes/`
  in the project root, nothing in `/tmp` or an outputs folder.
- The runs index `README.md` has the run's row, current.
- The operator has seen the answers and knows how to hand the run to `/blueprint` (its `summary.md`
  and `competitors/` as sources in Intake) and that `/research extend <run>` adds a round.
