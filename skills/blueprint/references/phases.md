# Blueprint phases — the procedure

Read the section for the phase you are in. Each section has the same shape: what you start from,
the steps, and the gate. Templates live in `templates/blueprint/` under the plugin root
(`${CLAUDE_PLUGIN_ROOT}`); a path like `templates/STATE.json` below means
`<plugin root>/templates/blueprint/STATE.json`.

## Contents

- [Common mechanics](#common-mechanics) — STATE.json, gates, IDs, subagent rules
- [Phase 0 — Intake](#phase-0--intake)
- [Phase 1 — Research of input](#phase-1--research-of-input)
- [Phase 2 — Brief](#phase-2--brief)
- [Phase 3 — Architecture](#phase-3--architecture)
- [Phase 4 — Modules (L2)](#phase-4--modules-l2)
- [Phase 5 — Capabilities (L3)](#phase-5--capabilities-l3)
- [Phase 6 — Consistency review](#phase-6--consistency-review)
- [Phase 7 — Adequacy review](#phase-7--adequacy-review)
- [`status`, `module`, `decide` modes](#other-modes)

---

## Common mechanics

### STATE.json

The resume point. Shape is in `templates/STATE.json`. Update it:

- when a phase starts (`status: "in-progress"`), when its gate is reached (`awaiting-approval`),
  when the operator approves (`approved`) — and set `phase` to the next one;
- when a module is added, renamed or removed in phase 3;
- when research consent is given;
- when a module's L2 or L3 is written (per-module status).

Write it with two-space indentation. If it is missing or unreadable on `continue`, stop and tell the
operator — rebuilding state from the documents is their call, not a thing to do silently.

### The gate

Every phase ends the same way. Do not shortcut it when the phase felt small.

1. Regenerate `README.md` from `templates/README.md` — one row per file, with the current counts.
2. Show the operator, in their language, a summary of at most ~20 lines: what this phase produced,
   which files to look at, the **new assumptions** (`A-` ids and one line each), the **new open
   questions** (`Q-` ids and one line each).
3. Ask with `AskUserQuestion` (header `Gate`):
   - **Approve — go to phase N+1** (Recommended when you have nothing pending)
   - **Revise** — the operator tells you what to change; apply, then gate again
   - **Promote an assumption** — the operator names `A-` ids that should have been questions; turn
     each into a question round, record decisions, then gate again
   - **Stop here** — save state as `awaiting-approval`; the next `continue` returns to this gate
4. On approval: `STATE.json` → phase `approved`, next phase `pending`, `phase` moves on.

### IDs

Before assigning an id, read the relevant log and take the highest existing number + 1. `S-` lives
in `00-sources.md`, `D-` in `DECISIONS.md`, `A-` in `ASSUMPTIONS.md`, `Q-` in `OPEN-QUESTIONS.md`.
Subagents never assign ids: they return their findings tagged `[?pending]`, and you assign ids when
you merge their output. Two agents counting in parallel would collide.

### Subagents

Use `Agent` (type `general-purpose`) for work that is noisy or parallel: reading sources,
writing modules, reviewing. A brief to a subagent always contains:

- the goal and the exact file(s) to read and to write;
- the relevant context files by path (`01-brief.md`, `02-architecture.md`, `GLOSSARY.md`,
  `DECISIONS.md`) — the agent reads them itself, do not paste them;
- the rule that output is English, uses only glossary terms, describes behaviour not implementation;
- the rule that it does not decide structural forks: it lists them under `QUESTIONS FOR OPERATOR`
  in its reply and marks the place in the text `[?pending]`;
- what to return: a summary of ≤15 lines plus the questions list.

You merge: assign ids, run the question round with the operator, update the files.

---

## Phase 0 — Intake

**Start from:** nothing, or `init [dir]`.

1. **Choose the folder.** The default is `docs/blueprint/`; the operator always gets to change it.
   Look first: does `docs/` exist, what is in it, does `docs/blueprint/` already exist and what is
   inside. Then ask (`AskUserQuestion`, header `Folder`): **`docs/blueprint/` (Recommended)** — or,
   when the look found a problem, the default with a note of what is there — plus one or two
   alternatives that fit the project (`blueprint/`, `docs/product/blueprint/`); the operator can
   type any path as "Other". If the operator passed a directory in the argument, offer that as
   the recommended option instead. Never scaffold into a non-empty folder without the operator
   confirming that specific folder.
2. **Scaffold.** Create the folder, `modules/`, `references/competitors/`; copy every template from
   `templates/` with the placeholders filled where you can (project name, date); write `STATE.json`
   with `phase: "intake"`.
3. **Ask for depth** (`AskUserQuestion`, header `Depth`):
   - **standard** (Recommended) — L3 for MVP modules, L2 for the rest
   - **quick** — L1 + L2 for MVP modules only; good for a pitch or an estimate
   - **deep** — L3 for every module

   In the same round ask whether the **surfaces** are already known (header `Surfaces`,
   multiSelect): web application · mobile application · other — they type it · **not decided yet,
   ask me after the research** (Recommended when the sources may say). An answer is a source, not
   the decision: write it to `00-sources.md` as `type: idea` so phase 2 can cite it.
4. **Collect sources.** Ask the operator to list everything they have: files and folders (paths),
   URLs, the idea in their own words, names of similar or competing products, people to ask.
   Accept it in any form. For each item write a row in `00-sources.md`: `S-NN`, type (document /
   folder / url / idea / product / person), location, the operator's note, reliability
   (`primary` = written for this project, `secondary` = related but not about this project, `web`).
   The idea told in conversation is a source too (`type: idea`, location `conversation, <date>`) —
   write its text down verbatim in the source entry, it is the only place it will be kept.
5. **Confirm the list** back to the operator; add or drop as they say.
6. Gate (the gate here is light: "this is what I will read; anything missing?").

## Phase 1 — Research of input

**Start from:** `00-sources.md` with registered sources.

1. **One subagent per source** (folders: one per folder, the agent lists and reads what is inside).
   Brief: read the source; return, under fixed headings, **Facts** (with the location in the source:
   page, section, file), **Requirements** (explicit asks), **Constraints** (legal, technical,
   business, timeline), **Actors** mentioned, **Surfaces mentioned** (where the source puts the
   actors — a browser at a desk, a phone in the field, email, an API — in its own words), **Terms**
   that look domain-specific with the source's
   definition if any, **Unclear / contradictory** points, **Not covered** (things a product like this
   needs that the source is silent on). Everything in English; quote the original where a term
   matters. Return ≤ 60 lines; for a very large source, allow more but ask for a table of contents.
   URLs the operator gave are read with `WebFetch` — that is their input, not research.
2. **Merge** each extract into the source's entry in `00-sources.md` (under `### Extract`).
3. **Cross-source pass** (you, not an agent): where sources disagree, list the disagreement;
   where a term is used differently, note it. Seed `GLOSSARY.md` with the terms (definition
   `[?pending]` where sources conflict).
4. **Gap report.** Write a section `## Gaps after research` at the end of `00-sources.md`: what a
   brief needs that no source gives (audience, goals, scale, platform, monetisation, comparable
   products…). Mark each gap: *ask the operator* / *research could close it* / *assume for now*.
5. **Research offer** — only if some gaps are marked *research could close it*. Ask
   (`AskUserQuestion`, header `Research`, multiSelect) which of the named products or questions you
   may research on the web, with **None — I will provide the information** as an option. On consent:
   `STATE.json` → `research.allowed: true`, `research.scope: [...]`; one subagent per product, brief
   it with `templates/references/competitors/COMPETITOR.md` and the gaps it should answer; it writes
   the profile and returns the pages it used, which you register as `S-NN` with `reliability: web`.
6. **Question round** for gaps marked *ask the operator* (2–4 per round).
7. Gate.

## Phase 2 — Brief

**Start from:** extracts, gap answers, glossary seed.

1. **Decide the surfaces first** — the actors table and the module map both hang on it. Gather
   what phase 1 found under *Surfaces mentioned* and what the operator said in Intake, then ask
   (`AskUserQuestion`, header `Surfaces`). This is always a question, never an assumption:
   - **one surface** (name it) — Recommended when every source puts every actor in one place;
   - **several surfaces, same scope** — the same actors do the same things on each;
   - **several surfaces, split** — some actors or jobs live on one, some on another; the next
     round settles which;
   - **like *competitor*** — when a profile shows how they split it.

   Record it as `D-NNN`. In the same record fix the **default rule** for later phases: "a module
   on several surfaces has every capability on all of them unless a capability says otherwise", or
   the stricter variant the operator prefers. Then write the brief's `## Surfaces` table: surface,
   actors on it, their main jobs there, constraints that bear on it (offline, device features,
   store distribution, screen size). Constraints, not platforms — whether "mobile" is a native app
   is decided when the work is cut.
2. Fill `01-brief.md` from the template: **Idea** (two paragraphs max), **Audience & actors** (who
   uses it, who operates it, who pays — each with a one-line description, the surface(s) they use
   and the source), **Goals**
   (what success looks like, measurable where a source says so), **Out of scope** (explicitly not
   doing — take these from sources and from decisions; this list is as valuable as the goals),
   **Non-functional requirements** (scale, platforms, offline, security, compliance, accessibility,
   languages — only what sources or decisions support, otherwise a question), **Comparable
   products** (one line each, link to profile if any), **Key constraints**.
3. Every statement carries its reference: `(S-03)`, `(D-002)`, `[A-001]`. A sentence you cannot
   reference is a fork: ask or assume.
4. Finalise `GLOSSARY.md` for the terms the brief uses; pick one term per concept and list the
   others as *also called*. From here on every document uses the glossary's term.
5. Gate.

## Phase 3 — Architecture

**Start from:** approved brief.

This phase has the most forks, because the module map decides everything downstream. Expect two or
three question rounds. Run them before writing the final document, not after.

1. **Draft the module map** on your side: candidate modules, each with a one-line responsibility
   and the surfaces it lives on — where its actors sit, per the brief: one surface, `both`, or a
   qualified form like `web · mobile read-only`. The obvious assignments are assumptions the
   operator sees at the gate; only a module whose actors sit on different surfaces is a question.
   A module is a coherent area of behaviour a user or operator would name (Accounts, Billing,
   Reporting, Notifications…), not a technical layer (Database, API, Frontend). Aim for 5–12; fewer
   means they are too broad, more means some are sub-modules.
2. **Question round(s)** on the forks the map exposes: a boundary that could go two ways, a
   capability that could live in two modules, an actor with an unclear home, a module whose actors
   sit on different surfaces when the brief does not say which surface the module serves, a
   cross-cutting concern (access control, audit, notifications, i18n, import/export) that could be
   a module or a property of every module.
3. Write `02-architecture.md`: **Module map** (table: module, responsibility, main actors,
   surfaces, MVP yes/no), **Relationships** (what each module needs from which other, and gives to
   which — described as behaviour: "Billing needs the current plan from Accounts"), **Main flows**
   (3–7 end-to-end user journeys as numbered steps crossing modules; each step names the module
   *and the surface* — a flow that changes surface halfway is the one to look at hardest: how does
   the user continue?), **Cross-cutting concerns** (one sub-section each, stating how it applies
   everywhere; when there are several surfaces one of them is *Surface parity*: what a user sees
   when a capability exists on another surface only), **Boundaries** (what the system does not do,
   external systems it relies on).
4. Write `03-roadmap.md`: per module *and surface* MVP / next / later with the reason — "Reporting:
   web MVP, mobile next" is one module, two rows. This decides phase-5 depth.
5. Create `modules/<name>.md` from the template for every module, L2 and L3 sections still
   placeholders; `STATE.json.modules` lists them with `l2: "pending"`, `l3: "pending"`.
6. Gate. Tell the operator plainly: after this gate the module list is frozen — adding, splitting or
   removing a module later goes through a `D-` record and `module <name>` runs, so that the documents
   never silently drift from the map.

## Phase 4 — Modules (L2)

**Start from:** frozen module map.

1. **One subagent per module**, launched in parallel. Brief: read `01-brief.md`,
   `02-architecture.md`, `GLOSSARY.md`, `DECISIONS.md` and the module's own file; fill the L2
   section of `modules/<name>.md` in place: **Purpose** (why this module exists, for whom),
   **Surfaces** (from the module map; what differs between them here, if anything), **Users**
   (actors, the surface each uses here, what each wants), **Sub-modules** (3–8 named areas, one
   line each),
   **Key entities** (the domain things this module is about — described as concepts with their
   important attributes and states, not as tables), **Receives from / provides to** (the
   relationships from the architecture, from this module's point of view), **External
   integrations** (systems outside the product it talks to, as behaviour), **Open points** marked
   `[?pending]`. Behaviour, not implementation. Return a ≤15-line summary and the questions.
2. **Merge**: read each file; assign ids; where two modules describe the same relationship
   differently, that is a question. Run question rounds grouped by module.
3. Update `STATE.json.modules[*].l2 = "done"`.
4. Gate — point the operator at the module files; MVP modules first.

## Phase 5 — Capabilities (L3)

**Start from:** L2 done. Depth from `STATE.json.depth` and `03-roadmap.md`: `standard` → full L3
for MVP modules, capability *list only* (titles) for the rest; `deep` → full L3 everywhere;
`quick` → skip this phase for non-MVP modules entirely and list capabilities for MVP ones.

1. **One subagent per module** (or per sub-module for a large module), in parallel. Brief: read the
   same context files plus the module file; for each sub-module write capabilities using the block
   in the template:

   ```
   ### Capability: <verb phrase — what can be done>
   Who: <actor(s)>
   Surfaces: <inherited from the module unless stated: web, mobile · mobile only · web; mobile read-only>
   What: <the behaviour in 1–3 sentences, as the user experiences it>
   Rules: <constraints, limits, permissions, validations — bullet list>
   Edge cases: <empty states, conflicts, failures and what happens then>
   States: <if the thing has a lifecycle: states and what moves it between them>
   Depends on: <Module › Sub-module, or capability names>
   Refs: <S-/D-/A- ids>
   ```

   A capability is something a user or the system *does*, named with a verb: "Invite a team
   member", "Recalculate totals when a factor changes", "Export a report". It is not a screen, not a
   function, not a table. Group system-initiated behaviour (scheduled, triggered) under its own
   heading inside the sub-module.

   **Surfaces follow the inheritance rule.** A capability is on its module's surfaces, under the
   brief's default rule, unless its nature says otherwise — scanning with a camera is mobile,
   editing a large table is web. The agent writes the deviation with its reason and marks it
   `[?pending]`; you turn it into `[A-NNN]` when the reason is plain, and into a question only when
   the module is on several surfaces, the nature does not tell and the brief's rule does not settle
   it. Where behaviour differs between surfaces, say so in Rules or Edge cases with the surface as
   prefix ("mobile: works offline and syncs when back online") — one capability, not two, unless
   the behaviour is fundamentally different. Return summary and questions.
2. **Merge**, ids, question rounds — most L3 forks are small (assumptions); only rules that change
   what an actor can do are structural.
3. Update `STATE.json.modules[*].l3`.
4. Gate.

## Phase 6 — Consistency review

**Start from:** all modules written.

1. **One read-only subagent** with the whole folder. Brief it to report, each with file and
   heading: **Contradictions** (module A says X, module B or the brief says not-X); **Dangling
   relationships** (A "receives from B" something B never "provides"); **Unreferenced statements**
   (a rule or requirement with no `S-/D-/A-`); **Glossary drift** (a concept called by a non-glossary
   term); **Open markers** (`[?pending]`, `[?Q-NNN]` for closed questions); **Decisions not
   reflected** (a `D-` whose consequence is absent from the module it names); **MVP modules with
   thin L3** (fewer capabilities than their sub-module list implies). Findings only, no edits.
2. Fix what is mechanical yourself (glossary terms, dangling refs). Turn the rest into a question
   round or into `OPEN-QUESTIONS.md`.
3. Gate: show the report and what you did with each finding.

## Phase 7 — Adequacy review

**Start from:** documents that agree with each other (phase 6 approved).

Phase 6 checked the documents against each other. This phase checks them against reality: would
the product they describe work for the people in the brief? Read it as the most sceptical senior
person on the team would — someone who has seen a specification pass every formal check and still
describe a product with no way to log in. Findings go to `04-review.md` (template
`templates/04-review.md`); every one of them ends with an outcome.

1. **Walk the actors — on each surface the brief gives them.** For each actor in `01-brief.md`:
   take what they want from the product and trace it through the capabilities on the surface they
   use. Can they get there? Where does the path stop — a capability missing, a permission that
   blocks it, a module that provides something nobody consumes? Each stop is a finding of kind
   **dead end**. A stop that exists on one surface only — the job is possible in the browser but
   the field actor only has the phone — is a **surface gap**.
2. **Walk the goals.** For each goal in the brief: which capabilities deliver it? A goal with none
   is a finding (**unsupported goal**); a capability that serves no goal and no actor is a finding
   too (**orphan**) — maybe it is scope creep, maybe the brief is missing a goal.
3. **Walk the flows.** For each main flow in `02-architecture.md`: every step must be a capability
   that exists, in the module the flow names, available to that actor on the surface the step
   names. Where the flow changes surface, the hand-over must be described — how the user continues
   (a notification, a link, nothing to do); a silent hand-over is a **surface gap**. Also ask what
   happens when
   the flow is interrupted halfway, run twice, or run by two people at once — the answer should be
   in some capability's edge cases (**unhandled path**).
4. **Walk the lifecycles.** Every entity with states: can it reach every state, leave every state,
   and be deleted or archived? What happens to the things that depend on it when it does
   (**lifecycle gap**)? Deletion and cancellation are where most specifications go quiet.
5. **Walk the non-functional requirements.** Each one in the brief should be visible somewhere in a
   rule, an edge case or a cross-cutting concern; one that is stated and never applied is a finding
   (**stated, not applied**).
6. **Look for what is not there.** Products of this kind have a standard set of behaviours
   (onboarding, empty states, settings, help, data export, account removal, admin recovery…).
   Compare, and compare with competitor profiles if any; list what is missing and say whether it
   is a gap or a deliberate out-of-scope item that should be written into the brief (**missing**).
7. **Propose improvements.** Beyond gaps: where a capability could be simpler, two sub-modules
   merged, a rule relaxed or tightened to match the goals better. Each proposal says what changes,
   which documents, and why it serves a goal or an actor (**improvement**). Do not propose things
   just to have proposals; three sharp ones beat fifteen vague ones.

Run steps 1–6 in a **read-only subagent** with the whole folder; it returns findings tagged by
kind, each with where it was found and a suggested resolution. Step 7 you do yourself after
reading its report — you have the decisions and the operator's reasoning in context, the agent
does not. Then:

8. Write `04-review.md`: findings grouped by kind, each with id `R-nn`, where, what, suggested
   resolution, outcome (empty for now).
9. **Question rounds**, grouped by module. Every finding is a fork: **Accept the suggested
   resolution** (Recommended when it is clearly a gap) / **Resolve differently** (the operator says
   how) / **Reject — it is intentional** (the reason goes to the brief's out-of-scope or to the
   finding's outcome) / **Defer** → `Q-`. Accepted findings become `D-` records; small ones become
   `A-` records. Fill the outcome column as you go.
10. **Apply.** Edit the affected documents directly when the change is local (one capability, one
    rule). When a finding changes a module's shape (new sub-module, moved capability), run the
    `module <name>` procedure for it instead, so the whole module file is rewritten coherently.
    Record in `04-review.md` which modules were re-run.
11. If step 10 touched more than a couple of modules, repeat phase 6 quickly — the fixes may have
    introduced a new dangling reference. Note it in `04-review.md`.
12. Final gate: the operator sees `04-review.md` with every outcome filled, the list of documents
    changed, and anything deferred. On approval `STATE.json.phase` → `"done"`. Regenerate
    `README.md`.

---

## Other modes

**`status`** — read `STATE.json`, count rows in the four logs, list open questions by title, list
modules with their L2/L3 state. Report and stop; write nothing.

**`module <name>`** — confirm the module exists in `STATE.json`; re-run phase 4 and then 5 for that
module only, with the extra instruction to the subagent to keep what is in the file unless a
decision or the operator's edit contradicts it. Gate once at the end. Use it after a `D-` record
changed the module, or when the operator edited the file and wants it re-checked.

**`decide`** — read `OPEN-QUESTIONS.md`; for each open `Q-`, present it as a question round (its
original options, plus what has been learned since). Closed questions get a `D-` record, the
`[?Q-NNN]` markers in the text are replaced with the outcome and `(D-NNN)`, the question is marked
closed with the decision id. Questions the operator still defers stay open. No gate; report what
closed.
