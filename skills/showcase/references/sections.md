# Showcase — what every section contains

The content each root section must have, in the order of the menu. Each is one page
(`<section>/index.html`) whose parts are the `sections` of its entry in `pages.mjs` — an element
with that id, written with `block()` from `tools/lib/html.mjs` so the menu can scroll to it.
Flows are pages of their own. "Variants" means several alternatives, one marked `Selected`.

## Product

### Overview (`index.html`)
The hero: the product in one paragraph and what this site is. The catalog (`<div data-catalog>`,
written by build.mjs). *Where this comes from*: a table of what was read and what each gave
(`SOURCES.md`). *How to read this site*: theme, menu, presentation, Selected marks, sample data.
Written by `tools/genOverview.mjs` in the Frame step and again in step 19.

### Principles
5–7 principles. Each: a name, one sentence, the reason (which goal or decision it serves), and a
*do / don't* pair drawn with the components — not described, shown.

### Logo
- **Side by side**: every mark at one size on light and on dark; then all of them at 28 px (the
  menu) and 16 px (a browser tab), where a weak mark shows.
- **One section per mark**: the idea behind it in one line; the mark large; where it comes from in
  the product. The picked one is `Selected`.
- **Sizes and spacing**: the picked mark at 16, 24, 32, 64, 128 px; its clear space; the
  backgrounds it may and may not sit on; the mark with the wordmark.
Every mark is SVG on a 64-unit grid, `currentColor` as the ink and `var(--lg-ground)` for
knockouts, so it follows the theme and the scheme.

### Sign-in layouts
3–5 variants, each a full screen in a desktop device frame: the form (email, password, sign in,
forgotten password, where an invitation leads) on one side, an animated panel on the other that
says what the product is — its data moving, its domain drawn, a promise. Under each: the idea of
the panel, what moves, what it looks like still (reduced motion). Then the picked layout on a
phone frame when a mobile surface exists. One `Selected`.

### App layout
2–4 variants of the shell: the sidebar folded and unfolded, grouped menus with their states
(default, hover, current, with a badge), the top bar (page title, search, bell, language, theme,
user menu), the page under them. Each on a desktop frame; the folding shown; how it behaves on a
tablet and a phone (a drawer, a bottom bar) described and drawn where the surfaces call for it.
One `Selected` — every later screen uses it.

### Key screens
The main screens of the product, each in the device frames of the surfaces its actors use. For
each: who looks at it and when, what it is for, the screen filled with the sample data, and its
empty state small beside it. Grouped by module or by actor as the documentation suggests.

### Flows (`flows/index.html` + `flows/<flow>.html`)
The index: the flows as tiles, sign-in first, each with its actor and goal — build.mjs writes them
from `children` in `pages.mjs`, in that order, the text of a tile being the flow's `desc`. Each
flow page: the hero
(actor, start, end), then the player (`flowPlayer()`): one step at a time — the screen drawn
with the picked shell and the components, the controls the user acts on in that step ringed and
numbered in the order of acting, the note under it (what the user did, naming those controls by
their numbers, and what they see),
the counter "Step n of N", the step's title, ← →, *All steps*, *Full screen*. Alternative paths
(an error, a cancel) are steps too, marked in the note. A control on a screen may lead on
(`data-go="step-n"`).

### Emails
- **Common letters**: invitation, verification code, password reset, welcome, digest, security
  alert.
- **The product's letters**: what its flows send, each named after the moment it is sent.
Each letter 600 px, in `mail()`: subject and sender as a mail client shows them; the brand header
with the mark; an illustration; one message in the voice of Microcopy; one action button; the
footer with why they received it. Light theme is the letter's own; the dark theme shows how a
dark mail client renders it.

## Design

### Illustrations
- **Side by side**: every picture at one size, titled by the situation it serves; moving ones
  marked, with a replay control.
- **In place**: each picture where it sits in the product — a panel, a page, a letter — at its
  real size.
Pictures are SVG symbols in `assets/illustrations.js`, drawn only with `--ill-*` tokens, no text,
no faces, so they need no translation and follow the theme. Sizes: hero, welcome, spot.

### States
One section per state — **empty** (nothing yet; nothing matching), **loading** (skeletons;
when a spinner), **error** (a page that did not load; a form that did not save), **access** (a
door closed to a role; a session ended), **offline** (no connection; changes waiting), **done**.
Each: the picture, the words (from Microcopy), the one action, where it appears in the product,
drawn in place.

### Not found page
3–5 variants on their own full screen outside the shell: a picture from the product's world
with one moving detail, the 404 worked into it, a sentence and the way back. One `Selected`.

### Charts
Only when the product has figures. The chart forms the product needs (by category, over time,
a share, a target line, a gauge), each in both themes, with the categorical colors, labelled
never by hue alone; the empty and loading states of a chart; the library decided in SC-008.

### Components
One block per component, in the order of `pages.mjs`. Each block: what it is for and the one
rule that matters; *Variants* with a table (variant, look in tokens, used for); *States* (default,
hover, focus, disabled, loading, error as applies); *Sizes*; *Properties* as a table; its source
in the product's code or `proposed`. Samples use the cast and data of `sample.mjs`. The reserve
components are marked *reserve* with one line of why they may be needed.

### Icons
- **The set**: every icon at 16 px with its name as used in code, in both themes.
- **Sizes and rules**: the grid, the stroke, 16 / 20 / 24; where an icon stands alone and where it
  needs a label; the icons that mean a status and must keep their shape.

### Foundations
- **Color scheme**: the brand color and its companions, the reason for them, the alternatives
  considered (a link to Decisions).
- **Colors**: swatches by group (surfaces, text, borders, brand, feedback, categories) with the
  live value; the *Compared with the product* list when the product has a token file; contrast
  rows for every text pair, both themes.
- **Typography**: the typefaces, the text styles with their classes and the utilities behind them.
- **Spacing**: the scale drawn; where each step is used.
- **Radius and shadows**: the radii on controls and cards; the elevations.
- **Motion**: durations and easings replayed on demand; what never moves; reduced motion.
- **Sizes**: controls, the shell, the form width.

### Microcopy and tone
- **Voice**: who speaks and how, in three lines; the words the product uses and avoids (from the
  glossary).
- **Buttons and links**, **Errors**, **Empty states**, **Confirmations**, **Notifications and
  emails**: the pattern, a *do / don't* pair, the cases.
- **Languages**: the same messages in every interface language, side by side, in a table — the
  source of the dictionaries.

## Project

### Technology
- **Architecture**: one SVG on tokens — the clients per platform, the backend, the data, the
  external services, named arrows; presentable, not a wiring diagram.
- **The stack**: a card per technology — its mark (a local SVG), its name and version where
  known, one line of what it is for, which part of the picture it is.
- **One request**: the path of one user action through the parts, numbered.

### Decisions
One card per `SC-nnn` from `DECISIONS.md`: the topic, the options as thumbnails where they are
visual (marks, layouts, schemes) or lines where not, the chosen one marked, the reason, the date;
the blueprint `D-` id when one applies.

### Changelog
Newest first: date, the sections touched, what changed, in one or two lines each.

### Next steps
- **Queue**: what this site gets next, in order: planned sections, deferred flows, reserve
  components, open questions.
- **Ideas**: proposals for the product beyond the documentation — each a title, a paragraph of
  what and why, and where the idea came from (a competitor, a flow's dead end, a state that had
  nothing to say).
