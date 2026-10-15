# Showcase — what every section contains

The content each section must have, in the order of the menu. A root section is one page whose parts
are the `sections` of its entry in `pages.mjs` — an element with that id, written with `block()` from
`tools/lib/html.mjs` so the menu can scroll to it. A root's `children` are pages of their own one
level down (the stack under Product, the pages of Design, the screens, each flow); a child's own
`sections` are anchors on its page. "Variants" means several alternatives, one marked `Selected`.

## Product

### Product (`index.html`, the home page)
What the customer reads first: the product, not the site. Written by `tools/genProduct.mjs` in the
Frame step from `SOURCES.md` and `sample.mjs`, and again in step 19.
- **What it is**: the product in one paragraph — what it does, for whom, the problem it solves — and
  three or four promises it keeps (from the brief's goals), each a short line with an icon.
- **Who uses it**: one card per role — the role, one line of what they do, where (web, phone, a
  link in a letter), the sample person who plays it.
- **Modules**: one tile per module of the product, a line each, the ones of the first release
  marked; a module planned for later says so.
- **How it works**: the product's main loop drawn as numbered steps on tokens (set up → collect →
  calculate → review → report, as the product has it), each with one sentence.
- **Sample company**: the fictional company of `sample.mjs` — what it is, its structure, its people
  — so every sample on the site reads as one story.
- **About this site**: the catalog (`<div data-catalog>`, written by build.mjs); *Where this comes
  from*, the table of what was read and what each gave (`SOURCES.md`); *How to read this site*:
  theme, menu, presentation, Selected marks, sample data.
- Then the list of its child pages (`<div data-children>`), the Technology stack.

### Technology stack (`product/stack.html`, under Product)
The stack as the customer should see it: recognisable and short. One section per layer the stack
has (clients, server, data and files, services, hosting and delivery, quality — the sections in
`pages.mjs`, fitted to the project). Each technology a card: its **official mark** (a file in
`assets/tech/` from `tools/fetchTechMarks.mjs`, `<img class="tech-mark">`, with `tech-mark--mono`
when marks.json says `mono`; a technology without a mark shows its initials on a
`tech-mark--initials` tile), its name and the version where known, **one line** of what it does in
this product, and a link to its **official site** (`target="_blank" rel="noopener"`, the text keyed
`ui.officialSite`). Above the layers, one sentence of why this stack (SC-003). No configuration, no
code: what each is for.

### Architecture (`architecture/index.html`)
How the product is put together, drawn for a customer who is not an engineer. Every diagram is an
inline SVG on tokens, readable in both themes, with a legend and two or three sentences beside it;
boxes carry the mark of the technology they stand for (`assets/tech/`); arrows are named by what they
carry. Not a wiring diagram — what a customer can follow in a minute.
- **The system in its world**: the product in the middle, the people who use it (each role) and the
  systems around it (mail, storage, AI, the authorities or frameworks it reports to).
- **Its parts**: the applications and stores — web client, API, jobs, database, file store,
  external services — and how they talk.
- **Modules**: the modules of the product and what each depends on, the first release marked.
- **How data moves**: from the first entry to the reported figure, through the steps the product
  has (entry → calculation → review → lock → report), with where each is stored.
- **Where it runs**: the installation — hosting, regions, what runs where, what is backed up.
- **One request**: one user action through the parts, numbered step by step.

## Design

### Design (`design/index.html`)
The system in one screen — the brand color and its companions, the typefaces, a button, a card, a
status — then the list of its pages (`<div data-children>`). Its child pages, each its own page:

- **Principles** (`design/principles.html`): 5–7 principles. Each: a name, one sentence, the reason
  (which goal or decision it serves), and a *do / don't* pair drawn with the components.
- **Colors** (`design/colors.html`): *Color scheme* — the brand color and its companions, the
  reason, the alternatives considered (a link to Decisions); *Palette* — swatches by group
  (surfaces, text, borders, brand, feedback) with the live value, and the *Compared with the
  product* list when the product has a token file; *Categories* — the categorical colors of the
  domain, named; *Contrast* — rows for every text pair, both themes.
- **Typography** (`design/typography.html`): the typefaces with their weights and scripts; the text
  styles with their classes and the utilities behind them.
- **Spacing and layout** (`design/spacing.html`): the scale drawn and where each step is used; the
  grid and the breakpoints; the sizes of controls, the shell, the form width.
- **Radius and shadows** (`design/shape.html`): the radii on controls and cards; the elevations.
- **Motion** (`design/motion.html`): durations and easings replayed on demand; what never moves;
  reduced motion.
- **Logo** (`design/logo.html`):
  - **Side by side**: every mark at one size on light and on dark; then all of them at 28 px (the
    menu) and 16 px (a browser tab), where a weak mark shows.
  - **One section per mark**: the idea behind it in one line; the mark large; where it comes from
    in the product. The picked one is `Selected`.
  - **Sizes and spacing**: the picked mark at 16, 24, 32, 64, 128 px; its clear space; the
    backgrounds it may and may not sit on; the mark with the wordmark.
  Every mark is SVG on a 64-unit grid, `currentColor` as the ink and `var(--lg-ground)` for
  knockouts, so it follows the theme and the scheme.
- **Loaders** (`design/loaders.html`), made once the logo is picked — the picked mark in motion, so
  that waiting looks like the product:
  - **While it waits**: 3–5 loaders, each at 64, 32 and 16 px with its class (`ld--<id>`) and what it
    is for. A loader is the mark's own SVG with each part (a core, a ring, a stroke) in a group
    `.ld__part` that the animation turns, fades, scales or draws — never a new drawing. One of them
    reads at 16 px, for buttons, fields and rows.
  - **When the share is known**: the determinate form — a part of the mark fills as the work goes
    (0, a third, two thirds, done), with the figure beside it.
  - **Where they stand**: each loader in place — a button at work with its label (`Calculating…`),
    a panel loading, a long wait with how long it may take, an import with its share, the
    application starting on the brand color — in the product's words and the sample company.
  - **Rules**: not at once (only after a short delay, so a quick answer never flashes it); in place
    of what is coming; with words beside it past 16 px; still under reduced motion; the words in a
    `role="status"` region.
  Every animation runs on `--duration-loader` and ends on the mark at rest, so under reduced motion
  (site.css stops every animation at its end) a loader is the still mark beside its words.
- **Icons** (`design/icons.html`): *The set* — every icon at 16 px with its name as used in code, in
  both themes; *Sizes and rules* — the grid, the stroke, 16 / 20 / 24; where an icon stands alone
  and where it needs a label; the icons that mean a status and must keep their shape.
- **Microcopy and tone** (`design/microcopy.html`): *Voice* — who speaks and how, in three lines;
  the words the product uses and avoids (from the glossary). *Buttons and links*, *Errors*, *Empty
  states*, *Confirmations*, *Notifications and emails* — the pattern, a *do / don't* pair, the
  cases. *Languages* — the same messages in every interface language, side by side, in a table: the
  source of the dictionaries.
- **States** (`design/states.html`): one section per state — **empty** (nothing yet; nothing
  matching), **loading** (skeletons; when a spinner), **error** (a page that did not load; a form
  that did not save), **access** (a door closed to a role; a session ended), **offline** (no
  connection; changes waiting — only when the product works offline; otherwise what a lost
  connection shows), **done**. Each: the picture (from Illustrations), the words (from Microcopy),
  the one action, where it appears in the product, drawn in place.
- **Charts** (`design/charts.html`, only when the product has figures): the chart forms the product
  needs (by category, over time, a share, a target line, a gauge), each in both themes, with the
  categorical colors, labelled never by hue alone; the empty and loading states of a chart; the
  library decided in SC-008.

### Illustrations (`illustrations/index.html`)
A root section of its own: the pictures are what makes the product feel like itself.
- **For states**: a picture for every state a screen can be in — empty, nothing found, error, no
  access, locked or closed (a period, an account), offline or no connection, done — titled by the
  state, with where it is used.
- **From the domain**: scenes from the product's world, from the reading — its places, objects and
  moments (for a carbon product: a plant and its smoke, a bill, a scale weighing tonnes, a report
  ready, a target reached) — each titled by the place it will sit (onboarding, a sign-in panel, a
  letter, an announcement, the 404).
- **In place**: each picture where it sits in the product — a panel, a page, a letter — at its real
  size.
- **Reserve**: pictures ready for situations the product will meet later, with one line of when.
Moving ones are marked, with a replay control. Pictures are SVG symbols in
`assets/illustrations.js`, drawn only with `--ill-*` tokens, no text, no faces, so they need no
translation and follow the theme. Sizes: hero, welcome, spot.

### Components (`components/index.html`)
One block per component, in the order of `pages.mjs`; the menu unfolds into the list. Each block:
what it is for and the one rule that matters; *Variants* with a table (variant, look in tokens, used
for); *States* (default, hover, focus, disabled, loading, error as applies); *Sizes*; *Properties* as
a table; its source in the product's code or `proposed`. Samples use the cast and data of
`sample.mjs`. The reserve components are marked *reserve* with one line of why they may be needed.

## The product in use

### Screens (`screens/index.html`)
The list of its pages (`<div data-children>`), each its own page:

- **Sign-in layouts** (`screens/signIn.html`): 3–5 variants, each a full screen in a desktop device
  frame: the form (email, password, sign in, forgotten password, where an invitation leads) on one
  side, an animated panel on the other that says what the product is — its data moving, its domain
  drawn, a promise. Under each: the idea of the panel, what moves, what it looks like still (reduced
  motion). Then the picked layout on a phone frame when a mobile surface exists. One `Selected`.
- **App layout** (`screens/appLayout.html`): 2–4 variants of the shell: the sidebar folded and
  unfolded, grouped menus with their states (default, hover, current, with a badge), the top bar
  (page title, search, bell, language, theme, user menu), the page under them. Each on a desktop
  frame; the folding shown; how it behaves on a tablet and a phone (a drawer, a bottom bar)
  described and drawn where the surfaces call for it. One `Selected` — every later screen uses it.
- **Key screens** (`screens/key.html`): the main screens of the product, each in the device frames
  of the surfaces its actors use. For each: who looks at it and when, what it is for, the screen
  filled with the sample data, and its empty state small beside it. Grouped by module or by actor
  as the documentation suggests.
- **Emails** (`screens/emails.html`): *Common letters* — invitation, verification code, password
  reset, welcome, digest, security alert; *The product's letters* — what its flows send, each named
  after the moment it is sent. Each letter 600 px, in `mail()`: subject and sender as a mail client
  shows them; the brand header with the mark; an illustration; one message in the voice of
  Microcopy; one action button; the footer with why they received it. Light theme is the letter's
  own; the dark theme shows how a dark mail client renders it.
- **Not found page** (`screens/notFound.html`): 3–5 variants on their own full screen outside the
  shell: a picture from the product's world with one moving detail, the 404 worked into it, a
  sentence and the way back. One `Selected`.

### Flows (`flows/index.html` + `flows/<flow>.html`)
The index: the flows as tiles, sign-in first, each with its actor and goal — build.mjs writes them
from `children` in `pages.mjs`, in that order, the text of a tile being the flow's `desc`. Each
flow page: the hero (actor, start, end), then the player (`flowPlayer()`): one step at a time — the
screen drawn with the picked shell and the components, the controls the user acts on in that step
ringed and numbered in the order of acting, the note under it (what the user did, naming those
controls by their numbers, and what they see), the counter "Step n of N", the step's title, ← →,
*All steps*, *Full screen*. Alternative paths (an error, a cancel) are steps too, marked in the
note. A control on a screen may lead on (`data-go="step-n"`).

## Project

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
