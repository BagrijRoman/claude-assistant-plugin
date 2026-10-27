# showcase

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/showcase [init [dir] \| continue \| status \| section <id> \| flow <id> \| pick <section> <variant> \| add \| audit \| open]` | a human only (`disable-model-invocation`) | [bin/showcase.mjs](../../bin/showcase.mjs) `check` for the audit; the site's own `build.mjs`, `open.mjs`, `tools/genPages.mjs` ship in the template — see [The script](#the-script) | 0.9.0 |

Files: [skills/showcase/SKILL.md](../../skills/showcase/SKILL.md) (the entry point),
[references/phases.md](../../skills/showcase/references/phases.md) (the procedure per step),
[references/sections.md](../../skills/showcase/references/sections.md) (what every section
contains), [references/site.md](../../skills/showcase/references/site.md) (how the frame works),
[skills/showcase/templates/](../../skills/showcase/templates/) (the frame and the site files).

## Why

A customer cannot picture a product from a requirements document, and a team cannot build one
from a mood board. The same static site answers both: the customer sees their product — its mark,
its first screen, its shell, its flows step by step, its emails — before a line of it exists; the
team gets what every screen is drawn with — the color scheme and tokens, the components with
their states, the icons, the stack — and a page that says what was decided and why.

The author has made this site for several products by hand; the frame (menu, theme switch,
in-place navigation, live token values) was rebuilt each time and the procedure lived in memory.
The skill keeps the frame as a template, adds what the hand-made sites grew towards (interface
languages, a step player for flows, presentation mode, variants with a pick), and writes the
procedure down: which sections, in which order of making, with the operator deciding at every
fork. It is a skill because nothing in it is mechanical enough for a hook; it ships with code
because the frame is.

## What it does

### Modes

`$ARGUMENTS` picks the mode; with no argument the skill continues the showcase it finds or starts
one.

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when a showcase exists, `init` when none does |
| `init [dir]` | choose the folder, read the documentation, decide languages, color scheme and stack, lay the frame, then the sections in order |
| `continue` | resume the step in `STATE.json` |
| `status` | steps and their state, flows and their stage, picks made; change nothing |
| `section <id>` | make or remake one root section |
| `flow <id>` / `flow new` | make or remake one flow; add one through the two approvals |
| `pick <section> <variant>` | record the operator's choice among variants |
| `add` | a page or section outside the standard list |
| `audit` | the checks on both themes and every language |
| `open` | serve the site locally |

### Input and output

The skill reads **the whole documentation folder** (`docs/` by default) through subagents — a
blueprint when there is one, requirements, feature files, earlier design work — and the product's
code when it exists (a token file, a component library). It writes into `docs/showcase/` by
default, proposed in a dialog with alternatives; a non-empty folder is never used without
confirmation. Whatever folder is chosen, it is the skill's working folder, and writes stay in it:
nothing is created outside it, not even for a moment — not in the project root, `docs/` above it,
`/tmp` or the session's scratchpad. The one passing file, the Color scheme step's `scheme.html`, is
removed by `build.mjs` once `STATE.json` records the scheme chosen, so the skill needs no `rm`.

```
docs/showcase/
├── site.mjs · pages.mjs · build.mjs · open.mjs       settings, the menu, the build, the server
├── tokens.css · base.css · components.css            every value; the type scale; the components
├── sample.mjs · i18n/<lang>.js                       the fictional company and cast; dictionaries
├── tools/lib/html.mjs · tools/gen*.mjs · tools/parts/ the page shell; one generator per heavy page or flow; a page's pieces
├── assets/ · assets/tech/                            the frame: showcase.css/js, site.css, nav.js, i18n.js, flow.js, favicon.svg (written by the build); the stack's official marks
├── index.html · <root>/index.html · <root>/<child>.html  the Product page; one page per root section; one per child page (stack, design pages, key screens, flows)
├── plans/                                            the approved plans and flow descriptions
└── STATE.json · DECISIONS.md · CHANGELOG.md · SOURCES.md · README.md
```

### The site

The menu shows the project's name, then the root sections and nothing above them — no band labels,
a gap between groups. Every root folds, one open at a time; under it are its sections (anchors on
its page, the one on screen marked) and its child pages one level down. The order is the order of a
customer's attention:

| Group | Root sections, with what unfolds under each |
|-------|---------------------------------------------|
| Product | **Product**, the home page (what it is · who uses it · modules · how it works · sample company · about this site; child page **Technology stack**: each technology with its official mark, one line and a link to its site) · **Architecture** (diagrams for the customer: the system in its world · its parts · modules · how data moves · where it runs · one request) · **Security** (in the customer's words, every claim from the documentation and marked done or planned: your data · who gets in · nothing is lost · against attacks · every change on record · what is promised, and what is not yet) · **Flows** (a page per flow with the step player — right after Security, since the product working step by step is the weightiest part for the customer) · **Screens** (child page: Key screens — right after Flows) |
| Design | **Design** (child pages: Principles · Colors · Typography · Spacing and layout · Radius and shadows · Motion · Logo · Loaders · Icons · States) · **Illustrations** (for states · from the domain · in place · reserve) · **Layouts** (Auth layout · App layout · Not found page — the variants led by animated pictures of the domain) · **Email templates** (a root of its own right after Layouts: the Template, then one item per letter — the common letters, then the product's own; a click scrolls to the letter and the menu marks the one in view) · **Components** (one item per component) · **Charts** (a root of its own right after Components, only when the product has figures: one section per use of a chart in the product, each drawn where the product shows it — not a gallery of chart types) |
| Project | Decisions · Changelog · Next steps |

The names are the team's words in every language: in Ukrainian Layouts is «Лейаути» and Email
templates «Імейл-темплейти», never «Макети» or «Листи».

On every page: a theme switch (light · dark · system) that the whole site follows, hex codes and
contrast ratios included; a language switch when the operator named more than one interface
language; presentation mode (**P** or `?present=1`); `prefers-reduced-motion` honoured.

### The order of making

Dependencies, not the menu, decide it; each step starts with its section intake and ends with a
gate where the operator looks at the site and approves: **Intake** (the reading, languages, name, the sample company and cast) →
**Color scheme** (confirmed from the design, or three proposals shown side by side on mini-UI
before anything is drawn) → **Technology** (a dialog per layer) → **Frame** (the folder
scaffolded, tokens from the scheme, the Product page from the reading and the Technology stack
page with the official marks, a starting page for every other section — the site opens) → Foundations → Logo (and the Loaders made from the picked mark) → Components (their words, and those of every later
step, from the documentation and the sample world, each translated into every dictionary as it is
written) → Icons (two groups only: the base
standard icons the components and screens use, and the icons of the product's domain) → Illustrations
→ States → **Layouts** (Auth layout → App layout → Not found page) → Key screens → **Flows** → Email templates → Charts →
**Architecture** → **Security** (one line per claim from what the documentation decided, then a page in
the customer's words — the consequence, not the mechanism — that says what is not promised yet) →
Principles, Decisions, Changelog, Next steps → **Audit**.

### How it decides with the operator

Before every section is made (steps 1–19) the skill asks whether it is wanted: **full**,
**simplified** (a reduced scope per section, written in `phases.md › Section intake` — one mark
instead of twelve, the components the screens use instead of the whole set, one diagram instead of
six) or **skipped** (planned in the menu, a later step draws what it needs in place), and what to take
into account; the wishes go word for word into the step's plan and every builder's brief. Color
scheme, Technology and Frame can be simplified but not skipped. There is no depth question at
Intake any more. A design found in the documentation — a design-system page from Figma, tokens,
drawn screens, icons, a logo — is the baseline the showcase follows.

Every fork is a question with the skill's recommendation first and the operator's own answer
always possible; every answer is a row in `DECISIONS.md` and a card on the Decisions page. A
section that is a set of things — marks, cases, components, screens, flows, letters — is first a
plan the operator edits, then built; the approved plan is kept in `plans/`, so a session that ends
between the approval and the build loses nothing. Flows take two approvals: the list, then each
flow's description (actor, start, steps, end, alternative paths) before its screens are drawn. Logo,
sign-in layouts, app layout and the not-found page are made as variants; `pick` marks the chosen
one `Selected` and keeps the others as alternatives for the Decisions page.

### Tokens

A showcase is twenty-one steps with a gate each, and every turn sends the whole context again; a step built
on top of the ones before pays for their readings, plans, builders' replies and generated pages, none of
which it reads. So the skill cuts only what the next step does not use:

- **A fresh context for every step.** After a gate is approved the skill stops and recommends
  `/clear`, then `/showcase`, and says why — what the conversation carries that the next step does not
  read, that nothing is lost, and why not `/compact`; the [skill-resume](../hooks/skillResume.md) hook
  tells the new session where the showcase stands, and `continue` reads `STATE.json`, the step's section and what it names — its plan,
  `SOURCES.md` when it plans from the reading — never the pages already built. The operator may go on
  in the same context instead.
- **Builders on Sonnet where the plan decides.** The readers of Intake and the builders of components,
  icons, states, key screens, flows, emails, charts, the architecture and the security page work from an approved plan
  and the conventions of `site.md`, and every result is looked at before the gate, so they run on
  Sonnet. The marks of the Logo, the pictures of Illustrations and the variants of the sign-in layouts,
  the app layout and the not-found page — what the customer chooses between — stay on the session's
  model.
- **The audit's mechanical checks are a script.** `check` reads the site once and lists what is wrong;
  the model no longer greps it and diffs the dictionaries by hand.

### What the frame gives for free

In-place navigation between pages without reloading the menu, the stylesheets re-read at each move so a
page opened after an edit to them is drawn with it; the tab's icon drawn from the picked mark (a letter
on the brand tile until one is picked) in the brand color of the light and the dark theme; a menu that
keeps one root section open at a time and keeps keyboard focus in it, and on a narrow screen a drawer the Tab key skips
while it is closed; scroll-spy on long pages; breadcrumbs that name the section on screen; previous
/ next and ← → keys; live token values and WCAG contrast rows that follow the theme, whatever CSS
color form a token is written in; the flow player (step counter, title, ← →, all steps, full screen,
`data-go` links between screens, and the controls a step uses ringed and numbered with the highlight
walking through them in order, so a viewer sees what the user does — a Hints switch turns it off);
the Flows index kept in step with `pages.mjs`; device frames per
surface; the 600 px letter frame; the language switch and dictionaries, with the frame's own words
in them too; presentation mode; a build that writes the navigation into every page, refuses two
entries with one i18n key, and changes nothing when run twice.

## Progress

The skill shows where it is at every step: a checklist of the mode's stages when it starts, at every
gate and at the end; a line `▸ /<command> · <n>/<N> <stage> · <step>` at every change; what it waits for
and how many; and, on `continue` or `status`, the checklist rebuilt from its state first
([rule 8](README.md#rules-every-skill-follows)). The stages per mode, as its `SKILL.md` lists them:

| Mode | Stages |
|------|--------|
| `init [dir]`, `continue` | Intake → Color scheme → Technology → Frame → Foundations → Logo → Components → Icons → Illustrations → States → Auth layout → App layout → Not found page → Key screens → Flows → Email templates → Charts → Architecture → Security → Principles, Decisions, Changelog, Next steps → Audit |
| `status` | Read the state → Report |
| `section <id>` | Section intake → Plan → Approval → Build → Gate |
| `flow <id>` | Description → Approval → Build → Gate |
| `flow new` | List → Description → Approval → Build → Gate |
| `pick <section> <variant>` | Check the variant → Mark it → Decisions → Build |
| `add` | What and where → Page → Build |
| `audit` | Checks per theme and language → Fixes → Final gate |
| `open` | Build → Serve → The address |

## What it will not do

- Write a color, font, radius or duration anywhere but `tokens.css`; draw a logo or a picture in
  anything but tokens and `currentColor`. The one exception: a technology's official mark, a file in
  `assets/tech/` in its owner's colors.
- Write a heavy page by hand instead of through a generator.
- Choose the scheme, the stack, a mark, a layout or a flow for the operator.
- Load anything from the network when the site is viewed, except web fonts with a local fallback.
- Invent what the product does: a gap in the documentation is a question or a Next steps entry.
- Skip a gate, or draw a flow whose description was not approved.

## The script

The template ships the site's own code — `build.mjs` (navigation and the tab's icon, idempotent), `open.mjs` (the
server), `tools/genPages.mjs` (starting pages), `tools/fetchTechMarks.mjs` (the stack's official marks
from Simple Icons, or a project's own site, into `assets/tech/` with `marks.json`), `tools/genProduct.mjs` and
`tools/genStack.mjs` (the Product page and the stack: the rendering fixed, the content filled per project),
`tools/lib/html.mjs` (the page shell and blocks) —
which the skill runs with `node` inside the showcase folder.

[bin/showcase.mjs](../../bin/showcase.mjs) `check <dir>` runs the rows of the audit that need no eyes,
so that the model reads one list of findings instead of grepping the site and diffing dictionaries by
hand (T31 in [TASKS.md](../TASKS.md)):

| Check | Reported |
|-------|----------|
| every page `pages.mjs` gives a path, children included, is a file | `error: design/icons.html — pages.mjs gives page "icons" this path, and there is no such file …` |
| the build is idempotent: `node build.mjs` twice, the second reporting the navigation up to date (the first may rewrite it, as the gate's build would) | `error: build.mjs — a second run still rewrites: …` |
| no hex color in a `.css`, `.html` or `.js` file but `tokens.css` — anchors, entities, `url(#…)` and lines marked `allow-hex` are not colors; no `font-family` that is not a `var(--font…)`; no radius in px on a page | `error: components/index.html:42 — the color #ff0000 is a raw value; use a token from tokens.css` |
| the dark set under `prefers-color-scheme: dark` and the one under `[data-theme='dark']` declare the same tokens with the same values | `error: tokens.css:181 — --color-danger is #ff0000 under [data-theme='dark'] but #f87171 in the media-query set` |
| every language of `site.mjs` but the default has `i18n/<lang>.js`, holding every `data-i18n` and `data-i18n-attr` key of every page | `error: i18n/uk.js — no "nav.design.icons", which design/icons.html:12 uses` |
| a dictionary key no page, script or generator names | `warning: i18n/uk.js:58 — "old.unused" is used by no page or script — remove it, or keep it knowingly` |

Errors exit 1, warnings do not; a missing or foreign `STATE.json` stops it (exit 1); usage errors exit 2.
`scaffold` (the copy with placeholders filled) and `screenshots` (Playwright, every page × theme) are
still to come (T19).

## Limitations

- **Guidance plus a template, not enforcement.** The frame is tested code; the content is prose
  the model follows. A hand edit to a generated page is lost on the next generator run — the
  README of the site says so.
- **Long.** A full showcase is twenty-one steps with a gate each; it spans sessions. `continue`
  resumes from `STATE.json`.
- **Illustrations and animated panels are where the model's taste shows.** Variants and picks
  exist so the operator chooses between drawn things rather than from descriptions; expect to
  reject some.
- **Translations are generated.** Each one is written into the dictionaries with the text it
  translates, in the product's voice or plainly; `i18n/<lang>.js` is the place to correct them.
- **Technology marks must be files in the folder.** `fetchTechMarks.mjs` takes them from Simple Icons
  (CC0 files of trademarked marks) once, with the network; a technology Simple Icons lacks needs a URL
  from its own site, or its card shows the initials on a tile.
- **Charts** are static SVG by default; live tooltips need a vendored library, decided
  explicitly. They are a root of their own after Components, one section per use in the product
  (on the home screen, in a report, beside a target), planned and approved first — never a gallery
  of chart types.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows.
- [tests/showcaseFrame.test.mjs](../../tests/showcaseFrame.test.mjs) — runs the Product and stack generators on a fresh scaffold; scaffolds the frame as the
  skill does, with one flow added, and checks genPages and the build: a starting page for every
  entry with a path, the navigation written and a second build changing nothing, every foldable root
  carrying the shared `name` with at most one open, no band label in the menu and a gap between the
  groups, the root of the page on show open (the Product root on the home page, Design on a design
  page), a root's child pages listed on its page with the flow player only on flows, a flow's root
  open with its title marked, the language switch and the dictionary
  wired in, a second genPages run writing nothing, a flow keyed apart from the root section with its
  id. A second scaffold has no flow at first, as the Frame step leaves it: the Flows index says it
  is being prepared, lists the flow after it is added and the build runs, and a `pages.mjs` with two
  entries on one key stops the build. The template's `pages.mjs` has Flows and then Screens in the first group right after Security — the
  menu lists them before Design and their index pages are headed by that group — no group *The
  product in use*, and Email templates (`emails`) in Design right after Layouts, with the Template
  and the common letters as its sections and no children, Screens holds Key screens only, and Charts (`charts`) is a planned root right after Components with no child under Design; the menu lists the Template and each letter as a link to its anchor, and the page
  is laid with a block per section. The tab's icon: the build writes `assets/favicon.svg` and every
  page's head links it with its folder's prefix; a letter mark gives a brand tile with the letter (escaped,
  the name's first when the mark is empty or a placeholder); a picked mark is written as it is, in the
  brand color of both themes, with the ground of each theme for its knockouts and no namespace twice;
  a token that names another is followed, a missing, empty or placeholder one is left out — never
  "undefined" — and so is a missing `tokens.css`; a mention of dark in a comment is not the dark set;
  an unchanged icon is not written again. `nav.js` is held to parsing and to what the in-place move
  promises (the site's own stylesheets read uncached at load and at each swap, a changed one loaded
  beside the old, which leaves on load) — there is no DOM in the suite to run it.
- The frame was smoke-tested by hand: a scaffold with two languages, `genPages` for 19 pages,
  `build.mjs` idempotent, and a Playwright pass over the menu, the language and theme switches,
  presentation mode and the scroll-spy with no console errors. A second Playwright pass, in the
  review of 2026-10-09, checked what the first missed and was fixed: presentation mode filling
  the window, the "not drawn yet" note of `data-go="end"`, the breadcrumb and a flow's step title
  across a language round trip, markup kept in translated text, live values for `oklch()` and
  `color-mix()` tokens, the closed narrow drawer out of the Tab order, a malformed address not
  stopping the server. A third pass checked the step highlights: rings and numbers on the step on
  show, the walk 1 → 2 → 3 and the pause, the marks in the note, Hints off and kept after a reload,
  a highlighted `data-go` button leading on, *All steps*, reduced motion still, a swap away and
  back.
- [tests/showcase.test.mjs](../../tests/showcase.test.mjs) — `check` on the site the Frame step lays,
  with a complete second dictionary: clean, then broken once per check — a page gone, a raw color, font
  and radius (and the anchors, entities and marked lines that are not), dark sets that disagree both
  ways, a key missing and one unused, a dictionary missing, a build that keeps rewriting — and a folder
  that is not a showcase. The scaffold is shared with the frame's tests
  ([tests/showcaseFixture.mjs](../../tests/showcaseFixture.mjs)).
