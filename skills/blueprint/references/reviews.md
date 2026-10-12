# Blueprint — reviews (phases 6–7)

Read `mechanics.md` first. Each phase says what it starts from, its steps, and its gate.

## Phase 6 — Consistency review

**Start from:** all modules written.

The mechanical half of consistency is the script's: `validate` reports dangling references,
duplicate ids, unnumbered capabilities, `[?Q-NNN]` markers of closed questions, missing module
files, stale counts and source items without coverage, and warns about every `[?pending]` left — an
open point a merge never turned into a question. The rest needs reading, and one reader cannot hold a large blueprint, so it is split
between reviewers (`mechanics.md › Subagents`); tell the operator the wave first. Each returns
findings with file and heading.

1. **Per module** — one reviewer per module (two small modules may share one), reading the brief,
   the architecture, the glossary, `DECISIONS.md`, `OPEN-QUESTIONS.md`,
   `00-sources.md › Decided in the sources` and the module file, and told the depth, the module's
   stage and the row of the depth table that applies:
   - **Contradictions** — the module says X, the brief, a decision or a decision of the sources says
     not-X;
   - **Unreferenced statements** — a rule or requirement with no source, decision or assumption;
   - **Glossary drift** — a concept called by a non-glossary term;
   - **Decisions not reflected** — a `D-` whose consequence is absent from the module it names;
   - **Thin L3** — fewer capabilities than the sub-module list and the depth table imply;
   - **Access** — the module's table against the coarse matrix in the architecture.
2. **Across modules** — one reviewer over every module's *Key entities*, *Receives from / provides
   to* table and capability headings, plus the domain model and the main flows:
   - **Dangling relationships** — A "receives from B" something B never "provides";
   - one entity given different states in two modules;
   - a flow step with no capability behind it.
3. **Coverage of the sources** — you, mechanically: for every item in the sources' indexes, find
   where the blueprint deals with it — the capability whose **Source** names it; for a module, its
   row in the module map; for a role, its actor in the brief and its row in
   `02-architecture.md › Roles and access`; for a non-functional requirement or a rule for every
   module, its `N-` in the brief or its cross-cutting section; for a feature of a module the depth
   leaves at L2, that module (`ORG — L2 only, depth`); the line of the brief's *Out of scope* that
   drops it; or the open question that holds it — and write the row in `00-sources.md › Coverage`.
   `validate` lists the items still without a row; each is a finding (**not covered**): a feature
   that disappeared on the way.
4. Fix what is mechanical yourself (the errors `validate` reports, glossary terms). Turn the rest —
   every `[?pending]` it warns about included — into a question round or into `OPEN-QUESTIONS.md`.
5. Gate: show the findings by kind and what you did with each.

## Phase 7 — Adequacy review

**Start from:** documents that agree with each other (phase 6 approved).

Phase 6 checked the documents against each other. This phase checks them against reality: would
the product they describe work for the people in the brief? Read it as the most sceptical senior
person on the team would — someone who has seen a specification pass every formal check and still
describe a product with no way to log in. Findings go to `04-review.md`, created from
`templates/04-review.md`; every one of them ends with an outcome.

1. **Walk the actors — on each surface the brief gives them.** For each actor in `01-brief.md`:
   take what they want from the product and trace it through the capabilities on the surface they
   use. Can they get there? Where does the path stop — a capability missing, a permission that blocks
   it (the modules' *Access* tables), a module that provides something nobody consumes? Each stop is
   a finding of kind **dead end**. A stop that exists on one surface only — the job is possible in
   the browser but the field actor only has the phone — is a **surface gap**.
2. **Walk the goals.** For each `G-` in the brief: which capabilities deliver it? A goal with none is
   a finding (**unsupported goal**); a capability that serves no goal and no actor is a finding too
   (**orphan**) — maybe it is scope creep, maybe the brief is missing a goal.
3. **Walk the flows.** For each main flow in `02-architecture.md`: every step must be a capability
   that exists, in the module the flow names, available to that actor on the surface the step
   names. Where the flow changes surface, the hand-over must be described — how the user continues
   (a notification, a link, nothing to do); a silent hand-over is a **surface gap**. Also ask what
   happens when the flow is interrupted halfway, run twice, or run by two people at once — the
   answer should be in some capability's edge cases (**unhandled path**).
4. **Walk the lifecycles.** Every entity with states: can it reach every state, leave every state,
   and be deleted or archived? What happens to the things that depend on it when it does
   (**lifecycle gap**)? Deletion and cancellation are where most specifications go quiet.
5. **Walk the non-functional requirements.** Each `N-` should be visible somewhere in a rule, an edge
   case or a cross-cutting concern; one that is stated and never applied is a finding (**stated, not
   applied**). For every entity that holds personal data, the brief's privacy requirements must have
   capabilities behind them — who sees it, how it is exported, how it is deleted.
6. **Look for what is not there.** Products of this kind have a standard set of behaviours
   (onboarding, empty states, settings, help, data export, account removal, admin recovery…).
   Compare, and compare with competitor profiles if any; list what is missing and say whether it is a
   gap or a deliberate out-of-scope item that should be written into the brief (**missing**). Do the
   same for risks: what could make a product like this fail that the brief's *Risks* do not name
   (**risk**).
7. **Propose improvements.** Beyond gaps: where a capability could be simpler, two sub-modules
   merged, a rule relaxed or tightened to match the goals better. Each proposal says what changes,
   which documents, and why it serves a goal or an actor (**improvement**). Do not propose things
   just to have proposals; three sharp ones beat fifteen vague ones.

Run steps 1–6 in reviewers (`mechanics.md › Subagents`), split by what they walk so that none has to
hold the whole blueprint: one per main flow (step 3), one per actor or small group of actors (step
1), one for goals, lifecycles and non-functional requirements (steps 2, 4, 5), one for what is
missing (step 6). Each reads the brief, the architecture and only the module files its walk passes
through — the brief names them, and the sections of a large file it needs — and is told the depth: a
capability the depth only lists has no rules yet and is judged by its Who, What and Source, never as
an orphan for lacking Refs. Each returns findings tagged by kind, each with where it was found and a
suggested resolution. Step 7 you do yourself after reading the reports — you have the decisions and the
operator's reasoning in context, the reviewers do not. Then:

8. Write `04-review.md`: findings grouped by kind, each with id `R-nn`, where, what, suggested
   resolution, outcome (empty for now).
9. **Question rounds**, grouped by module — the *how to take them* question first when there are more
   than four findings. Every finding is a fork: **Accept the suggested resolution** (Recommended when
   it is clearly a gap) / **Reject — it is intentional** (the reason goes to the brief's out of scope
   or to the finding's outcome) / **Defer** → `Q-`; a different resolution is typed as Other.
   Accepted findings become `D-` records — an accepted **risk** also becomes an `RK-` row in the
   brief; small ones become `A-` records. Fill the outcome column as you go.
10. **Apply.** Edit the affected documents directly when the change is local (one capability, one
    rule). When a finding changes a module's shape (new sub-module, moved capability), run
    `modes.md › module` for it instead, so the whole module file is rewritten coherently; a finding
    that needs a new, split or merged module goes through `modes.md › restructure`. Record in
    `04-review.md` which modules were re-run.
11. If step 10 touched more than a couple of modules, repeat phase 6 quickly — the fixes may have
    introduced a new dangling reference. Note it in `04-review.md`.
12. Final gate, every step of `mechanics.md › The gate`: the operator sees `04-review.md` with every
    outcome filled, the list of documents changed, and anything deferred. On approval the phase's
    assumptions are accepted, `phases.adequacy` → `"approved"` and `phase` → `"done"`; `README.md` is
    regenerated, and `stamp` runs last.
