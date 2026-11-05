# Illustrations — how to draw

The conventions that make a picture themable, clash-free on one page and good to look at. The
script's `check` enforces the mechanical ones; the rest is what you hold yourself and every builder
to. One example of each kind passes every check: `templates/examples/logo/valley.svg`,
`templates/examples/loaders/valley-turn.svg`, `templates/examples/icons/site.svg`,
`templates/examples/states/empty.svg`, `templates/examples/emails/invitation.svg`. Read the one
you need before drawing.

## Contents

- [The file](#the-file)
- [Tokens](#tokens)
- [Deriving the picture tokens from a brand](#deriving-the-picture-tokens-from-a-brand)
- [Direction](#direction)
- [Composition](#composition)
- [Animation](#animation)
- [Marks](#marks)
- [Loaders](#loaders)
- [Icons](#icons)
- [Pictures](#pictures)
- [Letter pictures](#letter-pictures)
- [What makes a picture look generated, and how to avoid it](#what-makes-a-picture-look-generated-and-how-to-avoid-it)

## The file

```svg
<!-- one comment: what it is, what moves -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" aria-hidden="true">
  <style>
    .empty__lid { transform-box: view-box; transform-origin: 160px 128px; animation: empty-settle var(--ill-duration) var(--ill-ease) 1 both; }
    @keyframes empty-settle { 0% { transform: translateY(-18px) rotate(-6deg); } 100% { transform: translateY(0) rotate(0deg); } }
  </style>
  <ellipse cx="160" cy="196" rx="112" ry="16" fill="var(--ill-ground)"/>
  <g class="empty__lid">…</g>
</svg>
```

- `viewBox` always; no `width` or `height` — the page sizes a picture.
- **No `id` attribute inside.** Every picture is inlined once as a `<symbol>` and used many times
  on one page and in one sprite; an id would clash. Hence no gradient, pattern, filter, mask, clip
  or marker (they need ids): draw depth with flat shapes — a shaded face in `--ill-soft`, a shadow
  in `--ill-muted`, a glint in `--ill-highlight`.
- **Every class and keyframe starts with the picture's id**: `empty__lid`, `empty-settle`;
  `valley-turn__sun`, `valley-turn-orbit`. The `<style>` of every picture is moved into one head.
- **No `<text>`**: words stand beside a picture as HTML, so no picture is redrawn per language. No
  `<image>`, no `<foreignObject>`.
- The file is small: under 24 KB (`check` warns above it). Paths with two decimals at most; a
  shape drawn once; no editor metadata.
- A picture is **complete and legible at its last keyframe**, which is what a thumbnail, a shared
  link and a reader with reduced motion see.

## Tokens

Three families, in `tokens.css`, light and dark; a picture uses one family and nothing else.

| Family | Who draws with it | Tokens |
|--------|-------------------|--------|
| `--ill-*` | states, scenes, onboarding, reserve, letter pictures | `line` the outlines and the darkest detail · `fill` the lit face of an object · `soft` the shaded face, a second object · `muted` the shadow under a thing, a far thing · `accent` the one brand touch · `accent-soft` its tint: a glow, a cushion · `highlight` a glint · `ground` the disc a picture stands on · `positive` · `caution` · `negative` the feedback tones |
| `currentColor` + `--lg-*` | marks, loaders, icons | `currentColor` the body (the page gives it the color) · `--lg-ground` the color behind the mark, for knockouts · `--lg-accent` the first accent · `--lg-accent-2` a second · `--lg-soft` a soft fill |
| `--ill-duration-short` · `--ill-duration` · `--ill-duration-long` · `--ill-ease` · `--ill-ease-in-out` | every animation | a glint or a small settle · one gesture · a loop of waiting, a loader's cycle |

Anything else — a hex, `rgb()`, a named color, a literal `600ms` — fails `check`. On the brand
ground the page turns `--lg-accent` and `--lg-accent-2` into the foreground and `--lg-soft` into
nothing, so a mark drawn with accents still reads on its own color; draw it so that it does.

## Deriving the picture tokens from a brand

When the scheme comes from a showcase or a baseline that has no `--ill-*` of its own:

- `--ill-accent` is the brand; `--ill-accent-soft` its soft tint (`--color-primary-soft` where one
  exists); `--lg-accent` the brand, `--lg-accent-2` a complement a quarter turn around the hue
  circle, desaturated, `--lg-soft` the soft tint.
- `--ill-line` is the foreground text color nudged toward the brand's hue (never pure black or
  white); `--ill-fill` the surface; `--ill-soft` the muted surface; `--ill-muted` the border color;
  `--ill-ground` a tint between the page and the soft surface; `--ill-highlight` the surface in the
  light theme and the foreground in the dark.
- `--ill-positive`, `--ill-caution`, `--ill-negative` are the feedback tones.
- The dark set is not an inversion: the line goes light, the fills go dark, the accent lightens so
  it reads on dark, the ground stays a touch above the page. Check a picture on both themes before
  the operator sees it.

## Direction

The hand of the set, chosen once on a sheet of four samples (`phases.md › Step 2 — Direction`) and
then held in every picture. A direction is a position on five axes; the plan names each, the chosen
sheet shows them, and every builder's brief repeats them:

| Axis | The choices | What it changes |
|------|-------------|-----------------|
| **Line** | outlines in `--ill-line` (2.5 units; or 2 for a lighter hand) · flat faces with no outline, edges from the fills meeting · outline only on the subject, flat around it | the first impression: drawn or built |
| **Angle** | front-on · three-quarter with one visible side · isometric | how much depth a picture carries, how a shelf or a box reads |
| **Detail** | spare (the subject and its ground) · furnished (a second object, a texture of dots or lines) · rich (a scene) | the time a picture takes to read; richer pictures need larger sizes |
| **Accent** | one touch of `--ill-accent` per picture · the accent and its tint as a field · a mark in one color, two, or more | where the eye lands; how the mark sits in the product's chrome |
| **Motion** | settle (things come to rest) · drift (things pass through) · draw (things appear stroke by stroke) | the character of every animation in the set |

The references the operator gave at Intake set the starting position; a direction may take them
as they are, calm them, or answer them. The sheet is not a style guide in words: it is four
pictures a builder keeps open while drawing, and a reviewer compares a new picture against.

## Composition

- **One subject, one idea.** A state is one object in one situation; a scene is one place with
  one thing happening. Three objects at most; the second and third smaller and in `--ill-soft`.
- **The product's own things.** Draw what the documentation's world has — its instruments, its
  records, its places — not a generic rocket, a generic astronaut, a generic magnifying glass
  over a generic document. A loupe is fine when the state is *nothing found*; it looks over the
  product's rows.
- **A ground to stand on**: an ellipse in `--ill-ground` under the subject, a shadow in
  `--ill-muted` under it. Nothing floats unless floating is the point.
- **Lines**: one stroke width per size — 2.5 for a 320 × 240 picture, 2 for a 160 × 120 spot
  (the same file; keep detail that survives halving), 1.5 for an icon; round caps and joins
  (`stroke-linecap="round" stroke-linejoin="round"`); outlines in `--ill-line` only where an edge
  needs it — faces of a thing meet without a line when their fills differ.
- **The accent once**: one thing in `--ill-accent` per picture (the handle, the seal, the leaf,
  the light), its tint in `--ill-accent-soft` behind it. Never two accents fighting.
- **Perspective**: a slight three-quarter view for objects (a lid, a drawer, a box), front-on for
  flat things (a sheet, a card, a screen). Consistent across the set — the same light from the top
  left, the same angle.
- **No faces, no hands with fingers, no text, no logos of real products.** People, when a scene
  needs them, are shapes: a head and a shoulder line in `--ill-soft`.
- **Margins**: nothing within 12 units of the edge of a picture; the subject in the middle third of
  a wide band.

## Animation

Every picture moves — minimally, to tell its story — except a mark and an icon.

- **One gesture.** A picture has one thing that moves, with one small reason: the lid settles, the
  loupe drifts and pauses, the lock rattles once, the parcel lands, the check draws itself. A
  second motion only as its echo (the leaf after the lid; the glint after the check). Small
  amplitudes (a few units), slow (`--ill-duration` to `--ill-duration-long`), the tokens' easings;
  no bounce, no overshoot, no spin for its own sake.
- **Once, then still.** `animation: <id>-<name> var(--ill-duration) var(--ill-ease) 1 both` — it
  runs once on coming into the page and again on *Replay*; `both` keeps the first and last
  frames. The **last keyframe is the complete picture**: under reduced motion the page runs every
  animation to its end in no time, so what remains must be the still, whole picture (a lid closed,
  a leaf landed). Never end on `opacity: 0` or off-canvas.
- **Loops only where waiting is the meaning**: a signal searching, sand running, parts arriving,
  a loader. A loop's keyframes start and end on the same pose, so the cut is invisible and the
  reduced-motion frame is the rest pose.
- **Transforms, not geometry**: `transform` on a `<g>` with `transform-box: view-box` and an
  explicit `transform-origin` in units of the viewBox; `opacity` for appearing. Never animate `d`.
- **Staggers** with `animation-delay` on a token (`var(--ill-duration)`), never a literal.
- A letter's picture moves on the page as a promise of its GIF; the developer exports it later.

## Marks

- The 64-unit grid; the body in `currentColor`; knockouts (a river through a ridge, a window in a
  door) in `var(--lg-ground)`; up to two accents and a soft fill from `--lg-*`. One-color marks
  are welcome; a mark that needs its colors to be read is weaker at 16 px.
- **Detailed enough to be a logo, simple enough for a tab**: 3–6 shapes; nothing thinner than 2
  units; counters (the holes) at least 4 units; it must read in the 16 px row of the lineup, where
  a weak mark shows. Make the thing recognisable by silhouette alone.
- **Ideas from the product**: its object, its action, its initial with the domain in it, the
  domain's geometry, the trade's own symbol. Fifteen marks are five ideas tried three ways, not
  fifteen unrelated drawings; say in `idea` which, and in `from` where in the product it comes from.
- **Parts in groups**: `<g class="<id>__sun">`, `<g class="<id>__ridge">` — the parts a loader
  will move. A mark with parts animates; a mark that is one path does not.
- Clear space: nothing of the mark within 4 units of the grid's edge. The wordmark is page text
  beside it; the page draws it.

## Loaders

- The mark's own SVG with its parts in motion — never a new drawing, never a generic ring. They
  turn, light up in turn, draw themselves (a stroke with `stroke-dasharray` and an animated
  `stroke-dashoffset`), beat, travel an arc, fill up.
- The id is `<mark>-<motion>`; every class and keyframe starts with it.
- `animation: … var(--ill-duration-long) var(--ill-ease-in-out) infinite`; the loop's first and
  last keyframe are the mark at rest.
- Three sizes from one file: at 16 px only the biggest motion reads — if the loader is unreadable
  at 16, make one of the mark's loaders a simple one for buttons and rows and say so in `use`.
- **Determinate**: `--progress` from the parent, 0 to 1 — `stroke-dashoffset: calc(200 * (1 -
  var(--progress, 1)))` on a path of length 200, or a clip of a rect's height by `transform:
  scaleY(var(--progress, 1))` with `transform-box` and the origin at the bottom; no animation of
  its own, so the share is what the page sets. `determinate: true` in the manifest; the page shows
  it at 0, 33, 66 and 100.

## Icons

- The 16-unit grid; a 1.5-unit stroke in `currentColor`, round caps and joins; no fill but
  `currentColor`, `var(--lg-accent)` for one small accent, `var(--lg-soft)` for a soft fill;
  optical size at 16 px is the test — nothing finer than the stroke, no more than two ideas, no
  diagonal under 30° that will alias.
- The manner of the chosen icon library (the stroke, the corners) and of the mark; the domain's
  own subjects only (`phases.md › Step 5 — Icons`).

## Pictures

States, scenes, onboarding, reserve: `viewBox="0 0 320 240"`, drawn to read at 320 (hero) and at
160 (spot, in the sample card and a panel) — `size` is the page's business. A band for a hero or
a sign-in panel may be `0 0 560 240` with `wide: true`.

## Letter pictures

`viewBox="0 0 560 240"`: the band at the top of a 600 px letter. The subject in the middle third,
the sides calm, so a narrow client that crops the sides loses nothing. The letter's own plate is
the picture's `--ill-ground`. The same rules of motion; the developer exports the GIF or the PNG.

## What makes a picture look generated, and how to avoid it

- A rocket, an astronaut, a plant in a pot, a generic magnifying glass, a generic clipboard, three
  floating shapes around a thing: the stock vocabulary. Draw the product's own objects instead.
- Everything centred and symmetrical: let the subject sit a little off centre, the ground wider on
  one side, the second object overlapping the first.
- Gradients and glows for depth: use the two faces (`fill`, `soft`) and one shadow (`muted`).
- The same blob in every picture: vary the ground's width and the subject's scale across the set.
- A motion that bounces or spins: one slow settle.
- Pastel everything: one strong accent, the rest quiet.
- A set that does not share a hand: the same stroke, the same angle, the same light, the same
  accent in every picture — look at the tab's grid as one thing before publishing.
