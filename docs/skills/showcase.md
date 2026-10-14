# showcase

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/showcase [init [dir] \| continue \| status \| section <id> \| flow <id> \| pick <section> <variant> \| add \| audit \| open]` | a human only (`disable-model-invocation`) | none in `bin/` yet; the site's own `build.mjs`, `open.mjs`, `tools/genPages.mjs` ship in the template — see [The script](#the-script) | 0.9.0 |

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
their states, the icons, the words, the stack — and a page that says what was decided and why.

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
├── assets/                                           the frame: showcase.css/js, site.css, nav.js, i18n.js, flow.js
├── <section>/index.html · flows/<flow>.html          one page per root section; one per flow
├── plans/                                            the approved plans and flow descriptions
└── STATE.json · DECISIONS.md · CHANGELOG.md · SOURCES.md · README.md
```

### The site

The menu shows the project's name, then bands that do not fold — **Product**, **Design**,
**Project** — each holding root sections that do. A root section is one long page; its items
scroll to its parts and the menu marks the one on screen. Flows are pages of their own with a
step player. The order is the order of a customer's attention:

| Band | Sections |
|------|----------|
| Product | Overview · Principles · Logo · Sign-in layouts · App layout · Key screens · Flows · Emails |
| Design | Illustrations · States · Not found page · Charts (when the product has figures) · Components · Icons · Foundations · Microcopy and tone |
| Project | Technology · Decisions · Changelog · Next steps |

On every page: a theme switch (light · dark · system) that the whole site follows, hex codes and
contrast ratios included; a language switch when the operator named more than one interface
language; presentation mode (**P** or `?present=1`); `prefers-reduced-motion` honoured.

### The order of making

Dependencies, not the menu, decide it; each step ends with a gate where the operator looks at the
site and approves: **Intake** (the reading, languages, name, the sample company and cast) →
**Color scheme** (confirmed from the design, or three proposals shown side by side on mini-UI
before anything is drawn) → **Technology** (a dialog per layer) → **Frame** (the folder
scaffolded, tokens from the scheme, the overview, a starting page for every section — the site
opens) → Foundations → Logo → **Microcopy and tone** (the source of every string that follows, in
every language, so before the first step that writes words) → Components → Icons → Illustrations
→ States → Sign-in layouts → App layout → Key screens → **Flows** → Emails → Not found → Charts →
Technology page → Principles, Decisions, Changelog, Next steps → **Audit**.

### How it decides with the operator

Every fork is a question with the skill's recommendation first and the operator's own answer
always possible; every answer is a row in `DECISIONS.md` and a card on the Decisions page. A
section that is a set of things — marks, cases, components, screens, flows, letters — is first a
plan the operator edits, then built; the approved plan is kept in `plans/`, so a session that ends
between the approval and the build loses nothing. Flows take two approvals: the list, then each
flow's description (actor, start, steps, end, alternative paths) before its screens are drawn. Logo,
sign-in layouts, app layout and the not-found page are made as variants; `pick` marks the chosen
one `Selected` and keeps the others as alternatives for the Decisions page.

### What the frame gives for free

In-place navigation between pages without reloading the menu; a menu that keeps one root section
open at a time and keeps keyboard focus in it, and on a narrow screen a drawer the Tab key skips
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
| `init [dir]`, `continue` | Intake → Color scheme → Technology → Frame → Foundations → Logo → Microcopy and tone → Components → Icons → Illustrations → States → Sign-in layouts → App layout → Key screens → Flows → Emails → Not found page → Charts → Technology page → Principles, Decisions, Changelog, Next steps → Audit |
| `status` | Read the state → Report |
| `section <id>` | Plan → Approval → Build → Gate |
| `flow <id>` | Description → Approval → Build → Gate |
| `flow new` | List → Description → Approval → Build → Gate |
| `pick <section> <variant>` | Check the variant → Mark it → Decisions → Build |
| `add` | What and where → Page → Build |
| `audit` | Checks per theme and language → Fixes → Final gate |
| `open` | Build → Serve → The address |

## What it will not do

- Write a color, font, radius or duration anywhere but `tokens.css`; draw a logo or a picture in
  anything but tokens and `currentColor`.
- Write a heavy page by hand instead of through a generator.
- Choose the scheme, the stack, a mark, a layout or a flow for the operator.
- Load anything from the network when the site is viewed, except web fonts with a local fallback.
- Invent what the product does: a gap in the documentation is a question or a Next steps entry.
- Skip a gate, or draw a flow whose description was not approved.

## The script

None in `bin/` yet. The template ships the site's own code — `build.mjs` (navigation, idempotent),
`open.mjs` (the server), `tools/genPages.mjs` (starting pages), `tools/lib/html.mjs` (the page
shell and blocks) — which the skill runs with `node` inside the showcase folder. The audit in
`references/site.md` is a checklist the skill performs by hand (grep for values outside tokens,
diff of `data-i18n` keys against the dictionaries, a look at both themes in every language). A
`bin/showcase.mjs` with `scaffold` and `check` (and `screenshots` through Playwright) is the
planned follow-up once the procedure has been run on a real project (task T19 in
[TASKS.md](../TASKS.md)).

## Limitations

- **Guidance plus a template, not enforcement.** The frame is tested code; the content is prose
  the model follows. A hand edit to a generated page is lost on the next generator run — the
  README of the site says so.
- **Long.** A full showcase is twenty steps with a gate each; it spans sessions. `continue`
  resumes from `STATE.json`.
- **Illustrations and animated panels are where the model's taste shows.** Variants and picks
  exist so the operator chooses between drawn things rather than from descriptions; expect to
  reject some.
- **Translations are generated.** The Microcopy page is the place to correct them; the
  dictionaries follow.
- **Technology marks must be files in the folder.** Finding a free SVG per technology is a step
  the skill does with the operator; without one the card shows the name only.
- **Charts** are static SVG by default; live tooltips need a vendored library, decided
  explicitly.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows.
- [tests/showcaseFrame.test.mjs](../../tests/showcaseFrame.test.mjs) — scaffolds the frame as the
  skill does, with one flow added, and checks genPages and the build: a starting page for every
  entry with a path, the navigation written and a second build changing nothing, every foldable root
  carrying the shared `name` with at most one open, the root of the page on show open and none on
  the overview, a flow's root open with its title marked, the language switch and the dictionary
  wired in, a second genPages run writing nothing, a flow keyed apart from the root section with its
  id. A second scaffold has no flow at first, as the Frame step leaves it: the Flows index says it
  is being prepared, lists the flow after it is added and the build runs, and a `pages.mjs` with two
  entries on one key stops the build.
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
  back. Script tests arrive with the script.
