# Showcase — what every section contains

The content each section must have, in the order of the menu. A root section is one page whose parts
are the `sections` of its entry in `pages.mjs` — an element with that id, written with `block()` from
`tools/lib/html.mjs` so the menu can scroll to it. A root's `children` are pages of their own one
level down (the stack under Product, the pages of Design, the key screens, each flow); a child's own
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

### Security (`security/index.html`)
What keeps the customer's data safe, in the customer's words: the page a buyer's IT or a procurement
questionnaire asks for, answered ahead. Written by `tools/genSecurity.mjs` from `plans/security.md`:
a `block()` per part, each a few short paragraphs of what it means for them — the consequence, not the
mechanism — with one drawing on tokens where it helps. Every claim comes from the documentation and is
done, planned (the `ui.planned` tag) or not promised; no certification that was not obtained, no
figure that was not set.
- **Your data**: where it lives (the region; an installation per customer, or shared), who at the
  vendor can reach it and when, encrypted on the way and at rest, kept how long, taken out how (an
  export; deletion when they leave).
- **Who gets in**: accounts by invitation only, the roles and the scope each one sees, passwords and
  what they are checked against, the second step, single sign-on when it exists, sessions and devices,
  the letters that warn of a sign-in or a change.
- **Nothing is lost**: backups and how far back they reach, the restore, versioned files, what is
  never deleted once reported or locked, undo where the product has it.
- **Against attacks**: pauses and limits on sign-in and on requests, what every input and file is
  checked for, how dependencies and the platform are kept current, how secrets are kept, who watches
  and what happens when something is found.
- **Every change on record**: who did what and when, kept and unchangeable, open to the roles that
  need it and to an auditor; what a figure can be traced back to.
- **What is promised, and what is not yet**: the certifications and checks held or not (a penetration
  test, SOC 2, ISO 27001), what is planned and when, and whom to ask — the honest list in place of
  silence.

### Flows (`flows/index.html` + `flows/<flow>.html`)
Right after Security, in the first group: the product working, step by step, is the weightiest part
for the customer, so it is one click from the home page and comes before the design. The index: the
flows as tiles, sign-in first, each with its actor and goal — build.mjs writes them
from `children` in `pages.mjs`, in that order, the text of a tile being the flow's `desc`. Each
flow page: the hero (actor, start, end), then the player (`flowPlayer()`): one step at a time — the
screen drawn with the picked shell and the components, the controls the user acts on in that step
ringed and numbered in the order of acting, the note under it (what the user did, naming those
controls by their numbers, and what they see), the counter "Step n of N", the step's title, ← →,
*All steps*, *Full screen*. Alternative paths (an error, a cancel) are steps too, marked in the
note. A control on a screen may lead on (`data-go="step-n"`).

### Screens (`screens/index.html`)
Right after Flows, in the first group: the screens are the product in use too. Its one child page is
listed on it (`<div data-children>`); every screen is drawn in the shell picked on Layouts. Screens
stays a root while Key screens is still planned.

- **Key screens** (`screens/key.html`): the main screens of the product, each in the device frames
  of the surfaces its actors use. For each: who looks at it and when, what it is for, the screen
  filled with the sample data, and its empty state small beside it. Grouped by module or by actor
  as the documentation suggests.

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
- **Icons** (`design/icons.html`): two groups, and only these — *Base* — the standard icons the
  components and screens use, with the library's names; *From the domain* — the icons of the
  product's own subjects, drawn for it, each with the thing it stands for. Every icon at 16 px with its
  name as used in code and where it is used, in both themes; *Sizes and rules* — the grid, the stroke, 16 / 20 / 24; where an icon stands alone
  and where it needs a label; the icons that mean a status and must keep their shape.
- **States** (`design/states.html`): one section per state — **empty** (nothing yet; nothing
  matching), **loading** (skeletons; when a spinner), **error** (a page that did not load; a form
  that did not save), **access** (a door closed to a role; a session ended), **offline** (no
  connection; changes waiting — only when the product works offline; otherwise what a lost
  connection shows), **done**. Each: the picture (from Illustrations), the words (from the
  documentation, in the product's voice or plainly), the one action, where it appears in the
  product, drawn in place.

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
Every picture moves: a minimal animation of its own that tells its story — small, slow, calm, once
on coming into view and on replay, looping only where the picture is about waiting — and each
block has the *Moving* tag and a replay control; under reduced motion it rests on its last frame,
the complete still picture. Pictures are SVG symbols in
`assets/illustrations.js`, drawn only with `--ill-*` tokens, no text, no faces, so they need no
translation and follow the theme. Sizes: hero, welcome, spot.

### Layouts (`layouts/index.html`)
The frames every screen sits in, before any one screen: the customer recognises the product by its
first screen and its shell. The page: the selected variant of each layout large, side by side, then
the list of its pages (`<div data-children>`). **Pictures come first here**: a layout is where the
product's world meets the user, so its variants are told apart by their pictures — scenes from the
domain, drawn on `--ill-*` tokens, that move (a slow loop of the product's data or world: smoke
thinning over a plant, a meter turning, figures rising into a report) and stand still, complete,
under reduced motion. A scene is taken from Illustrations' *From the domain* where one fits; a new
one is drawn into `assets/illustrations.js` the same way and added to Illustrations' *In place*.
Under each variant: the idea of its picture in one line, what moves, and the still version.

- **Auth layout** (`layouts/signIn.html`): 3–5 variants, **every one with an animated scene**, each a
  different composition and a different idea of the product — the form beside a panel of the scene;
  the scene filling the screen with the form on a card over it; the scene as a band above a narrow
  form; the product's data moving behind glass. The form is the components' (email, password, sign
  in, forgotten password, where an invitation leads). Each variant: the full screen in a desktop
  device frame, the same on a phone frame (the scene shrinks to a band or a spot, never away), and
  the other screens before the product that share it — invitation accepted, forgotten password, a
  verification sent — small beside it. One `Selected`.
- **App layout** (`layouts/appLayout.html`): 2–4 variants of the shell — the sidebar folded and
  unfolded, grouped menus with their states (default, hover, current, with a badge), the top bar
  (page title, search, bell, language, theme, user menu), the page under them — around a page
  filled with the sample data. **Most variants carry the product's pictures where a user meets them
  first**: the welcome page of a new account (an animated scene and the first thing to do), a card
  at the foot of the sidebar (the setup's progress as a small scene), a header scene on the home
  page, the empty state inside the shell; one variant stays plain, so the customer sees the
  difference. Each on a desktop frame; the folding shown; how it behaves on a tablet and a phone (a
  drawer, a bottom bar) drawn where the surfaces call for it. One `Selected` — every later screen
  uses it.
- **Not found page** (`layouts/notFound.html`): 3–5 variants on their own full screen outside the
  shell: a picture from the product's world with one moving detail, the 404 worked into it, a
  sentence and the way back. One `Selected`.

### Email templates (`emails/index.html`)
A root of its own in Design, right after Layouts, made unless its section intake skips it; its name is Email templates
(in Ukrainian «Імейл-темплейти», never «Листи»), its key stays `emails`. The letters stand on
the one page, each a section of its own — its anchor is the letter's id, written with `block()` —
so the menu lists the *Template* and every letter, a click scrolls to it, and the menu marks the one
in view as it does for any root with sections. The page has two headings over the letters, *Common
letters* and *The product's own*, which are not menu items. `tools/genEmails.mjs` writes it, with
the Design group over its title.
- *Template* — the one layout every letter uses, drawn once with its parts named (brand header with
  the mark, picture, heading, message, action button, secondary detail, footer) and their sizes,
  and what a mail client changes: the pictures go out as images in the brand colors, a dark mail
  client may recolor the letter. The pictures move or stand still as the operator chose in the
  step: animated GIFs whose first frame is the complete still picture (old Outlook shows only that
  frame), played twice, on a solid plate, small, with alt text — or still PNGs; the Template says
  which, and the letter reads complete with images off.
- *Common letters* — invitation, verification code, password reset, welcome, digest, security
  alert; *The product's own* — what its flows send, each named after the moment it is sent.
  Each letter 600 px, in `mail()`, filled into the template: subject and sender as a mail client
  shows them; a picture of its own about that moment, in the product's colors and from its domain;
  one message in the product's voice, or plainly; one action button; the footer with why they received it.
  Light theme is the letter's own; the dark theme shows how a dark mail client renders it.
- The `sections` of its entry in `pages.mjs` are the Template, then one per letter in the order of
  the page — the common letters, then the product's own. A planned showcase starts with the Template
  and the common letters the skill always proposes; the Email templates step adds one section for
  each letter the operator approves (id, title, one line), so the menu grows with the list.

### Components (`components/index.html`)
One block per component, in the order of `pages.mjs`; the menu unfolds into the list. Each block:
what it is for and the one rule that matters; *Variants* with a table (variant, look in tokens, used
for); *States* (default, hover, focus, disabled, loading, error as applies); *Sizes*; *Properties* as
a table; its source in the product's code or `proposed`. Samples use the cast and data of
`sample.mjs`. The reserve components are marked *reserve* with one line of why they may be needed.

### Charts (`charts/index.html`)
A root of its own in Design, right after Components, and only when the product has figures; its key
is `charts`. It is **not a gallery of chart types**: it shows the *uses* of a chart in the product,
each as the product would show it — on the home screen, in a report, beside a target, in a card of
the shell — so the customer sees a figure in its place and not a chart in a vacuum.
- **Intro** (the top of the page, not a menu item): the library from the Technology step (SC-008)
  and how the site draws it (inline SVG on tokens); the colors from tokens — the categorical colors
  of the domain (scopes, categories), the sequential ramp, the feedback tones for a target, never
  hue alone (a label, a pattern or a marker beside every color); the rules of axes (units on the
  axis or in the title, a zero baseline for bars, tick counts), legend (direct labels where they
  fit), tooltip (what it shows, how it opens by keyboard); the empty and the loading state of a
  chart, in the product's words and the look of States; reduced motion (a chart that draws
  itself stands finished).
- **One section per use**, in the order of the plan; its anchor is the use's id, written with
  `block()`, and the menu lists it. Each section has: *who looks at it* (the role); *where it stands*
  (the screen or the card — drawn in the picked shell of App layout, or as the card on its own, at
  its real size); *the question it answers* in one line; *the chart* drawn with the sample data of
  `sample.mjs` in tokens, as inline SVG, light and dark; *its empty state* (no data yet, a period
  not yet reported); and *where it appears* — the flows and screens that show it, linked.
- The uses come from the documentation — the dashboards, reports, targets and comparisons of the
  blueprint or the requirements — and are approved as a plan first (`plans/charts.md`); a use the
  documentation does not support is an open point with a recommendation, not a section.
- The `sections` of the `charts` entry in `pages.mjs` are the approved uses, in the order of the
  page (`{ id, title, desc }`, the desc one line), with their `nav.charts.<use id>` keys in every
  dictionary; `tools/genCharts.mjs` writes the page.

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
