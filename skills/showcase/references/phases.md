# Showcase — the procedure, step by step

Read the step you are on. Each step: what you start from, what you do, the gate. Templates live in
the skill's own folder, `${CLAUDE_PLUGIN_ROOT}/skills/showcase/templates/`; a path like
`templates/STATE.json` below is relative to the skill's folder. The content each section
must have is in [sections.md](sections.md); how pages are written, in [site.md](site.md).

## Contents

- [Common mechanics](#common-mechanics)
- [Step 0 — Intake](#step-0--intake)
- [Step 1 — Color scheme](#step-1--color-scheme)
- [Step 2 — Technology](#step-2--technology)
- [Step 3 — Frame](#step-3--frame)
- [Steps 4–5 — Foundations, Logo](#steps-45--foundations-logo)
- [Step 6 — Microcopy and tone](#step-6--microcopy-and-tone)
- [Steps 7–9 — Components, Icons, Illustrations](#steps-79--components-icons-illustrations)
- [Steps 10–13 — States, Sign-in layouts, App layout, Key screens](#steps-1013--states-sign-in-layouts-app-layout-key-screens)
- [Step 14 — Flows](#step-14--flows)
- [Steps 15–18 — Emails, Not found, Charts, Technology page](#steps-1518--emails-not-found-charts-technology-page)
- [Step 19 — Principles, Decisions, Changelog, Next steps](#step-19--principles-decisions-changelog-next-steps)
- [Step 20 — Audit](#step-20--audit)
- [Other modes](#other-modes)

---

## Common mechanics

**STATE.json** (template `templates/STATE.json`): `step` and `steps.<key>` (the keys of the table
in `SKILL.md`) move `pending → in-progress → awaiting-approval → done` (or `skipped`); `flows`
lists each flow as `{ id, title, stage }`, the stage `listed / described / approved / built`;
`selected` mirrors `site.mjs`; `pending` holds the question put to the operator and not answered
yet, so `continue` asks it again instead of guessing the answer. Update it at every change of
state; on `continue` read it first and resume exactly there.

**The gate.** At the end of a step: run `node build.mjs`, tell the operator what to open (the page,
both themes, each language), list the decisions taken and what is still open, add a dated entry to
`CHANGELOG.md` (the Changelog page is made from it in step 19), then ask (`AskUserQuestion`, header
`Gate`): **Approve** (Recommended when nothing is pending) / **Revise** — they say what / **Stop
here** — state saved. Never start the next step before approval.

**Decisions** go to `DECISIONS.md` as `SC-nnn` the moment they are taken: topic, options offered,
choice, reason, a blueprint `D-` id when one applies. SC-001 to SC-008 are reserved in the template
for the decisions every showcase takes — fill that row; any other decision (the depth, the fonts,
the voice, the list of flows) is appended from SC-009 in the order taken. The Decisions page is
generated from it by `tools/genDecisions.mjs`, written in step 19 and run again after every later
`pick`.

**Plans before work.** Every section that is a set of things — marks, cases, components, screens,
flows, letters — is first a list the operator sees and edits (`AskUserQuestion` with the list in
the question text and options *Build as listed (Recommended) / Change the list / Skip this
section*), and only then built. The approved list goes to `plans/<page id>.md` before anything is
built — the subagents read it there, and a session that ends between the approval and the build
resumes from it; the list of flows is `plans/flows.md`, each approved flow description
`plans/flows/<flow id>.md`.

**Subagents** (`Agent`, `general-purpose`) for the reading in Intake and for building a section's
pieces in parallel — one per component group, per flow, per letter. A brief names: the files to
read (`site.md`, `sections.md`, `sample.mjs`, `tokens.css`, the plan in `plans/`), the file to
write (`tools/gen<Name>.mjs`, then run it — or, when several pieces make one page, a part
`tools/parts/<page id>/<piece>.mjs` that the page's generator imports), the rules (tokens only,
static markup, `data-i18n` keys in the form `<section>.<item>.<field>`, the sample cast), and what
to return (what was made, what was unclear, the `components.css` blocks and the dictionary entries
it needs). A subagent never writes a file another one may write at the same time — `pages.mjs`,
`components.css`, `i18n/*.js`, a page made of several pieces: you put the returned blocks and
entries in, run the page's generator and `node build.mjs`, look at the result, and gate.

**Sample world.** `sample.mjs` is filled in Intake and never contradicted: the company, one person
per actor (the cast), the data of the domain, a `today`. Every generator imports it.

**Languages.** The pages are written in the default language. Every translatable text carries
`data-i18n`; every dictionary `i18n/<lang>.js` gets the key as soon as the text exists, with the
translation from the Microcopy page — you add the keys a page introduced (a subagent returns
them) right after its generator runs. `templates/i18n/lang.js` is the skeleton of a dictionary.

---

## Step 0 — Intake

1. **Find or start.** Glob `**/STATE.json` with `"kind": "showcase"`. Found → `continue`. None →
   choose the folder (procedure in `SKILL.md › The output folder`).
2. **Read the documentation.** Find the documentation folder (`docs/` by default; ask if it is not
   obvious) and leave the showcase folder out of it. Group its contents; one subagent per group
   returns, under fixed headings: **Product**
   (what, for whom, in one paragraph), **Actors and surfaces**, **Domain categories** (things
   that need telling apart by color), **Brand** (name, existing colors, fonts, logo, tone),
   **Flows and screens** named, **Constraints** (platforms, offline, accessibility, languages,
   regulations), **Design decisions already taken**, **Open questions**. A blueprint folder
   (`STATE.json` with `kind: blueprint`) is read directly: `01-brief.md`, `02-architecture.md`,
   `GLOSSARY.md`, `DECISIONS.md`, module files for capabilities. Product code: a token file
   (`globals.css`, a theme), a component folder — note names and values.
3. **Ask, in one or two rounds** (`AskUserQuestion`):
   - **Interface languages** (multiSelect): English (Recommended, default) · the languages the
     documentation mentions · other. The first chosen is the default unless they say otherwise.
   - **Name and short name** of the product as the site should show them.
   - **Sample company and cast**: propose a fictional company fitting the domain and one person
     per actor; the operator renames or accepts.
   - **Depth**: full (every section, Recommended) · essentials (Foundations, Logo, Microcopy,
     Components, Sign-in, App layout, Flows, Technology; the rest planned). Under essentials a step
     that needs a planned one draws what it needs in place — a sign-in panel without the
     Illustrations page, a flow's screens without the Key screens page.
4. Write `STATE.json` (a product without figures: `steps.charts` is `skipped`), `DECISIONS.md`
   (SC-001 languages), the reading's summary as `SOURCES.md` in the showcase folder (what was read,
   what each gave). Gate — light: "this is what I know; anything missing?"

## Step 1 — Color scheme

Before anything is drawn. The scheme is: a **brand** color (with hover, foreground, soft, strong),
**neutrals** (page, surface, muted surface, text at three strengths, borders), four **feedback**
tones, and **categorical** colors if the domain has categories.

1. If the documentation or the product's code gives a scheme → write it down as a proposal and
   ask to confirm or change (one question).
2. Otherwise **propose three schemes**, each in one line of reasoning from the domain and the
   brand hints (a finance product and a children's product do not share a hue), with hex values
   for brand and its companions, and the contrast of white on brand and of brand-strong on
   brand-soft. Write them into a scratch page `scheme.html` in the showcase folder (not in
   `pages.mjs`): the three schemes side by side, each on a strip of mini-UI — a button, a chip, a
   link, a selected row, on light and on dark — so the operator looks before choosing. The frame
   is not laid yet, so the page stands alone: its own `<style>` holds the three schemes' values (the
   one page allowed to, as it does not outlive the choice), and the operator opens it from disk.
   Offer *like competitor* when a profile exists.
3. Ask (`AskUserQuestion`, header `Scheme`): A (Recommended) / B / C — the operator may type a hue or
   a hex. Record SC-002. Delete the scratch page; the Foundations page will show the chosen scheme.

## Step 2 — Technology

A dialog, not a lookup. Propose a stack from: what the operator has (their starter templates, if
they name them; the product's code), what the documentation implies (surfaces → platforms, offline,
integrations), and what the blueprint's architecture names. Ask per layer, 2–4 questions per round:
web client, mobile client (if a mobile surface exists), backend, data store, hosting, and the
charts library when the product has figures (the options of step 17). Options: your
recommendation first · the alternative worth considering · *what the product already uses* when
code exists; the operator types their own. Record SC-003 with the reasons, the charts library as
SC-008. This feeds the Technology page in step 18.

## Step 3 — Frame

1. Copy `templates/frame/` into the folder as it is.
2. Copy `site.mjs` with `{{NAME}}`, `{{MARK}}` (the first letter until a logo is picked),
   `{{PORT}}` (pick a free one, 4330 up), `{{LANGUAGES}}` (a JS array), `{{DEFAULT_LANGUAGE}}`.
3. Copy `pages.mjs`; remove what the depth decision planned away (keep the entry without `path`
   so it shows as planned), add domain components to the Components sections if the reading named
   them. Copy `tokens.css` and write the scheme's values into the brand block (light and dark; the
   dark brand is lighter and the foreground on it darker — check contrast; the dark values stand
   twice, under the media query and under `[data-theme='dark']`, and must be the same). Copy
   `components.css`, `sample.mjs` (fill it), `README.md`, `CHANGELOG.md`, `DECISIONS.md` if not yet,
   and `i18n/lang.js` once per non-default language as `i18n/<lang>.js`, with the frame's strings
   translated (`ui.*`, `flow.*`, `overview.how.*`, `flows.list.*`) and the `nav.*` keys for every
   page, section and child in `pages.mjs`.
4. `node tools/genPages.mjs`. Then the overview (`sections.md › Overview`): `tools/genOverview.mjs`
   writes `index.html` over its starting page — the hero (the product in one paragraph, from the
   reading, and what this site is), `<div data-catalog></div>`, *Where this comes from* from
   `SOURCES.md`, and *How to read this site* with the `overview.how.*` keys of the starting page.
5. `node build.mjs`, `node open.mjs` — the operator sees the whole site with the menu, the theme and
   language switches, the overview, and every section as a starting page. Gate.

## Steps 4–5 — Foundations, Logo

Each follows the same shape: **plan → approve → build in parallel → build.mjs → gate**.

- **Foundations (4).** Finish `tokens.css` (type scale with the fonts decided, spacing, radii,
  shadows, motion, sizes; categorical colors). Write `tools/genFoundations.mjs`: the sections in
  `sections.md › Foundations`, with swatches, token values and contrast rows as showcase.js
  expects (`site.md › Live values`). Font choice is a question when the documentation does not
  settle it (two proposals, with the reason).
- **Logo (5).** Plan: 6–12 ideas for a mark, each from a concept in the product (a thing, an
  action, the initial, the domain) — one line each. Approve. `tools/genLogo.mjs`: each mark an
  SVG on a 64-unit grid in `currentColor` with `var(--lg-ground)` knockouts; the side-by-side
  section at one size on light and dark, then at menu size (28 px) and tab size (16 px); the
  sizes section. The operator picks → `pick logo <id>` → `site.mjs › mark` becomes that SVG.

## Step 6 — Microcopy and tone

It needs only the Intake, and comes before Components — the first step that puts words on a
sample. Decide the voice with the operator (two or three options: plain and warm · precise and
formal · brisk and playful — with a sample error message in each). Then the patterns of
`sections.md › Microcopy` with examples, and the **languages** section: the same messages in every
interface language, side by side. From here on every string on a screen, in a component or a
letter is taken from this page, and its translations go to the dictionaries.

## Steps 7–9 — Components, Icons, Illustrations

The shape of steps 4–5: **plan → approve → build in parallel → build.mjs → gate**.

- **Components (7).** Plan: the standard set in `pages.mjs` + the product's own from the reading
  (a capability that needs a component the standard set lacks) + a reserve for later (name why
  each might be needed). Approve. Subagents per group (inputs; display; feedback; navigation;
  shell), each writing its part of `components/index.html` as `tools/parts/components/<group>.mjs`
  — variants, states, sizes and a properties table per component, each naming its source or
  `proposed`, the words from Microcopy — and returning its `components.css` blocks;
  `tools/genComponents.mjs` puts the parts together. Restyle the starter classes to the project.
  Samples use the cast and data of `sample.mjs`.
- **Icons (8).** The sprite in `assets/showcase.js` is the start; add what the components and
  screens need; the page lists every icon with its name, the grid and the rules.
- **Illustrations (9).** Plan: the situations — from States (empty, loading, error, access,
  offline, done), from the flows (a success at the end of each), sign-in panels, not-found — plus
  a reserve. Approve. `tools/genIllustrations.mjs`: SVG symbols drawn only with `--ill-*` tokens
  (added to `tokens.css`, derived from the scheme), no text, no faces; some with CSS animation
  that stops under `prefers-reduced-motion`; the side-by-side section and the in-place section.

## Steps 10–13 — States, Sign-in layouts, App layout, Key screens

- **States (10).** One section per state: the picture (from Illustrations), the words (from
  Microcopy), the action; where it appears in the product; the loading section shows skeletons
  and when a spinner is right instead.
- **Sign-in layouts (11).** Plan: 3–5 layouts, each one line — the form on one side, an animated
  panel about the product on the other; each panel a different idea of the product (its data
  moving, its domain drawn, its promise). Approve. `tools/genSignIn.mjs`: each a `variant` with
  the full screen in a desktop device frame, the panel's animation in CSS on tokens, still under
  reduced motion; the form uses the components. The operator picks one.
- **App layout (12).** Plan: 2–4 shells — sidebar that folds to icons, sidebar with grouped
  menus, top navigation, rail + panel — each one line. Approve. Each a `variant` with the shell
  around a real-looking page, the sidebar folded and unfolded, the menu's states, the user menu;
  responsive behaviour described. Pick one; it becomes the shell of every later screen.
- **Key screens (13).** Plan: the screens the flows will need, from the documentation (a
  dashboard, the main list, a record, a form). Approve. One generator per screen or group,
  rendering in `device()` frames for every surface the brief gives the screen's actors.

## Step 14 — Flows

Two approvals, by design.

1. **The list.** From the documentation (and the blueprint's main flows): sign-in flows first
   (sign in, verification code, forgotten password, invitation), then the product's flows in the
   order a user meets them. One line each: name, actor, what it achieves. Ask: *Build these /
   Add or remove (they say what) / Change the order*. Write the list to `plans/flows.md`; record
   each flow in `STATE.json.flows` as `listed`.
2. **Each description**, before it is drawn: the actor, the starting point, the steps — each step
   one line of what the user does, naming the controls they use in order (the email field, then
   the password, then *Sign in*), and one of what they see — the end state, the alternative paths
   worth a step (an error, a cancel), and which key screens it reuses. Write it to
   `plans/flows/<flow id>.md` and record `described`; show it; ask *Draw it / Change (they say
   what) / Later*. On *Draw it*, record `approved`.
3. **Build.** `tools/genFlow<Name>.mjs` with `flowPlayer(...)` from `site.md`: a step per approved
   line, the screen drawn with the components and the shell picked, the controls the step names
   marked `data-flow-target="1"`, `"2"`, … in that order, the note under it saying what happened
   with `flowMark(n)` for each (`site.md › Flows`); controls on a screen may lead on with
   `data-go="step-n"`. Add the flow to
   `children` of Flows in `pages.mjs` and its `nav.flows.<flow id>` keys to every dictionary;
   `node build.mjs` — the menu and the Flows index list it. Record `built`. The player gives the
   step counter, the title, ← →, All steps, Full screen and the walking highlight with its Hints
   switch for free.
4. Gate per flow or per batch of flows, as the operator prefers.

## Steps 15–18 — Emails, Not found, Charts, Technology page

- **Emails (15).** Plan: the common letters (invitation, verification code, password reset,
  welcome, digest, security alert) and the product's own, proposed from the flows (what a flow
  sends and when). Approve. `tools/genEmails.mjs` with `mail(...)`: a 600 px letter — brand
  header with the mark, an illustration, the one message, the one action button, the footer —
  shown as a mail client shows it, with subject and sender; words from Microcopy.
- **Not found (16).** Plan: 3–5 ideas, each a picture from the product's world with a moving
  detail. Approve. `variant`s on their own full screen; pick one.
- **Charts (17).** Only when the product has figures. The library is SC-008, chosen in step 2
  (ask now only if it was left open): **static SVG on tokens** (Recommended: no dependency, exact
  style, both themes free) · a vendored UMD library (Chart.js, ECharts, uPlot) when the operator
  wants live tooltips · none.
  Load the `dataviz` skill for the palette and the choice of chart forms. Draw the product's
  figures in both themes; the `charts` entry in `pages.mjs` gets its `path`.
- **Technology page (18).** `tools/genTechnology.mjs`: the architecture as one SVG on tokens —
  the clients per platform, the backend, the data, the external services, with the arrows named;
  the stack as a grid of cards, each with the technology's mark (an SVG file under
  `assets/tech/`, taken from a free set such as Simple Icons and kept in the folder, never a
  CDN), its name, one line of what it is for; the path of one request through the parts.

## Step 19 — Principles, Decisions, Changelog, Next steps

- **Principles.** 5–7, from the brief's goals and the decisions: each a sentence, a reason, a
  *do* and a *don't* drawn with the components. Ask the operator to confirm the list first.
- **Decisions.** `tools/genDecisions.mjs` from `DECISIONS.md`: one card per decision, the
  options as thumbnails or lines, the chosen one marked, the reason; a link to the variant.
- **Changelog.** `tools/genChangelog.mjs` from `CHANGELOG.md`, which has had a dated entry per
  gate since step 3; it runs again at every later gate.
- **Overview.** `tools/genOverview.mjs` again, so the hero and *Where this comes from* describe
  the site as it now stands.
- **Next steps.** The queue: what the site will get next, in order (planned sections, flows
  deferred, the reserve components). The ideas: proposals for the product beyond the
  documentation — each a title, one paragraph of what and why, where it came from. Ask the
  operator which ideas to keep.

## Step 20 — Audit

The checks in [site.md › Audit](site.md#audit), run on both themes and every language: build
idempotent, no values outside tokens, every `data-i18n` key in every dictionary, no overflow in
device frames and flows in the longest language, contrast rows all pass, animations still under
reduced motion, every page reachable from the menu and the catalog. With Playwright available,
screenshots of every page in both themes into `screenshots/`. Fix what is mechanical; the rest is
a question or a Next steps entry. Final gate; `STATE.json.step = "done"`.

---

## Other modes

**`status`** — read `STATE.json`, `DECISIONS.md`, `pages.mjs`; report steps and states, flows and
their stage, picks made and pending, planned sections. Write nothing.

**`section <id>`** — the step for that section, alone: plan (or re-plan, keeping what the operator
approved unless they say otherwise) → build → gate.

**`flow <id>`** — the description and build of one flow; `flow new` runs step 14's two approvals
for a new one and adds it to the list.

**`pick <section> <variant>`** — confirm the variant exists; set `site.mjs › selected[section]`;
on the page: the chosen variant first with the `Selected` mark, the others `Alternative`; for
`logo`, `site.mjs › mark` becomes the mark's SVG; fill the group's row in `DECISIONS.md` (SC-004
to SC-007; a group made with `add` gets the next `SC-nnn`); regenerate the Decisions page once
`tools/genDecisions.mjs` exists; `node build.mjs`; an entry in `CHANGELOG.md`.

**`add`** — a page or a section outside the standard list: ask what, where in the menu, a
generator or hand-written; add to `pages.mjs`; `genPages` for the start; build.

**`audit`** — step 20 alone, at any time.

**`open`** — `node open.mjs` from the showcase folder (background), tell the operator the address.
