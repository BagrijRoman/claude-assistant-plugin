# Illustrations — the procedure, step by step

Read the step you are on. Each step: what you start from, what you do, how the operator reviews it.
Templates live in the skill's own folder, `${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`;
a path like `templates/STATE.json` below is relative to the skill's folder. What to draw is in
[catalog.md](catalog.md), how to draw it in [drawing.md](drawing.md), how the page and the
artifact work in [page.md](page.md).

## Contents

- [Common mechanics](#common-mechanics)
- [Tab intake](#tab-intake)
- [A fresh context](#a-fresh-context)
- [Step 0 — Intake](#step-0--intake)
- [Step 1 — Color scheme](#step-1--color-scheme)
- [Step 2 — Logo](#step-2--logo)
- [Step 3 — Loaders](#step-3--loaders)
- [Step 4 — Icons](#step-4--icons)
- [Steps 5–7 — States, Scenes, Onboarding](#steps-57--states-scenes-onboarding)
- [Step 8 — Email templates](#step-8--email-templates)
- [Step 9 — Reserve](#step-9--reserve)
- [Step 10 — Save](#step-10--save)
- [Other modes](#other-modes)

---

## Common mechanics

**STATE.json** (template `templates/STATE.json`): `step` and `steps.<key>` (the keys of the table in
`SKILL.md`) move `pending → in-progress → awaiting-review → approved` (or `skipped`; `save` ends
`done`); `rounds.<key>` counts the reviews a tab went through; `scope.<key>` holds the tab intake's
answer (`{ "mode": "full" | "simple" | "skipped", "wishes": "…" }`); `selected` the scheme, the
primary mark and the shortlist; `artifact.url` the page's address once published; `pending` the
question put to the operator and not answered yet, so `continue` asks it again instead of guessing.
Update it at every change of state; on `continue` read it first and resume exactly there.

**The manifest** (`review/manifest.json`, template `templates/manifest.json`) is the catalog the
page is built from: every tab with its kind and lead, every picture with its `id`, `title`, `idea`,
`file`, its tags and words (`page.md › The manifest`). A picture exists for the page only once it
is in the manifest. You keep it; a builder returns entries for it and never edits it.

**Show, do not describe.** Whatever the operator chooses or approves, they see first. After every
drawing round: `check` (fix what it lists), `build`, then **publish** the page as an artifact
(`page.md › Publishing`) — the same address every time — and tell the operator the address and the
tab to open. When a headless browser is at hand, take the page's screenshots per theme
(`?theme=light`, `?theme=dark`, the tab in the hash) into `review/screenshots/`, look at them
yourself before the operator does — a mark that reads badly at 16 px, a picture whose dark version
lost its line, a letter whose words overflow — fix what you see, and send them (`SendUserFile`
when the session has it) so the choice can be made from the chat. A question about something
visual never goes out with only words in it.

**The review.** When a tab is published: `steps.<key>` becomes `awaiting-review`, `rounds.<key>`
goes up by one, and you ask (`AskUserQuestion`, header `Review`): **Approve** (Recommended when
nothing is pending) / **Revise** — they write the revisions in the chat / **Stop here** — state
saved. A revision names a picture by its id — `states/empty — the lid is too heavy, thinner, and
let it settle slower` — and may name several; a revision that names the whole tab ("every mark is
too busy") is applied to every picture of the tab. On *Revise*: list what you understood, one line
per picture, redraw **those pictures and nothing else** (a picture the operator did not name is
kept as it is — they chose it by saying nothing), `check`, `build`, publish, add the round to
`CHANGELOG.md`, and ask again. On *Approve*: `steps.<key>` is `approved`, a dated entry in
`CHANGELOG.md`, the checklist, and the fresh-context recommendation below. Never mark a tab
approved without the operator's answer; never take a revision from anywhere but the chat.

**Decisions** go to `DECISIONS.md` as `IL-nnn` the moment they are taken: topic, options offered,
choice, reason, the showcase `SC-` or blueprint `D-` id it follows when one applies. IL-001 to
IL-005 are reserved for the decisions every set takes (the scheme, the mark, the shortlist, the list
of states, the list of letters); the rest are appended from IL-006 in the order taken (a tab
simplified or skipped, the wishes for one, the language, the icons' manner, a reserve picture kept).

**Plans before drawing.** Every tab is first a list the operator sees and edits (`AskUserQuestion`
with the list in the question text and the options *Draw as listed (Recommended) / Change the list /
Skip this tab*), and only then drawn. The approved list goes to `plans/<tab>.md` in the working
folder before anything is drawn — the builders read it there, and a session that ends between the
approval and the drawing resumes from it. A plan line is: the id, the title, the idea in one
sentence (what is in the picture and what moves), where it is used, and for a state or a letter its
words. Ideas beyond the documentation are in the plan too, marked *proposed*, so the operator says
yes or no to each.

**Subagents** (`Agent`, `general-purpose`) draw in parallel, on the session's model — the drawing
is what the customer chooses between, so it is not sent to a smaller model. One builder per 4–6
pictures (3 builders for the 15 marks; a builder per group of states; one per mark for its
loaders; one per group of letters). A brief names: the files to read (`drawing.md`, the plan, the
example of the kind in `templates/examples/`, `tokens.css`), the files to write (`review/<tab>/<id>.svg`
for its pictures, nothing else — never the manifest, never another builder's file), the rules
(tokens only, the id prefix on every class and keyframe, no id, text, gradient or raw duration, one
gesture of animation with a still last frame), the wishes of the tab intake word for word, and what
to return: the manifest entries for its pictures as JSON (id, title, idea, file, animated, motion,
usedIn, words), and what was unclear. You put the entries into `review/manifest.json`, run `check`
— a finding in a builder's file goes back to that builder, or you fix it when it is one line —
`build`, look, publish.

**Words.** The words of a state (heading, message, action) and of a letter (subject, heading,
message, action, detail) come from the documentation and the sample world — a showcase's
`sample.mjs` when there is one, else the cast named at Intake — in the product's voice as the
documentation sets it, or plainly: short, the user's own terms, an error that says what to do
next. They stand beside the picture as text on the page and in the manifest, never inside the
drawing.

**Design baseline and a showcase.** A showcase's `tokens.css`, mark, reading, cast and plans, or a
design baseline in the documentation (tokens, a logo, drawn screens), are followed, not proposed
against: the scheme is theirs, the mark is theirs when they have one, and a tab proposes only
where they are silent or the operator asks (`SKILL.md › What goes in`). Every tab intake names
what the baseline already decides for it.

## Tab intake

Before every step from 1 to 9 draws anything, the operator says whether they want the tab, how
much of it, and what to take into account. Nothing of a step — no plan, no proposal, no builder —
starts before this answer. Intake (0) and Save (10) have none.

1. **Ask** (`AskUserQuestion`, two questions in one call, headers `Tab` and `Wishes`), the first
   question's text in three short lines: what the full tab shows, what the simplified one shows
   (from the table below, fitted to this product), and what later tabs take from it.
   - *Tab*: **Full** (Recommended, unless the reading or an earlier answer argues for less) ·
     **Simplified** · **Skip**. Step 1 (Color scheme) and step 2 (Logo) cannot be skipped — every
     picture stands on the scheme, the loaders and the letters on the mark — so for them the
     options are Full and Simplified (and *Take the showcase's* when one exists).
   - *Wishes*: **None — follow the documentation** (Recommended) · **From the design baseline**
     (only when there is one: name what it fixes for this tab) · the operator's own text. A wish
     narrows or redirects the tab (a manner of drawing, a thing to avoid, a reference they like);
     it never adds a claim the documentation does not support.
2. **Record** `scope.<key>` in `STATE.json`, and an `IL-nnn` row in `DECISIONS.md` for every answer
   other than *Full* with no wishes.
3. **Apply.** *Full* — the step as written. *Simplified* — the step's shape stays (plan → approve →
   draw → publish → review), with the simplified scope. *Skip* — `steps.<key>` becomes `skipped`,
   the tab is taken out of `review/manifest.json`, and the page does not show it; a later step
   that needs what it would have made draws that in place (a letter's picture when Scenes is
   skipped). *Wishes* — carried into the plan (each a line under *Wishes* at its top) and into every
   builder's brief, word for word.
4. `tab <id>` asks the intake of its step again, with the current answer as the recommended
   option.

| Step | Full | Simplified |
|------|------|------------|
| 1 Color scheme | three schemes on the page, each on mini-UI with a sample picture, one chosen | the showcase's, the baseline's or the documentation's, confirmed in one question |
| 2 Logo | 15 marks, grouped by idea, on three grounds and five sizes; a primary and a shortlist of 2–3 | 5 marks; a primary, one shortlisted |
| 3 Loaders | 3–5 loaders per mark of the primary and the shortlist, one determinate; in place | 2 loaders of the primary mark, one determinate |
| 4 Icons | every subject of the domain the icon library has no fit for, with where it is used | the 6–8 the planned screens need |
| 5 States | the catalog's states and the product's own, each with words, action and the in-place sample | the core eight (empty, nothing found, error, no access, offline, done, 404, loading companion), words only |
| 6 Scenes | a sign-in panel, a hero, an announcement, the 404, a letter band, the domain's moments | a sign-in panel and the 404 |
| 7 Onboarding | welcome, first thing to do, every setup step, empty workspace, tour | welcome and empty workspace |
| 8 Email templates | the template, the common letters, the letters beyond them, the product's own; a picture each | the template, the product's own letters, one shared picture |
| 9 Reserve | 6–10 pictures for later situations, from the catalog's reserve and the documentation | 3 |

## A fresh context

Every turn of a session sends its whole context again, so a step that runs in the context of the
steps before it pays for all of them on every turn: the reading, the plans, the builders' replies,
the manifest and the page as they were looked at. Everything a step needs is on disk —
`STATE.json`, `plans/`, `review/manifest.json`, `DECISIONS.md`, the drafts — so it can start from
the files instead. Nothing in the procedure is skipped for it.

- **At the approval.** After a tab is approved, do not start the next step. Recommend a fresh
  context and say why, in the operator's language, so that they decide knowing what it saves:

  ```
  ✓ <tab> approved and saved in <set folder>/review (the set is written at the save).
  ▸ Next: <next step>. Recommended: type /clear, then /illustrations.
  Why: every message sends this whole conversation to the model again, and it now carries <what this
  step piled up>, which <next step> does not read — it starts from the files. In a fresh context
  each of its steps costs a fraction of that, and nothing is lost: everything is saved, and after
  /clear the plugin tells the new session where the set stands.
  Not /compact: it spends one more request on this whole conversation to keep a summary the next
  step does not need.
  Or say "go on here" to continue in this context.
  ```

  Name what the step really piled up — the fifteen marks' SVG in the builders' replies, three
  rounds of revisions, the screenshots looked at — not this list. After the save, *Next* is whatever
  the operator does next. A plugin cannot clear or compact the context itself; the operator's two
  commands do it. If the operator says to go on here, go on.
- **After `/clear`.** The `skill-resume` hook tells the new session which set is unfinished and at
  which step; `/illustrations` then runs `continue`. The artifact's address is in `STATE.json`: the
  new session **reads the artifact first** (`page.md › Publishing`) before it publishes to it again.
- **What `continue` reads.** `STATE.json` first (its `pending` question is asked again; a step with
  no `scope.<key>` yet starts with its tab intake), then `phases.md › Common mechanics`, the section
  of the step it resumes, its plan in `plans/`, and `review/manifest.json`. Never every SVG just to
  have them in mind: a builder reads the file it redraws, you read the manifest and the page.

---

## Step 0 — Intake

1. **Find or start.** Glob `**/STATE.json` with `"kind": "illustrations"`. Found → `continue`.
   None → choose the folder (`SKILL.md › The output folder`).
2. **A showcase?** Glob `**/STATE.json` with `"kind": "showcase"`. Found: tell the operator, and
   take from it — `SOURCES.md` as the reading, `tokens.css` as the scheme (copied into this set's
   `tokens.css`: the `--color-*` values as they are, the `--ill-*` and `--lg-*` from its own when it
   has them, else derived from its brand), `sample.mjs` as the cast, `site.mjs › mark` as the mark
   when one is picked, `plans/illustrations.md`, `plans/emails.md` and its states as the first draft
   of this set's lists, `STATE.json › languages` as the language. Record `showcase` in `STATE.json`
   (the folder) and the reuse as IL-006.
3. **Read the documentation** otherwise (`SKILL.md › What goes in`): the folder (`docs/` by default;
   ask if it is not obvious), this set's folder left out; one subagent per group, returning under
   fixed headings — **Product** (what, for whom, in one paragraph), **Actors**, **The world** (the
   objects, places, moments and instruments of the domain: what a picture can show — a plant and
   its smoke, a ledger, a scale, a parcel on its legs, a report ready), **States named** by the
   screens, **Letters sent** and when, **Brand** (name, colors, fonts, a logo, the tone),
   **Constraints** (languages, dark theme, accessibility, what must never be drawn), **Design
   decisions already taken**, **Open questions**. A blueprint is read directly (`01-brief.md`,
   `02-architecture.md`, `GLOSSARY.md`, `DECISIONS.md`, module files). Write the summary as
   `SOURCES.md` in the set's folder.
4. **Ask, in one round** (`AskUserQuestion`): the **name and wordmark** as the pictures should carry
   them; the **language** of the words (the documentation's, or English — one, the pictures carry
   none); the **cast** the letters go to (a showcase's, or propose one sender and two people).
   Say in one line that every tab will be asked for before it is made (tab intake).
5. Write `STATE.json`, `DECISIONS.md`, `CHANGELOG.md`, `README.md` and `tokens.css` from the
   templates, `review/manifest.json` from `templates/manifest.json` with the name, tagline, wordmark
   and language filled. Build and publish the empty page once — the operator sees the tabs, the
   theme switch and the address (`page.md › Publishing`), and keeps that address for the whole run.
   Gate — light: "this is what I know; anything missing?"

## Step 1 — Color scheme

Before anything is drawn. The scheme is: the brand (`--color-primary` and its companions), the
neutrals of the page, the picture tokens (`--ill-*`: line, fill, soft, muted, accent, accent-soft,
highlight, ground, positive, caution, negative) and the mark tokens (`--lg-*`: ground, accent,
accent-2, soft), light and dark.

1. **Fixed already** (a showcase, a design baseline, values in the documentation): write the
   values into `tokens.css` (the dark set twice, the same under the media query and under
   `[data-theme='dark']`; the dark brand lighter and its foreground darker), derive the `--ill-*`
   and `--lg-*` from them (`drawing.md › Deriving the picture tokens from a brand`), put one item
   into the *Color scheme* tab with `selected: true` and the sample picture `templates/examples/states/empty.svg`
   copied as `review/scheme/sample.svg`, publish, and ask to confirm or change (one question). IL-001.
2. **Otherwise propose three schemes**, each in one line of reasoning from the domain and the brand
   hints (a finance product and a children's product do not share a hue), each a full `light` and
   `dark` set of the tokens above, as three items of the *Color scheme* tab, each with the sample
   picture (`page.md › The manifest`). Offer *like competitor* when a profile exists.
   `build`, publish, screenshots in both themes; the operator looks at the strips — a button, a
   chip, a link, a selected row and the picture on each — before choosing.
3. Ask (`AskUserQuestion`, header `Scheme`): A (Recommended) / B / C — the operator may type a hue
   or a hex. Mark the chosen item `selected: true`, write its values into `tokens.css`, keep the
   others as alternatives; `check` (the dark sets must agree), `build`, publish. Record IL-001 and
   `selected.scheme`; `steps.scheme` is `approved` on the operator's word.

## Step 2 — Logo

1. **Plan 15 ideas** for a mark, grouped by where they come from — the product's **object** (the
   thing it is about), its **action** (what it does to the thing), the **initial** (a letterform
   with the domain in it), an **abstract** form (the domain's geometry: a grid, a flow, a cycle),
   the **domain's own symbol** (what its trade draws) — three per group, one line each: the idea,
   what is in the mark, how many colors it needs (one, two, more). Approve (`plans/logo.md`).
2. **Draw** on the session's model, three builders with five marks each
   (`drawing.md › Marks`): 64-unit grid, `currentColor` as the body, the knockouts in
   `var(--lg-ground)`, the accents in `var(--lg-accent)` and `var(--lg-accent-2)`, the soft fill
   in `var(--lg-soft)`; detailed enough to be a logo, simple enough to read at 16 px; the parts a
   loader can set in motion in groups of their own. Each builder returns the manifest entries
   (`id`, `title`, `idea`, `file`, `from` — where in the product it comes from).
3. `check`, `build`, publish, screenshots: the lineup on three grounds and at 16 px is where a weak
   mark shows — look at it yourself and say which marks you would drop and why, before the
   operator looks.
4. **Review** (Common mechanics): revisions by id; then the **pick**: ask (`AskUserQuestion`,
   header `Mark`, the ids in the question text) for the primary mark, your recommendation first;
   then (header `Shortlist`, multiSelect) two or three marks the loaders will also be made from.
   `pick logo <primary> <shortlist…>`: `selected: true` on the primary, `shortlist: true` on the
   others, `STATE.json › selected.logo` and `selected.shortlist`, IL-002 and IL-003, `build`,
   publish. Approve.

## Step 3 — Loaders

1. **Plan**: for the primary mark and each shortlisted one, 3–5 loaders, each a motion of the
   mark's own parts — they turn, light up in turn, draw themselves, beat, travel an arc — with
   what it is for (a button or a row at 16 px, a panel at 32, a long wait or the start of the
   application at 64), and one **determinate** loader per mark (a part fills as the share grows,
   on `--progress`). One line each. Approve (`plans/loaders.md`).
2. **Draw** (`drawing.md › Loaders`): the loader is the mark's SVG with its moving parts in groups
   of their own; the animation on `--ill-duration-long`; the last keyframe the mark at rest; the
   determinate one reads `var(--progress, 1)`. One builder per mark. Entries: `id`, `title`,
   `mark`, `idea`, `file`, `use`, `determinate`.
3. `check`, `build`, publish; the page shows each at 64 / 32 / 16, the determinate one at four
   shares, and the three in-place samples (a button at work, a panel loading, the application
   starting) — the words of the tab's `words` from the documentation. Review; approve.

## Step 4 — Icons

1. **Plan** the icons of the product's own subjects — what the icon library chosen by the project
   (or the standard set) has no fit for: for a carbon product a scope, an emission source by kind, a
   factor, a meter, a site by type — each with where it is used; nothing is added because a set
   "should have it". The manner follows the mark: the same stroke, the same corners. Approve
   (`plans/icons.md`).
2. **Draw** (`drawing.md › Icons`): the 16-unit grid, a 1.5-unit stroke in `currentColor`, round
   caps and joins, at most one accent; it must read at 16 px. One builder per 6–8 icons. Entries:
   `id`, `title`, `group`, `file`, `usedIn`.
3. `check`, `build`, publish: the page shows them in a row on the page and on the inverted
   surface, then each at 16 / 20 / 24. Review; approve.

## Steps 5–7 — States, Scenes, Onboarding

The same shape for the three: **plan → approve → draw in parallel → check → build → publish →
review → approve**. Every picture **moves**, minimally, once, and rests on a complete still frame
(`drawing.md › Animation`); the page shows it at its size and, for a state or an onboarding step,
in place — the sample card with the picture small, the heading, the message and the one action.

- **States (5).** Plan from `catalog.md › States`: the core states every product has, the ones the
  documentation names (an entity locked, a period closed, a role refused), and the ones you
  propose from the product's situations — each with its id, title, idea (what is in the picture
  and what moves), where it is used and its words. Group them on the page by kind (Empty ·
  Nothing found · Errors · Access · Connection · Done · Pages). Approve (`plans/states.md`). Draw,
  one builder per group. Entries: `id`, `title`, `group`, `idea`, `file`, `animated`, `motion`,
  `usedIn`, `words: { heading, message, action }`.
- **Scenes (6).** Plan from `catalog.md › Scenes` and the reading's *The world*: a scene per place
  it will sit — the sign-in panel, the hero of a landing or home page, an announcement, the 404,
  a letter's band, the domain's moments (a first setup, an import, an approval, a report ready, a
  target reached). Entries as for a state, with `usedIn` the place; `wide: true` for a band.
- **Onboarding (7).** Plan from `catalog.md › Onboarding`: the welcome, the first thing to do, a
  picture per step of the product's setup (from the documentation's setup flow), the empty
  workspace, the tour, the first success. Each with its words — the heading, the one sentence, the
  action — as the operator will read them on the first screens.

## Step 8 — Email templates

1. **Plan** (`catalog.md › Letters`): the common letters (invitation, verification code, password
   reset, welcome, digest, security alert), the letters beyond them that the product plausibly
   sends (a receipt, a trial ending, a mention, a reminder, an export ready, a sign-in from a new
   device, a goodbye) — each marked *proposed* unless the documentation names it — and the
   product's own, from its flows and notifications: who sends what to whom and when. Each line: id,
   title, the moment, the subject, the heading, the message in one or two sentences, the action,
   the secondary detail (a code, a date, a figure), the picture's idea. Approve (`plans/emails.md`),
   IL-005.
2. **The template** is the page's: the brand header with the selected mark and the wordmark, the
   picture band, the heading, the message, the action, the detail, the footer — the tab's
   `template.sender` and `template.footer` from the documentation or the cast; the page draws its
   anatomy on the first letter with every part named. Say in the tab's `template.note` what a mail
   client changes: the pictures go out as images (an animated GIF whose first frame is the still
   picture, or a still PNG — the developer's call later, the page shows the animation as a promise
   of what the GIF will do), a dark mail client may recolor the letter.
3. **A picture per letter** (`drawing.md › Letter pictures`), about its moment — an invitation: a
   door opening onto the product's world; a reset: a key; a digest: the week's figures; an alert: a
   shield — 560 × 240, the subject in the middle third; a scene from Scenes reused where it fits
   (the same file named twice is one symbol). One builder per group. Entries: `id`, `title`,
   `group` (*Common letters* · *Beyond the common* · *The product's own*), `moment`, `subject`,
   `to`, `heading`, `message`, `action`, `detail`, `file`, `animated`.
4. `check`, `build`, publish: the Template first, then every letter at 600 px as a mail client
   shows it, light as the letter's own, dark as a dark client renders it. Review; approve.

## Step 9 — Reserve

Plan 6–10 pictures for situations the product will meet later — from `catalog.md › Reserve` and
the documentation's roadmap (a module planned for later, a surface not yet built) — each with one
line of when. Approve (`plans/reserve.md`); draw; publish; review; approve. The operator may move a
reserve picture into States or Scenes by saying so: change its tab in the manifest and its folder.

## Step 10 — Save

1. Every tab `approved` or `skipped` in `STATE.json`, the scheme item `selected`: run
   `node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" check <dir>` once more, then `save <dir>`.
   The script moves the files, writes `manifest.json`, `index.html`, `artifact.html` and
   `illustrations.js`, removes `review/` and marks the state done.
2. Fill `README.md` (the picked mark and a loader in its snippets, the count per folder), add the
   save to `CHANGELOG.md`, and publish `artifact.html` once more to the same address, so the
   shared page is the saved set.
3. Tell the operator what is where, the address, and that `/showcase` will find the set and
   propose it (its Logo, Loaders, Icons, Illustrations and Email templates steps).

---

## Other modes

**`status`** — read `STATE.json`, `DECISIONS.md`, `review/manifest.json` (or `manifest.json`);
report steps and states, rounds, picks, the address, what waits. Write nothing.

**`tab <id>`** — the step for that tab, alone: its tab intake again (the current answer
recommended) → plan (or re-plan, keeping what the operator approved unless they say otherwise) →
draw → publish → review → approve. On a saved set: the tab's files are redrawn under `review/`
again with a manifest holding that tab only; the save then replaces those files and keeps the rest
(say so before starting; a saved file is never overwritten without this).

**`revise`** — the review loop of Common mechanics for the tab in `awaiting-review`, when the
operator wrote revisions outside the question.

**`pick logo <id> [<id>…]`** — confirm the ids exist; the first is `selected`, the rest
`shortlist`; `STATE.json › selected`; IL-002 and IL-003; `build`; publish.

**`add`** — a picture the catalog lacks: ask what and which tab; its plan line; draw; publish; the
tab's review again.

**`publish`** — `check`, `build`, publish to the address in `STATE.json` (`page.md › Publishing`);
the address.

**`save`** — step 10 alone, when the operator asks; the script refuses while a tab is not approved
and says which.

**`check`** — the script's checks; fix what it lists.
