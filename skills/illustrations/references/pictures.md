# Illustrations — steps 6 to 11, the pictures and the save

Read the step you are on. These six draw the set in number — the states, the scenes, the onboarding, the letters, the reserve — each with a trial first, and save it. Templates live in the skill's own folder,
`${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`; a path like `templates/STATE.json` below is
relative to the skill's folder. What every step shares is in [mechanics.md](mechanics.md); the foundation steps in [steps.md](steps.md); what to draw in [catalog.md](catalog.md), how in [drawing.md](drawing.md), the page in [page.md](page.md).

## Contents

- [Steps 6–8 — States, Scenes, Onboarding](#steps-68-states-scenes-onboarding)
- [Step 9 — Email templates](#step-9-email-templates)
- [Step 10 — Reserve](#step-10-reserve)
- [Step 11 — Save](#step-11-save)

---

## Steps 6–8 — States, Scenes, Onboarding

The same shape for the three: **plan → approve → the trial drawn → published → reviewed → the rest
drawn → check → build → publish → review → approve** (*A trial before the number* in Common
mechanics; the plan marks the trial's pictures with *trial* at the end of their lines). The words
of every picture follow `catalog.md › Words`; `check` warns past their lengths. Every picture **moves**, minimally and in a cycle — it rests, rewinds its gesture, plays it again —
and its rest pose is the complete still picture (`drawing.md › Animation`); the page shows it at its size and, for a state or an onboarding step,
in place — the sample card with the picture small, the heading, the message and the one action.

- **States (6).** Plan from `catalog.md › States`: the core states every product has, the ones the
  documentation names (an entity locked, a period closed, a role refused), and the ones you
  propose from the product's situations — each with its id, title, idea (what is in the picture
  and what moves), where it is used and its words. Group them on the page by kind (Empty ·
  Nothing found · Errors · Access · Connection · Done · Pages). Approve (`plans/states.md`). Draw,
  one builder per group. Entries: `id`, `title`, `group`, `idea`, `file`, `animated`, `motion`,
  `usedIn`, `words: { heading, message, action }`.
- **Scenes (7).** Plan from `catalog.md › Scenes` and the reading's *The world*: a scene per place
  it will sit — the sign-in panel, the hero of a landing or home page, an announcement, the 404,
  a letter's band, the domain's moments (a first setup, an import, an approval, a report ready, a
  target reached). Entries as for a state, with `usedIn` the place; `wide: true` for a band.
  **Two places are drawn in several variants**: the **sign-in panel** (the authorization layout) and
  the **404 page**, 3–4 each — different ideas from the product's world (one its place at rest, one
  its object, one its moment, one its instrument), never one idea redrawn — so the operator chooses
  between pictures, as for the mark. The plan lists each variant on its own line with its `place`
  (`sign-in` or `not-found`) and ids `sign-in-<idea>` / `not-found-<idea>`; the trial takes one
  variant of each place; on the page the variants of a place stand side by side under the place's
  group heading, `group: "Sign-in panel"` / `group: "404 page"`. After the review, ask the pick
  (`AskUserQuestion`, header `Sign-in`, then `404`, the ids in the question text, your
  recommendation first): `pick scene <place> <id>` marks it `selected: true`, the rest stay as
  alternatives in the set and the sprite; `STATE.json › selected.scenes.<place>`, an `IL-nnn` row
  each. Approve only after both picks.
- **Onboarding (8).** Plan from `catalog.md › Onboarding`: the welcome, the first thing to do, a
  picture per step of the product's setup (from the documentation's setup flow), the empty
  workspace, the tour, the first success. Each with its words — the heading, the one sentence, the
  action — as the operator will read them on the first screens.

## Step 9 — Email templates

1. **Plan** (`catalog.md › Letters`): the common letters (invitation, verification code, password
   reset, welcome, digest, security alert), the letters beyond them that the product plausibly
   sends (a receipt, a trial ending, a mention, a reminder, an export ready, a sign-in from a new
   device, a goodbye) — each marked *proposed* unless the documentation names it — and the
   product's own, from its flows and notifications: who sends what to whom and when. Each line: id,
   title, the moment, the subject, the heading, the message in one or two sentences, the action,
   the secondary detail (a code, a date, a figure), the picture's idea and its `alt` — by
   `catalog.md › Words`. Approve (`plans/emails.md`), IL-005.
2. **The template** is the page's: the brand header with the selected mark and the wordmark, the
   picture band, the heading, the message, the action, the detail, the footer — the tab's
   `template.sender` and `template.footer` from the documentation or the cast; the page draws its
   anatomy on the first letter with every part named. Say in the tab's `template.note` what a mail
   client changes (`catalog.md › Letters`): the pictures go out as images — an animated GIF under
   1 MB whose first frame is the whole picture, since Outlook shows only that frame, and a still
   PNG at 2× — the page shows the animation as a promise of what the GIF will do; the band's
   background is the picture's `--ill-ground` for a client that blocks images; a dark mail client
   may recolor the letter.
3. **A picture per letter** (`drawing.md › Letter pictures`), the trial first — one letter of each
   group, reviewed — then the rest; about its moment — an invitation: a
   door opening onto the product's world; a reset: a key; a digest: the week's figures; an alert: a
   shield — 560 × 240, the subject in the middle third; a scene from Scenes reused where it fits
   (the same file named twice is one symbol). One builder per group. Entries: `id`, `title`,
   `group` (*Common letters* · *Beyond the common* · *The product's own*), `moment`, `subject`,
   `to`, `heading`, `message`, `action`, `detail`, `alt`, `file`, `animated`.
4. `check`, `build`, publish: the Template first, then every letter at 600 px as a mail client
   shows it, light as the letter's own, dark as a dark client renders it. Review; approve.

## Step 10 — Reserve

Plan 6–10 pictures for situations the product will meet later — from `catalog.md › Reserve` and
the documentation's roadmap (a module planned for later, a surface not yet built) — each with one
line of when. Approve (`plans/reserve.md`); draw; publish; review; approve. The operator may move a
reserve picture into States or Scenes by saying so: change its tab in the manifest and its folder.

## Step 11 — Save

1. Every tab `approved` or `skipped` in `STATE.json`, the scheme item and the direction `selected`: run
   `node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" check <dir>` once more, then `save <dir>`.
   The script moves the files, writes `manifest.json`, `index.html`, `artifact.html` and
   `illustrations.js`, removes `review/` and marks the state done.
2. Fill `README.md` (the picked mark and a loader in its snippets, the count per folder), add the
   save to `CHANGELOG.md`, and publish `artifact.html` once more to the same address, so the
   shared page is the saved set.
3. Tell the operator what is where, the address, and that `/showcase` will find the set and
   propose it (its Logo, Loaders, Icons, Illustrations and Email templates steps).

---
