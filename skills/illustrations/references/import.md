# Import — the customer's own logo and icons

The most common request is not a new mark but a mark that exists, and an icon set the product
already uses. These two modes take them in without redrawing them. Everything mechanical is the
script's (`SKILL.md › The script`); what to propose and what to ask is here.

## Contents

- [import logo](#import-logo)
- [import icons](#import-icons)
- [Rules](#rules)

## import logo

`/illustrations import logo <file.svg> [--id <id>]` — on a set at any step (Intake done at least).

1. **Analyse.** `node bin/illustrations.mjs import <dir> logo <file> [--id <id>]` prints what the
   file is made of — the viewBox, the shapes, whether the outline is one merged path, the named
   groups, the stroked shapes and their widths, the raw colors by frequency, the ids, what needs a
   hand (a gradient, a filter, a mask, text, a raster image) — and **what can move**: a named group
   is a part a loader may move on its own; a stroked shape can draw itself; a merged outline moves
   only as one; a whole mark takes a wipe, an appearance with a shift, a ring or a pulse around it.
   Read the report to the operator in two or three lines.
2. **The copy on tokens.** The script keeps the file as received (`review/logo/<id>.source.svg`,
   never shown, never edited) and writes `review/logo/<id>.svg`: the same geometry, the colors
   mapped to tokens (the most used color the body in `currentColor`, white the ground, the next
   ones `--lg-accent`, `--lg-accent-2`, `--lg-soft`), `<g id>` turned into prefixed classes, ids
   dropped. Add the printed entry to the logo tab with `"from": "the customer's file"` and
   `"source"`, `selected: true`; `check`. Where the report said *needs a hand* — a gradient, text,
   a mask — `check` will fail on it: **ask** before flattening (a gradient to its mid color, text
   to the wordmark beside the mark), and say what changes in the look. Where more colors than
   tokens were found, ask which two are the accents. If the mapping reads wrong on the page (the
   body and an accent swapped), swap the tokens in the copy — never the geometry.
3. **Motions proposed.** From the report, write `plans/loaders.md` for this mark only: a motion
   per part the build allows — the parts in groups turn, light up in turn, travel; a stroked
   outline draws itself (`stroke-dasharray` and an animated `stroke-dashoffset`); a merged or
   single-path mark: a **wipe** (a rect in `--lg-ground` sliding off it), an **appearance with a
   shift** (`translate` and `opacity` on the whole), a **ring** or a **pulse** around it (a circle
   in `--lg-accent` growing and fading) — and one determinate loader. **Splitting a merged outline
   into parts changes the file: propose it as a question, with what it would allow, and do it only
   on the operator's word**, in the copy, never in the source. Approve the plan.
4. **Publish and review** the Logo tab with the mark alone (the lineup on three grounds, five
   sizes, one color, inverted: say what the import shows — a mark that needs its colors, or fails
   at 16 px — so the operator knows before the loaders). `pick logo <id>` is implied: the Logo step
   is `approved` with the imported mark `selected` and no shortlist; IL-002 records *imported from
   <file>*. Then Step 4 — Loaders runs on the plan of point 3.

## import icons

`/illustrations import icons <folder>` — on a set at any step.

1. **Analyse and normalise.** `node bin/illustrations.mjs import <dir> icons <folder>` reads every
   SVG, writes a normalised copy into `review/icons/<id>.svg` — a square viewBox scaled to the 16
   grid, every stroke width to 1.5, raw colors to `currentColor`, ids dropped, classes prefixed —
   and prints, per file, what it changed or why it left it: not square, text, a raster, a gradient.
   Add the printed entries to the icons tab with `"from": "the customer's file"`; `check`, `build`,
   publish.
2. **What differs.** Look at the row at 16 px and on the inverted surface. Mark in the tab's lead
   or the item's `usedIn` what still differs from the set's manner — a filled icon among stroked
   ones, square corners among round, a diagonal under 30° that aliases, two ideas in one — and
   propose for each: keep (the customer's choice), redraw in the manner (a builder, the icon as
   reference), or drop. The ones left for a hand are proposed as redraws.
3. **Micro-animations proposed.** For the icons that change state in the product — a checkbox,
   a star, a bell, a toggle, a chevron, a heart — propose a transition between the two states, not
   an idle motion: the check draws itself on `--ill-duration-short`, the bell swings once on
   `--ill-duration-instant` and settles, the chevron turns, the star fills. Each is a second file
   `icons/<id>-<motion>.svg` beside the still icon, the still icon its rest pose
   (`drawing.md › Icons`). One line each in `plans/icons.md`; approve; draw; publish; review.
4. **Approve** the Icons tab. Step 5 then proposes only the domain's subjects the set still lacks.

## Rules

- **The source is sacred.** `<id>.source.svg` is never edited, never shown on the page, never in
  the sprite; a change the operator allows is made in the copy.
- **No geometry changed without a word.** Mapping colors, dropping ids, prefixing classes, scaling
  to the grid and setting a stroke width are normalisation; splitting a path, flattening a
  gradient, removing text, redrawing an icon are changes — each a question first.
- **What the report says, the operator hears**: a mark that reads only in color, that fails at
  16 px or is one merged path is told so before the loaders are planned, with what that limits.
- **The imported mark is the mark.** No new marks are drawn beside it unless the operator asks
  for alternatives; then Step 3 runs with the imported mark as the reference and `selected` stays
  on it until a pick says otherwise.
