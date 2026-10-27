# Showcase — the procedure, step by step

Read the step you are on. Each step: what you start from, what you do, the gate. Templates live in
the skill's own folder, `${CLAUDE_PLUGIN_ROOT}/skills/showcase/templates/`; a path like
`templates/STATE.json` below is relative to the skill's folder. The content each section
must have is in [sections.md](sections.md); how pages are written, in [site.md](site.md).

## Contents

- [Common mechanics](#common-mechanics)
- [Section intake](#section-intake)
- [A fresh context](#a-fresh-context)
- [Step 0 — Intake](#step-0--intake)
- [Step 1 — Color scheme](#step-1--color-scheme)
- [Step 2 — Technology](#step-2--technology)
- [Step 3 — Frame](#step-3--frame)
- [Steps 4–5 — Foundations, Logo](#steps-45--foundations-logo)
- [Steps 6–8 — Components, Icons, Illustrations](#steps-68--components-icons-illustrations)
- [Steps 9–13 — States, Layouts, Key screens](#steps-913--states-layouts-key-screens)
- [Step 14 — Flows](#step-14--flows)
- [Steps 15–18 — Email templates, Charts, Architecture, Security](#steps-1518--email-templates-charts-architecture-security)
- [Step 19 — Principles, Decisions, Changelog, Next steps](#step-19--principles-decisions-changelog-next-steps)
- [Step 20 — Audit](#step-20--audit)
- [Other modes](#other-modes)

---

## Common mechanics

**STATE.json** (template `templates/STATE.json`): `step` and `steps.<key>` (the keys of the table
in `SKILL.md`) move `pending → in-progress → awaiting-approval → done` (or `skipped`); `flows`
lists each flow as `{ id, title, stage }`, the stage `listed / described / approved / built`;
`selected` mirrors `site.mjs`; `scope.<key>` holds the answer of the step's section intake
(`{ "mode": "full" | "simple" | "skipped", "wishes": "…" }`, see [Section intake](#section-intake));
`pending` holds the question put to the operator and not answered yet, so `continue` asks it again
instead of guessing the answer. Update it at every change of state; on `continue` read it first and
resume exactly there.

**Show, do not describe.** Whatever the operator chooses or approves, they see first: open the page
(`node open.mjs`, or the scratch page from disk) and, when Playwright is available, take
screenshots of it into `screenshots/` — the page in both themes, in the second language too — look
at them yourself before the operator does, and send them (`SendUserFile` when the session has it)
so the choice can be made from the chat. A question about something visual never goes out with only
words in it.

**The gate.** At the end of a step: run `node build.mjs`, tell the operator what to open (the page,
both themes, each language), show it as above, list the decisions taken and what is still open, add a dated entry to
`CHANGELOG.md` (the Changelog page is made from it in step 19), then ask (`AskUserQuestion`, header
`Gate`): **Approve** (Recommended when nothing is pending) / **Revise** — they say what / **Stop
here** — state saved. Never start the next step before approval; after it, the next step starts in a
fresh context (`phases.md › A fresh context`).

**Decisions** go to `DECISIONS.md` as `SC-nnn` the moment they are taken: topic, options offered,
choice, reason, a blueprint `D-` id when one applies. SC-001 to SC-008 are reserved in the template
for the decisions every showcase takes — fill that row; any other decision (a section simplified
or skipped, the wishes for one, the fonts, the voice, the list of flows) is appended from SC-009 in the order taken. The Decisions page is
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
pieces in parallel — one per component group, per flow, per letter. Pass `model: "sonnet"` in the
call for the readers and for the builders of components, icons, states, key screens, flows, emails,
charts, the technology page and the security page: their work follows an approved plan and the conventions of `site.md`,
and you look at every result before the gate. The marks of the Logo, the pictures of Illustrations and
the variants of the Layouts (Auth, App, Not found) are built on the session's model:
there the drawing is what the customer chooses between. A brief names: the files to
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

**Design baseline.** When the documentation holds a design — a design-system page extracted from
Figma, a token file, screenshots of drawn screens, exported icons or a logo — it is the baseline, not
a hint: the scheme, the fonts and type scale, the radii and shadows, the shell, the component shapes
and the icon style follow it, and a step proposes something else only where the baseline is silent
(a dark theme, a phone layout, states, illustrations) or the operator asks for it. Its assets are
copied into the showcase folder, not linked. Each step's section intake names what the baseline
already decides for it.

## Section intake

Before every step from 1 to 19 makes anything, the operator says whether they want the section, how
much of it, and what to take into account. Nothing of a step — no plan, no proposal, no subagent — starts
before this answer. Intake (0) and Audit (20) have none.

1. **Ask** (`AskUserQuestion`, two questions in one call, header `Section` and `Wishes`), the first
   question's text in three short lines: what the full section shows, what the simplified one shows
   (from the table below, fitted to this product), and what later steps take from it.
   - *Section*: **Full** (Recommended, unless the reading or an earlier answer argues for less) ·
     **Simplified** · **Skip**. Steps 1–3 (Color scheme, Technology, Frame) cannot be skipped — every
     later step stands on them — so for them the options are Full and Simplified.
   - *Wishes*: **None — follow the documentation** (Recommended) · **From the design baseline** (only
     when the documentation has one: name what it fixes for this section) · the operator's own text
     (the free answer). A wish narrows or redirects the section; it never adds a claim the
     documentation does not support.
2. **Record** `scope.<key>` in `STATE.json`, and an `SC-nnn` row in `DECISIONS.md` for every answer
   other than *Full* with no wishes — topic, the choice, the wishes in the operator's words.
3. **Apply.**
   - *Full* — the step as written below.
   - *Simplified* — the step's shape stays (plan → approve → build → gate), with the simplified scope
     of the table; its plan says in its first line that it is simplified and what is left out. A
     variant section (Logo, Layouts) makes one variant, so its pick is a confirmation.
   - *Skip* — `steps.<key>` becomes `skipped` and the entry in `pages.mjs` loses its `path`, so the
     menu shows it as planned; a later step that needs what it would have made draws that in place (a
     sign-in panel without the Illustrations page, a flow's screens without Key screens). Add it to
     Next steps. The gate is skipped too: say in one line what was skipped and go on to the next
     step's intake.
   - *Wishes* — carried into the step's plan (each wish a line under *Wishes* at its top) and into
     every builder's brief, word for word.
4. `section <id>` and `flow new` ask the intake of their step again, with the current answer as the
   recommended option; the operator may change it.

| Step | Full | Simplified |
|------|------|------------|
| 1 Color scheme | three proposals on a scratch page, picked | one proposal from the design baseline or the brand hints, confirmed in one question |
| 2 Technology | a dialog per layer | one proposed stack, confirmed or edited in one question |
| 3 Frame | the Product page and the Technology stack page with official marks | the Product page; the stack as a plain list without marks |
| 4 Foundations | Colors, Typography, Spacing and layout, Radius and shadows, Motion, each with live values and contrast | Colors and Typography; spacing, radius, shadows and motion as one token table on the Design page |
| 5 Logo | 6–12 marks at every size, one picked; the Loaders page | the baseline's mark, or three marks to pick from; one loader in Components, no Loaders page |
| 6 Components | the standard set, the product's own, a reserve; variants, states, sizes, properties | the components the planned screens and flows use, default and one state each, no properties table, no reserve |
| 7 Icons | the base and domain groups on their grid, with the rules | the icons the screens use, on one sheet |
| 8 Illustrations | for states, from the domain, in place, a reserve; every picture with a minimal animation | one picture per state and one domain scene, each with a minimal animation |
| 9 States | a section per state: picture, words, action, where it appears | one table of states with words and actions; pictures for empty and error only |
| 10 Auth layout | 3–5 variants, each with a moving scene, one picked | one layout, its scene still |
| 11 App layout | 2–4 shells, folded and unfolded, tablet and phone, one picked | one shell (the baseline's when there is one), desktop and phone |
| 12 Not found page | 3–5 variants, one picked | one |
| 13 Key screens | every screen the flows need, on every surface of its actors | the screens the flows need, on the main surface |
| 14 Flows | the list, a description per flow, each built and gated | the one to three main flows, their descriptions approved together |
| 15 Email templates | the template, the common letters and the product's own, a picture each — animated GIF or still, as the operator chooses | the template and the product's own letters, one shared picture — animated or still, as the operator chooses |
| 16 Charts | a section per use of a chart in the product | the one or two uses the key screens show |
| 17 Architecture | the six diagrams | one diagram: the system in its world, with its parts |
| 18 Security | the six parts, with drawings | one page of short paragraphs per part, done / planned tags, no drawings |
| 19 Principles · Decisions · Changelog · Next | all four pages | Decisions and Next steps |

**Words.** The words of the product — on a screen, in a component, a state, a flow or a letter —
come from the documentation and the sample world, written in the product's voice as the Principles
page sets it, or plainly while there is none: short, the user's own terms from the glossary, an
error that says what to do next.

**Languages.** The pages are written in the default language. Every translatable text carries
`data-i18n`; every dictionary `i18n/<lang>.js` gets the key as soon as the text exists, with its
translation into that language written at the same time — you add the keys a page introduced (a
subagent returns them, each with its translation into every language) right after its generator
runs. `templates/i18n/lang.js` is the skeleton of a dictionary.

## A fresh context

Every turn of a session sends its whole context again, so a step that runs in the context of the steps
before it pays for all of them on every turn: their readings, plans, builders' replies and generated
pages. Everything a step needs is on disk — `STATE.json`, `plans/`, `SOURCES.md`, `DECISIONS.md`, the
site itself — so it can start from the files instead. Nothing in the procedure is skipped for it.

- **At the gate.** After a step's gate is approved, do not start the next step. Recommend a fresh
  context and say why, in the operator's language, so that they decide knowing what it saves:

  ```
  ✓ <step> approved and saved in <showcase folder>.
  ▸ Next: <next step>. Recommended: type /clear, then /showcase.
  Why: every message sends this whole conversation to the model again, and it now carries <what this
  step piled up>, which <next step> does not read — it starts from the files. In a fresh context
  each of its steps costs a fraction of that, and nothing is lost: everything is saved, and after
  /clear the plugin tells the new session where the showcase stands.
  Not /compact: it spends one more request on this whole conversation to keep a summary the next
  step does not need.
  Or say "go on here" to continue in this context.
  ```

  Name what the step really piled up — the reading, the plan rounds, the builders' replies, the pages
  generated and looked at — not this list. After the audit, *Next* is whatever the operator does next.
  A plugin cannot clear or compact the context itself; the operator's two commands do it. If the
  operator says to go on here, go on.
- **After `/clear`.** The `skill-resume` hook tells the new session which showcase is unfinished and at
  which step; `/showcase` then runs `continue`.
- **What `continue` reads.** `STATE.json` first (its `pending` question is asked again; a step with
  no `scope.<key>` yet starts with its section intake), then
  `phases.md › Common mechanics`, the section of the step it resumes, and what that step names: its
  plan in `plans/`, the parts of `site.md` and `sections.md` it points to, `SOURCES.md` when the step
  plans from the reading. Never the pages already built just to have them in mind: builders read the
  files they need, you read their replies and the result.

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
   - No depth question: whether a section is made, simplified or skipped is asked before that
     section, in its intake ([Section intake](#section-intake)). Say so in one line, so the operator
     knows the questions will come.
4. Write `STATE.json` (a product without figures: `steps.charts` is `skipped` and the `charts` root is taken out of `pages.mjs`), `DECISIONS.md`
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
   one page allowed to, as it does not outlive the choice). Open it from disk for the operator and
   send its screenshot (*Show, do not describe*).
   Offer *like competitor* when a profile exists.
3. Ask (`AskUserQuestion`, header `Scheme`): A (Recommended) / B / C — the operator may type a hue or
   a hex. Record SC-002. Leave the scratch page to the build: once the step is approved and
   `steps.scheme` is `done`, the first `node build.mjs` — when step 3 has laid the frame — removes
   `scheme.html`. The Colors page under Design will show the chosen scheme.

## Step 2 — Technology

A dialog, not a lookup. Propose a stack from: what the operator has (their starter templates, if
they name them; the product's code), what the documentation implies (surfaces → platforms, offline,
integrations), and what the blueprint's architecture names. Ask per layer, 2–4 questions per round:
web client, mobile client (if a mobile surface exists), backend, data store, hosting, and the
charts library when the product has figures (the options of step 16). Options: your
recommendation first · the alternative worth considering · *what the product already uses* when
code exists; the operator types their own. Ask about the libraries the documentation leaves open
too (internationalisation, icons, charts). Record SC-003 with the reasons, the charts library as
SC-008. For every technology chosen, note its official site: the Technology stack page (step 3)
shows each with its mark, one line and that link; the Architecture page (step 17) draws them.

## Step 3 — Frame

1. Copy `templates/frame/` into the folder as it is.
2. Copy `site.mjs` with `{{NAME}}`, `{{MARK}}` (the first letter until a logo is picked),
   `{{PORT}}` (pick a free one, 4330 up), `{{LANGUAGES}}` (a JS array), `{{DEFAULT_LANGUAGE}}`.
3. Copy `pages.mjs` whole — a section is made planned only when its intake skips it (its entry
   loses its `path`, a child page too) — add domain components to the Components sections if
   the reading named them, and fit the Stack page's sections to the layers the stack has. Copy `tokens.css` and write the scheme's values into the brand block (light and dark; the
   dark brand is lighter and the foreground on it darker — check contrast; the dark values stand
   twice, under the media query and under `[data-theme='dark']`, and must be the same). Copy
   `components.css`, `sample.mjs` (fill it), `README.md`, `CHANGELOG.md`, `DECISIONS.md` if not yet,
   and `i18n/lang.js` once per non-default language as `i18n/<lang>.js`, with the frame's strings
   translated (`ui.*`, `flow.*`, `overview.how.*`, `flows.list.*`) and the `nav.*` keys for every
   page, section, child and child's section in `pages.mjs`.
4. `node tools/genPages.mjs`. Then the **Product page** (`sections.md › Product`): the frame's
   `tools/genProduct.mjs` — fill its arrays marked `FILL` from `SOURCES.md` (the tagline, the
   paragraph, the promises, what each role does and where, the modules with the first release
   marked, the main loop, one line of the sample company); keep its rendering, which follows
   `sections.md`. It writes `index.html` over its starting page from them and `sample.mjs` — what it is, who uses it, the modules, how it works (the main loop drawn), the
   sample company, and *About this site* with `<div data-catalog></div>`, where the content comes
   from and how to read the site (the `overview.how.*` keys of the starting page), then the list of
   its child pages (`<div data-children></div>`).
5. The **Technology stack** page (`sections.md › Technology stack`): `node tools/fetchTechMarks.mjs
   <slug> …` once with the Simple Icons slug of every technology in SC-003 (`name=url` for one Simple
   Icons lacks: an SVG or PNG from the project's own site, or its GitHub organisation's picture,
   `https://github.com/<org>.png`, when that is the project's logo and not a person; none fits → the
   initials); then fill `LAYERS` and `LEAD` of the frame's `tools/genStack.mjs` — every technology
   of SC-003 by layer, with its version, its Simple Icons slug, one line of what it does in this
   product and its official site — and run it: it writes `product/stack.html` with the marks of
   `assets/tech/marks.json`. Add the keys both pages introduce to every dictionary.
6. `node build.mjs`, `node open.mjs` — the operator sees the whole site with the menu, the theme and
   language switches, the Product page, the stack, and every other section as a starting page. Gate.

## Steps 4–5 — Foundations, Logo

Each follows the same shape: **plan → approve → build in parallel → build.mjs → gate**.

- **Foundations (4).** Finish `tokens.css` (type scale with the fonts decided, spacing, radii,
  shadows, motion, sizes; categorical colors). Write `tools/genFoundations.mjs`: the Design pages
  Colors, Typography, Spacing and layout, Radius and shadows and Motion (`design/*.html`, the
  sections in `sections.md › Design`), with swatches, token values and contrast rows as showcase.js
  expects (`site.md › Live values`); and the Design root page, `design/index.html`: the system in
  one screen — the brand color, the type, a button, a card — above the list of its pages. Font choice is a question when the documentation does not
  settle it (two proposals, with the reason).
- **Logo (5).** Plan: 6–12 ideas for a mark, each from a concept in the product (a thing, an
  action, the initial, the domain) — one line each. Approve. `tools/genLogo.mjs`: each mark an
  SVG on a 64-unit grid in `currentColor` with `var(--lg-ground)` knockouts; the side-by-side
  section at one size on light and dark, then at menu size (28 px) and tab size (16 px); the
  sizes section, on `design/logo.html`. The operator picks → `pick logo <id>` → `site.mjs › mark`
  becomes that SVG. Then the **Loaders** page, `design/loaders.html`, in the same step: plan 3–5
  loaders, each a motion of the picked mark's own parts (they turn, light up in turn, draw, beat)
  with what it is for — a button or a row at 16 px, a panel, a long wait, the start of the
  application — one line each; approve (`plans/loaders.md`); `tools/genLoaders.mjs` draws them as
  the Loaders item of `sections.md › Design` says, the keyframes in `components.css › Loader`. The Logo gate shows
  both pages.

## Steps 6–8 — Components, Icons, Illustrations

The shape of steps 4–5: **plan → approve → build in parallel → build.mjs → gate**.

- **Components (6).** Plan: the standard set in `pages.mjs` + the product's own from the reading
  (a capability that needs a component the standard set lacks) + a reserve for later (name why
  each might be needed). Approve. Subagents per group (inputs; display; feedback; navigation;
  shell), each writing its part of `components/index.html` as `tools/parts/components/<group>.mjs`
  — variants, states, sizes and a properties table per component, each naming its source or
  `proposed`, the words from the documentation and the sample world (*Words* above) — and returning its `components.css` blocks;
  `tools/genComponents.mjs` puts the parts together. Restyle the starter classes to the project.
  Samples use the cast and data of `sample.mjs`.
- **Icons (7).** Two kinds only, nothing else is drawn: **base** — the standard icons the components,
  the shell and the planned screens use (actions, navigation, status, files), named and drawn as the
  icon library chosen in step 2 has them; and **from the domain** — the product's own subjects the
  library has no fit for (for a carbon product: a scope, an emission source by kind, a factor, a
  meter, a site by type, lineage), drawn in the same grid and stroke. No icon is added because a set
  "should have it": each names where it is used. Plan the two lists with that column; approve
  (`plans/icons.md`). The sprite in `assets/showcase.js` is the start — what it holds beyond the
  two lists is removed; `design/icons.html` shows the two groups with names, the grid and the rules.
- **Illustrations (8).** A root section of its own. Plan, in two lists: **for states** — a picture
  for every state a screen can be in (empty, nothing found, error, no access, locked or closed,
  offline when the product has it, done) — and **from the domain** — the scenes of the product's
  world the reading gives (its places, its objects, its moments: a first setup, an import, an
  approval, a report ready, a target reached), each named after where it will sit (onboarding, a
  sign-in panel, a letter, an announcement, the 404) — plus a reserve. Approve. `tools/genIllustrations.mjs`:
  SVG symbols drawn only with `--ill-*` tokens (added to `tokens.css`, derived from the scheme), no
  text, no faces; the sections For states, From the domain, In place and Reserve. **Every picture
  moves** — a minimal animation of its own that tells its story (the cushions of an empty tray
  settle, a loupe drifts and pauses, a lock gives one small rattle, a parcel travels its legs):
  small amplitudes, slow, the easings of the tokens, no bounce or overshoot; once on coming into
  view and again on Replay, looping only where waiting is the meaning (a signal, sand running, a
  scan). CSS keyframes on classes inside the symbol, durations and easings from tokens; under
  `prefers-reduced-motion` every one stops on its last frame, which is the complete still picture.
  Each block carries the *Moving* tag and a replay control.

## Steps 9–13 — States, Layouts, Key screens

- **States (9).** One section per state: the picture (from Illustrations), the words (from the
  documentation, as *Words* above says), the action; where it appears in the product; the loading section shows skeletons
  and when a spinner is right instead.
- **Layouts (10–12)** — a root section of its own, `sections.md › Layouts`; its three pages are three
  steps, each **plan → approve → build → pick**, and pictures lead every one of them. A variant's plan
  line names its composition **and its scene**: which picture from Illustrations, or which new one,
  what moves in it, what it shows still. Scenes are drawn on the session's model, on `--ill-*` tokens,
  their motion in CSS keyframes on tokens, still and complete under reduced motion; a new scene goes
  into `assets/illustrations.js` and onto Illustrations' *In place*. When Illustrations is planned
  away, the scenes are drawn here all the same.
  - **Auth layout (10).** Plan: 3–5 variants, each one line — a composition (form beside a panel,
    the scene full screen with the form on a card, a band above a narrow form, the data moving behind
    the form) and an animated scene, each a different idea of the product (its data moving, its
    domain drawn, its promise); every variant has one. Approve (`plans/signIn.md`).
    `tools/genSignIn.mjs`: each a `variant` with the full screen in a desktop device frame, the
    phone frame beside it, the other screens before the product (invitation, forgotten password,
    verification sent) small; the form uses the components. The operator picks one.
  - **App layout (11).** Plan: 2–4 shells — sidebar that folds to icons, sidebar with grouped
    menus, top navigation, rail + panel — each one line, with where its pictures stand (the welcome
    page of a new account, a setup card at the foot of the sidebar, a header scene, the empty state
    in the shell); most carry a moving picture, one stays plain for the contrast. Approve
    (`plans/appLayout.md`). `tools/genAppLayout.mjs`: each a `variant` with the shell around a
    real-looking page, the sidebar folded and unfolded, the menu's states, the user menu; tablet and
    phone drawn. Pick one; it becomes the shell of every later screen.
  - **Not found page (12).** Plan: 3–5 ideas, each a picture from the product's world with a moving
    detail and the 404 worked into it. Approve (`plans/notFound.md`). `tools/genNotFound.mjs`:
    `variant`s on their own full screen; pick one.
- **Key screens (13).** Plan: the screens the flows will need, from the documentation (a
  dashboard, the main list, a record, a form). Approve. One generator per screen or group,
  rendering in `device()` frames for every surface the brief gives the screen's actors, inside the
  picked shell.

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

## Steps 15–18 — Email templates, Charts, Architecture, Security

- **Email templates (15).** Plan: the common letters (invitation, verification code, password reset,
  welcome, digest, security alert) and the product's own, proposed from the flows and the
  documentation's notifications (what is sent, to whom, when) — each with its subject, its one
  action and its picture, one line each. With the plan, ask whether the letters' pictures move
  (`AskUserQuestion`, header `Motion`): **Animated GIF** — the letter's picture is its illustration's
  own animation exported as a GIF: the first frame is the complete still picture (Outlook 2007–2019
  shows only that frame; Apple Mail, iOS, Gmail and Outlook.com play it), it plays twice and rests,
  on a solid plate of the letter's color (no transparency, so a dark mail client shows no halo),
  ≤ 200 KB, hosted over https on the sending domain, with alt text, and the letter reads complete
  with images off — or **Still pictures** — the same pictures in their still pose as PNG. The answer
  is a row in `DECISIONS.md` and the first line of the plan. Animated: a `tools/exportEmailGifs.mjs`
  steps each picture's animation frame by frame in Playwright and writes `assets/email/<id>.gif`
  with no npm dependency (a small PNG decoder on `node:zlib`, a palette from the `--ill-*` tokens,
  a GIF89a LZW encoder); the letters show `<img>`s of those files, as the sent letter will, and the
  Template carries a rule card *Animated pictures* with the rules above. Approve (`plans/emails.md`). Email templates is a root section of
  its own in Design, right after Layouts, not a page under Screens: the letters stand on one page,
  `emails/index.html`, each a section of it (`sections.md › Email templates`). Right after the approval make the `sections` of the
  `emails` entry in `pages.mjs` match the plan, in the order of the page — the Template, then one
  `{ id, title, desc }` for each approved letter, the common letters first, then the product's own;
  the id is the letter's anchor, the desc one line — and add the `nav.emails.<letter id>` keys to
  every dictionary. The frame starts with the Template and the common letters; take out the ones the
  plan drops. Then:
  1. **The template** first — the one layout every letter is filled into: the brand header with
     the mark, the picture, the heading, the message, the one action button, a secondary detail
     (a code, a list, a figure), the footer with the sender and why they received it. Its parts
     and sizes are the *Template* section of the page, drawn once with each part named.
  2. **A picture per letter**, about its moment (an invitation: a door opening onto the product's
     world; a reset: a key; a digest: the week's figures; an alert: a shield), in the product's
     colors and its domain — the scenes of Illustrations reused where they fit, the rest drawn now
     into `assets/illustrations.js` the same way (`--ill-*` tokens only, no text, no faces), and
     added to the Illustrations page's *In place*. When Illustrations is planned away, drawn here
     all the same.
  3. `tools/genEmails.mjs` with `mail(...)`: every letter in the template, 600 px, shown as a mail
     client shows it, with subject and sender, the sample cast and company; the words from the
     documentation, in the product's voice or the tone the requirements set (*Words* above). It writes
     `emails/index.html`: the Template, a heading *Common letters* over those letters, a heading
     *The product's own* over the rest, each letter a `block()` whose id is the letter's. Letters
     may be built by subagents per group, each writing `tools/parts/emails/<group>.mjs`. A flow
     that shows a letter imports `letter(id, marks)` from this generator instead of drawing it
     again. `node build.mjs` — the menu lists the Template and every letter, and marks the one in
     view as the page scrolls.
- **Charts (16).** Only when the product has figures. The library is SC-008, chosen in step 2
  (ask now only if it was left open): **static SVG on tokens** (Recommended: no dependency, exact
  style, both themes free) · a vendored UMD library (Chart.js, ECharts, uPlot) when the operator
  wants live tooltips · none.
  Charts is a root section of its own in Design, right after Components, not a page under Design:
  `charts/index.html`, a section per **use** of a chart in the product (`sections.md › Charts`) —
  never a gallery of chart types. Needs the foundations (tokens), the stack's chart library
  (SC-008), and Components and the App layout (a use is drawn in the picked shell or as its card).
  1. **Plan the uses** from the documentation — the dashboards, reports, targets and comparisons of
     the blueprint or the requirements, and the key screens already drawn: one line each — name ·
     who looks at it · where it stands (screen or card) · the question it answers · chart kind ·
     the data it shows (from `sample.mjs`). A use the documentation does not support is an open
     point with a recommendation. Approve (`plans/charts.md`).
  2. Right after the approval make the `sections` of the `charts` entry in `pages.mjs` match the
     plan (`{ id, title, desc }` per use, in the order of the page) and add the `nav.charts.<use id>`
     keys to every dictionary; the entry gets its `path` (`charts/index.html`).
  3. Load the `dataviz` skill for the palette and the choice of chart forms.
     `tools/genCharts.mjs`: the intro, then a `block()` per use — the chart as inline SVG on
     tokens in the picked shell or the card, with the sample data, light and dark, and its empty
     state. Uses may be built by subagents (sonnet), several to a builder, each writing
     `tools/parts/charts/<group>.mjs`. `node build.mjs` — the menu lists the uses.
  A product without figures: `steps.charts` is `skipped` and the `charts` entry is taken out of
  `pages.mjs`.
- **Architecture (17).** A root section, drawn for the customer, not for the team. Plan: the
  diagrams the reading supports (`sections.md › Architecture`), one line each. Approve.
  `tools/genArchitecture.mjs`: each diagram an inline SVG on tokens — boxes with the technology's
  mark from `assets/tech/` where one stands for it, arrows named by what they carry, a legend — with
  two or three sentences beside it of what it shows; the one-request section numbered step by step.
  Load the `artifact-diagramming` skill when it is available for how to draw a diagram that shows
  the real mechanism and stays legible in both themes.
- **Security (18).** A root section after Architecture, in the customer's words — for the buyer,
  their IT and the procurement questionnaire that asks "where does our data live and who can see
  it" before anyone asks about a feature. Plan from what the documentation already decided — the
  blueprint's cross-cutting concerns (access control, audit and history, review and locking,
  personal data), its access module (sign-in, roles and scopes, invitations), the Architecture's
  *Where it runs*, the security letters of Email templates: one line per claim under the six parts of
  `sections.md › Security`, each marked *done*, *planned* or *not promised*. A claim the
  documentation does not support is an open point with a recommendation, not a sentence on the
  page. Approve (`plans/security.md`). `tools/genSecurity.mjs`: a `block()` per part, each a few
  short paragraphs of what it means for the customer — the consequence, not the mechanism: no
  library names, no acronym without the thing it does — with one drawing on tokens where it helps
  (the data's path with its locks, the roles over the structure; the `artifact-diagramming` skill
  as for Architecture); a planned claim carries the `ui.planned` tag. The last part says what is not
  promised — a certification not held, a check not yet run, a figure not yet set — and whom to ask.
  Never a certification that was not obtained, never a figure (a recovery time, a retention period)
  the documentation did not set.

## Step 19 — Principles, Decisions, Changelog, Next steps

- **Principles.** 5–7, from the brief's goals and the decisions: each a sentence, a reason, a
  *do* and a *don't* drawn with the components. Ask the operator to confirm the list first.
- **Decisions.** `tools/genDecisions.mjs` from `DECISIONS.md`: one card per decision, the
  options as thumbnails or lines, the chosen one marked, the reason; a link to the variant.
- **Changelog.** `tools/genChangelog.mjs` from `CHANGELOG.md`, which has had a dated entry per
  gate since step 3; it runs again at every later gate.
- **Product page.** `tools/genProduct.mjs` again, so *About this site* and where the content
  comes from describe the site as it now stands.
- **Next steps.** The queue: what the site will get next, in order (planned sections, flows
  deferred, the reserve components). The ideas: proposals for the product beyond the
  documentation — each a title, one paragraph of what and why, where it came from. Ask the
  operator which ideas to keep.

## Step 20 — Audit

The checks in [site.md › Audit](site.md#audit), run on both themes and every language. The
mechanical ones — every page there, build idempotent, no values outside tokens, the dark sets
agreeing, every `data-i18n` key in every dictionary — are the script's `check`: run it and fix what it
lists, without grepping the site by hand. Then by looking: no overflow in device frames and flows in
the longest language, contrast rows all pass, animations still under reduced motion, every page
reachable from the menu and the catalog. With Playwright available,
screenshots of every page in both themes into `screenshots/`. Fix what is mechanical; the rest is
a question or a Next steps entry. Final gate; `STATE.json.step = "done"`.

---

## Other modes

**`status`** — read `STATE.json`, `DECISIONS.md`, `pages.mjs`; report steps and states, flows and
their stage, picks made and pending, planned sections. Write nothing.

**`section <id>`** — the step for that section, alone: its section intake again (the current
answer recommended) → plan (or re-plan, keeping what the operator approved unless they say
otherwise) → build → gate.

**`flow <id>`** — the description and build of one flow; `flow new` runs step 14's two approvals
for a new one and adds it to the list.

**`pick <section> <variant>`** — confirm the variant exists; set `site.mjs › selected[section]`;
on the page: the chosen variant first with the `Selected` mark, the others `Alternative`; for
`logo`, `site.mjs › mark` becomes the mark's SVG; fill the group's row in `DECISIONS.md` (SC-004
to SC-007; a group made with `add` gets the next `SC-nnn`); regenerate the Decisions page once
`tools/genDecisions.mjs` exists; `node build.mjs` (for `logo` it redraws the tab's icon from the mark); an entry in `CHANGELOG.md`.

**`add`** — a page or a section outside the standard list: ask what, where in the menu, a
generator or hand-written; add to `pages.mjs`; `genPages` for the start; build.

**`audit`** — step 20 alone, at any time.

**`open`** — `node open.mjs` from the showcase folder (background), tell the operator the address.
