---
name: illustrations
description: Draws the illustration set of a project from what its documentation says — fifteen marks for a logo and the loaders made from the one picked, a picture for every state a screen can be in (empty, nothing found, no access, 404, offline, done and the product's own), scenes from its world, and a full page of email templates with a picture per letter — every picture themable, animated where that tells its story, and reviewed by the operator on one shared page with tabs and two themes before a single file is saved into illustration-samples/. Reuses a showcase's scheme and reading; a showcase reuses the set. Human-invoked only.
argument-hint: "[init [dir] | continue | status | tab <id> | revise | pick logo <id> [<id>…] | add | publish | save | check]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(find:*), AskUserQuestion, Agent, Artifact, SendUserFile
---

# Illustrations

You draw the pictures a product is recognised by, before the product exists: its **mark** and the
**loaders** made from it, a picture for every **state** a screen can be in, the **scenes** of its
world, and its **letters** with a picture each. Two readers look at the result: the **customer**,
who should see their product's character in the first minute, and the **team**, who will put every
picture in place and needs it themable, light and dark, still under reduced motion, and in one
sprite.

Nothing is drawn in the abstract. Every picture comes from the documentation — the product's
objects, places and moments, its states, its letters — and is drawn in the project's own scheme.
The operator decides every fork; and they decide from pictures, never from descriptions: every
tab is published as a **shared page** the moment it is drawn, reviewed there in both themes,
revised picture by picture, and approved; only when every tab is approved is the set **saved** into
the project.

## How to read the arguments

`$ARGUMENTS` picks the mode. With no argument, look for an existing set (`STATE.json` with
`"kind": "illustrations"` under the project, skipping `node_modules`): found → `continue`; none →
`init`.

| Argument | What to do |
|----------|------------|
| *(none)* | `continue` when a set exists, `init` when none does |
| `init [dir]` | choose the folder, read the documentation (or take a showcase's reading), settle the scheme, then the tabs in order |
| `continue` | read `STATE.json`, resume the step it is in — from the files, in a fresh context (`phases.md › A fresh context`) |
| `status` | the steps and their state, the rounds of review, the picks, the page's address, what waits for the operator; change nothing |
| `tab <id>` | make or remake one tab — `scheme`, `direction`, `logo`, `loaders`, `icons`, `states`, `scenes`, `onboarding`, `emails`, `reserve` — through its intake, plan, drawing and review |
| `revise` | take the operator's revisions from the chat for the tab in review, redraw those pictures only, rebuild, republish, ask again |
| `pick logo <id> [<id>…]` | the first id is the primary mark, the rest the shortlist the loaders are made from |
| `add` | a picture the catalog lacks, into one tab, through that tab's review |
| `publish` | build the review page and publish it as an artifact (or republish to the same address); tell the operator the address |
| `save` | the script's save: every tab approved → the files moved out of `review/`, the page, manifest and sprite written |
| `check` | the script's checks on the drafts (or on the saved set); fix what it lists |

The procedure step by step is in [references/phases.md](references/phases.md); what to draw — the
catalog of states, scenes and letters, with what to propose beyond it — in
[references/catalog.md](references/catalog.md); how to draw so that a picture is themable,
clash-free and animated well, in [references/drawing.md](references/drawing.md); how the review
page, the manifest and the artifact work, in [references/page.md](references/page.md). Read the
part you need before acting.

## Rules that never bend

**Every value is a token.** A picture is drawn only with the `--ill-*` tokens; a mark, a loader and
an icon with `currentColor` and the `--lg-*` tokens (the ground, two accents, a soft fill — a mark
may be one color or several, but every color is one of these); durations are the
`--ill-duration-*` tokens. No hex, no named color, no literal millisecond anywhere but `tokens.css`.
This is what makes two themes, a scheme change and the reuse in a showcase or the product a matter
of one file. The script's `check` refuses anything else.

**One page holds every picture**, so no picture may clash with another: no `id` attribute inside a
drawing, no gradient, filter or mask (they need ids), and every class and keyframe starts with the
picture's own id (`empty__lid`, `empty-settle`). `check` refuses a clash.

**The manner first, the number after.** Nothing is drawn fifteen or thirty times before the
operator has chosen how the set is drawn: the Direction step shows three manners on sheets of four
samples each, and a big tab (States, Scenes, Onboarding, Email templates) starts with a trial of a
few pictures reviewed before the rest. A revision of the manner is then cheap.

**The operator sees before choosing.** Nothing is approved from words: the tab is built and
published, the operator looks at it in both themes, and only then do you ask. Revisions come **in
the chat**, each naming a picture by its id (`states/empty`) and what should change; you redraw
those pictures and nothing else, republish to the same address, and ask again. A tab is approved by
the operator, in a question, never assumed.

**Nothing is saved before every tab is approved.** While a review is on, the drawings live under
`review/` of the working folder; the project gets the set — the files, the page, the manifest, the
sprite — in one `save`, run by the script, which refuses while a tab is not approved. A hand edit
to a saved SVG is kept: you never overwrite a saved file without asking.

**State lives on disk.** `STATE.json` holds the step, the round of each tab, the picks, the
artifact's address and the question waiting for an answer; `DECISIONS.md` the choices;
`review/manifest.json` every picture's id, title, idea, file and words; `CHANGELOG.md` what each
round changed. Re-read them on `continue`; trust them over what you remember.

**The set is in the interface language of the project** — the words of the states and the letters;
English unless the documentation or the operator says otherwise. The skill's own files are English.

## What goes in

Read the documentation of the project the way `/showcase` does, and before that look for what is
already there:

- **A showcase** (`STATE.json` with `"kind": "showcase"`): its `SOURCES.md` is the reading — take it
  instead of reading again; its `tokens.css` is the scheme — copy its values into this set's
  `tokens.css` (the brand, the neutrals, the `--ill-*` tokens if it has them); its `sample.mjs` is
  the cast and company the letters are addressed to; its `plans/` name the states, flows and letters
  it already decided; its `plans/emails.md` and `DECISIONS.md` the letters' motion. A mark the
  showcase picked (`site.mjs › mark`) is the mark — the Logo tab then shows it and proposes only
  what the operator asks for.
- **A design baseline** in the documentation — tokens, a palette, a logo, drawn screens, a
  Figma export: the scheme and the mark follow it, and the set proposes only where it is silent.
- **References the operator gives** at Intake — pictures they like, sites, brands, a mood board,
  as files or addresses: a reader describes each one's traits (line, angle, detail, palette, mood,
  motion) into `SOURCES.md › References`; the Direction step builds its proposals from them.
- **The documentation itself** otherwise — requirements, a blueprint (`01-brief.md`,
  `02-architecture.md`, `GLOSSARY.md`, module files), feature files, notes — read by subagents, one
  per group, returning under fixed headings: the product in a paragraph; the actors; the objects,
  places and moments of the domain (what a picture can show); the states the screens name; the
  letters sent and when; brand hints (name, colors, fonts, logo, tone); constraints (languages, a
  dark theme, accessibility); design decisions already taken.

The **color scheme** is a dialog unless something already fixes it: a showcase, a design baseline,
or values the documentation states. Then it is confirmed in one question, and the *Color scheme* tab
shows it alone. Otherwise three proposals are drawn onto the page — the *Color scheme* tab, each
scheme on its own strip of mini-UI and a sample picture — published, looked at in both themes, and
chosen; the tab stays in the set with the chosen scheme marked and the alternatives beside it, so
the customer sees what was considered.

## The output folder

Default `illustration-samples/` at the project root; the operator always gets to change it. Look at
what exists, then ask (`AskUserQuestion`, header `Folder`): **`illustration-samples/`
(Recommended)** — with a note if something is already there — plus one or two alternatives
(`docs/illustrations/`, next to a showcase); any path may be typed. A directory given in the
argument becomes the recommended option. Never lay a set into a non-empty folder without the
operator confirming that folder; an existing set there is resumed, not replaced.

Writes stay in the working folder: nothing is created outside it, not even for a moment.
The working folder is the set's folder chosen at Intake, wherever it is. `STATE.json`, `tokens.css`,
the decisions, the drafts under `review/`, the page the artifact is published from, screenshots —
everything is created inside it; never the project root, `docs/` above the folder or any temporary
place, by you or by an agent; a subagent's brief names files inside the folder.

```
illustration-samples/
├── STATE.json · DECISIONS.md · CHANGELOG.md · README.md
├── tokens.css                      every value, light and dark — the scheme
├── review/                         while a review is on; removed by the save
│   ├── manifest.json               every picture: id, title, idea, file, words, tags
│   ├── direction/ logo/ loaders/ icons/ states/ scenes/ onboarding/ emails/ reserve/   the drafts, <id>.svg
│   ├── index.html · artifact.html  the review page (from disk; the fragment the artifact is published from)
│   └── screenshots/                the page per theme, when a browser is at hand
└── after the save:
    ├── manifest.json · index.html · artifact.html
    ├── direction/ logo/ loaders/ icons/ states/ scenes/ onboarding/ emails/ reserve/
    └── illustrations.js            the sprite: every picture as a <symbol>, with its styles
```

The templates come from `${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`: `STATE.json`,
`manifest.json`, `tokens.css`, `README.md`, `DECISIONS.md`, `CHANGELOG.md` are copied with their
`{{placeholders}}` filled; `page/` is the frame the script builds the page from and stays in the
plugin; `examples/` holds one drawing of each kind — a mark, a loader, an icon, a state picture, a
letter's picture — that passes every check: read them before drawing, and never copy one into a set as if it
were the project's.

## The script

`node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" <command> <dir>` does the mechanical parts, the
same way every time, so that you draw and decide, and never assemble a page by hand:

| Command | Does |
|---------|------|
| `build <dir>` | the review page from `review/manifest.json` and the SVG files: `review/index.html` (opens from disk) and `review/artifact.html` (the fragment the `Artifact` tool publishes); after the save, the set's own `index.html` and `artifact.html` |
| `check <dir>` | the manifest (every file there, ids unique and kebab-case, one mark and one scheme selected, a loader's mark known), every SVG (tokens only, no id, text, gradient or raw duration, its classes and keyframes its own, a size warning), the two dark sets of `tokens.css` |
| `save <dir>` | refuses while a tab is not `approved` in `STATE.json` or no scheme is marked chosen; otherwise moves every file out of `review/`, writes `manifest.json`, the page, `illustrations.js`, removes `review/`, marks the state done |
| `sprite <dir> [--out <file>]` | the set as `<symbol>`s in one script — `lg-<id>` a mark, `ld-<id>` a loader, `ic-<id>` an icon, `ill-<id>` a picture — for a showcase or the product |

Run `check` before every publish and fix what it lists; run `build` after every change to the
manifest or a file; never edit `index.html` or `artifact.html` by hand.

## The page

One page, tabs along the top — **Overview** (the colors every picture is drawn with, the status of
each tab, how to review) · **Color scheme** · **Direction** · **Logo** · **Loaders** · **Icons** · **States** ·
**Scenes** · **Onboarding** · **Email templates** · **Reserve** — a theme switch (light · dark · system) that
every picture follows, a switch between the schemes considered that redraws every picture on the
one the viewer picks (the chosen scheme is the page's own), a *Replay* on every moving picture and
*Replay all* on a tab, and on every picture a chip with its id that copies `tab/id` for a revision. It is self-contained: tokens, styles,
scripts and every drawing inline, no network, so it opens from disk and publishes as one artifact
(`page.md › Publishing`). Published, it has an address the operator can send to their customer; the
address stays the same through every round.

## The order of making

Each step from 1 to 10 starts with its **tab intake** — full, simplified or skipped, and what to
take into account (`phases.md › Tab intake`) — and ends with the operator's approval of the tab on
the page. The key is the step's name in `STATE.json › steps`.

| Step | Key | Makes | Needs |
|------|-----|-------|-------|
| 0 Intake | `intake` | the folder, the reading (or a showcase's), the name, the language, the cast the letters go to | — |
| 1 Color scheme | `scheme` | the tokens — from a showcase or a design baseline, confirmed; otherwise three schemes on the page, one chosen; the tab stays, the chosen one marked | the reading |
| 2 Direction | `direction` | **the manner of the whole set, settled before anything is drawn in number**: three directions, each a sheet of four samples — a mark, an icon, a state, a letter band — in one hand, told apart by line, angle, detail, accent and motion, built from the references and the reading; one chosen, or mixed; its sheet becomes the builders' reference | 1, the references |
| 3 Logo | `logo` | **15 marks** from ideas in the product, on three grounds and at five sizes, with the wordmark; reviewed; one picked as primary and two or three shortlisted | 1 |
| 4 Loaders | `loaders` | for the primary mark and each shortlisted one, 3–5 loaders from the mark's own parts, at 64 / 32 / 16 px, one determinate; in place | 2 |
| 5 Icons | `icons` | the icons of the product's own subjects, on the 16 px grid in the mark's manner, at 16 / 20 / 24, each with where it is used | 2 |
| 6 States | `states` | a picture for every state a screen can be in — the catalog's and the product's own — each with its words and its action, drawn in place; **a trial of 3–4 first**, reviewed, then the rest | 2 |
| 7 Scenes | `scenes` | scenes from the product's world — a sign-in panel, a hero, an announcement, the 404, a letter's band | 1 |
| 8 Onboarding | `onboarding` | the first minutes with the product — the welcome, the first thing to do, the setup's steps, the empty workspace, the tour — each with its words | 1, 5 |
| 9 Email templates | `emails` | the template with its parts named, then every letter — the common ones and the product's own — filled in, a picture each; a trial of 3 letters first | 3, 2 |
| 10 Reserve | `reserve` | pictures for situations the product will meet later, each with when; proposed from the catalog and the documentation | 5 |
| 11 Save | `save` | every tab approved → `save`; the sprite; the README; the set published once more as the saved set | all |

## Variants and picks

The marks are **fifteen**, because a customer chooses better between things than from a
description, and a logo is the choice they care most about. `pick logo <id> [<id>…]` marks the
first `Selected` and the others `Shortlist`, writes `STATE.json › selected`, fills IL-002 and IL-003
in `DECISIONS.md`, rebuilds and republishes; the loaders are then made from the selected mark and
the shortlist, so the operator sees two or three marks in motion before settling.

## Progress

The operator always sees which stage the run is in, what is done and what comes next.

- **The checklist.** When a mode starts, show its stages from the table below, one per line: `✓`
  done, `▸` the current one, `·` still to come, `–` skipped, `✗` failed. Show it again at every
  approval and at the end, with the marks brought up to date and where the result is. When the
  session has a task-list tool (`TaskCreate` and `TaskUpdate`, or `TodoWrite`), mirror the stages
  there, one item per stage, and keep the items current; without one, the checklist in the chat is
  enough.
- **The line.** At every change of stage or step, one line:
  `▸ /illustrations · <n>/<N> <stage> · <step>`, plus `· <k>/<m>` while units are counted —
  `▸ /illustrations · 4/12 Logo · drawing · 9/15`. The marks, the numbers and the command are
  fixed; the stage and the step are in the operator's language.
- **Units.** A stage that works through units — document groups read, marks, loaders, pictures,
  letters, revisions — counts them in the line, and the task list gets an item per unit while there
  are twelve or fewer.
- **Waits.** Before subagents start, say what they draw, how many, and that you wait for them; as
  each returns, the line with the count, and a failure by name. At a review or a question, the line
  says the run waits for the operator, for what, and the page's address.
- **Resume.** `continue` and `status` show the checklist rebuilt from `STATE.json` (`steps`,
  `rounds`, `selected`, `pending`) before anything else, so the operator sees where the last session
  stopped.

| Mode | Stages |
|------|--------|
| `init [dir]`, `continue` | Intake → Color scheme → Direction → Logo → Loaders → Icons → States → Scenes → Onboarding → Email templates → Reserve → Save |
| `status` | Read the state → Report |
| `tab <id>` | Tab intake → Plan → Approval → Draw → Publish → Review → Approve |
| `revise` | Read the revisions → Redraw → Publish → Review |
| `pick logo <id>` | Check the marks → Mark them → Decisions → Publish |
| `add` | What and where → Draw → Publish → Review |
| `publish` | Build → Check → Publish → The address |
| `save` | Check the approvals → Save → Sprite → Report |
| `check` | Checks → Report |

## What this skill does not do

- **Write a value outside `tokens.css`**, or a page by hand that the script builds.
- **Choose for the operator** — the scheme, the mark, the shortlist, the list of states and letters
  are theirs; you recommend.
- **Approve a tab yourself**, or save before every tab is approved.
- **Overwrite a saved file** without asking, or touch anything outside the working folder.
- **Draw words into a picture** — a state's heading and action are text beside it, so they need no
  redrawing per language — or faces, which date a picture and exclude someone.
- **Take a revision from anywhere but the chat.** The page is for looking; what should change is
  said to you, picture by picture.
- **Invent the product.** What a picture shows comes from the documentation and the decisions; a
  gap is a question, and an idea beyond the documentation is a proposal in the plan, marked as one.
- **Pull from the network at view time.** The page is self-contained; no font, script or image is
  loaded from elsewhere.

## Done when

- `STATE.json` shows every tab `approved` or `skipped`, `save` done and `step` `done`.
- `check` reports no error on the saved set; `build` writes the same page twice.
- The folder holds `manifest.json`, `index.html`, `artifact.html`, `illustrations.js`, `tokens.css`,
  the SVG files of every tab and no `review/`; `README.md` says how to use them.
- Every variant group has its pick in `STATE.json › selected` and its row in `DECISIONS.md`.
- The operator has looked at the page in both themes, on the artifact's address or from disk, and
  said the set is theirs.
