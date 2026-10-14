# Blueprint — common mechanics

Read this file at the start of every session, then the file for the phase or mode you are in:
`intake.md` (phases 0–1), `design.md` (phases 2–3), `modules.md` (phases 4–5), `reviews.md`
(phases 6–7), `modes.md` (`status`, `module`, `decide`, `restructure`, `feedback`, `export`).
Templates live in the skill's own folder, `${CLAUDE_PLUGIN_ROOT}/skills/blueprint/templates/`; a path
like `templates/STATE.json` is relative to the skill's folder. A reference such as
`mechanics.md › Depth` names a file and a heading in it.

## The working folder

Writes stay in the working folder: nothing is created outside it, not even for a moment. The working
folder is the blueprint folder chosen at Intake. Every file the skill makes is created there: the
documents and logs, `STATE.json`, `modules/`, `references/competitors/`, the converted copies of Word
files in `.sources/`, the one-document copy in `export/`. A file needed only for a while is created
there too and removed once it has served. Never write into the project root, into `docs/` above the
folder, into `/tmp` or the system's temporary folder, or into the session's scratchpad; never leave a
copy in an "outputs" folder. Every agent's brief names a file inside the folder, and the script's
`export --out` refuses a path outside it. Sending a document anywhere else is the operator's step.

## The helper script

The bookkeeping is done by a script, not by counting:
`node "${CLAUDE_PLUGIN_ROOT}/bin/blueprint.mjs" <command> <blueprint dir> …`

| Command | When | What it does |
|---------|------|--------------|
| `changed [--root <project root>]` | first thing on `continue`, `module`, `decide`, `restructure` and `feedback`; `status` only reports it | lists the files of the folder and the document sources changed since `STATE.json` was last written, and the document sources it cannot find |
| `next <kind> [code] [--count N]` | every time you assign an id | prints the next `S-`, `D-`, `A-`, `Q-`, `G-`, `N-` or `RK-` id (`next decision`), or reserves capability ids for a module (`next capability ORG --count 3`) |
| `validate` | before every gate, and after a repair | reports dangling references — capabilities named that no module has included — duplicate ids, unnumbered capabilities, missing module files, stale counts and — from phase 6 on — source items without coverage; every error is fixed before the gate |
| `stamp` | last thing in every operation that wrote anything | writes `updated` (the clock's time) and `counts` into `STATE.json` |
| `export [--with-sources]` | the `export` mode | writes the whole blueprint as one document under `export/` |
| `expand <path>… [--root <project root>]` | Intake, when the operator names folders or a `/research` run | lists the files to register, grouped by folder, and counts what it left out by kind — dotfiles, build folders, this folder, assets, and a research run's brief, state and `raw/` notes (`intake.md › Phase 0 — Intake`, step 4) |

Pass `--root` to `changed` when the sources' paths are relative to the project rather than to the
folder you run from. If the script cannot run, say so and do the same by hand — but never skip the
checks it would have made.

## STATE.json

The resume point. Shape is in `templates/STATE.json`; the `modules` entry is described below. Update
it when a phase starts (`phases.<phase>: "in-progress"`), when its gate is reached
(`"awaiting-approval"`) and when the operator approves (`"approved"`) — then set `phase` to the next
one; when the depth is chosen (`depth`); when research consent is given (`research.allowed`,
`research.scope`, `research.grantedOn`); when a module is added, renamed or removed (phase 3,
`restructure`); when a source's extract is merged or a module's L2 or L3 is written. On `continue`
inside phases 1, 4 and 5, skip the units already done (an extract in `00-sources.md`; `l2: "done"`;
`l3` anything but `"pending"` or `"failed"`) and retry the failed ones first. A unit of phase 1 is a
`document` or `url` source the operator gave: an `idea` or `feedback` source you extract yourself from
its verbatim text, and a `product`, a `person`, a page a researcher used, a register (*Read as*
`register — not read`) and a source another one carries (*Read as* `carried by S-NN`) are not read at
all.

`updated` and `counts` are never edited by hand: `stamp` writes them at the end of every operation
that changed anything, in every mode. `/backlog` compares them to notice that the blueprint moved.

### The modules entry

`modules` holds one entry per module from phase 3 on —
`{ "name", "slug", "code", "file", "stage", "surfaces", "sources", "lastCapability", "l2", "l3" }`,
plus `"expected"` from phase 4 and `"l3Plan"` from phase 5 on, and `"removed": "<D- id>"` on a removed
module only:
- `slug` — the kebab-case file name (`modules/<slug>.md`);
- `code` — the short module code used in capability ids: the sources' own prefix when they have one
  (`ORG`, `DAT`), otherwise three letters you choose;
- `stage` — the module's earliest stage on any of its surfaces (web MVP, mobile next → MVP); the
  per-surface stages stay in the roadmap;
- `sources` — the `S-` ids the module rests on, with sections where a source covers several modules
  (`S-05 §ORG`);
- `lastCapability` — the highest capability number ever issued under the code; `next capability`
  raises it;
- `l2` — `pending` / `failed` / `done`; `l3` — `pending` / `failed` / `list-only` / `none` (L2 only,
  by depth) / `done`;
- `expected` — the number of capabilities the module's L2 writer foresaw; phase 5 shows it when the
  operator chooses how deep each module goes;
- `l3Plan` — `full` or `list`: what phase 5 writes for the module (`mechanics.md › Depth`); absent on a
  module the depth leaves at L2. `validate` holds `l3` to it: a `full` plan ends in `done`, a `list`
  plan in `list-only`.

### Hand edits

On `continue`, `module`, `decide`, `restructure` and `feedback`, run `changed` first. Read every file
it lists before anything else and say which they are. A changed source is converted again when it has
a copy in `.sources/`, and extracted again, its *Decided* rows and index brought up to date, before
work continues; then name the modules whose `sources` include it and offer to re-run `module` for
each. A source listed as not found was moved or deleted — or `--root` is wrong: ask the operator where
it went before going on. After `done`, every change found gets a `CHANGELOG.md` line with mode
`hand edit`. `status` lists them and writes nothing.

### After done

Every change also adds one line to `CHANGELOG.md`: when (`date +%Y-%m-%dT%H:%M`), the mode, what
changed, the ids and the modules it touched — so `/backlog` and a person coming back later see what
moved.

### Written last

`STATE.json` is written last in every operation — `stamp` runs after any `CHANGELOG.md` line and any
regenerated `README.md` — so that `changed` finds only what the operator changed. If `STATE.json` is
missing or unreadable on `continue`, stop and tell the operator — rebuilding state from the
documents is their call, not a thing to do silently.

## The gate

Every phase ends the same way. Do not shortcut it when the phase felt small.

1. Run `stamp`, then `validate` — counts first, so that a stale count is never an error — and fix
   every error it reports, or, when one needs the operator, make it a question.
2. Regenerate `README.md` from `templates/README.md` — one row per file that exists so far, the
   counts as `STATE.json.counts` holds them.
3. Show the operator, in their language, a summary of at most ~20 lines: what this phase produced,
   which files to look at, the **new assumptions** — how many, and the ten that matter most (`A-` id
   and one line each; the rest are in `ASSUMPTIONS.md`) — the **new open questions** (`Q-` ids and
   one line each), any decision of the sources this phase built on that the operator has not seen
   named yet, the units whose agent failed or that rest on an extract only, and the warnings
   `validate` left.
4. Ask with `AskUserQuestion` (header `Gate`):
   - **Approve — go to phase N+1** (Recommended when you have nothing pending) — offered only when no
     unit of the phase is failed; otherwise this slot is **Retry the failed units** (Recommended)
   - **Revise** — the operator tells you what to change; apply, then gate again
   - **Promote an assumption** — the operator names `A-` ids that should have been questions; turn
     each into a question round, record decisions, then gate again
   - **Stop here** — save state as `awaiting-approval`; the next `continue` returns to this gate
5. On approval: every assumption of this phase that was not promoted is marked `accepted (gate
   <phase>)` in `ASSUMPTIONS.md`; `STATE.json` → phase `approved`, next phase `pending`, `phase`
   moves on. Whatever the answer — *Stop here* included — `stamp` is the last write.
6. When the next phase runs agents — Reading the input, Modules, Capabilities, the two reviews — stop
   after the stamp and hand the operator a fresh context (`mechanics.md › A fresh context`).

A gate that ends a mode (`module`, `restructure`, `feedback`) approves the run: its assumptions are
marked `accepted (gate <mode>)`, and `phase` and `phases` do not change. A mode run inside another
run — `module` inside `restructure`, `restructure` inside `feedback` or phase 7 — does not gate on its
own: the outer run gates once for everything.

## A fresh context

Every turn of a session sends its whole context again, so a phase that runs in the context of the
phases before it pays for all of them on every step: their extracts, their question rounds, their
agents' replies. Everything a phase needs is on disk, so it can start from the files instead. Nothing
in the procedure is skipped for it; only what the next phase does not use is left behind.

- **At the gate.** After the approval of a phase whose next phase runs agents
  (`mechanics.md › The gate`, step 6), do not start that phase. Say, in the operator's language, that the phase is approved
  and saved, and that the next one costs far fewer tokens in a fresh context: type `/clear`, then
  `/blueprint`. A plugin cannot clear the context itself; the operator's two commands do it. If the
  operator says to go on here, go on.
- **After `/clear`.** The `blueprint-resume` hook tells the new session which blueprint is unfinished
  and where it stands; `/blueprint` then runs `continue`.
- **What `continue` reads.** `STATE.json` first, then `changed`, this file, the reference of the phase
  or mode it resumes, and `README.md` for the list of files. After that, only what the phase's steps
  name, when a step needs it — never the whole blueprint, and never the documents of the approved
  phases just to have them in mind. A phase that runs agents gives them paths: the agents read the
  files, you read their replies.

## IDs

Every id comes from `next`, never from counting. Where each lives: `S-` in `00-sources.md`, `D-` in
`DECISIONS.md`, `A-` in `ASSUMPTIONS.md`, `Q-` in `OPEN-QUESTIONS.md`, and `G-` (goals), `N-`
(non-functional requirements) and `RK-` (risks) in `01-brief.md`. Capability ids are
`<module code>-C<NN>`, reserved with `next capability <code>` from the module's `lastCapability` —
never taken from the module file, which no longer shows a moved or removed id. `next` reads the log
as it is on disk: write each row before asking for the next id, or take several at once with
`--count N` — two calls before a write give the same id twice. The one exception is the `R-nn` of a
phase-7 finding, numbered in order inside `04-review.md`.

Subagents never assign ids: they tag their findings `[?pending]`, their capabilities `<code>-C??`
and an assumption they need `[A-??: <what>]`, and they refer to a capability not yet numbered as
`<code>-C?? · <its verb phrase>`. You replace all of these when you merge. Two agents counting in
parallel would collide.

An id is never changed and never reused: a capability that moves to another module keeps it, and the
id of a removed one stays retired (after `done`, the removal is a line in `CHANGELOG.md`).

`validate` reads every `S-NN`, `D-NNN`, `A-NNN`, `Q-NNN`, `G-NN`, `N-NN` and `RK-NN` in the folder as a
reference, and every `<CODE>-CNN` as a capability. Anything that only looks like one goes in
backticks, which the script does not read: a word (an N-95 mask, a G-20 summit), and above all a
source's own id of that shape — a source whose decisions are `D-023` or whose features are
`ORG-C05` is cited as `` `D-023` `` and `` `ORG-C05` `` everywhere: in its extract, in *Decided in the
sources*, in the index and in *Coverage*, whose cells the script reads without the backticks.

Ids that come from the sources keep their source. A source's decision or question is cited with the
source's prefix — `S-01 §D23`, `S-01 §Q4` — never as `D-023`, `Q-004` or a bare `D23`: `D-`, `A-` and
`Q-NNN` belong to this blueprint's logs only. A source's item is cited by its own id (`ORG-06`), and
as `S-03 §ORG-06` when another source uses the same id; a section as `S-03 §4.2`.

## Subagents

Noisy or parallel work goes to subagents, each of a type whose tools fit its role, so that what a
role must not do, it cannot do:

| Role | Agent type | Model | Tools | Does |
|------|------------|-------|-------|------|
| reader | `dev-assistant:blueprint-reader` | `sonnet` | Read, Glob, Grep, WebFetch | reads one source and returns its extract; cannot write or run a command; has no web search |
| writer | `dev-assistant:blueprint-writer` | `sonnet` | Read, Glob, Grep, Write, Edit | writes the one module file it is given; has no web tools |
| reviewer | `dev-assistant:blueprint-reviewer` | the session's | Read, Glob, Grep | returns findings; cannot write |
| researcher | `dev-assistant:blueprint-researcher` | the session's | Read, Write, WebSearch, WebFetch | researches one consented product and writes its profile |

Where the agent is listed without the prefix (`blueprint-reader`), use that name; where neither is
available, use `general-purpose` with the same brief — the rules then hold by instruction only, so
say so in the gate summary — and pass the model of the table in the `Agent` call (`model: "sonnet"`
for a reader or a writer).

Readers and writers are most of a run's agents, and their work — a source to a fixed layout, one
module from its sources — is well within Sonnet. A reader is not put on a smaller model: its extract
feeds the gaps, the brief and the split into modules, so a requirement it drops or misattributes
travels through the whole blueprint. Reviewers and researchers keep the session's model: a reviewer's
findings decide the gates, and a researcher judges pages nobody has checked.

No agent has a shell: a Word file is read from its converted copy in `.sources/`
(`intake.md › Phase 0 — Intake`, step 4), and the brief names the copy next to the original. A writer
has no web tools either, so a `url` source reaches it through its extract only: say so in its brief,
and name at the gate the modules that rest on such a source — when the page matters, ask the operator
for a PDF or Markdown export, which then becomes the source.

Every brief names the goal, the files to read by path (the agent reads them; do not paste them), the
citation rules of `mechanics.md › IDs`, and what to return, and repeats the rules every role shares:
English, the glossary's terms, behaviour not implementation. The agent types carry these rules in
their own instructions; the brief repeats them so that the `general-purpose` fallback has them too.
A **writer**'s brief also names its one file; the sections of `01-brief.md` and `02-architecture.md`
it reads (`modules.md › What a writer reads`), not the whole files, most of which concern other
modules; and **the module's sources in full** — the files in `STATE.json.modules[].sources`, not their
extracts. It repeats that the writer puts forks under **Open points** in its file as `[?pending]`, writes
no other file (never a log, the glossary or `STATE.json`), and returns a summary of at most 15 lines,
the open points and the proposed terms and entities. When several writers work on one module (one per
sub-module), none of them writes: each returns its section as text and you assemble the file. Open
points written to disk survive a summarised context; a reply does not.

You merge: assign ids with `next`, add the proposed terms to the glossary and accepted entities to the
domain model and to the module that owns them, turn open points into questions (asked now, or
`OPEN-QUESTIONS.md`), update the files.

**Before a wave**, tell the operator what is about to run: how many agents, of which role, for which
modules or sources — a phase over thirteen modules is thirteen agents, then a merge. No question,
unless they want to narrow it.

**When an agent fails** — an error, a usage limit, an empty or cut-off reply — do not redo its work
yourself and do not wait in silence: mark its unit failed (`l2` or `l3: "failed"` for a module,
`Read as: failed` for a source), finish the rest of the wave, tell the operator which units failed
and why, and retry them first on the next `continue`, or when the operator asks. A failed reviewer or
researcher has no state of its own: run it again before the gate, and if it fails twice, name the walk
or the product as not done in the gate summary. A writer that failed may have left half a section:
its retry brief says that what it finds under its headings is a failed attempt to rewrite, not the
operator's text to keep. The phase is not approved while a unit is failed (`mechanics.md › The gate`).

## Depth

One table decides how deep the modules are described. The depth in `STATE.json` picks the column;
the row is picked by the stage of a module — its earliest across surfaces — or of a capability that
has a stage of its own. A capability that exists only on a later-staged surface carries that stage
as its own **Stage**.

| Stage | `quick` | `standard` | `deep` |
|-------|---------|------------|--------|
| MVP / in scope | L2 + capability list | L2 + full L3 | L2 + full L3 |
| next / later | L2 | L2 + capability list | L2 + full L3 |
| out of scope | no module file; a line in the brief's *Out of scope* | same | same |

L2 is written for every module that is not out of scope. A *capability list* gives, for each
capability, its heading with its id, its **Who**, its **Source** line, its **Stage** line when it
differs, and one line of **What** — no rules or edge cases yet. A capability whose own stage lands on a row that says
only L2 is still listed this way: nothing a source names is dropped by depth.

**Per module.** The table is where phase 5 starts, not where it must end. Before its first writer the
operator sees, per module, what the table gives it and how many capabilities its L2 writer foresaw
(`expected`), and may narrow full L3 to the core of the product: the modules most main flows pass
through get it, the rest a capability list (`modules.md › Phase 5 — Capabilities (L3)`, step 1). The
choice is each module's `l3Plan` — `full`: the module's row reads *full L3*; `list`: it reads
*capability list* — and a capability with a stage of its own still takes its own row. A module left as
a list is deepened later, when the work needs it, by `/blueprint module <name> full`
(`modes.md › module`).
