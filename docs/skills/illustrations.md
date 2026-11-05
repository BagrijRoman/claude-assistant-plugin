# illustrations

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/illustrations [init [dir] \| continue \| status \| tab <id> \| revise \| pick logo <id> [<id>…] \| add \| publish \| save \| check]` | a human only (`disable-model-invocation`) | [bin/illustrations.mjs](../../bin/illustrations.mjs) `build`, `check`, `save`, `sprite` — see [The script](#the-script) | 0.24.0 |

Files: [skills/illustrations/SKILL.md](../../skills/illustrations/SKILL.md) (the entry point),
[references/phases.md](../../skills/illustrations/references/phases.md) (the procedure per step),
[references/catalog.md](../../skills/illustrations/references/catalog.md) (what to draw: states,
scenes, onboarding, letters, reserve), [references/drawing.md](../../skills/illustrations/references/drawing.md)
(how to draw: tokens, composition, animation, marks, loaders, icons),
[references/page.md](../../skills/illustrations/references/page.md) (the manifest, the page, the
artifact, the sprite), [skills/illustrations/templates/](../../skills/illustrations/templates/)
(the tokens, the page frame, one example of every kind).

## Why

A product is recognised by its pictures before it is recognised by its screens: the mark in the
tab, the loader that is the mark in motion, the empty tray on the first list, the door on the
invitation letter. `/showcase` draws them as one step among twenty, inside a site the customer
reads top to bottom, and the operator chooses between pictures described in a chat. This skill
makes the pictures the whole job: fifteen marks instead of a few, every state of the catalog and the
product's own, a page of letters, a reserve — drawn to one hand, on tokens, light and dark, and
reviewed where a picture can be judged: on one page with tabs, published as a shared artifact, in
both themes, with every animation replayable. The operator revises picture by picture through the
chat, approves tab by tab, and the set reaches the repository in one save when every tab is theirs.

The mechanical parts are a script — the page built from a manifest and the SVG files, the checks
that keep every picture themable and clash-free, the save, the sprite — so the model draws and
decides, and never assembles a page by hand. A showcase takes the saved set instead of drawing its
own; the set takes a showcase's scheme and reading instead of asking again.

## What it does

### Modes

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when a set exists, `init` when none does |
| `init [dir]` | choose the folder, read the documentation (or take a showcase's reading and scheme), settle the scheme, then the tabs in order |
| `continue` | resume the step in `STATE.json` |
| `status` | steps, rounds, picks, the page's address; change nothing |
| `tab <id>` | make or remake one tab through its intake, plan, drawing (a trial first on a big tab) and review |
| `revise` | apply the operator's revisions from the chat to the tab in review, republish |
| `pick logo <id> [<id>…]` | the primary mark and the shortlist the loaders are made from |
| `add` | a picture the catalog lacks, into one tab |
| `publish` | build and publish the page as an artifact, or republish to the same address |
| `save` | the script's save, once every tab is approved |
| `check` | the script's checks |

### Input and output

The skill reads the documentation through subagents the way `/showcase` does, or takes a showcase's
`SOURCES.md`, `tokens.css`, cast, mark and plans when one exists; a design baseline in the
documentation fixes the scheme and the mark. References the operator gives at Intake — pictures,
sites, brands — are read for their traits (line, angle, detail, palette, mood, motion), never copied. It writes into the documentation's `illustrations/`
folder — the documentation repository when the project has one and it is reachable, else the
project's `docs/`, else `illustration-samples/` at the root — proposed in a dialog with the
documentation first and alternatives after; whatever folder is chosen is its working folder, and writes stay in it: nothing is created outside it, not even for a moment. While a review
is on, the drafts live under `review/`; the set itself is written by the save.

```
<docs>/illustrations/          (the folder chosen at Intake)
├── STATE.json · DECISIONS.md · CHANGELOG.md · README.md · SOURCES.md
├── tokens.css                     every value, light and dark
├── plans/<tab>.md                 the approved plan of each tab
├── review/                        until the save: manifest.json, <tab>/<id>.svg, index.html, artifact.html, screenshots/
└── after the save: manifest.json · index.html · artifact.html · illustrations.js
    · direction/ logo/ loaders/ icons/ states/ scenes/ onboarding/ emails/ reserve/   <id>.svg
```

### The page

One self-contained page — tokens, styles, scripts and every picture inline, nothing from the
network — with tabs along the top: **Overview** (the colors every picture is drawn with, each tab's
status, how to review) · **Color scheme** (the schemes considered on strips of mini-UI, the chosen
one marked; it stays in the set) · **Direction** (the manners considered, each a sheet of four
samples — a mark, an icon, a state, a letter band — the chosen one the hand of the set) · **Logo** (the lineup of every mark on three grounds and at 16
px; a card per mark with the wordmark and five sizes) · **Loaders** (each at 64 / 32 / 16, the
determinate one at four shares, three in-place samples) · **Icons** (the domain's own, at 16 / 20 /
24) · **States** · **Scenes** · **Onboarding** · **Reserve** (each picture at its size and in place
with its words) · **Email templates** (the template with its parts named, then every letter at 600
px with its picture). A theme switch that every picture follows, a switch between the schemes considered that redraws
every picture on the one the viewer picks (the chosen scheme is the page's own values), *Replay* on
every moving picture,
a chip with the picture's id that copies `tab/id` for a revision; `?theme=` in the address for a
screenshot; reduced motion rests every animation on its last frame, which is the complete picture.

The page is published with the session's `Artifact` tool as `review/artifact.html` (the fragment the
tool wraps) — the first time with an icon and a description, every later time to the same address,
so the operator and whoever they sent it to see each round where the last one was. After `/clear`
the new session reads the artifact before publishing to it again. Without the tool, the operator
opens `review/index.html` from disk.

### The order of making

**Intake** (the folder; a showcase found and taken; or the reading; the name, the language, the
cast; the empty page published once, so the address exists from the start) → **Color scheme**
(confirmed from a showcase or a baseline, or three proposals on the page, one chosen) →
**Direction** (three manners on sheets of four samples each, built from the references and the
reading, told apart by line, angle, detail, accent and motion; one chosen or mixed, before anything
is drawn in number) → **Logo** (fifteen marks from five ideas tried three ways; the lineup looked at; a primary picked and two or
three shortlisted) → **Loaders** (3–5 per mark of the primary and the shortlist, one determinate;
in place) → **Icons** (the domain's own subjects in the mark's manner) → **States** (the catalog's
and the product's own, each with words and action; a trial of four reviewed before the rest) → **Scenes** (a sign-in panel, a hero, an
announcement, the 404, a letter band, the domain's moments) → **Onboarding** (welcome, first step,
setup steps, empty workspace, tour) → **Email templates** (the common letters, the ones beyond
them, the product's own; a picture each; a trial of three letters first) → **Reserve** → **Save**.

Before every tab the skill asks whether it is wanted — **full**, **simplified** (a reduced scope
per tab, in `phases.md › Tab intake`) or **skipped** — and what to take into account; the wishes go
word for word into the plan and every builder's brief. Every tab is a plan the operator edits, then
drawn by builders on the session's model (the drawing is what the customer chooses between), then
published and reviewed: **Approve** / **Revise** — the revisions in the chat, each naming a picture
by its id, applied to those pictures and nothing else — / **Stop here**. After an approval the skill
recommends a fresh context and says why; the [skill-resume](../hooks/skillResume.md) hook tells the
new session where the set stands.

## Progress

The skill shows where it is at every step: a checklist of the mode's stages when it starts, at every
gate and at the end; a line `▸ /<command> · <n>/<N> <stage> · <step>` at every change; what it waits for
and how many; and, on `continue` or `status`, the checklist rebuilt from its state first
([rule 8](README.md#rules-every-skill-follows)). The stages per mode, as its `SKILL.md` lists them:

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

## What it will not do

- Write a color, font, radius or duration anywhere but `tokens.css`; draw a picture with anything
  but its family of tokens; put an id, a gradient, a text or a raw duration into a picture.
- Build the page by hand, or save before every tab is approved.
- Choose the scheme, the mark, the shortlist, the list of states or letters for the operator.
- Take a revision from anywhere but the chat, or approve a tab without the operator's answer.
- Overwrite a saved file without asking; touch anything outside the working folder.
- Draw words or faces into a picture; invent what the product does.
- Load anything from the network when the page is viewed.

## The script

[bin/illustrations.mjs](../../bin/illustrations.mjs) `<command> <dir>`, `<dir>` the set's folder
(its `STATE.json` must have kind `illustrations`; otherwise exit 1):

| Command | Does | Reports |
|---------|------|---------|
| `build <dir>` | the page from `review/manifest.json` and the SVG files (or from the saved set's `manifest.json`): every file parsed once, its styles into the head once, a `<symbol>` per id, the tabs in the manifest's order, a direction's samples as a sheet — `index.html` (a whole document) and `artifact.html` (the fragment to publish) | `Wrote review/index.html and review/artifact.html with 42 pictures`; a file that is not an SVG stops it |
| `check <dir>` | the manifest: every file there, ids kebab-case and unique per tab, at most one mark selected, a loader's mark known, a saved scheme tab with a chosen scheme and a saved directions tab with a chosen direction, a direction's samples of a known kind with files, a file outside its tab's folder (warning); every SVG: a viewBox, no raw color (hex, a color function, a named value, a token of another family), no `<text>`, `<image>`, gradient, pattern, filter, mask, clip or marker, no `id`, every class and keyframe starting with the picture's id, every animation on a `--ill-duration` token, a size over 24 KB (warning); `tokens.css`: the two dark sets declare the same tokens with the same values, every dark token has a light one | `error: review/states/empty.svg:12 — the color #abcdef is a raw value; draw with --ill-* tokens`, one per line; exit 1 on an error |
| `save <dir>` | refuses while a tab is not `approved` in `STATE.json` (names them), while the scheme tab has no chosen scheme or the directions tab no chosen direction, or while a named file is missing; otherwise moves every file out of `review/` into the set's folder (a scheme's sample too), writes `manifest.json`, `index.html`, `artifact.html` and `illustrations.js`, removes `review/`, marks `save` done and `step` `done` with the date | `Saved 42 pictures into …` |
| `sprite <dir> [--out <file>]` | `illustrations.js`: one script that puts every picture into a page as `<symbol>`s (`lg-`, `ld-`, `ic-`, `ill-`) with a `<style>` of their keyframes; from the drafts while a review is on | `Wrote …/illustrations.js with 42 symbols` |

Usage errors exit 2.

## Limitations

- **Guidance plus a script, not enforcement.** The page, the checks and the save are code; the
  drawing is the model's and the operator's taste — fifteen marks exist so that there is something
  to choose from, and some will be rejected.
- **The artifact needs the `Artifact` tool.** A session without it reviews from disk; the shared
  address is then whatever the operator makes of `review/index.html`.
- **Animated letters are a promise.** Mail clients play no CSS; the page shows what the GIF will
  do, and the developer exports it later from the SVG.
- **No export.** No PNG, GIF, favicon or app-icon set is written; the developer takes what they
  need from the SVG files and the sprite.
- **Revisions by id.** A revision that names no picture is applied to the tab; one that names a
  picture that does not exist is asked about.
- **Long.** Twelve steps with a review each; it spans sessions and resumes from `STATE.json`.

## Tests

- [tests/illustrations.test.mjs](../../tests/illustrations.test.mjs) — a set laid as the skill
  lays it, with the templates' tokens and state and the five examples as drafts: the build writes
  the page and the fragment (tabs in order, one symbol per id, styles once, both dark sets, the
  lineup, the sizes, the selected mark in the top bar, the loaders' sizes and shares, the in-place
  samples, the letter's anatomy and words, the id chips, the scheme strips on their own values, the
  icons' rows, a direction's sheet with its samples as symbols and its axes); the check passes the examples and reports a raw color, a color function, a raw
  duration, a text, an id, a class, a selector and a keyframe not the picture's own, a family
  crossed, a gradient, a missing file, two items on one id, a loader from an unknown mark, two marks
  selected, an id not in kebab-case, a direction's sample without a file or of a wrong kind, a sample
  checked as a picture of its kind, dark sets that disagree in either direction and a dark token
  with no light one; the save refuses a draft tab, a scheme not chosen and a direction not chosen, then moves the files,
  writes the page, manifest and sprite and marks the state done; the sprite goes where it is told;
  a foreign state and a bad command line stop it.
- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows, the files and headings it names, the working-folder
  invariant, the progress table, the fresh-context section and the hook's knowledge of the kind.
- [tests/skillResume.test.mjs](../../tests/skillResume.test.mjs) — the hook's line and context for
  an unfinished set, a tab in review with its round, a finished set and the template.
