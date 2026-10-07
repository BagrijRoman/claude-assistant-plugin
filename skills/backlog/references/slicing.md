# Slicing — the rules

How a blueprint becomes batches, tasks and subtasks. Read before `init`, `detail`, `add` and
`resync`. Templates live in `templates/backlog/` under the plugin root (`${CLAUDE_PLUGIN_ROOT}`);
a path like `templates/tasks/TASK.md` below means `<plugin root>/templates/backlog/tasks/TASK.md`.

## Contents

- [What to read in the blueprint](#what-to-read-in-the-blueprint)
- [Strategy questions](#strategy-questions)
- [Batches](#batches)
- [From capabilities to tasks](#from-capabilities-to-tasks)
- [Foundation and cross-cutting tasks](#foundation-and-cross-cutting-tasks)
- [Subtasks](#subtasks)
- [Acceptance criteria and How to verify](#acceptance-criteria-and-how-to-verify)
- [Priority, size, dependencies, blocking](#priority-size-dependencies-blocking)
- [Feedback to the blueprint](#feedback-to-the-blueprint)

---

## What to read in the blueprint

| Blueprint file | Take from it |
|----------------|--------------|
| `02-architecture.md` | the module map with MVP flags and the `Surfaces` column; the **main flows** (batch 1 is cut from flow 1) with the surface of each step; cross-cutting concerns; relationships (they become dependencies) |
| `03-roadmap.md` | stage per module *and surface* (MVP / next / later) → priority and batch placement; the *MVP in one paragraph* — the target state after the MVP batches |
| `modules/<name>.md` | sub-modules; entities with states; **capabilities** with their Surfaces, Rules, Edge cases, Depends on, Refs and any `[?Q-nnn]` marker |
| `01-brief.md` | actors (for *Who* in tasks), the `## Surfaces` table with its constraints (the input to the platform map), non-functional requirements (they become acceptance criteria), out of scope (never slice it) |
| `OPEN-QUESTIONS.md` | open `Q-` ids → `blocked_by` on the tasks whose capabilities carry the marker |
| `DECISIONS.md` | only to understand a capability; tasks cite the `D-` ids their capability cites |
| `GLOSSARY.md` | the words to use; a task never introduces a term the glossary lacks |

Reading the module files is noisy: use one subagent per module to return a **capability
inventory** — for each capability: module, sub-module, heading (verbatim, for the anchor), number
of rules, number of edge cases, its *Surfaces* line, *Depends on* entries, `Q-` markers, refs, and
whether it is a *System:* behaviour. You merge the inventories into `COVERAGE.md`'s first columns.

## Strategy questions

Asked once at `init`, in one or two rounds, recorded as `P-` records. Offer your recommendation
first; the reasons below are the descriptions.

| Question | Options | Recommend |
|----------|---------|-----------|
| **Batch size** | small (3–5 tasks) · medium (6–9) · large (10+) | small for one developer or one developer plus an agent — a batch should finish in days, not weeks, so the *what works* moment comes often; medium for a team |
| **Cross-cutting concerns** (access control, audit, notifications…) | a foundation task per concern in batch 1 plus a criterion on every task it touches · a criterion only, no foundation task · a dedicated batch later | the first: the concern exists from the start, and every task proves it still holds |
| **Foundation depth** | walking skeleton — only what batch 1's flow needs · full skeleton — every module's basics first | walking skeleton; a full skeleton is a horizontal layer in disguise |
| **Batch 1 flow** | one option per main flow in `02-architecture.md` | the flow the roadmap's *MVP in one paragraph* describes; usually flow 1 |
| **Platform map** — only with several surfaces | per surface from the brief: web → `web`; mobile → `ios` + `android` · one cross-platform `mobile` · `web` (the same responsive page) | read the brief's constraints: store distribution, offline or device features → an installed app; none of these → the responsive page. Between a native pair and one cross-platform app there are no product grounds to recommend — ask, and say so |
| **Platform order** — only with several platforms | one platform through its MVP flows first, the other follows · both from batch 1 · interleave by flow | one first: the batch-1 paragraph stays small and the second platform starts with lessons learned. Both from batch 1 only when the first flow itself crosses surfaces |
| **Non-MVP modules** | outline their batches now · leave as a single "later" list | outline — titles cost little and show the shape of the whole |

## Batches

1. **Batch 1 is the thinnest end-to-end version of the chosen flow.** Every step of the flow has
   a task; each task delivers the capability's core path only (rules and edge cases come later
   unless the flow is meaningless without them). Plus the foundation tasks batch 1 cannot run
   without. After batch 1 a user can do the flow, badly but completely.
2. **Next batches widen before they broaden.** Widen: the rules and edge cases of batch-1
   capabilities, the cross-cutting criteria applied for real. Broaden: the next flow. Widening
   first keeps the first flow honest before a second one is started.
3. **Then the remaining MVP flows**, one or two per batch, widened in the batch after.
4. **Non-MVP stages** become outline-only batches at the end, ordered by roadmap stage; they are
   detailed when their turn comes, or re-cut by `resync` when the blueprint has changed by then.
5. **A batch never depends forward.** No task in batch 2 depends on a task in batch 3. If the
   dependency is real, the depended-on task moves earlier or the dependent task moves later; say
   which and why in the batch file's notes.
6. **Each batch has a goal line and a *What works after this batch* paragraph**, written before
   its tasks. The paragraph is the test of the cut; it is also what the operator demos. It names
   the platform(s) it is true on.
7. **Name batches by what they deliver**, not by number only: `01-first-report-end-to-end`,
   `02-report-rules-and-access`. The number orders, the slug tells.

## From capabilities to tasks

Default: **one capability → one task**. Deviate when:

| Situation | Do | Mark |
|-----------|----|------|
| Capability has many rules and edge cases (more than ~6 together) | core path in one task; rules and edge cases in a second task in the widening batch | both tasks cite the same capability; each lists the other under *Out of scope → goes to* |
| Several small capabilities on one entity (create / view / edit / archive) | one task | task cites all of them; subtasks are the capabilities |
| A *System:* behaviour (scheduled, triggered) | its own task, usually in the widening batch | `type: feature`; *How to verify* says how to trigger it |
| A capability spans two modules' sub-modules | a task per module side, with a dependency between them | each task's *Out of scope* names the other side |
| A capability is on several surfaces whose platforms differ | a task per platform, each citing the capability; the second platform's task sits in the batch where that platform enters | `platforms:` names one platform each; *Out of scope → goes to* names the sibling |
| A capability is on several surfaces that share a platform (the responsive page) | one task; surface-specific rules from the capability become subtasks | `platforms: [web]`; a subtask per surface-specific rule |
| A capability carries `[?Q-nnn]` | still a task, `status: blocked`, `blocked_by: [Q-nnn]` | the task's *Notes* say which part is provisional |
| A capability belongs to a non-MVP module | title only in an outline batch | `COVERAGE.md` row says `outline — batch NN` |
| A capability is too vague to cut (no rules, no edge cases, one sentence) | do not guess; a row in `COVERAGE.md` with `blueprint gap` and a *Feedback to the blueprint* entry | — |

Task title: a verb phrase in the user's terms, close to the capability's heading. Task
`description` (*What the user gets*): the capability's *What*, in the same voice.

## Foundation and cross-cutting tasks

Foundation tasks (`type: foundation`, `source: planning`) are the few things batch 1 needs that
no capability describes: the project exists and runs; a user can be signed in (if the flow needs
one and no capability covers sign-in — check first, it usually does); the entities of flow 1
exist in their first shape. A skeleton is per platform, and only the platforms batch 1's flow uses
get one in batch 1 — another platform's skeleton arrives with that platform's first flow. Describe
them in product terms too ("the product runs locally and
shows an empty first screen"), and keep them to what batch 1's paragraph needs — a foundation task
nobody in batch 1 depends on is a sign of a horizontal layer creeping in.

Cross-cutting tasks (`type: cross-cutting`) follow the strategy decision. With the recommended
option: one task per concern in batch 1 ("access control: a user sees only their organisation's
data"), and from then on every task touching that concern carries a criterion for it ("a user of
another organisation cannot see this report").

## Subtasks

Subtasks are the list a developer works down. Their shape, in the task file:

```
## Subtasks
- [ ] T-012.1 — Record an invitation: who invited whom, expiry, single-use link
      done when: an invitation exists and can be listed by the team owner
- [ ] T-012.2 — Send the invitation email with the link
      done when: the invitee receives a mail that opens the accept page
```

Rules:

- **2 to 8 per task.** Nine or more → the task is `L` → split it into two tasks before it enters
  a detailed batch. One → the task is too small → merge with a neighbour.
- **Execution order, vertical.** The first subtasks make the thinnest working path; then rules;
  then edge cases. After each subtask something can be shown.
- **Rules and edge cases are their own subtasks**, not folded into the path subtasks. This is
  how the task proves it covers the capability: the capability's *Rules* and *Edge cases* lists
  should each be traceable to a subtask here or to a named other task.
- **One-line *done when* each**, checkable by looking at the running product or its behaviour.
  Not "code is written"; "an expired link shows the expiry message and offers to request a new
  one".
- **Product terms only.** "Record an invitation with an expiry", not "add an Invitation model
  and a migration". Files, classes, tables and libraries are chosen by whoever does the work.
- **Subtask ids** are `T-NNN.n`, numbered in order, never renumbered once the task is detailed;
  a subtask added later gets the next number even if it belongs earlier in the order (note it).

## Acceptance criteria and How to verify

Acceptance criteria are the task's definition of done, as a checklist:

1. the *done when* line of every subtask (so nothing is done until every subtask is);
2. any capability rule or edge case not already a subtask (there should be none; if there is,
   ask yourself why it is not a subtask);
3. the cross-cutting criteria that apply to this task;
4. non-functional requirements from the brief that this task can violate (a limit, a response
   time that "must feel instant", a language).

*How to verify* is prose, three to five lines: which main flow (or which part) this task makes
possible, and what to do to see it — the actor, the starting state, the actions, what should be
visible. This is what `/verify` or a reviewer follows; write it so someone who did not do the
task can.

## Priority, size, dependencies, blocking

**Priority** follows the roadmap stage of the task's module, with one exception:

| Priority | Meaning |
|----------|---------|
| `P0` | the batch does not work without it — foundation tasks and the core-path tasks of the batch's flow |
| `P1` | MVP stage |
| `P2` | next stage |
| `P3` | later stage |

Inside a batch, order is dependency first, then priority, then your judgement.

**Size** is relative and shapes batches: `S` 2–3 subtasks, `M` 4–6, `L` 7–8 and a candidate for
splitting; beyond 8 splitting is not a candidate but a rule. Never hours.

**Dependencies** (`depends`) come from the capability's *Depends on*, from the module
relationships in the architecture, and from entities (you cannot invite to a team that cannot be
created). Keep them to the real ones — a long dependency list is usually a horizontal cut in
disguise. No cycles; no forward-batch dependencies.

**Blocking** (`blocked_by`) lists blueprint `Q-` ids only. A blocked task stays in its batch so
the shape is visible, but `next` never offers it, and `BACKLOG.md` shows the question with the
tasks it holds up — the operator's reason to run `/blueprint decide`. `resync` lifts the block
when the question closes.

## Feedback to the blueprint

Slicing is the sharpest review a blueprint gets, because it has to make every sentence buildable.
When you hit one of these, write a row in `PLANNING.md › Feedback to the blueprint` and tell the
operator at the next gate; do not fix the blueprint yourself:

- a flow step with no capability behind it;
- a capability too vague to produce subtasks;
- two capabilities that describe the same behaviour differently;
- a rule that contradicts a decision or the brief;
- a non-functional requirement no capability could be made to satisfy.

Each row names the blueprint file and heading, the problem in one line, and what you did meanwhile
(left a `COVERAGE.md` gap, cut the task from the most likely reading and marked it in *Notes*).
