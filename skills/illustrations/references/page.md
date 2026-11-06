# Illustrations — the page, the manifest and the artifact

How the review page is built from the manifest, how it is published and reviewed, and what the
script writes.

## Contents

- [Files](#files)
- [The manifest](#the-manifest)
- [The page](#the-page)
- [Publishing](#publishing)
- [Screenshots](#screenshots)
- [Revisions](#revisions)
- [The sprite](#the-sprite)

## Files

| File | Role |
|------|------|
| `STATE.json` | step, steps, rounds, scope, selected, the artifact's address, pending |
| `tokens.css` | every value, light and dark; the only file with values |
| `review/manifest.json` | the catalog the page is built from, while a review is on |
| `review/<tab>/<id>.svg` | the drafts |
| `review/index.html` | the page, self-contained, opens from disk |
| `review/artifact.html` | the same page as the fragment the `Artifact` tool publishes (no doctype, html, head or body of its own) |
| `review/screenshots/` | the page per theme and tab, when a browser is at hand |
| `plans/<tab>.md` | the approved plan of each tab |
| `SOURCES.md` | what was read, what each gave (a showcase's is taken as it is) |
| `DECISIONS.md`, `CHANGELOG.md`, `README.md` | the choices, the rounds, how to use the set |
| after the save: `manifest.json`, `index.html`, `artifact.html`, `<tab>/<id>.svg`, `illustrations.js` | the set |

The script: `node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" build | check | save | sprite <dir>`
(`SKILL.md › The script`). `build` and `check` work on `review/` while it exists and on the saved
set after; `save` needs every tab approved; `sprite` takes `--out <file>`.

## The manifest

```json
{
  "kind": "illustrations-manifest",
  "project": "Name", "tagline": "one line", "wordmark": "Name", "lang": "en",
  "tabs": [
    { "id": "scheme", "kind": "scheme", "title": "Color scheme", "lead": "…", "items": [
      { "id": "slate", "title": "Slate", "idea": "why", "selected": true,
        "light": { "--color-primary": "#…", "--ill-accent": "#…", "…": "…" },
        "dark":  { "--color-primary": "#…", "…": "…" },
        "sample": "scheme/sample.svg" } ] },
    { "id": "direction", "kind": "directions", "title": "Direction", "lead": "…", "items": [
      { "id": "linework", "title": "Linework", "idea": "why", "selected": true,
        "axes": { "line": "2.5 outline", "angle": "three-quarter", "detail": "furnished", "accent": "one touch", "motion": "settle" },
        "samples": [
          { "id": "linework-mark", "kind": "marks", "file": "direction/linework-mark.svg" },
          { "id": "linework-icon", "kind": "icons", "file": "direction/linework-icon.svg" },
          { "id": "linework-state", "kind": "pictures", "file": "direction/linework-state.svg", "animated": true },
          { "id": "linework-letter", "kind": "letters", "file": "direction/linework-letter.svg", "animated": true } ] } ] },
    { "id": "logo", "kind": "marks", "title": "Logo", "lead": "…", "items": [
      { "id": "valley", "title": "Valley", "idea": "…", "file": "logo/valley.svg", "from": "where in the product", "selected": true, "shortlist": false } ] },
    { "id": "loaders", "kind": "loaders", "title": "Loaders", "lead": "…", "words": { "button": "Saving…", "panel": "Loading your sites…", "start": "Starting Name" }, "items": [
      { "id": "valley-turn", "title": "Sunrise", "mark": "valley", "idea": "…", "file": "loaders/valley-turn.svg", "use": "a panel loading", "determinate": false } ] },
    { "id": "icons", "kind": "icons", "title": "Icons", "lead": "…", "items": [
      { "id": "site", "title": "Site", "group": "From the domain", "file": "icons/site.svg", "usedIn": "the sites list" } ] },
    { "id": "states", "kind": "pictures", "title": "States", "lead": "…", "items": [
      { "id": "empty", "title": "Nothing here yet", "group": "Empty", "idea": "…", "file": "states/empty.svg", "animated": true, "motion": "the lid settles", "usedIn": "every list before its first row", "wide": false,
        "words": { "heading": "No sites yet", "message": "Add the first site to start.", "action": "Add a site" } } ] },
    { "id": "emails", "kind": "letters", "title": "Email templates", "lead": "…",
      "template": { "sender": "Name <hello@…>", "footer": "why they receive it", "note": "what a mail client changes" }, "items": [
      { "id": "invitation", "title": "Invitation", "group": "Common letters", "moment": "when …", "subject": "…", "to": "…", "heading": "…", "message": "…", "action": "…", "detail": "…", "file": "emails/invitation.svg", "animated": true } ] }
  ]
}
```

- `about` (optional, top level): `{ "title", "lead": ["paragraph", …], "points": [{ "title", "text" }], "note" }` — the product described for whoever opens the page: what it is, for whom, what it does, what sets it apart, from the reading (`SOURCES.md`). The Overview shows it first, then *How to use this page* (the tabs, the color schemes to try, the two themes, motion, the in-place cards — written by the script from the manifest), then the tabs' status and the colors.
- The tabs' order is the page's; `scenes`, `onboarding` and `reserve` are `pictures` like `states`.
  A tab the intake skipped is taken out.
- `file` is relative to `review/` (then to the set's folder) and under the tab's folder; the same
  file named by two items (a scene reused as a letter's picture) is one symbol per id.
- Items are grouped on the page by `group`, in the order groups first appear; a loader's group is
  its mark.
- A `pictures` item drawn as one of several variants of a place carries `place` (`sign-in` or
  `not-found`) and, once picked, `selected: true`; the variants share a `group` so they stand side
  by side. `check` refuses two selected variants of one place, and a saved set where a place with
  variants has none.
- `scheme` items carry their own `light` and `dark` sets — the one place raw values are allowed,
  since they serve the choice — and the chosen one is `selected`; the tab stays in the saved set.
- `animated` shows the *Moving* tag and the *Replay*; `motion` is one line of what moves.
- `directions` items carry `samples` instead of a file — one of each kind, each checked as a
  picture of that kind (`marks` and `icons` on `--lg-*`, `pictures` and `letters` on `--ill-*`),
  its classes prefixed by the sample's id — and `axes`; the chosen direction is `selected`; the tab
  stays in the saved set, its sheets are moved with the rest but are not part of the sprite.

## The page

One page, no dependency, no network: `tokens.css`, the frame's CSS and JS (`templates/page/`) and
every picture's styles inline in the head; every picture once as a `<symbol>` at the top of the
body, used by `<use>` wherever it appears (a mark at six sizes is six `<use>`s). Tabs along the top
(`role="tab"`, the id in the address as `#states`), the theme switch, *Replay all* per tab, *Replay*
per moving picture, the id chip that copies `tab/id`. The Overview lists the tabs with their status
from `STATE.json`, the live values of the picture tokens, and how to review.

| Kind | The page shows |
|------|----------------|
| `scheme` | each scheme on its own strip — a button, a chip, a link, a selected row and the sample picture — with its swatches; the chosen one marked |
| `directions` | a sheet per direction, one under the other: its mark on three grounds, its icon at 16 / 20 / 24, its state picture, its letter band; the axes under it; the chosen one marked |
| `marks` | the lineup: every mark on the page, on the inverted surface and on the brand color, then at 16 px; a card per mark: three grounds, the wordmark, 16 / 24 / 32 / 64 / 128, where it comes from; `Selected` and `Shortlist` |
| `loaders` | grouped by mark: each at 64 / 32 / 16, the determinate one at 0 / 33 / 66 / 100 %; then *In place*: a button at work, a panel loading, the application starting |
| `icons` | a row on the page and on the inverted surface, then each at 16 / 20 / 24 with its name and where it is used |
| `pictures` | grouped: the picture at its size, the in-place sample (the spot picture, heading, message, action), where it is used, what moves |
| `letters` | the Template with its parts named on the first letter, then every letter at 600 px: subject and sender, the brand header with the selected mark, the picture band, heading, message, action, detail, footer |

**Trying a scheme.** When the *Color scheme* tab holds more than one scheme, the top bar gets a
switch between them, and every scheme card a *Try it on every picture* button: the viewer sees the
whole set — every mark, loader, state and letter — redrawn on that scheme's values, light and dark,
and comes back to the chosen one with its button. The chosen scheme is the page's own values
(`tokens.css`); the others apply through a class on `<html>` and are kept per viewer. So a
customer can compare the schemes on the real pictures, not on a strip, before or after the choice.

`?theme=light` or `?theme=dark` in the address forces a theme and `?scheme=<id>` a scheme (for a
screenshot, or a link that opens on one); otherwise the viewer's choice, kept per viewer. Reduced motion stops every animation on its last frame.

## Publishing

The page is published with the session's `Artifact` tool as the shared review page.

1. `check`, then `build`: `review/artifact.html` is the file to publish (the fragment the tool
   wraps); `review/index.html` is the same page for opening from disk.
2. **First publish**: `Artifact` with `file_path: <set>/review/artifact.html`, `icon: "palette"`,
   `description: "<Name>: the illustration set for review — logo, loaders, icons, states, scenes,
   letters."`. The page's `<title>` is `<Name> illustrations`. Record the address the result gives
   in `STATE.json › artifact.url` and `publishedAt`, and tell the operator: the address, the tab to
   open, both themes.
3. **Every later publish** goes to the same address: `Artifact` with the same `file_path` and
   `url: <artifact.url>`, so the operator and whoever they sent the address to see the new round
   where the old one was. **After `/clear`**, a publish to an address this conversation has not
   touched is refused: first `Artifact` `action: "read"` with that `url`, then publish with `url`.
4. **Without the `Artifact` tool** (a session that lacks it): say so once, and the review happens
   from disk — the operator opens `review/index.html`; screenshots are sent with `SendUserFile`.
5. After the save, publish `artifact.html` from the set's folder to the same address once more:
   the shared page is then the saved set.

The page is private at its address; the operator decides whom to send it to. Nothing in it reaches
the network at view time, and nothing a viewer does on it reaches the set — revisions come through
the chat.

## Screenshots

When a headless browser is at hand (Playwright, or Chrome's `--headless=new --screenshot`), take
`review/screenshots/<theme>-<tab>.png` for the tab in review in both themes:
`review/index.html?theme=dark#states`. Look at them yourself before the operator does — the
lineup at 16 px, a dark picture that lost its line, a letter's words that overflow — fix what you
see, then send them (`SendUserFile`). Without a browser, the published page is what the operator
looks at; say so.

## Revisions

The operator writes them in the chat, each naming a picture by its id — the chip on the page
copies `tab/id` — and what should change:

```
logo/valley — the sun too big; move it left
states/empty — the lid too heavy, thinner; settle slower
emails — every picture lighter in the dark theme
```

List what you understood, one line each; redraw those and nothing else; `check`, `build`, publish;
`rounds.<tab>` + 1; a line per round in `CHANGELOG.md`; ask again. A picture the operator did not
name is kept as it is.

## The sprite

`illustrations.js` (`sprite`, and the save): one script that, loaded in any page, puts a hidden
`<svg>` of `<symbol>`s and a `<style>` of every picture's keyframes into the document — `lg-<id>` a
mark, `ld-<id>` a loader, `ic-<id>` an icon, `ill-<id>` a picture. The page that loads it brings the
`--ill-*` and `--lg-*` tokens (its own `tokens.css`, or the set's). A showcase imports it as its
`assets/illustrations.js` (`/showcase › Illustrations`); the product may load it the same way or
inline the files.
