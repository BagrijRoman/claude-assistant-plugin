# Blueprint — brief and architecture (phases 2–3)

Read `mechanics.md` first. Each phase says what it starts from, its steps, and its gate.

## Phase 2 — Brief

**Start from:** extracts, gap answers, glossary seed.

1. **Decide the surfaces first** — the actors table and the module map both hang on it. Gather
   what phase 1 found under *Surfaces mentioned*, what the sources decided about devices and apps,
   and what the operator said in Intake. If a source already decided it ("one web app with layouts
   for desktop, tablet and phone"), cite that decision, write the surfaces from it and name it in
   the gate summary — no question. Otherwise ask (`AskUserQuestion`, header `Surfaces`); this
   question has no *Defer*, because every later phase depends on it:
   - **one surface** (name it) — Recommended when every source puts every actor in one place;
   - **several surfaces, same scope** — the same actors do the same things on each;
   - **several surfaces, split** — some actors or jobs live on one, some on another; the next
     round settles which.

   When a competitor profile shows how they split it, say so in the matching option's label.
   Record the answer as a `D-`, and in the same record fix the **default rule** for later phases:
   "a module on several surfaces has every capability on all of them unless a capability says
   otherwise", or the stricter variant the operator prefers. When a source decided the surfaces, no
   `D-` is written — its decision is cited (`S-01 §D4`), as every decision of the sources is — and the
   default rule, unless the source states one, is an assumption the gate summary names first. Then
   write the brief's `## Surfaces` table: surface, actors on it, their main
   jobs there, constraints that bear on it (offline, device features, store distribution, screen
   size). Constraints, not platforms — whether "mobile" is a native app is decided when the work is
   cut.
2. Create `01-brief.md` from `templates/01-brief.md` and fill it — the template's example rows show
   the shape of each table and are replaced, never kept:
   - **Idea** (two paragraphs at most);
   - **Audience & actors** — who uses it, who operates it, who pays; each with a one-line
     description, the surface(s) they use and the source;
   - **Goals** — each a `G-` (`next goal`): what success looks like, measurable where a source says
     so;
   - **Out of scope** — explicitly not doing; from sources and from decisions, including the
     features a source marks as skipped. This list is as valuable as the goals;
   - **Non-functional requirements** — each an `N-` (`next nfr`): scale, devices and browsers,
     offline, security, privacy, compliance, accessibility, languages; only what sources or
     decisions support, otherwise a question;
   - **Risks** — each an `RK-` (`next risk`): what could make the product fail — a regulation that
     may change, data that may not exist, a dependency, adoption — with how likely, how bad, and what
     reduces it. From the sources and the operator; a risk you suspect but nobody named is an
     assumption, shown at the gate;
   - **Decided outside this blueprint** — the implementation decisions the sources took (stack, data
     store, hosting, an app or no app), cited from `00-sources.md › Decided in the sources`, not
     discussed;
   - **Comparable products** (one line each, a link to the profile if there is one) and **Key
     constraints**.
3. Every statement carries its reference: `(S-03)`, `(D-002)`, `[A-001]`. A sentence you cannot
   reference is a fork: ask or assume.
4. Finalise `GLOSSARY.md` for the terms the brief uses; pick one term per concept and list the
   others as *also called*. From here on every document uses the glossary's term. A term that first
   appears later — an entity in phase 4, a state in phase 5 — is proposed by the agent that needs it
   and added by you at merge, before the files use it.
5. Gate.

## Phase 3 — Architecture

**Start from:** approved brief.

This phase has the most forks, because the module map decides everything downstream. Expect two or
three question rounds — after the draft is on disk, so that a summarised context never loses it.

1. **Draft the module map and write it down at once** — `02-architecture.md`, created from
   `templates/02-architecture.md`, with `Status: draft` at the top, before any question round. If the sources already define modules or feature areas,
   they are the draft: one blueprint module per source module, with the sources' codes (`ORG`,
   `DAT`) and names; you adjust only what the sources leave unclear. A source module that is a
   technical layer or a surface ("Mobile app", "API", "Admin panel") is not copied silently: ask one
   *Revisit?* question about folding it into the modules it serves. Otherwise draft it yourself:
   candidate modules, each with a one-line responsibility — a coherent area of behaviour a user or
   operator would name (Accounts, Billing, Reporting, Notifications…), not a technical layer
   (Database, API, Frontend); aim for 5–12, since fewer means they are too broad and more means
   some are sub-modules. Either way give each module the surfaces it lives on — where its actors
   sit, per the brief: one surface, `both`, or a qualified form like `web · mobile read-only`; the
   obvious assignments are assumptions the operator sees at the gate, and only a module whose
   actors sit on different surfaces is a question.
2. **Question round(s).** When the draft is the sources' map, ask only about what the sources leave
   unclear or contradict — as a *Revisit?* question where a source decided — and a concern the
   sources made a module stays a module, its cross-cutting section pointing to it. Otherwise ask
   about the forks the draft exposes: a boundary that could go two ways, a capability that could
   live in two modules, an actor with an unclear home, a module whose actors sit on different
   surfaces when the brief does not say which surface the module serves, a cross-cutting concern
   (access control, audit, notifications, i18n, import/export) that could be a module or a property
   of every module. Update the draft on disk after each round.
3. Finish `02-architecture.md` and drop the draft mark:
   - **Module map** — module, code, responsibility, main actors, surfaces, stage, sources (the last
     filled in step 5) — with a Mermaid diagram of the modules and their relationships under it;
   - **Relationships** — what each module needs from which other, and gives to which, described as
     behaviour: "Billing needs the current plan from Accounts";
   - **Main flows** — 3–7 end-to-end user journeys as numbered steps crossing modules; each step
     names the module *and the surface*. A flow that changes surface halfway is the one to look at
     hardest: how does the user continue?
   - **Domain model** — the entities the product is about: the module that owns each, its states,
     what it relates to, and whether it holds personal data (and what kind) — the brief's privacy
     requirements apply to those. A table and a Mermaid diagram without fields: concepts, not a
     database schema;
   - **Roles and access** — the roles of the brief against the modules: none / read / use /
     manage; the coarse matrix that each module's *Access* table refines in phase 5. When a source
     has a permission matrix, start from it;
   - **Cross-cutting concerns** — one sub-section each, stating how it applies everywhere; when
     there are several surfaces, one of them is *Surface parity*: what a user sees when a capability
     exists on another surface only;
   - **Boundaries** — what the system does not do, the external systems it relies on.
4. Write `03-roadmap.md` from `templates/03-roadmap.md`: a stage per module *and surface* with the
   reason — MVP / next / later,
   or, when the operator has not cut an MVP yet (a source may leave the build order open), in scope
   / later / out of scope; "Reporting: web MVP, mobile next" is one module, two rows. A source that
   sets stages per feature (keep / later / skip) seeds the stages of the capabilities in phase 5.
   With the depth, this decides how deep phases 4–5 go (`mechanics.md › Depth`). A module or surface
   set to out of scope gets its line in `01-brief.md › Out of scope`, with the reason and its ref,
   and is named in the gate summary.
5. **Map the sources to the modules**: for each module, the source ids — with sections where a source
   covers several modules — that describe it. A source section that governs several modules, such as
   a permission matrix, is mapped to each of them. They go to the module map's *Sources* column now;
   phases 4 and 5 read them in full.
6. Create `modules/<slug>.md` from `templates/modules/MODULE.md` for every module that is not out
   of scope: fill only the header lines (name, code, stage, surfaces, sources) — the L2 and L3
   sections keep the template's placeholders, whose example ids are placeholders too, until the
   writers replace them;
   `STATE.json.modules` lists them (`mechanics.md › The modules entry`) with their sources,
   `lastCapability: 0`, `l2: "pending"`, `l3: "pending"`.
7. Gate. Tell the operator plainly: after this gate the module list is frozen — adding, splitting,
   merging, renaming or removing a module later goes through `/blueprint restructure`, so that the
   documents never silently drift from the map.
