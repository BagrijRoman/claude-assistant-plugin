# Illustrations — the mechanics of every step

What every step shares: the state and the manifest, the quality bar, how a tab is taken in, planned, drawn by builders, published and reviewed, when to recommend a fresh context — and the order the tabs are made in, with the places drawn in variants. Templates live in the skill's own folder,
`${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`; a path like `templates/STATE.json` below is
relative to the skill's folder. The steps themselves are in [steps.md](steps.md) (Intake to Icons) and [pictures.md](pictures.md) (States to Save); the other modes in [modes.md](modes.md); what to draw in [catalog.md](catalog.md), how in [drawing.md](drawing.md), the page in [page.md](page.md).

## Contents

- [Common mechanics](#common-mechanics)
- [Tab intake](#tab-intake)
- [A fresh context](#a-fresh-context)
- [The order of making](#the-order-of-making)
- [Variants and picks](#variants-and-picks)

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

**Presentable before published.** The set is drawn to attract a customer and their clients
(`SKILL.md › Rules that never bend`, `drawing.md › Presentable`). Every plan's ideas are chosen for
it — charming, warm, aspirational moments of the product's world — and every round's screenshots
are looked at for it before the operator sees them: a picture that is correct but not lovely goes
back to its builder with what to improve, and only then is the tab published.

**The motion looked at, not assumed.** Before a moving tab is published, play it on the page at
¼× and step through the gesture: does the lead move first and farthest, do the parts arrive as one
group or as a metronome, does the echo take over before the lead stops, is the first frame and the
last frame the whole picture, does anything appear from nothing. Then at 1×: is the gesture over in
well under a second, does it earn its place for a state seen this often. When a motion is in doubt,
**the strongest move is to take it out** — a still picture that is lovely beats a moving one that is
busy; say so in the plan line. Look at the tab again the next day before the save.

**Show, do not describe.** Whatever the operator chooses or approves, they see first. After every
drawing round: `check` (fix what it lists), `build`, then **publish** the page as an artifact
(`page.md › Publishing`) — the same address every time — and tell the operator the address and the
tab to open. When a headless browser is at hand, take the page's screenshots per theme
(`?theme=light`, `?theme=dark`, the tab in the hash) into `review/screenshots/`, look at them
yourself before the operator does — a mark that reads badly at 16 px, a picture whose dark version
lost its line, a letter whose words overflow — fix what you see, and send them (`SendUserFile`
when the session has it) so the choice can be made from the chat. A question about something
visual never goes out with only words in it.

**Progress, every time.** Every message that stops for the operator — a tab intake, a plan, a
review, a pick — and every change of stage starts with the checklist of `SKILL.md › Progress`:
what is done (with its result), what is in progress (with its sub-step and count), what remains
(with what each will take) and one line of what is left in all. The operator never has to ask
"how much is left".

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

**A trial before the number.** A tab of many pictures — States, Scenes, Onboarding, Email
templates, Reserve — is drawn in two batches: first a **trial** of 3–4 pictures the plan marks
(the ones that show the most of the manner: one with an object, one with a place, one with a
feedback tone, one letter of each group), published and reviewed like a tab; only once the operator
approves the trial — or revises it until they do — are the rest drawn, by the same builders, on the
trial's files as reference beside the direction's sheet. `batches.<key>` in `STATE.json` is `trial`
until then and `full` after; a tab in `awaiting-review` with `batches.<key>: "trial"` resumes at
the trial's review. A revision of the manner at the trial is applied to the plan's wording for the
rest, so it is not repeated picture by picture.

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
pictures (a builder per idea for the marks; a builder per group of states; one per mark for its
loaders; one per group of letters). A brief names the quality bar of `drawing.md › Presentable`
word for word, and: the files to read (`drawing.md`, the plan,
`plans/direction.md` and the chosen direction's sheet in `review/direction/` — the reference of the
hand, over the example of the kind in `templates/examples/` — the trial's files when the tab has
them, `tokens.css`), the files to write (`review/<tab>/<id>.svg`
for its pictures, nothing else — never the manifest, never another builder's file), the rules
(tokens only, the id prefix on every class and keyframe, no id, text, gradient or raw duration, one
gesture of animation drawn once with the complete picture as its last frame — the `loop` command makes it cyclic), the wishes of the tab intake word for word, and what
to return: the manifest entries for its pictures as JSON (id, title, idea, file, animated, motion,
usedIn, words), and what was unclear. You put the entries into `review/manifest.json`, run `loop`
(every picture's and letter's animation made cyclic, `drawing.md › Animation`), run `check`
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

Before every step from 1 to 10 draws anything, the operator says whether they want the tab, how
much of it, and what to take into account. Nothing of a step — no plan, no proposal, no builder —
starts before this answer. Intake (0) and Save (10) have none.

1. **Ask** (`AskUserQuestion`, two questions in one call, headers `Tab` and `Wishes`), with the
   checklist of `SKILL.md › Progress` in the message before it; the first
   question's text in three short lines: what the full tab shows, what the simplified one shows
   (from the table below, fitted to this product), and what later tabs take from it.
   - *Tab*: **Full** (Recommended, unless the reading or an earlier answer argues for less) ·
     **Simplified** · **Skip**. Steps 1 (Color scheme), 2 (Direction) and 3 (Logo) cannot be skipped — every
     picture stands on the scheme and the manner, the loaders and the letters on the mark — so for
     them the options are Full and Simplified (and *Take the showcase's* when one exists).
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
| 2 Direction | three sheets of four samples each, from the references and the reading; one chosen or mixed | one sheet from the references or the baseline, confirmed |
| 3 Logo | marks in two rounds (6–9, then 4–6 around the chosen idea), grouped by idea, on three grounds and five sizes, in one color and inverted; a primary and a shortlist of 2–3 | 5 marks; a primary, one shortlisted |
| 4 Loaders | 3–5 loaders per mark of the primary and the shortlist, one determinate; in place | 2 loaders of the primary mark, one determinate |
| 5 Icons | every subject of the domain the icon library has no fit for, with where it is used | the 6–8 the planned screens need |
| 6 States | the catalog's states and the product's own, each with words, action and the in-place sample; a trial of four first | the core eight (empty, nothing found, error, no access, offline, done, 404, loading companion), words only |
| 7 Scenes | the sign-in panel and the 404 in 3–4 variants each, a hero, an announcement, a letter band, the domain's moments | the sign-in panel and the 404, 3 variants each |
| 8 Onboarding | welcome, first thing to do, every setup step, empty workspace, tour | welcome and empty workspace |
| 9 Email templates | the template, the common letters, the letters beyond them, the product's own; a picture each; a trial of three letters first | the template, the product's own letters, one shared picture |
| 10 Reserve | 6–10 pictures for later situations, from the catalog's reserve and the documentation | 3 |

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

  Name what the step really piled up — the marks' SVG in the builders' replies, three
  rounds of revisions, the screenshots looked at — not this list. After the save, *Next* is whatever
  the operator does next. A plugin cannot clear or compact the context itself; the operator's two
  commands do it. If the operator says to go on here, go on.
- **After `/clear`.** The `skill-resume` hook tells the new session which set is unfinished and at
  which step; `/illustrations` then runs `continue`. The artifact's address is in `STATE.json`: the
  new session **reads the artifact first** (`page.md › Publishing`) before it publishes to it again.
- **What `continue` reads.** `STATE.json` first (its `pending` question is asked again; a step with
  no `scope.<key>` yet starts with its tab intake), then `mechanics.md › Common mechanics`, the section
  of the step it resumes, its plan in `plans/`, and `review/manifest.json`. Never every SVG just to
  have them in mind: a builder reads the file it redraws, you read the manifest and the page.

---

## The order of making

Each step from 1 to 10 starts with its **tab intake** — full, simplified or skipped, and what to
take into account (`mechanics.md › Tab intake`) — and ends with the operator's approval of the tab on
the page. The key is the step's name in `STATE.json › steps`.

| Step | Key | Makes | Needs |
|------|-----|-------|-------|
| 0 Intake | `intake` | the folder, the reading (or a showcase's), the name, the language, the cast the letters go to | — |
| 1 Color scheme | `scheme` | the tokens — from a showcase or a design baseline, confirmed; otherwise three schemes on the page, one chosen; the tab stays, the chosen one marked | the reading |
| 2 Direction | `direction` | **the manner of the whole set, settled before anything is drawn in number**: three directions, each a sheet of four samples — a mark, an icon, a state, a letter band — in one hand, told apart by line, angle, detail, accent and motion, built from the references and the reading; one chosen, or mixed; its sheet becomes the builders' reference | 1, the references |
| 3 Logo | `logo` | **marks in two rounds** — 6–9 from three ideas in the product, then 4–6 more around the idea the operator points at — on three grounds and at five sizes, in one color and inverted, with the wordmark; reviewed; one picked as primary and two or three shortlisted | 1 |
| 4 Loaders | `loaders` | for the primary mark and each shortlisted one, 3–5 loaders from the mark's own parts, at 64 / 32 / 16 px, one determinate; in place | 2 |
| 5 Icons | `icons` | the icons of the product's own subjects, on the 16 px grid in the mark's manner, at 16 / 20 / 24, each with where it is used | 2 |
| 6 States | `states` | a picture for every state a screen can be in — the catalog's and the product's own — each with its words and its action, drawn in place; **a trial of 3–4 first**, reviewed, then the rest | 2 |
| 7 Scenes | `scenes` | scenes from the product's world — **the sign-in panel (the authorization layout) and the 404 page in several variants each, 3–4 different ideas, and the hero in 2–3, one picked per place**; an announcement, a letter's band | 1 |
| 8 Onboarding | `onboarding` | the first minutes with the product — the welcome, the first thing to do, the setup's steps, the empty workspace, the tour — each with its words | 1, 5 |
| 9 Email templates | `emails` | the template with its parts named, then every letter — the common ones and the product's own — filled in, a picture each; a trial of 3 letters first | 3, 2 |
| 10 Reserve | `reserve` | pictures for situations the product will meet later, each with when; proposed from the catalog and the documentation | 5 |
| 11 Save | `save` | every tab approved → `save`; the sprite; the README; the set published once more as the saved set | all |

## Variants and picks

The marks come **in two rounds** — 6–9 first, then 4–6 around the idea the operator pointed at —
because a customer chooses better between things than from a description, a logo is the choice they
care most about, and fifteen drawn at once come out alike. `pick logo <id> [<id>…]` marks the
first `Selected` and the others `Shortlist`, writes `STATE.json › selected`, fills IL-002 and IL-003
in `DECISIONS.md`, rebuilds and republishes; the loaders are then made from the selected mark and
the shortlist, so the operator sees two or three marks in motion before settling.

**The sign-in panel, the 404 page and the hero are drawn in several variants** — 3–4 each for the
first two, 2–3 for the hero, different ideas from the product's world rather than one idea redrawn
— because they are the pictures a customer meets first and most often, and they choose them like
the mark: from pictures. The variants of a place stand side by side on the Scenes tab under the
place's heading, each with `place: "sign-in"`, `"not-found"` or `"hero"` in the manifest; `pick scene <place> <id>` marks the
picked one `Selected`, writes `STATE.json › selected.scenes.<place>` and an `IL-nnn` row, rebuilds
and republishes. The alternatives stay in the set and in the sprite — the product may show them
in rotation — and `check` refuses two selected variants of one place, and a saved set where a
place with variants has none picked.
