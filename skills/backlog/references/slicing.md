# Slicing — the rules

How a blueprint becomes batches, tasks and subtasks. Read before `init`, `detail`, `add`, `plan` and
`resync`. Templates live in the skill's own folder, `${CLAUDE_PLUGIN_ROOT}/skills/backlog/templates/`;
a path like `templates/tasks/TASK.md` below is relative to the skill's folder.

## Contents

- [What to read in the blueprint](#what-to-read-in-the-blueprint)
- [Stages](#stages)
- [Strategy questions](#strategy-questions)
- [Batches](#batches)
- [From capabilities to tasks](#from-capabilities-to-tasks)
- [Foundation and cross-cutting tasks](#foundation-and-cross-cutting-tasks)
- [Task types](#task-types)
- [Subtasks](#subtasks)
- [Acceptance criteria and How to verify](#acceptance-criteria-and-how-to-verify)
- [Priority, size, dependencies, blocking](#priority-size-dependencies-blocking)
- [Feedback to the blueprint](#feedback-to-the-blueprint)

---

## What to read in the blueprint

| Blueprint file | Take from it |
|----------------|--------------|
| `STATE.json` | `phase` and `phases` (is it done?), `depth` (which capabilities are only listed — *Stages* below), `counts`, and `modules[]` — code, slug, file, stage, surfaces, `l3`, `l3Plan`, `removed` — the list of module files to read |
| `01-brief.md` | actors (for the actor in *How to verify*); the `## Surfaces` table with its constraints and default rule (the input to the platform map); goals `G-`; non-functional requirements `N-` (they become acceptance criteria and operational tasks); out of scope (never slice it); **Decided outside this blueprint** — binding: it settles platform questions and may mandate technical work; *Key constraints* |
| `02-architecture.md` | the module map with the `Surfaces` column; the **main flows** — each step's module and surface (the batches are cut along them); the **domain model** — the entities a flow touches are the foundation's first shape, *Relates to* gives entity dependencies, *States* gives lifecycle work; **Roles and access**; the cross-cutting concerns; relationships between modules (they become dependencies) |
| `03-roadmap.md` | the stage per module *and surface*; *MVP — or what is in scope — in one paragraph*, the target state after the first-stage batches |
| `modules/<slug>.md` | sub-modules; entities with states; the **capabilities** (inventory below); the `## Access` table |
| `OPEN-QUESTIONS.md` | open `Q-` ids, *Where* each came up, and its *Provisional choice in the text* |
| `DECISIONS.md` | only to understand a capability; tasks cite the `D-` ids their capability cites |
| `GLOSSARY.md` | the words to use; a task never introduces a term the glossary lacks |
| `CHANGELOG.md` | after the blueprint is done: what moved since the last sync (`resync`) |

**The capability inventory.** Capabilities are read from the files named in the blueprint's
`STATE.json.modules[].file`, for the entries without `removed` — never from `modules/removed/` or
`export/`. A heading that starts with an id is a capability (`#### ORG-C03 · Invite a team member`,
`#### ORG-C07 · System: Remind…`); one `Grep` for `^#{1,6} +[A-Z][A-Z0-9]{1,5}-C[0-9]{2,}` lists every
id, verb phrase and `System:` flag. One inventory reader per module returns, per capability:

- id, verb phrase, sub-module, `System:` yes or no, **Who**;
- **Surfaces** (or `inherited` — then the module's), **Source** items (`ORG-06`), its own **Stage** (or
  `inherited`);
- the number of **Rules**, **Edge cases** and **States** transitions, as `R/E/S` (`5/3/2`);
- **Depends on**, **Refs** (`D-`, `A-`, `G-`, `N-`, and source decisions `S-01 §D23`), **Trigger** for a
  `System:` capability;
- its row of the module's `## Access` table;
- the open `[?Q-NNN]` markers inside its block;
- `no rules` when the block has neither Rules nor Edge cases — a fact, not a verdict.

You merge the inventories into `COVERAGE.md`'s rows (`templates/COVERAGE.md`), keyed by id, and decide
for each `no rules` capability whether it is list-only by depth or a blueprint gap (*Stages* below).

**Open questions outside capabilities.** Map every open `Q-` by its *Where* and by a `Grep` for
`\[\?Q-[0-9]+\]` over the blueprint (not `export/`, not `modules/removed/`). In a capability block or
an Access row → that capability's tasks. In a flow step, a cross-cutting section or *Roles and access*
→ a line in the *Notes* of the tasks and batches it touches, and a row in `BACKLOG.md`'s question
table; it blocks only where a core path depends on it (*Priority, size, dependencies, blocking*).

## Stages

A capability's **effective stage** on a surface is its own **Stage** line when it has one, otherwise
the `03-roadmap.md` row for its module and that surface. The roadmap uses either *MVP / next / later*
or, while the build order is still open, *in scope / later / out of scope*. Wherever this skill says
**first stage**, it means MVP — or in scope when the roadmap uses that word. Out of scope is never
sliced.

A capability with no rules and no edge cases is **list-only** when the blueprint's depth table gives
its effective stage only a capability list (depth `quick`: MVP or in scope; depth `standard`: next and
later), or when its module's `l3` is `list-only` (its `l3Plan` is `list`: the operator kept it a list
at the start of phase 5) — and not when its module's `l3Plan` is `full`, which reads the module's own
stage as full detail whatever the depth — it has a heading, Who, Source and one line of What,
and no rules or edge cases *yet*, by design. Where the depth asks for full detail, the same emptiness is
a blueprint gap (*From capabilities to tasks*). A list-only capability is cut as an outline row only and
never reported as a gap. A module with `l3: none` has no capabilities yet: its outline rows come from its L2
sub-modules, and `COVERAGE.md` gets one row `<CODE> — L2 only (depth)`. A list-only capability cannot
be detailed; the blueprint has to describe it in full first (`modes.md › detail`, step 1).

## Strategy questions

Asked at `init`, in as many rounds as the limits of `mechanics.md › Questions` need — usually two or
three; each answer takes the next `P-NNN`, and a question not asked gets no record. Offer your
recommendation first; the reasons below are the descriptions. The value goes to `STATE.json.strategy`
as a copy of the record.

| Question (header) | Options → `strategy` value | Recommend |
|-------------------|----------------------------|-----------|
| **Batch size** (`Batch size`) | small, 3–5 tasks → `small` · medium, 6–9 → `medium` · large, 10+ → `large` | small for one developer, or one developer plus an agent — a batch should finish in days, so the *what works* moment comes often; medium for a team. It applies from batch 2: batch 1 is as big as its flow's thinnest path and its foundation need, and its count is shown at Gate 1 |
| **Batch 1 flow** (`First flow`) | every main flow listed in the question text with its size (steps × modules, from the inventory); options: the recommended flow / the runner-up; Other takes a flow number → `firstFlow` | the flow the roadmap's *MVP — or what is in scope — in one paragraph* describes; usually flow 1 |
| **First release** (`Release`) — only when the roadmap says *in scope* instead of MVP | the flows of the first release, as the operator names them (recommended: the batch-1 flow and the modules it crosses) → `firstRelease: [flow ids]` · every in-scope module → `firstRelease: "all"` | the first: it gives the work a first useful end. Capabilities on the chosen flows are `P1`; the rest of in scope is `P2`; the batches that complete the chosen flows say "first release" in their goal line |
| **Cross-cutting concerns** (`Crosscut`) | a task per concern in the first batch that touches it, plus a criterion on every task it touches → `task-plus-criterion` · a criterion only → `criterion-only` · a dedicated batch later → `later-batch` | the first: the concern exists from the moment it matters, and every task proves it still holds |
| **Foundation depth** (`Foundation`) | walking skeleton — only what batch 1's flow needs → `walking-skeleton` · full skeleton — every module's basics first → `full-skeleton` | walking skeleton; a full skeleton is a horizontal layer in disguise |
| **Platform map** (`Platforms`) — when any surface is not plainly the web, unless *Decided outside this blueprint* or a source decision already fixes it (then record a `P-` citing it, `S-01 §D4`, and do not ask) | per surface: an installed app per OS (`ios`, `android`) · one cross-platform app (`mobile`) · the same responsive web application (`web`) → `platformMap: { surface: [platforms] }` | read the brief's constraints: store distribution, offline use, or device features a browser cannot reach → an installed app; none of these → the responsive page (a camera alone is not a reason: a browser can take a photo). Between a native pair and one cross-platform app there are no product grounds — ask, and say so. A surface that is a channel, not an application (email, a partner API), gets no platform of its own: its work is built on the platform that sends or serves it, usually `web` |
| **Platform order** (`Plat order`) — next round, only when the map produced several platforms | one platform through its first-stage flows, the other follows → `one-first` · both from batch 1 → `together` · interleave by flow → `by-flow` | one first: the batch-1 paragraph stays small and the second platform starts with lessons learned. Both from batch 1 only when the first flow itself crosses surfaces |

## Batches

1. **Batch 1 is the thinnest end-to-end version of the chosen flow.** Every step of the flow has a
   task; each task delivers the capability's core path only (rules and edge cases come later unless
   the flow is meaningless without them). Plus the foundation tasks batch 1 cannot run without. After
   batch 1 a user can do the flow, badly but completely. The batch-size decision does not apply to it.
2. **Next batches widen before they broaden.** Widen: the rules, edge cases and transitions of the
   capabilities already built, and the cross-cutting concerns batch 1 did not touch. Broaden: the next
   flow. Widening first keeps the first flow honest before a second one is started.
3. **Then the remaining first-stage flows**, one or two per batch, each widened in the batch after.
4. **Later stages** become outline batches at the end, ordered by stage; they are detailed when their
   turn comes, or re-cut by `resync` when the blueprint has changed by then.
5. **A batch never depends forward.** No task in batch 2 depends on a task in batch 3. If the
   dependency is real, the depended-on task moves earlier or the dependent task moves later; say which
   and why in the batch's *Notes*.
6. **Each batch has a goal line and a *What works after this batch* paragraph**, written before its
   tasks. The paragraph is the test of the cut and what the operator demos; it names the platform(s) it
   is true on.
7. **A batch that cuts a flow maps it.** Flow steps name a module and a surface, not a capability, so
   the batch file's *Flow → capabilities* table records step → capability id(s) → task. A step no
   capability delivers is a *Feedback to the blueprint* row, not a guess.
8. **Name batches by what they deliver**, not by number only: `01-first-report-end-to-end`,
   `02-report-rules-and-access`. The number orders, the slug tells.

## From capabilities to tasks

Default: **one capability → one task**. Deviate when:

| Situation | Do | Mark |
|-----------|----|------|
| A capability on the flow of a batch that cuts it thin (batch 1, and the first batch of each later flow) | its core path in that batch; its rules, edge cases and transitions in the widening batch — in their own task when they make two or more subtasks, otherwise merged into one widening task for the same entity or module, a subtask per capability | each lists the other under *Out of scope → goes to* |
| A capability first cut in a widening batch, with many rules and edge cases (more than ~6 together) | core path in one task; rules and edge cases in a second task in the same or the next batch | both cite the same capability; each lists the other under *goes to* |
| Several small capabilities on one entity (create / view / edit / archive) | one task | it cites all of them; its subtasks are the capabilities |
| A *System:* capability (scheduled, triggered) | its own task, in the widening batch — unless it is a step of the batch's flow, then in that batch | `type: feature`; *How to verify* says how to trigger it |
| A capability spans two modules' sub-modules | a task per module side, with a dependency between them | each task's *Out of scope* names the other side |
| A capability on surfaces whose platforms differ — and a surface mapped to two platforms (`ios` + `android`) counts as two | a task per platform, each citing the capability; a later platform's task sits in the batch where that platform enters | `platforms:` names one platform; *goes to* names the siblings. Each task takes the unprefixed rules and edge cases plus those prefixed with its surface (`mobile: …`); a qualified surface (`mobile read-only`) limits its *In scope* to what the qualifier allows |
| A capability on several surfaces that share a platform (the responsive page) | one task; the surface-specific rules become subtasks | `platforms: [web]`; a subtask per surface-specific rule |
| A capability carries `[?Q-nnn]` | still a task; blocked only when its core path depends on the question (*Priority, size, dependencies, blocking*) | *Notes* name the question's provisional choice |
| A capability that exists already in the code (`init`, step 4) | no task, or a task for only the missing part | `COVERAGE.md` status `exists — <repo>`, or `partly — <repo>: <what is missing>`; the partial task's *Notes* say what exists |
| A capability whose effective stage is not the first stage | title only, in the outline batch of its stage | `COVERAGE.md` status `outline — batch NN` |
| A list-only capability (*Stages*) | an outline row only, never a gap | `COVERAGE.md` status `list-only — batch NN` |
| A capability the blueprint describes in full but too vaguely to cut (no rules, no edge cases, one sentence where the depth asks for full detail) | do not guess; no task | `COVERAGE.md` status `blueprint gap: <one line>` and a *Feedback to the blueprint* row |

Task title: a verb phrase in the user's terms, close to the capability's verb phrase. The *What the
user gets* section: the capability's *What*, in the same voice, then one *Delivers* line per capability
(`mechanics.md › Paths`).

## Foundation and cross-cutting tasks

**Foundation tasks** (`type: foundation`, `source: planning`) are the few things batch 1 needs that no
capability describes: the product exists and runs; the entities of flow 1 exist in their first shape
(the domain model says which). A skeleton is per platform, and only the platforms batch 1's flow uses
get one in batch 1 — another platform's skeleton arrives with that platform's first flow. Describe them
in product terms too ("the product runs locally and shows an empty first screen"), and keep them to
what batch 1's paragraph needs — a foundation task nobody in batch 1 depends on is a horizontal layer
creeping in. A foundation already in place in the code is not a task.

Signing in is usually a capability — check first. When no capability covers it and the flow needs it,
that is a blueprint gap: write a *Feedback to the blueprint* row, tell the operator at Gate 1, then cut
a provisional foundation task from the most likely reading, marked so in *Notes*.

**Technical work a decision mandates** — a row of *Decided outside this blueprint* or a source decision
(a data store, a layering rule, a required template) — is a `foundation` task, `source: planning`,
`refs: [S-nn §Dnn]`, placed before the first task that needs it. It may name the technology the
decision names: citing a decision is not prescribing.

**Operational requirements** — an `N-` no capability can deliver (backup and recovery, encryption at
rest, a hosting region, monitoring) — are `foundation` or `chore` tasks that cite the `N-` id, placed in
the batch where they first matter. They are not blueprint gaps: the blueprint describes behaviour only.

**Cross-cutting tasks** (`type: cross-cutting`) follow the strategy decision. With the recommended
option, a concern gets one task in the batch whose flow first touches it, and from then on every task
touching the concern carries a criterion for it ("a user of another organisation cannot see this
report"), written once in `PLANNING.md › Standing criteria` and copied verbatim. Before creating one,
read the concern's section in the architecture: when a module or a capability delivers the concern
(scoped access as a capability of the accounts module, say), the concern's work is those capabilities
(`source: blueprint`), at core path and only as far as the batch's flow needs. A `source: planning`
cross-cutting task exists only for a concern no capability describes.

## Task types

| Type | What it is | Done when |
|------|------------|-----------|
| `feature` | delivers one or more capabilities | its subtasks and criteria hold on the running product |
| `foundation` | the skeleton, first shapes, mandated technical work, operational requirements a batch needs | the product shows it ("runs locally and shows an empty first screen") |
| `cross-cutting` | one concern of the architecture that no capability delivers | its criterion holds wherever the batch's flow touches the concern |
| `bug` | behaviour that contradicts a capability or a done task; cites it (`capabilities`, or the task in `depends`) | the correct behaviour is shown; a done task is never reopened |
| `chore` | no user-visible change: an upgrade, a refactoring, CI, an environment | observable in the build or the repository; *How to verify* says how to see that nothing broke |
| `spike` | answers one question in 1–3 sittings, placed before the task it unblocks | the answer is written in *Notes* and as a `P-` record or a *Feedback* row; exempt from the product done-when rule |
| `polish` | a visible refinement of existing behaviour, with no new rules | the refinement is visible |

The rule "product terms only" holds for tasks cut from the blueprint. A `bug` or `chore` the operator
adds may name the library, the error or the endpoint it is about; a mandated `foundation` task may name
the technology its decision names.

## Subtasks

Subtasks are the list a developer works down. Their shape, in the task file:

```
## Subtasks
- [ ] ABC-012.1 — Record an invitation: who invited whom, expiry, single-use link
      done when: an invitation exists and can be listed by the team owner
- [ ] ABC-012.2 — Send the invitation email with the link
      done when: the invitee receives a mail that opens the accept page
- [x] ~~ABC-012.4 — Remind the invitee after three days~~ moved → ABC-019.6
```

Rules:

- **2 to 8 per task.** 7–8 makes the task `L`, a candidate for splitting; nine or more → split it into
  two tasks before it enters a detailed batch. One → merge with a neighbour — except a `manual` task the
  operator adds, which may have one (size `S`).
- **Execution order, vertical.** The first subtasks make the thinnest working path; then rules; then
  edge cases; then state transitions. After each subtask something can be shown.
- **Rules, edge cases and state transitions are their own subtasks**, not folded into the path
  subtasks, and each names the rules it covers in its *done when*. This is how the task proves it covers
  the capability: every item of the capability's *Rules*, *Edge cases* and *States* is traceable to a
  subtask here or to a *goes to* line.
- **One-line *done when* each**, checkable by looking at the running product or its behaviour. Not
  "code is written"; "an expired link shows the expiry message and offers to request a new one".
- **Product terms only.** "Record an invitation with an expiry", not "add an Invitation model and a
  migration". Files, classes, tables and libraries are chosen by whoever does the work.
- **Provisional subtasks** — built on an open question's provisional choice — say `(provisional,
  Q-nnn)` in their line.
- **Closed is ticked.** A subtask moved to another task or dropped is ticked and struck through, with
  `moved → ABC-0xx.n` or `dropped: <reason>` after it; it counts as closed. Ids are never renumbered.

## Acceptance criteria and How to verify

Acceptance criteria are the task's definition of done, as a checklist:

1. the *done when* line of every subtask (so nothing is done until every subtask is);
2. any capability rule, edge case or state transition that is neither a subtask here nor listed under
   *Out of scope → goes to* (there should be none; if there is, ask yourself why it is not a subtask);
3. the capability's **Access** row: one criterion naming the roles that may not do it ("Respondent,
   Viewer and Auditor cannot approve"), and one per scoped value ("a Reviewer approves only within
   their own scope", in the words defined under the Access table);
4. the standing criteria that apply to this task (`PLANNING.md › Standing criteria`);
5. the `N-` requirements the capability's Refs cite, and any other `N-` the task could violate, by id
   ("N-04: every screen works with a keyboard alone").

This is product-level done. The project's own engineering definition — review, merge, tests, a
WORKLOG line — applies on top and is not repeated in every task.

*How to verify* is prose, three to five lines: which main flow (or which part) this task makes
possible, and what to do to see it — the actor, the starting state, the actions, what should be
visible; when the Access row restricts a role, try one allowed role and one refused. Write it so that
someone who did not do the task — a reviewer, or a verifying agent — can follow it.

## Priority, size, dependencies, blocking

**Priority** follows the effective stage (*Stages*) of the task's capability on the surface of the
task's platform, with one exception:

| Priority | Meaning |
|----------|---------|
| `P0` | the batch does not work without it — foundation tasks and the core-path tasks of the batch's flow |
| `P1` | first stage — MVP or in scope (with a first release decided: on its flows) |
| `P2` | next stage (or in scope outside the first release) |
| `P3` | later stage |

A task without a capability takes the priority the operator gives it, or, when they give none, the
priority of its batch's stage. Inside a batch, order is dependency first, then priority, then your judgement.

**Size** is relative and shapes batches: `S` 2–3 subtasks, `M` 4–6, `L` 7–8 and a candidate for
splitting; beyond 8 splitting is not a candidate but a rule. Never hours.

**Dependencies** (`depends`) come from the capability's *Depends on* — a capability id maps to the
task(s) citing it through `COVERAGE.md`; a `Module › Sub-module` entry maps to the earliest task of that
sub-module — from the module relationships, and from entities (you cannot invite to a team that cannot
be created). Keep them to the real ones — a long dependency list is usually a horizontal cut in
disguise. No cycles; no forward-batch dependencies; never on a dropped task.

**Blocking** (`blocked_by`) holds open blueprint `Q-` ids, and `ext: <one line> (YYYY-MM-DD)` for a
blocker outside the blueprint (credentials, a sandbox, a design not delivered yet), quoted in the
frontmatter. A question blocks a task only when the task's **core path** depends on it. Otherwise the
task is built on the question's provisional choice: the subtasks for that part say `(provisional,
Q-nnn)`, *Notes* name the choice, and when the question closes `resync` proposes a follow-up only if
the decision differs. Gates 1 and 2 list the tasks that hang on open questions — blocked or
provisional — so the operator can choose differently. A blocked task stays in its batch so the shape is
visible; `next` never offers it, and `BACKLOG.md` shows the question with the tasks it holds up — the
operator's reason to run `/blueprint decide`. `resync` lifts a `Q-` block when the question closes;
`plan unblock` lifts an `ext:` one.

## Feedback to the blueprint

Slicing is the sharpest review a blueprint gets, because it has to make every sentence buildable.
When you hit one of these, write a row in `PLANNING.md › Feedback to the blueprint` and tell the
operator at the next gate; do not fix the blueprint yourself:

- a flow step with no capability behind it;
- a capability too vague to produce subtasks where the depth asks for full detail;
- two capabilities that describe the same behaviour differently;
- a rule that contradicts a decision or the brief;
- an `N-` that contradicts a capability.

Each row stands alone, because it will be read as a feedback item: the blueprint file › heading with
the capability id, the problem in one line, the change it asks for, and what the backlog did meanwhile
(a `COVERAGE.md` gap, or a task cut from the most likely reading and marked in its *Notes*). The
operator takes the open rows to `/blueprint feedback <backlog dir>/PLANNING.md` (only the *Feedback to
the blueprint* rows are meant), or to `/blueprint decide` when a row is about an open `Q-`, or to plain
`/blueprint` while the blueprint is not done. `resync` closes each row when the blueprint answers it.
