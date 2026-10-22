---
name: showcase
description: Builds the project's design showcase — a static site in docs/showcase/ that shows the customer the product before it exists (what it is and for whom, the technology stack with official marks, the architecture in diagrams, what keeps the data safe in the customer's words, then the design — colors, type, logo, icons, words, states — illustrations, layouts — sign-in, the app's shell and the 404, led by animated pictures of the domain — components, key screens, flows with a step player, emails) and gives the team what every screen is drawn with (tokens, components, icons, microcopy, decisions). Reads the whole documentation folder; the operator decides every fork; theme and interface language switch everywhere. Human-invoked only.
argument-hint: "[init [dir] | continue | status | section <id> | flow <id> | pick <section> <variant> | add | audit | open]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(find:*), AskUserQuestion, Agent, SendUserFile
---

# Showcase

You build a static site that shows a product before it exists. Two readers look at it: the
**customer**, who should recognise their product in the first minute — its mark, its first screen,
its shell, its flows; and the **team**, who will build it and needs the pieces every screen is made
of — tokens, components, icons, the words, the stack. One site serves both, in that order.

The site is plain HTML and CSS served by a tiny Node script, with no dependencies, so it opens on
any machine and from a zip. Its frame — menu, theme and language switches, presentation mode, the
flow player — is a template you copy; what you make is the content, from the documentation and
from decisions you take with the operator.

## How to read the arguments

`$ARGUMENTS` picks the mode. With no argument, look for an existing showcase (`STATE.json` with
`"kind": "showcase"` under the project, skipping `node_modules`): found → `continue`; none → `init`.

| Argument | What to do |
|----------|------------|
| *(none)* | `continue` when a showcase exists, `init` when none does |
| `init [dir]` | choose the folder, read the documentation, decide languages, scheme and stack, lay the frame; then the steps in order |
| `continue` | read `STATE.json`, resume the step it is in — from the files, in a fresh context (`phases.md › A fresh context`) |
| `status` | the steps and their state, the picks made, what waits for the operator; change nothing |
| `section <id>` | make or remake one section (`components`, `illustrations`, `architecture`, a page under a root such as `logo` or `stack`, …) by its id in `pages.mjs` |
| `flow <id>` | make or remake one flow; `flow new` adds one through the two approvals |
| `pick <section> <variant>` | record the operator's choice among variants: `Selected` mark, `site.mjs › selected`, its row in `DECISIONS.md`, the Decisions page |
| `add` | a page or a section the standard list does not have |
| `audit` | the checks in [references/site.md › Audit](references/site.md) on both themes and every language |
| `open` | `node open.mjs` in the showcase folder, so the operator can look |

The step-by-step procedure is in [references/phases.md](references/phases.md); what every section
must contain, in [references/sections.md](references/sections.md); how the frame works and how pages
are written, in [references/site.md](references/site.md). Read the part you need before acting —
the site has conventions that are easy to break by improvising.

## Rules that never bend

**Everything is read from `tokens.css`.** No hex value, font name, radius or duration anywhere
else — not in a page, not in a component, not in an illustration. A logo is `currentColor`; a
picture is drawn in `--ill-*` tokens. This is what makes two themes and a color-scheme change a
matter of one file, and the pages incapable of drifting from the tokens. The one exception is the
official mark of a technology on the Stack page: an SVG file in `assets/tech/` in its owner's
colors, fetched once by `tools/fetchTechMarks.mjs`, never redrawn.

**Nothing appears late.** The menu, the steps of a flow, the pictures are static markup; scripts
only decide what is visible. A heavy page is written by a generator in `tools/` from data, never
by hand: the texts can then carry their language keys, and a change is made once.

**The operator decides.** Before every section is made — steps 1 to 20 — they say whether they
want it at all: **full**, **simplified** or **skipped**, and what to take into account in making it
(`phases.md › Section intake`); nothing of a step starts before that answer. The color scheme, the
stack, which mark, which layout, which flows and
what each shows — every one is a question with your recommendation first, and every answer a row in
`DECISIONS.md`. Before a section is built, its plan (the list of marks, cases, components, flows)
is shown and approved; a flow's description is approved before its screens are drawn. And the
operator **sees before choosing**: the page opened and its screenshots sent, never a visual choice
put in words alone (`phases.md › Common mechanics`).

**State lives on disk.** `STATE.json` holds the step, the picks and the question waiting for an
answer; `DECISIONS.md` the choices; `plans/` every approved plan and flow description; `CHANGELOG.md`
what each gate changed; `sample.mjs` the fictional company and people every sample uses. Re-read
them on `continue`; trust them over what you remember. The operator edits files between sessions;
show what you change in a file they touched.

**The site is in the interface language the operator chose** — English unless they say otherwise —
and in every other language they named, switchable in the top bar. The skill's own files (README,
generator comments) are English.

## What goes in

Read **the whole documentation folder** of the project — requirements, a blueprint if there is one,
feature files, notes, earlier design work, whatever is there, all but the showcase folder itself —
and the product's code when it
exists (a token file, a component library). Use subagents for the reading, one per document group,
returning what bears on design: what the product is and for whom; the actors and the surfaces they
use; the categories of the domain that need telling apart (they become categorical colors); brand
hints, an existing palette, a logo; the main flows and the screens they name; constraints; design
decisions already taken. A design in the documentation — a design-system page extracted from Figma,
tokens, drawn screens, exported icons or a logo — is the **design baseline**: the showcase follows it
and proposes only where it is silent (`phases.md › Common mechanics`). A blueprint shortens this: its brief gives the actors, surfaces and
glossary; its architecture the flows; its modules the capabilities the components must serve.

## The output folder

Default `docs/showcase/`; the operator always gets to change it. Look at what exists, then ask
(`AskUserQuestion`, header `Folder`): **`docs/showcase/` (Recommended)** — with a note if something
is already there — plus one or two alternatives; any path may be typed. A directory given in the
argument becomes the recommended option. Never scaffold into a non-empty folder without the
operator confirming that folder.

Writes stay in the working folder: nothing is created outside it, not even for a moment.
The working folder is the showcase folder chosen at Intake, wherever it is. The site, `STATE.json`,
`plans/`, screenshots and any file needed only for a while are created inside it; the scratch page of
the Color scheme step is removed by `build.mjs` once the scheme is chosen. Nothing goes into the
project root, `docs/` above the folder, `/tmp` or the session's scratchpad — never, by you or by an
agent; a subagent's brief names files inside the folder.

The frame comes from `templates/` next to this file (`${CLAUDE_PLUGIN_ROOT}/skills/showcase/templates/`):
`frame/` is copied as it is;
`site.mjs`, `pages.mjs`, `tokens.css`, `components.css`, `sample.mjs`, `i18n/lang.js`,
`STATE.json`, `DECISIONS.md`, `CHANGELOG.md` and `README.md` are copied with their `{{placeholders}}`
filled. Then `node tools/genPages.mjs` lays a starting page for every section and `node build.mjs`
writes the navigation — the operator can open the whole site before any section has content. The
frame also brings the generators of the first two pages, `tools/genProduct.mjs` and
`tools/genStack.mjs`, and `tools/fetchTechMarks.mjs` for the stack's official marks: fill their
content, keep their rendering. The
scripts find the site by their own location, so `node docs/showcase/build.mjs` works from anywhere.

## The site

The menu: the project's name on top, then the **root sections**, nothing above them — no band
labels; a group of roots is set apart from the next by a gap. A root folds, and only one is open at
a time — opening one folds the one that was open; a root without items is a plain link. The items
under a root are its **sections** — anchors on its own page, the one on screen marked as it scrolls
(a list is sections too: one per component, one per letter) — and its **child pages**, one level
down: the stack under Product, the pages of Design, the layouts, the key screens, each flow. The
order is the order of a customer's attention, not the order of making:

| Group | Root sections, in order, with what unfolds under each |
|-------|-------------------------------------------------------|
| **Product** | **Product** (the home page: what it is · who uses it · modules · how it works · sample company · about this site; child page **Technology stack** — each technology with its official mark, one line, a link to its site) · **Architecture** (diagrams: the system in its world · its parts · modules · how data moves · where it runs · one request) · **Security** (in the customer's words: your data · who gets in · nothing is lost · against attacks · every change on record · what is promised, and what is not yet) · **Flows** (one page per flow, with the step player — right after Security: the product working, step by step, is the weightiest part for the customer, so it stands in the first group) · **Screens** (child page: Key screens — right after Flows) |
| **Design** | **Design** (child pages: Principles · Colors · Typography · Spacing and layout · Radius and shadows · Motion · Logo · Loaders · Icons · Microcopy and tone · States) · **Illustrations** (for states · from the domain · in place · reserve) · **Layouts** (child pages: Auth layout · App layout · Not found page — variants led by animated pictures of the domain) · **Email templates** (a root of its own right after Layouts: the Template, then one item per letter — the common letters, then the product's own) · **Components** (one item per component) · **Charts** (a root of its own right after Components, only when the product has figures: one section per use of a chart in the product, each drawn where the product shows it — on the home screen, in a report, beside a target — not a gallery of chart types) |
| **Project** | Decisions · Changelog · Next steps |

The names are the team's words in every language: in Ukrainian Layouts is «Лейаути» (Auth layout
«Лейаут входу», App layout «Лейаут застосунку») and Email templates «Імейл-темплейти» — never
«Макети» or «Листи»; a caption or a note that points at a section uses the same name.

Everywhere: a theme switch (light · dark · system) that every page follows, hex codes and contrast
ratios included; a language switch when there is more than one language; presentation mode
(**P**, or `?present=1`) that hides the frame and enlarges the page; `prefers-reduced-motion`
honoured by every animation.

## The order of making

Dependencies decide it, not the menu. Each step from 1 to 20 starts with its section intake — full,
simplified or skipped, and the operator's wishes — and ends with a gate: the operator looks at the
site, and approves or sends it back. A skipped step has no gate. The key is the step's name in `STATE.json › steps`.

| Step | Key | Makes | Needs |
|------|-----|-------|-------|
| 0 Intake | `intake` | folder, the reading, languages, name, the sample company and cast | — |
| 1 Color scheme | `scheme` | the brand color and its companions — **first**, before anything is drawn; from the design when there is one, otherwise three proposals to look at | the reading |
| 2 Technology | `stack` | the stack, chosen in a dialog from what the operator has (starter templates, code) and what the documentation implies | the reading |
| 3 Frame | `frame` | the folder scaffolded, tokens from the scheme, starting pages; the Product page from the reading and the Technology stack page with the official marks; the site opens | 1, 2 |
| 4 Foundations | `foundations` | tokens finished; the Design pages Colors, Typography, Spacing and layout, Radius and shadows, Motion, with live swatches and contrast | 3 |
| 5 Logo | `logo` | marks from ideas in the product, at every size; one picked; then the Loaders page, the picked mark set in motion | 4 |
| 6 Microcopy and tone | `microcopy` | voice and patterns in every language — the source of every string that follows, so it comes before the first step that writes words | 0 |
| 7 Components | `components` | the standard set, the product's own, a reserve; styled to the project | 4, 6 |
| 8 Icons | `icons` | two groups only: the base standard icons the components and screens use, and the icons of the product's domain; on their grid | 7 |
| 9 Illustrations | `illustrations` | a picture for every state a screen can be in and for the cases of the domain, some moving; a reserve | 4, 5 |
| 10 States | `states` | picture + words + action for empty, loading, error, access, offline, done | 6, 9 |
| 11 Auth layout | `signIn` | Layouts: several, every one with an animated scene of the domain; one picked | 7, 9 |
| 12 App layout | `appLayout` | Layouts: several shells with a folding sidebar, most with the product's moving pictures in place; one picked | 7, 9 |
| 13 Not found page | `notFound` | Layouts: several, each a moving picture with the 404 in it; one picked | 9 |
| 14 Key screens | `screens` | the main screens in device frames per surface, in the picked shell | 7, 10, 12 |
| 15 Flows | `flows` | list approved → each description approved → built with the step player, the controls of each step highlighted in the order they are used | 14 |
| 16 Email templates | `emails` | the root section Email templates (in Design, after Layouts): the template, then the common letters and the product's own — each a menu item with a picture of its own in the product's colors | 6, 9 |
| 17 Charts | `charts` | only when the product has figures: the root section Charts (in Design, after Components) — one section per use of a chart in the product, each drawn where the product shows it (in the picked shell or as the card), from an approved plan, with the library chosen in step 2 | 4, 7, 12 |
| 18 Architecture | `architecture` | the architecture drawn for the customer: diagrams of the system in its world, its parts, modules, data, deployment, one request | 2 |
| 19 Security | `security` | the security page in the customer's words: where the data lives and who reaches it, what guards it from loss and from attack, what stays on record, what is not promised yet — every claim from the documentation, marked done or planned | 2, 18 |
| 20 Principles · Decisions · Changelog · Next | `principles`, `project` | the pages about the project | all |
| 21 Audit | `audit` | both themes × every language; the checks in site.md | all |

## Variants and picks

Logo and the three Layouts — auth, app, not found — are made as **several variants**, because
a customer chooses better between things than from a description. Each variant is a section with
an id; `/showcase pick <section> <variant>` marks the chosen one `Selected`, moves it first, writes
`site.mjs › selected`, fills the group's row in `DECISIONS.md` and regenerates the Decisions page
once it exists (step 20). The others stay as alternatives — the Decisions page is where the
customer sees what was considered.

## Progress

The operator always sees which stage the run is in, what is done and what comes next.

- **The checklist.** When a mode starts, show its stages from the table below, one per line: `✓`
  done, `▸` the current one, `·` still to come, `–` skipped (a step `STATE.json` marks `skipped`, a
  section its intake skipped), `✗` failed. Show it again at every gate and at the end, with the
  marks brought up to date and where the result is. When the session has a task-list tool
  (`TaskCreate` and `TaskUpdate`, or `TodoWrite`), mirror the stages there, one item per stage, and
  keep the items current; without one, the checklist in the chat is enough.
- **The line.** At every change of stage or step, one line:
  `▸ /showcase · <n>/<N> <stage> · <step>`, plus `· <k>/<m>` while units are counted —
  `▸ /showcase · 8/22 Components · building · 3/5`. The marks, the numbers and the command are fixed;
  the stage and the step are in the operator's language.
- **Units.** A stage that works through units — document groups read, component groups, marks,
  flows, letters, pages audited per theme and language — counts them in the line, and the task list
  gets an item per unit while there are twelve or fewer.
- **Waits.** Before subagents start, say what they build, how many, and that you wait for them; as
  each returns, the line with the count, and a failure by name. At a gate, a plan or a question, the
  line says the run waits for the operator, and for what — and which page to open.
- **Resume.** `continue` and `status` show the checklist rebuilt from `STATE.json` (`steps`, `flows`,
  `pending`) before anything else, so the operator sees where the last session stopped.

| Mode | Stages |
|------|--------|
| `init [dir]`, `continue` | Intake → Color scheme → Technology → Frame → Foundations → Logo → Microcopy and tone → Components → Icons → Illustrations → States → Auth layout → App layout → Not found page → Key screens → Flows → Email templates → Charts → Architecture → Security → Principles, Decisions, Changelog, Next steps → Audit |
| `status` | Read the state → Report |
| `section <id>` | Section intake → Plan → Approval → Build → Gate |
| `flow <id>` | Description → Approval → Build → Gate |
| `flow new` | List → Description → Approval → Build → Gate |
| `pick <section> <variant>` | Check the variant → Mark it → Decisions → Build |
| `add` | What and where → Page → Build |
| `audit` | Checks per theme and language → Fixes → Final gate |
| `open` | Build → Serve → The address |

## What this skill does not do

- **Write a value outside `tokens.css`**, or a page by hand that a generator should write.
- **Choose for the operator** — the scheme, the stack, a mark, a layout, the flows and their steps
  are theirs; you recommend.
- **Pull from the network at view time.** Fonts may load from Google Fonts with a local copy as
  fallback; technology marks and every other asset are files in the folder.
- **Describe implementation** on the pages beyond the Technology stack and Architecture pages: a screen is a picture of
  behaviour, not a component tree.
- **Invent the product.** What a screen shows comes from the documentation and the decisions; a
  gap is a question, not a guess — and goes into Next steps if the operator defers it.
- **Skip a gate**, or draw a flow whose description was not approved.

## Done when

- `STATE.json` shows every step `done` or `skipped`, and `audit` done.
- Every root section in `pages.mjs` has content, or is planned because its intake skipped it; every flow in `children` has a page with a working
  player and a tile on the Flows index; the overview catalog lists every root section.
- `tokens.css` is the only file with values; `node build.mjs` changes nothing; every `data-i18n` key
  has an entry in every dictionary.
- Every variant group has a `Selected` mark and a row in `DECISIONS.md`; the Decisions page shows
  them with their alternatives.
- The operator has opened the site in both themes and every language and said it is theirs.
