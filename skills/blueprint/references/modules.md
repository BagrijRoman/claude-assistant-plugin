# Blueprint — modules and capabilities (phases 4–5)

Read `mechanics.md` first. Each phase says what it starts from, its steps, and its gate.

## Phase 4 — Modules (L2)

**Start from:** frozen module map.

1. **One writer per module** that is not out of scope (`mechanics.md › Subagents`), launched in waves
   of four or five, so that each wave's questions make a round the operator can take; tell the
   operator the wave first. Brief: read `01-brief.md`, `02-architecture.md` (domain model and roles
   included), `GLOSSARY.md`, `DECISIONS.md`, `00-sources.md › Decided in the sources`, the module's
   own file, `templates/modules/MODULE.md` for the layout and **the module's sources in full**; fill
   the L2 section of `modules/<slug>.md` in place:
   - **Purpose** — why this module exists, for whom; its surfaces stay in the header line, and what
     differs between them goes in the note under Users;
   - **Users** — the actors, the surface each uses here, what each wants;
   - **Sub-modules** — 3–8 named areas, one line each;
   - **Key entities** — the entities of the domain model this module owns, with the attributes and
     states that matter to behaviour; a new entity is proposed, not slipped in;
   - **Receives from / provides to** — the relationships of the architecture, from this module's
     point of view;
   - **External integrations** — systems outside the product it talks to, as behaviour;
   - **Open points**, marked `[?pending]`.

   Behaviour, not implementation. It returns a summary of at most 15 lines, the open points and the
   proposed terms and entities — each entity with the personal data it holds, if any.
2. **Merge** each wave: read the files; turn the open points into questions; add the proposed terms
   and entities to the glossary and the domain model, with the entity's *Personal data* column;
   assign ids with `next`; where two modules
   describe the same relationship or entity differently, that is a question. Run question rounds
   grouped by module — the *how to take them* question first when the merge raises more than four
   forks (`SKILL.md › Structural forks → ask`).
3. Set `STATE.json.modules[*].l2` to `"done"` for each module written (`"failed"` for one whose writer
   failed — `mechanics.md › Subagents`).
4. Gate — point the operator at the module files, the in-scope ones first.

## Phase 5 — Capabilities (L3)

**Start from:** L2 done. How deep each module goes is the table in `mechanics.md › Depth`: the depth
in `STATE.json` picks the column, the module's stage — or a capability's own — the row.

1. **One writer per module**, in waves as in phase 4; a large module may get one writer per
   sub-module, and those return their sections as text for you to assemble
   (`mechanics.md › Subagents`). Brief: the same context files, the module file, **the module's
   sources in full**, the depth and the module's row of the depth table — which capabilities get full
   L3 and which a list entry; for each sub-module write capabilities in the block of
   `templates/modules/MODULE.md` — exactly that block, nothing improvised:
   - the heading is `#### <code>-C?? · <verb phrase>`, or `#### <code>-C?? · System: <verb phrase>`
     for behaviour the system starts on its own; you number the ids at merge, and a capability not
     yet numbered is referred to as `<code>-C?? · <its verb phrase>` (in *Depends on* and *Access*);
   - **Source** names the source items the capability delivers, cited as in `mechanics.md › IDs`
     (`ORG-06`, `S-03 §4.2`); **Stage** is written only when it differs from the module's (a source
     marking the feature *later* sets it);
   - **Rules** and **Edge cases** come from the sources first; what no source states is one
     assumption for the whole capability, marked `[A-??: edge cases]` in its Refs, not one per line;
   - where a capability serves a goal or must meet a non-functional requirement of the brief, its
     Refs name the `G-` or `N-`.

   A capability is something a user or the system *does*, named with a verb: "Invite a team
   member", "Recalculate totals when a factor changes", "Export a report". It is not a screen, not a
   function, not a table.

   **Surfaces follow the inheritance rule.** A capability is on its module's surfaces, under the
   brief's default rule, unless its nature says otherwise — scanning with a camera is mobile,
   editing a large table is web. The writer notes the deviation with its reason and marks it
   `[?pending]`; you turn it into an assumption when the reason is plain, and into a question only
   when the module is on several surfaces, the nature does not tell and the brief's rule does not
   settle it. Where behaviour differs between surfaces, say so in Rules or Edge cases with the
   surface as prefix ("mobile: works offline and syncs when back online") — one capability, not two,
   unless the behaviour is fundamentally different.

   The writer also fills the module's **Access** table: each capability against the roles of
   `02-architecture.md › Roles and access` — ✓ / own only / —, or the values of the source's
   permission matrix when there is one, defined under the table.
2. **Merge**: reserve the capabilities' ids with `next capability <code> --count N`, never
   renumbering one, and replace every `<code>-C?? · …` reference as you go; turn open points into
   questions — the *how to take them* question first when the merge raises more than four forks;
   give one `A-` to each capability marked `[A-??: edge cases]`; most L3 forks are small, only rules
   that change what an actor can do are structural. Check that the module's Access table agrees with
   the coarse matrix in the architecture — a disagreement is a question.
3. Set `STATE.json.modules[*].l3` — `done`, `list-only`, `none` when the depth leaves the module at
   L2, or `failed`.
4. Gate.
