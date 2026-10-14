# Research — phases and modes

Each phase says what it starts from, its steps, and how it ends. Write `STATE.json` at the end of
every step that changes it, with `updated` from `date "+%Y-%m-%dT%H:%M"`.

## Phase 0 — Frame

**Start from:** a topic (the argument, or asked for when none was given).

1. **The folder.** Runs always live in `docs/research/` — a folder of their own inside the
   project's `docs/` — and the folder is not asked; `mkdir -p` creates whatever is missing. The only
   question is *which* `docs/`, and only when the project root is not a git repository but holds
   repositories of its own (`ls -d .git`, then `ls -d */.git`): ask (`AskUserQuestion`, header
   `Folder`) which repository's `docs/research/` — the one that keeps the documentation first
   (Recommended; the one with a blueprint, when one exists), the others after. The run's folder is
   `docs/research/<YYYY-MM-DD>-<slug>/`, the slug two to four English words of the topic in
   kebab-case. Never write into a non-empty folder that is not this run's.
2. **Read the project's context** — only what tells you what the project is and what it already
   knows; not its code:
   - a blueprint (`STATE.json` with `"kind": "blueprint"`): `01-brief.md` when it exists, otherwise
     `00-sources.md › Gaps after reading`; its `GLOSSARY.md`; the profiles in
     `references/competitors/`, so a known product is not researched again by accident;
   - earlier research runs: their `brief.md` and the *Answers at a glance* of their `summary.md`;
   - the project's `README.md` and `CLAUDE.md`, the first screen of each.

   When there is little, ask the operator in one message, in their language, numbered, answered in
   their own words: what is the product and for whom; which decision or document will this research
   feed; which products do they already know of; which region and which period matter.
3. **Ask the focus** (`AskUserQuestion`, header `Focus`, multiSelect) when the topic does not make it
   plain:
   - **Landscape** — who is on this market, how it is segmented, how products price and position
   - **Competitors** — named products, one profile each, on the questions asked
   - **Domain** — how the field works: actors and roles, terms, processes, rules and regulation,
     business models

   The focus shapes the questions and the output: *Competitors* adds a profile per product, and
   *Landscape* a table of the market in the summary.
4. **Draft the brief** from `templates/brief.md` into the run folder:
   - **Why** — the decision or document the research feeds, in one or two sentences. A brief without
     a *why* drifts; when the operator cannot name one, write "orientation" and keep the questions few.
   - **Context** — the project in three to five lines, with the files it came from.
   - **Questions** — 3 to 7, each answerable by public pages, each with why it matters. A question
     that asks for an opinion ("is X a good idea?") is rewritten as facts that would inform it ("how
     many products offer X, and how do they price it?"). More than seven means two runs.
   - **Products in scope** — at most six; their sites when known. More than six → ask which matter
     most and leave the rest to a *Landscape* question or a later round.
   - **Constraints** — region, period, languages of sources, kinds of source to prefer or avoid.
   - **Out of scope** — what this run will not look at, so the engine does not wander there.
5. **Name the engine** — `engines.md › Choosing the engine` — and how many agents it will roughly
   start; write it into the brief's status line.
6. **Approve** (`AskUserQuestion`, header `Brief`), with the questions listed in the question text:
   **Run it** (Recommended) / **I will edit brief.md first** / **Cancel**. Edit → wait, re-read the
   file, ask again. Run → `brief.md` status `approved on <date>`; `STATE.json`: `consent.grantedOn`,
   `consent.scope` (the question ids and the product names), `engine`, `phase: "research"`, round 1
   `pending` with its questions. Cancel → the folder stays with the draft, `phase: "frame"`.
7. **The runs index.** Create `docs/research/README.md` — in the `docs/` chosen at step 1 — from
   `templates/README.md` when there is none, and add or update the run's row.
8. After *Run it*, recommend a fresh context before Phase 1 (`phases.md › A fresh context`).

## Phase 1 — Research

**Start from:** `STATE.json` with `phase: "research"` and the current round `pending` or `failed`.

1. Tell the operator what is about to run: the engine, the round, the questions, roughly how many
   agents. No question, unless they want to stop.
2. Set the round `running` and run the engine — `engines.md › Calling deep-research` or
   `engines.md › Fallback — the scouts`.
3. When the engine is done, its output is in `raw/round-<n>/`: set the round's `raw` path, the round
   `researched`, and `phase: "curate"`. Go straight on to Phase 2 in the same turn: deep-research ends
   with a delivery step of its own, and the run is not finished there.
4. When the engine fails — `engines.md › When something fails`.

## Phase 2 — Curate

**Start from:** `phase: "curate"` and the round's raw material on disk.

1. One curator (`engines.md › The curator's brief`). Its files appear in the run folder; its reply is
   short and is what you read — not the raw material.
2. Write the statuses it returns into `STATE.json.questions` (`RQ-01: "answered"`, …), the round
   `done`, and `phase: "review"`.

## Phase 3 — Review

**Start from:** `phase: "review"`.

1. **Check** the curated files yourself — they are short; the raw material is not read here:
   - every question of the round has its section in `summary.md`, with a status, and *Answers at a
     glance* has the same statuses;
   - every `(R-NN)` cited in `summary.md` and the profiles is a row of `sources.md`; no `R-??` is left;
     every row has an address and a date;
   - every product in scope has its profile, and the landscape table links each one;
   - *What this means for the project* says it is a reading, and every point cites a question.

   A problem the curator can fix (a missing section, an id that does not resolve) goes back to it once,
   with the problem named; what is still wrong after that is reported to the operator as it is.
2. **Tell the operator**, in their language: each question with its status and a one-line answer; how
   many sources, of which kinds; the conflicts the curator found; what was not found, and what the
   curator suggests for another round. Then where the files are.
3. **Next** (`AskUserQuestion`, header `Next`): **Done** (Recommended when every question is answered
   or the rest cannot be answered by public pages) / **Another round** (Recommended when follow-ups
   would close real gaps — name them in the description) / **I will edit the summary first**.
   - Done → `phase: "done"`, the runs index row updated. Say how the run reaches a blueprint: in
     `/blueprint` Intake, list the run's `summary.md` and `competitors/` folder as sources (not `raw/`,
     which is the engine's record and repeats the summary), reliability `web`. Then recommend a fresh
     context for whatever comes next (`phases.md › A fresh context`).
   - Another round → `extend` on this run (below), starting at its step 2.
   - Edit → wait; the operator's edits stand, and `continue` comes back to this step.

## A fresh context

Every turn of a session sends its whole context again. The brief is drafted on top of the project's
context and the question rounds, and a round leaves deep-research's coordination and the curator's
reply behind it; the phase that follows reads none of it — the engine's prompt is built from `brief.md`,
and `/blueprint` reads the run's curated files. Everything is on disk, so the next phase can start from
the files instead.

After the brief is approved (*Run it*, for the first round or one added by `extend`) and after *Done*,
do not go on in this context. Recommend a fresh one and say why, in the operator's language, so that
they decide knowing what it saves:

```
✓ <the brief approved / the run done> — saved in <run folder>.
▸ Next: <round n of the research / whatever comes next — /blueprint takes the run as a source>. Recommended: type /clear, then <the command>.
Why: every message sends this whole conversation to the model again, and it now carries <what this
phase piled up>, which <next> does not read — it starts from the files. In a fresh context each of its
steps costs a fraction of that, and nothing is lost: everything is saved, and after /clear the plugin
tells the new session where the run stands.
Not /compact: it spends one more request on this whole conversation to keep a summary the next step
does not need.
Or say "go on here" to continue in this context.
```

Name what the phase really piled up — the project's documents read for the brief, the question rounds,
deep-research's coordination — not this list. After the brief, the command is `/research`, which
continues the run (the `skill-resume` hook tells the new session where it stands); after *Done*, it is
what the operator runs next. A plugin cannot clear or compact the context itself; the operator's two
commands do it. If the operator says to go on here, go on.

## The other modes

### continue

Find the run (`SKILL.md › How to read the arguments`), read `STATE.json`, and resume its phase: a
round `failed` or `running` (a session that ended mid-research) starts again at Phase 1, step 1 —
`raw/round-<n>/` from a cut-off run is moved aside to `raw/round-<n>-incomplete/` (`-incomplete-2`
and on when that exists), not mixed with the new one; a round that was `running` gets the comparison
of `engines.md › Calling deep-research` first, so whatever it left outside the run joins the folder
moved aside. A round `researched` resumes at Phase 2. Files the operator edited by hand are theirs: re-read
before writing, and show what you change.

### status

For every run: folder, topic, phase, rounds and their state, the count of questions answered, partial
and not found. Read only `STATE.json` and the brief's status line; change nothing.

### extend

**Start from:** a run with `phase: "done"`, or one in review whose operator chose *Another round*
(any other run in progress is `continue`d instead).

1. Read `brief.md`, *Answers at a glance* and *Open questions* of `summary.md`.
2. Propose the round's questions — the open questions worth answering, the curator's suggestions, and
   what the operator asks for — numbered from the next `RQ-NN`, each with why it matters. Products may
   be added, at most six in the run altogether.
3. Add them to `brief.md` with their round, then the approval of `Phase 0 — Frame`, step 6: approving
   extends `consent.scope` and adds round `<n+1>` `pending`; `phase: "research"`.
4. Phases 1–3 as for the first round. The curator extends the files: earlier answers stay, a later
   round's evidence may change an earlier answer, and then the section says so with the round.
