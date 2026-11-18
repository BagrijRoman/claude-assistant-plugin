# Illustrations — how to draw

The conventions that make a picture themable, clash-free on one page and good to look at. The
script's `check` enforces the mechanical ones; the rest is what you hold yourself and every builder
to. One example of each kind passes every check: `templates/examples/logo/brayer.svg`,
`templates/examples/loaders/brayer-roll.svg`, `templates/examples/icons/ream.svg`,
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
- [Presentable](#presentable)

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
  `brayer-roll__roller`, `brayer-roll-ink`. The `<style>` of every picture is moved into one head.
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
| `--ill-*` | states, scenes, onboarding, reserve, letter pictures | `line` the outlines and the darkest detail · `fill` the lit face of an object · `soft` the shaded face, a second object · `muted` the shadow under a thing, a far thing · `deep` the face turned from the light, depth without a gradient · `accent` the one brand touch · `accent-soft` its tint: a glow, a cushion · `highlight` a glint · `ground` the disc a picture stands on · `positive` · `caution` · `negative` the feedback tones |
| `currentColor` + `--lg-*` | marks, loaders, icons | `currentColor` the body (the page gives it the color) · `--lg-ground` the color behind the mark, for knockouts · `--lg-accent` the first accent · `--lg-accent-2` a second · `--lg-soft` a soft fill |
| `--ill-duration-instant` · `--ill-duration-short` · `--ill-duration` · `--ill-duration-long` · `--ill-stagger` · `--ill-rest` · `--ill-ease` · `--ill-ease-in-out` · `--ill-spring-smooth` · `--ill-spring-snappy` | every animation | a press or a toggle (150 ms) · a glint, a small settle, an echo (300 ms) · one gesture (600 ms) · a loader's cycle, the rest between loops (1400 ms) · the step between parts appearing (60 ms) · the rest between two plays of a gesture in the product (6 s) · the two easings · the two springs (no bounce; a little bounce), `linear()` where supported and `--ill-ease` elsewhere |

Anything else — a hex, `rgb()`, a named color, a literal `600ms` in a duration or a delay, a raw
`cubic-bezier()` — fails `check`. `check` also measures the tokens: the outline against every face it borders (`fill`, `soft`,
`ground`) and the accent on `fill` and `ground` — and a mark's accent on its ground — read apart at
3:1 or more in both themes (WCAG 1.4.11); a scheme that fails is changed, not excused. On the brand
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

The hand of the set, chosen once on a sheet of four samples (`steps.md › Step 2 — Direction`) and
then held in every picture. A direction is a position on five axes; the plan names each, the chosen
sheet shows them, and every builder's brief repeats them:

| Axis | The choices | What it changes |
|------|-------------|-----------------|
| **Line** | outlines in `--ill-line` (2.5 units, or 2 for a lighter hand — one width for the whole set) · flat faces with no outline, edges from the fills meeting · outline only on the subject, flat around it | the first impression: drawn or built |
| **Angle** | front-on · three-quarter with one visible side · isometric | how much depth a picture carries, how a shelf or a box reads |
| **Detail** | spare (the subject and its ground) · furnished (a second object, a texture of dots or lines) · rich (a scene) | the time a picture takes to read; richer pictures need larger sizes |
| **Accent** | one touch of `--ill-accent` per picture · the accent and its tint as a field · a mark in one color, two, or more | where the eye lands; how the mark sits in the product's chrome |
| **Motion** | settle (things come to rest) · drift (things pass through) · draw (things appear stroke by stroke) · spring (things arrive with a little life, on `--ill-spring-snappy`) | the character of every animation in the set |

The references the operator gave at Intake set the starting position; a direction may take them
as they are, calm them, or answer them. The sheet is not a style guide in words: it is four
pictures a builder keeps open while drawing, and a reviewer compares a new picture against.

## Composition

- **One subject, one idea.** A state is one object in one situation; a scene is one place with
  one thing happening. Three objects at most; the second and third smaller and in `--ill-soft`.
- **Counted.** A spot (a state, an onboarding step) is about 8 parts — shapes a reader could name;
  a scene about 14; `check` warns past 20 shapes in a file. The accent covers at most about a
  seventh of the picture (15 % of its area): a handle, a seal, a light — never a whole object.
- **Two tests before a picture is sent**: the silhouette — fill everything in `--ill-line` in your
  head: is the thing still recognisable? — and the squint — at half size, does one shape lead and
  the rest support it, or is it an even texture?
- **The product's own things.** Draw what the documentation's world has — its instruments, its
  records, its places — not a generic rocket, a generic astronaut, a generic magnifying glass
  over a generic document. A loupe is fine when the state is *nothing found*; it looks over the
  product's rows.
- **A ground to stand on**: an ellipse in `--ill-ground` under the subject, a shadow in
  `--ill-muted` under it — its own `<ellipse>`, so it can move with the thing. Nothing floats
  unless floating is the point.
- **Lines**: one outline width for the whole set — 2.5 units, or 2 when the direction chose the
  lighter hand — on every picture whatever its size on the page: a 320 × 240 file shown at 160 has
  a line half as heavy, and that is accepted; it is why detail is kept coarse enough to survive
  halving. A detail line (a seam, a vein of texture) may be one step thinner (2 under 2.5, 1.5
  under 2), nothing thinner; icons 1.5; a mark nothing under 2. Round caps and joins
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

Every picture moves — minimally, to tell its story — except a mark and an icon: a mark moves
only as a loader, an icon only between its states (`› Icons`).

- **One gesture.** A picture has one thing that moves, with one small reason: the lid settles, the
  loupe drifts and pauses, the lock rattles once, the parcel lands, the check draws itself. A
  second motion only as its echo (the leaf after the lid; the glint after the check). Small
  amplitudes (a few units); **quick**, like a system animation: the gesture on `--ill-duration`
  (600 ms), an echo or a glint on `--ill-duration-short`, a loader's cycle on
  `--ill-duration-long`, a press on `--ill-duration-instant`; the tokens' easings — `--ill-ease`
  for a settle, `--ill-ease-in-out` for a drift, `--ill-spring-smooth` for a spring with no bounce,
  `--ill-spring-snappy` only in a set whose direction's motion is *spring*. Nothing else overshoots;
  no spin for its own sake; an appearance never eases in (slow start, abrupt end). A keyframe
  animates `transform`, `opacity` or `stroke-dashoffset` and nothing else — a color change is a
  part in the new color appearing over the old; its last frame is never `opacity: 0`. `check`
  refuses each of these.
- **Every part has a role, and the role sets its motion.** The **lead** is the one thing the
  picture is about — the subject or the part that does the gesture: it moves first, travels
  farthest and longest. The **support** is the echo — the leaf after the lid, the glint after the
  check: shorter, smaller, after the lead. The **decoration** — glints, dots, a texture line, the
  accent — only appears (`opacity`, no travel) or stays still. Everything else — the ground, the
  shadow's shape, the far objects — is **static**. If two parts want to be the lead, the picture
  has two ideas: take one out. "Order without meaning is just delay": a part that has no reason to
  come after another comes with it.
- **Parts appear in order, the steps shrinking** — the ground, the lead, the details, the accent
  — on `--ill-stagger`, each step shorter than the one before so the group reads as one arrival
  and not a metronome: `calc(var(--ill-stagger) * 1)`, `* 1.6`, `* 2`, `* 2.3` for the second,
  third, fourth and fifth parts (the first waits nothing); and the treatment varies with the role
  — the lead travels the full few units, the support half, the decoration none. The whole group
  is in by `--ill-duration`.
- **The echo takes over before the gesture ends**: `animation-delay: calc(var(--ill-duration) *
  0.85)` — it starts in the lead's last stretch, so the two read as one gesture instead of a
  queue. Never a literal delay, never a delay longer than the gesture itself.
- **A part appears from almost there**: `scale(0.95)` (0.9–0.97) and `opacity: 0`, or a shift of
  a few units — never from `scale(0)`, never from off the canvas. `check` refuses `scale(0)`.
- **The shadow moves as a shadow.** When a thing lifts or lands, its shadow is its own
  `<ellipse>` in `--ill-muted` animated with `transform: scale()` and `opacity` (smaller and
  lighter as the thing rises), never a `filter` or a blur.
- **Where it runs.** A picture protects itself: the save writes a `prefers-reduced-motion` block
  into its `<style>` (every animated rule stopped on its last frame), and the sprite carries one for
  all its symbols, so an SVG dropped into the product keeps the rule without the review page. The
  sprite pauses every symbol while the product's tab is in the background; a picture that must play
  only when it scrolls into view is inlined from its file and started by an `IntersectionObserver`
  (the sprite's symbols share one animation each, so they cannot pause one instance at a time).
- **A budget**: at most 30 animated nodes in a picture (`check` warns past it), at most 3 pictures moving on one screen of
  the product (the rest still or paused off screen), and every tab looked at once with the CPU
  slowed 4× in the browser's devtools before it is published — a stutter there is a stutter on a
  phone — and, before the save, once on a real mid-range phone: throttling models a slow CPU, not
  a weak GPU or a small memory budget.
- **Cyclic, rarely.** Every picture, scene and letter picture loops: it rests, rewinds its gesture,
  plays it again and rests — an attention loop, not a spinner: the rest between two plays is
  `--ill-rest` (6 s), long enough that the picture is a still thing which moves now and then.
  **A picture the user meets many times a day** — an empty list, a filter with no match, a row
  loading — carries `frequency: "often"` in the manifest, plays its small gesture once when it
  appears and stays still: `loop` leaves it one-shot (`catalog.md › States`). A picture seen
  rarely — the welcome, the first success, the 404, an onboarding step — may take the whole
  gesture and the echo. Never a flicker. A builder draws the gesture **once**
  (`animation: <id>-<name> var(--ill-duration) var(--ill-ease) 1 both`, echoes on `animation-delay`
  tokens) with the **last keyframe the complete picture**, and `node bin/illustrations.mjs loop
  <dir>` turns it into the cycle: each animation gets a loop keyframe set on one period per picture
  (`calc(var(--ill-duration-short) * n)`: a rest, the rewind, the play, a rest), the delays baked in so
  the echo keeps its place in every cycle, and `infinite`. The loop starts and ends on the rest
  pose, so the cut is invisible, and under reduced motion the page stops every animation on that
  rest pose: the still, whole picture (a lid closed, a leaf landed). Never rest on `opacity: 0` or
  off-canvas. A loader loops by itself and is left as drawn.
- **Transforms, not geometry**: `transform` on a `<g>` with `transform-box: view-box` and an
  explicit `transform-origin` in units of the viewBox; `opacity` for appearing. Never animate `d`.
- **Staggers** on `--ill-stagger` (`calc(var(--ill-stagger) * n)`), an echo on `--ill-duration`;
  never a literal.
- A letter's picture moves on the page as a promise of its GIF; the developer exports it later.

## Marks

- The 64-unit grid; the body in `currentColor`; knockouts (a river through a ridge, a window in a
  door) in `var(--lg-ground)`; up to two accents and a soft fill from `--lg-*`. One-color marks
  are welcome; a mark that needs its colors to be read is weaker at 16 px.
- **Detailed enough to be a logo, simple enough for a tab**: 3–6 shapes; nothing thinner than 2
  units; counters (the holes) at least 4 units; it must read in the 16 px row of the lineup, where
  a weak mark shows. Make the thing recognisable by silhouette alone.
- **Ideas from the product**: its object, its action, its initial with the domain in it, the
  domain's geometry, the trade's own symbol. The marks come in two rounds — 6–9 first, three
  ideas tried two or three ways, then 4–6 more around the idea the operator pointed at — never
  fifteen at once, which come out alike; say in `idea` which, and in `from` where in the product it
  comes from.
- **Not somebody's logo.** For every mark, name the well-known marks its shape is near — a
  mountain-and-sun, a swoosh, a shield with an initial, a speech bubble, a chain link, a leaf — and
  move away from them before it is drawn; the plan says for each mark what it is not. The lineup
  is looked at at 16 px, in one color and inverted (dark on light, light on dark): a mark that
  needs its colors, its size or its ground to be read is dropped.
- **Parts in groups**: `<g class="<id>__sun">`, `<g class="<id>__ridge">` — the parts a loader
  will move. A mark with parts animates; a mark that is one path does not.
- Clear space: nothing of the mark within 4 units of the grid's edge. The wordmark is page text
  beside it; the page draws it.

## Loaders

- The mark's own SVG with its parts in motion — never a new drawing, never a generic ring. They
  turn, light up in turn, draw themselves (a stroke with `stroke-dasharray` and an animated
  `stroke-dashoffset`), beat, travel an arc, fill up. A path that draws itself carries
  `pathLength="100"`, so `stroke-dasharray: 100` and a `stroke-dashoffset` from 100 to 0 draw any
  path without measuring it.
- The id is `<mark>-<motion>`; every class and keyframe starts with it.
- `animation: … var(--ill-duration-long) var(--ill-ease-in-out) infinite`; the loop's first and
  last keyframe are the mark at rest.
- **Shown late, never blinking**: the product shows a loader only after about 250 ms of waiting
  (`--ill-duration-instant` and a little), so a fast answer never flashes one; say so in `use`.
- **From an imported mark** (`import.md`): what moves is what the file's build allows — its named
  groups as parts; a stroked outline drawing itself; a merged or single-path mark left whole, with
  a wipe (a rect in `--lg-ground` sliding off it), an appearance with a shift, a ring or a pulse
  around it. The mark's geometry is never changed for a loader; a part the operator allows to be
  split off is cut in the copy, on the operator's word.
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
  own subjects only (`steps.md › Step 5 — Icons`).
- **The customer's own icons** come in through `import icons` (`import.md`): normalised to this
  grid, stroke and `currentColor` by the script, their drawing untouched; what still differs from
  the manner is marked and proposed for a redraw, never silently redrawn.
- **An icon moves only between its states.** A still icon is its rest pose; an icon that toggles
  in the product may have a second file `<id>-<motion>.svg` with the transition — the check drawing
  itself, the bell swinging once, the chevron turning, the star filling — on `--ill-duration-short`
  or `--ill-duration-instant`, ending on the other state; never an idle motion, never a loop. A
  press is `transform: scale(0.97)` on `:active` over `--ill-duration-instant`, and a hover
  motion lives under `@media (hover: hover) and (pointer: fine)` only, since a tap fires a false
  hover; the product's stylesheet carries both, the icon file carries the drawing.

## Pictures

States, scenes, onboarding, reserve: `viewBox="0 0 320 240"`, drawn to read at 320 (hero) and at
160 (spot, in the sample card and a panel) — `size` is the page's business. A band for a hero or
a sign-in panel may be `0 0 560 240` with `wide: true`.

## Letter pictures

`viewBox="0 0 560 240"`: the band at the top of a 600 px letter. The subject in the middle third,
the sides calm, so a narrow client that crops the sides loses nothing. The letter's own plate is
the picture's `--ill-ground`, and the band's background in the letter's HTML too. The same rules
of motion, with one more: **the first frame is the whole picture** — the gesture a small motion of
a part, never an appearance from nothing — because the desktop Outlook shows only a GIF's first
frame. The developer exports a GIF under 1 MB and a PNG at 2× from the SVG; the manifest's `alt`
goes with them (`catalog.md › Letters`).

## What makes a picture look generated, and how to avoid it

- A rocket, an astronaut, a plant in a pot, a generic magnifying glass, a generic clipboard, three
  floating shapes around a thing: the stock vocabulary. Draw the product's own objects instead.
- Everything centred and symmetrical: let the subject sit a little off centre, the ground wider on
  one side, the second object overlapping the first.
- Gradients and glows for depth: use the three faces (`fill` lit, `soft` shaded, `deep` turned
  away) and one shadow (`muted`).
- The same blob in every picture: vary the ground's width and the subject's scale across the set.
- A motion that bounces or spins: one slow settle.
- Pastel everything: one strong accent, the rest quiet.
- A set that does not share a hand: the same stroke, the same angle, the same light, the same
  accent in every picture — look at the tab's grid as one thing before publishing.

## Presentable

The set is shown to win a customer and, through the product, that customer's clients. Passing
`check` is the floor; the bar is a picture someone would want to show. Hold every picture to it and
put this section in every builder's brief:

- **A focal point.** The eye lands on one thing first — the subject, lit, a little off centre, with
  the one accent on it or beside it. Nothing competes with it.
- **Balance and room.** The weight sits low and steady on its ground; the margins are generous; the
  second object overlaps or frames the first rather than floating beside it. Nothing cramped.
- **Life in the detail.** A few texture lines (stitching, a floor line, a reflection), a soft
  shadow, a glint — enough to feel crafted, never so much that it reads as noise at half size.
- **Warmth.** The product's world at its best: a tidy station, warm light, a moment the client
  looks forward to. Errors, empty and access states are gentle and inviting — the chair waiting,
  not a red cross; never alarming, never sad.
- **Refined lines.** Smooth curves with few points, consistent corner radii, consistent stroke ends;
  shapes that look drawn with care, not assembled from rectangles.
- **A family.** Looked at as a grid, the tab reads as one hand: the same scale of subject, the same
  light, the same accent dose. A picture heavier, busier or plainer than its neighbours is redrawn.
- **The test.** Before returning, a builder renders its pictures in both themes at full and half
  size and asks: would the customer put this on their own site? If not, it is not done.

