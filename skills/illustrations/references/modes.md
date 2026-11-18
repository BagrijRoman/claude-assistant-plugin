# Illustrations — the other modes

What each mode does when it is not the whole run: a status, one tab, a revision, a pick, an import, one picture, a publish, a save, a check — and the quick path for a single picture. Templates live in the skill's own folder,
`${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`; a path like `templates/STATE.json` below is
relative to the skill's folder. The run itself is in [mechanics.md](mechanics.md), [steps.md](steps.md) and [pictures.md](pictures.md); the imports in [import.md](import.md).

## Other modes

**`status`** — read `STATE.json`, `DECISIONS.md`, `review/manifest.json` (or `manifest.json`);
report steps and states, rounds, picks, the address, what waits. Write nothing.

**`tab <id>`** — the step for that tab, alone: its tab intake again (the current answer
recommended) → plan (or re-plan, keeping what the operator approved unless they say otherwise) →
draw → publish → review → approve. On a saved set: the tab's files are redrawn under `review/`
again with a manifest holding that tab only; the save then replaces those files and keeps the rest
(say so before starting; a saved file is never overwritten without this).

**`revise`** — the review loop of Common mechanics for the tab in `awaiting-review` (its trial,
when `batches.<key>` is `trial`), when the operator wrote revisions outside the question.

**`pick logo <id> [<id>…]`** — confirm the ids exist; the first is `selected`, the rest
`shortlist`; `STATE.json › selected`; IL-002 and IL-003; `build`; publish.

**`pick scene <place> <id>`** — `place` is `sign-in`, `not-found` or `hero`; confirm the id is a Scenes
item with that `place`; it alone is `selected` among the place's variants;
`STATE.json › selected.scenes.<place>`; an `IL-nnn` row; `build`; publish.

**`import logo <file> [--id <id>]`** and **`import icons <folder>`** — the customer's own mark
and icons taken in without redrawing: `import.md`. The Logo step is then the imported mark alone,
the loaders are planned from what its build allows, and the Icons step starts from the normalised
set.

**`add [what]`** — a picture the catalog lacks, and **the quick path** when one picture is all that
is wanted: ask what and which tab (or take it from the argument); its plan line; draw; `loop`,
`check`, `build`, publish; the tab's review. No tab intake, no plan beyond the line, no trial. With
no set in the project yet: lay a minimal one first — the folder as `steps.md › Step 0 — Intake`
chooses it (one question), `tokens.css` from a showcase or a design baseline when there is one,
else the template's starter scheme confirmed in one question; `STATE.json` with every other step
`pending`; a manifest with that one tab — then the picture. Say that the rest of the run (the
direction, the mark, the other tabs) waits for `/illustrations continue`, and that a picture drawn
before the direction is settled may be redrawn in its hand later. `tab <id>` is the same quick path
for one whole tab.

**`publish`** — `check`, `build`, publish to the address in `STATE.json` (`page.md › Publishing`);
the address.

**`save`** — step 10 alone, when the operator asks; the script refuses while a tab is not approved
and says which.

**`check`** — the script's checks; fix what it lists.
