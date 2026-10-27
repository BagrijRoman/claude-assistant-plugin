# Showcase — how the site works

The frame and its conventions. Read before writing a page or a generator; the frame has rules that
a hand-written page breaks without noticing.

## Contents

- [Files](#files)
- [pages.mjs](#pagesmjs)
- [Writing a page](#writing-a-page)
- [Live values](#live-values)
- [Languages](#languages)
- [Variants and picks](#variants-and-picks)
- [Flows](#flows)
- [Device frames and letters](#device-frames-and-letters)
- [Illustrations and marks](#illustrations-and-marks)
- [Menu, theme, presentation, keys](#menu-theme-presentation-keys)
- [Audit](#audit)

---

## Files

| File | Role |
|------|------|
| `site.mjs` | name, mark (the menu's tile and the tab's icon), port, languages, fonts, `selected` picks |
| `pages.mjs` | the menu: bands → root sections → sections or children |
| `build.mjs` | writes menu, breadcrumbs, pager, catalog, the Flows index's tiles, head (the tab icon's link, fonts, language scripts) and the language switch into every page, between its markers, and `assets/favicon.svg` beside them; refuses two entries of `pages.mjs` that would share a key; idempotent |
| `open.mjs` | the server; runs the build first; `SHOWCASE_PORT`, `SHOWCASE_NO_OPEN` |
| `tokens.css` | every value, light and dark |
| `base.css` | reset and the text classes `.t-page-title .t-section-title .t-card-title .t-body .t-body-strong .t-label .t-caption .t-figure .mono .tnum` |
| `components.css` | the product's components, one block each |
| `assets/showcase.css` | the frame: `.sc-side .sc-top .sc-main .sc-hero .sc-section .sc-section__head .sc-block .sc-row .sc-row__items .sc-state .sc-sample .sc-stage .sc-grid-2/3/4 .sc-tiles .sc-tile .sc-source .sc-proposed .sc-note .sc-list .swatch .sc-swatches .sc-diagram .frame .shell-sample .sc-motion .table-wrap` |
| `assets/site.css` | the gaps between groups, root links, `.tech-mark` (`--mono`, `--initials`), language switch, presentation mode, the flow player, `.variant`, `.tag--selected`, `.device--phone/tablet/desktop`, `.mail`, reduced motion |
| `assets/showcase.js` | the icon sprite (`<use href="#i-…">`), live swatches and contrast, tabs, switches, modals, toasts, motion replay; `window.showcase.enhance(root)` |
| `assets/nav.js` | menu on narrow screens, one root open at a time (fallback), root-title clicks, in-place page swaps that keep the site's stylesheets as the server has them now, scroll-spy, theme, presentation, keys; fires `pageswap` |
| `assets/favicon.svg` | the tab's icon, written by `build.mjs` — never by hand: the selected mark (a letter on the brand tile until one is picked) in `--color-primary`, light and dark |
| `assets/i18n.js` | translates `[data-i18n]` and `[data-i18n-attr]`; the language switch; `window.showcaseI18n` |
| `assets/flow.js` | the step player |
| `tools/lib/html.mjs` | `renderPage`, `section`, `block`, `variant`, `flowPlayer`, `flowMark`, `device`, `mail`, `t`, `escapeHtml` |
| `tools/genPages.mjs` | a starting page for every page that does not exist yet |
| `tools/fetchTechMarks.mjs` | the official marks of the stack, fetched once into `assets/tech/` with `marks.json` (title, color, `mono`, source) |
| `assets/tech/` | the technology marks: the only files with colors of their own, never redrawn, never in a page |
| `tools/gen*.mjs` | one generator per heavy page or flow |
| `tools/parts/<page id>/*.mjs` | the pieces of a page made by several subagents, imported by its generator |
| `sample.mjs` | the company, the cast, the data, `today` |
| `i18n/<lang>.js` | a dictionary per non-default language |
| `plans/` | the approved plans, `<page id>.md`; the list of flows, `flows.md`; each flow's description, `flows/<flow id>.md` |
| `STATE.json`, `DECISIONS.md`, `CHANGELOG.md`, `SOURCES.md`, `README.md` | the skill's state, the decisions, what each gate changed, what was read, how to use the site |

## pages.mjs

```js
export const BANDS = [{ id, title, desc, pages: [page, …] }, …];      // a group: a gap in the menu, a heading in the catalog
// page:  { id, path, title, desc, sections: [{ id, title, desc }] }  — one long page, anchors
//        { id, path, title, desc, sections?, children: [child, …] }   — and pages one level down
//        { id, title, desc }                                          — planned: no path
// child: { id, path, title, desc, sections?: [{ id, title, desc }] } — a page; its sections are anchors on it
```

Ids are the i18n keys: `nav.<page>`, `nav.<page>.desc`, `nav.<page>.<section>`,
`nav.<page>.<section>.desc`, `nav.band.<band>`, `nav.band.<band>.desc`, a child under its root:
`nav.<page>.<child>` (a flow: `nav.flows.<flow>`), and a child's section
`nav.<page>.<child>.<section>` — so a flow called `signIn` does not take the label of the Auth
layout page (`nav.layouts.signIn`). The menu shows no band label: a band is a group of roots, set
apart from the next by a gap, and a heading of the catalog on the Product page. The first page is
the home page, `index.html` — the Product page; build.mjs writes the catalog into it. A section's element on the page has the section's id. After any
change: `node build.mjs`, which stops with the two entries named when two would share a key.

A root whose sections are a list that grows has its step add one section per item: Components, one
per component; Email templates (`emails/index.html`, in Design after Layouts, key `emails`), the
Template and one per letter, the letter's id being its anchor and `nav.emails.<letter id>` its key.
Email templates has no `children` — its letters are not pages — so its page lists none.
Charts (`charts/index.html`, in Design right after Components, key `charts`, only when the product has
figures) is the same: a section per use of a chart in the product, the use's id its anchor and
`nav.charts.<use id>` its key; it is planned (no path) until the Charts step lays it, and has no
`children`.

## Writing a page

Always through `tools/lib/html.mjs`, from a generator:

```js
import { renderPage, section, block, variant, flowPlayer, device, mail, escapeHtml } from './lib/html.mjs';
renderPage({ prefix: '../', lang, siteName, title, titleKey: 'nav.logo', overline, lead, body, scripts: [] })
section({ id, title, titleKey, desc, descKey, body, level: 2 })      // <section class="sc-section">
block({ id, title, titleKey, lead, leadKey, source, body })           // <article class="sc-block" id> — a menu item
variant({ id, title, titleKey, desc, descKey, selected, body })       // a variant with its Selected / Alternative tag
```

`renderPage` leaves the placeholders build.mjs fills: the menu after `<body>`, `<div class="sc-crumb"
data-crumb>`, `<div data-lang-switch>`, the pager before `</main>`, the head markers; the overview
needs `<div data-catalog></div>`, and the Flows index `<div data-children></div>`, where build.mjs
lists the flows. Pages sit one folder below the root (`prefix: '../'`); a flow page,
`flows/<flow>.html`, is one folder below it too.

Inside a block, the frame's vocabulary: `.sc-row` with `.sc-row__items` holding `.sc-state`s
(a sample + a `.t-caption` under it); `.sc-sample` for one sample on a surface; `.sc-stage` for a
wide one (`--page` on the page background, `--narrow`, `--center`); `.sc-grid-2/3/4`; a
`.table-wrap > table.table` for properties; `<p class="sc-source">` for where a sample comes from,
`<span class="badge sc-proposed">proposed</span>` when the product lacks it; `.sc-note` for a note.

Every visible text that will be translated: `<span data-i18n="<section>.<item>.<field>">text</span>`
(or `data-i18n` on the element itself). An element whose text holds markup (`<code>`, `<strong>`, a
tag) keeps it in every language: its dictionary entry is HTML with the same markup. A key never
sits inside another element with a key. Attributes: `data-i18n-attr="placeholder:key;aria-label:key"`.

## Live values

showcase.js reads tokens in the browser and redraws them on `themechange`:

```html
<div class="swatch" data-token="--color-primary" data-use="Main button, links" data-code="bg-primary"></div>
<span data-value="--color-primary"></span>
<tr data-label="Body on surface" data-fg="--color-foreground" data-bg="--color-surface" data-min="4.5"></tr>
```

A token may be written in any CSS color form (hex, `rgb()`, `oklch()`, `color-mix()`); the value is
shown as sRGB hex. The texts in `data-use` and `data-label` translate through `data-use-key` and
`data-label-key` beside them. The contrast row gets a sample cell, the tokens, the ratio and pass /
fail. Tabs (`.tab`),
switches (`[data-switch-state]`), password reveal (`[data-reveal]`), modals
(`[data-modal-open]`), toasts and motion replay (`.sc-motion`) are wired the same way; read the
top of `assets/showcase.js` for the attributes before using one.

## Languages

`site.mjs › languages` lists them; the first is the default unless `defaultLanguage` says
otherwise. Pages are written in the default. A dictionary `i18n/<lang>.js` registers
`window.SHOWCASE_I18N['<lang>'] = { key: text }`; build.mjs loads it in `<head>` with
`assets/i18n.js`, deferred. The switch appears in the top bar when there is more than one language;
the choice is kept per site and stamped on `<html lang>`. A missing key keeps the default text,
so a half-translated site never shows blanks — the audit (below) finds the gaps.

Nav labels, pager and catalog texts are keyed by build.mjs (`nav.*`, `ui.*`); the frame's own
strings — `ui.*`, `flow.*`, and the starting pages' `overview.how.*` and `flows.list.*` — are
already in the dictionary skeleton.

## Variants and picks

A variant is `variant({...})`: a `<section class="sc-section variant" data-variant="<id>">` with
a `Selected` or `Alternative` tag. `site.mjs › selected = { logo: 'valley', signIn: 'liveApp', … }`
is the record; the generator reads it to put the selected variant first and tag it. `pick` edits
`site.mjs`, reruns the generator, appends to `DECISIONS.md`, regenerates Decisions, builds.

## Flows

```js
flowPlayer({ id: 'signIn', title: 'Sign in', steps: [
  { title: 'The sign-in page', titleKey: 'flows.signIn.page.title', screen: '<div class="shell">…</div>',
    note: 'What the user sees and does.', noteKey: 'flows.signIn.page.note' },
  …
]})
// the page around it: renderPage({ …, titleKey: 'nav.flows.signIn', scripts: ['assets/flow.js'] })
```

**What the user acts on** in a step is marked in its screen with `data-flow-target="1"`, `"2"`, … in
the order of acting, and the note names it with `flowMark(1)` from `tools/lib/html.mjs`:

```js
{ title: 'The sign-in page', screen: `…<div class="field" data-flow-target="1">…</div>
    <div class="field" data-flow-target="2">…</div><button class="btn btn--primary" data-flow-target="3" data-go="step-2">Sign in</button>…`,
  note: `Types the email ${flowMark(1)}, the password ${flowMark(2)} and presses Sign in ${flowMark(3)}.` }
```

While its step is on show each target is ringed in the brand color with its number at the corner,
and the emphasis walks 1 → 2 → 3 and starts again, so the viewer sees the order of the actions
(still under reduced motion; *All steps* rings every step). The attribute goes on the component's
outer element — the field with its label, the button, the row — not on a bare `<input>`, which
cannot carry the number; a component that draws its own `::after` (a switch, a checkbox) is marked
on its wrapper. `data-flow-target=""` rings without a number. A flow with targets gets a **Hints**
button in the bar that turns rings and numbers off, for a clean screen; the choice is kept for the
site.

The player (`assets/flow.js`, loaded by the flow page) shows one step, keeps `#step-n` in the
address, gives ← → (taking the keys from the page turner while a flow is on the page), *All
steps*, *Full screen* (the browser's, or an overlay). The bar shows the title of the step on
show, in the language on show. A control inside a screen with `data-go="step-3"` jumps;
`data-go="end"` shows "not drawn yet". The flow page is a child of Flows in `pages.mjs` and
includes `assets/flow.js` (genPages does so for the children of Flows, and only for them); the next `node build.mjs` puts it in the
menu and on the Flows index.

## Device frames and letters

`device('phone' | 'tablet' | 'desktop', screenHtml)` draws the frame; `.devices` lays several side
by side. `mail({ from, to, subject, body })` shows a 600 px letter as a mail client does. The letters
stand on `emails/index.html`, written by `tools/genEmails.mjs`: a `block()` per letter with the
letter's id, under two headings, *Common letters* and *The product's own*. A flow that shows a letter
imports `letter(id, marks)` from that generator.

## Illustrations and marks

Illustrations: SVG `<symbol>`s in `assets/illustrations.js`, used as
`<svg class="ill ill--spot"><use href="#ill-empty"/></svg>`; drawn only with `--ill-*` tokens
(line, fill, soft, accent — added to `tokens.css` from the scheme, both themes); every picture
animated, minimally, in CSS keyframes on classes inside the symbol, stopped by the reduced-motion
rule in `site.css`. Marks:
SVG on a 64-unit grid, `currentColor` ink, `var(--lg-ground)` knockouts; the picked mark's SVG goes
to `site.mjs › mark`, where `build.mjs` also draws the tab's icon from it. `--lg-ground` is the color
behind the mark: `tokens.css` sets it for the page, the brand tile in `components.css` to its own
fill, and every ground the Logo page shows a mark on (light, dark, the brand color) sets it again.

## Menu, theme, presentation, keys

Menu: a root with sections or child pages is a `<details>` carrying `name="sc-side"`, so one root is
open at a time — opening one folds the one that was open; a root without them is a plain link. The
root of the page on show is opened by build.mjs, and after an in-place swap by nav.js, which folds the
others itself as well (so browsers without the attribute agree, and a swap to a page whose root is a
plain link ends with every root folded, as a reload does). nav.js never scrolls the menu to a link
inside a folded root, and keeps keyboard focus in the menu when a fold would hide it. A folded root
still marks the page on show on its title — `aria-current="page"`, or `"true"` on the root of a flow.
On a narrow screen the menu is a drawer behind *All pages*, inert while closed, so the Tab key
skips it. The styles stay as fresh as the menu: an in-place swap asks the server again (`cache: 'no-store'`)
for the site's own stylesheets and loads one that changed since the tab took it beside the old copy,
which leaves once the new one has loaded — so a page opened after `tokens.css` or `components.css`
was edited is drawn with the edit, with no reload.

`data-theme="light|dark"` on `<html>`, or none for the device's choice; tokens.css carries both
sets. The tab's icon follows only the device's choice (`prefers-color-scheme`), as a browser gives an
icon no page to read the switch from. Presentation: `html.present`, toggled by **P**, the top-bar
button or `?present=1`; Escape leaves. Keys: ← → step sections, then pages; in a flow they step the flow.

## Audit

Run from the showcase folder; fix what is found before the gate. The rows that need no eyes — every
page exists, the build is idempotent, no value outside tokens, the two dark sets agree, every key
translated — are one command, which prints each finding with its file and line:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/showcase.mjs" check <showcase dir>
```

Run it first and work from its list; the rows below say what each check means. The rest — both themes
in every language, reduced motion, screenshots — is done by looking.

| Check | How |
|-------|-----|
| Build is idempotent | `node build.mjs` twice; the second run reports "up to date" |
| Every page exists | each `path` in `pages.mjs` (and children) is a file; `node tools/genPages.mjs` reports nothing to write |
| No value outside tokens | `grep -rnE '#[0-9a-fA-F]{3,8}\b' --include='*.css' --include='*.html' --include='*.js' . \| grep -v tokens.css \| grep -v 'href="#' \| grep -v 'allow-hex'` is empty; same for `font-family:` not followed by `var(--font` and for literal `px` radii in pages |
| Two dark sets agree | in `tokens.css`, the block under `@media (prefers-color-scheme: dark)` and the one under `:root[data-theme='dark']` declare the same tokens with the same values |
| Every key translated | collect `data-i18n="…"` keys from every `.html`; for each dictionary, list keys absent — fill them; list dictionary keys no page uses — remove or keep knowingly |
| Both themes, every language | open each page in light and dark and in each language: nothing overflows a device frame or a flow screen in the longest language; the contrast rows all pass; the menu and crumbs read right |
| Reduced motion | with the OS setting on (or DevTools emulation), every animation is still and the page is complete |
| Reachability | every page is in the catalog and the menu; the pager walks the whole site |
| Screenshots | with Playwright available: every page × theme to `screenshots/<theme>/<page>.png` — the set to send the customer |
