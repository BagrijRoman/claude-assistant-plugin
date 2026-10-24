# {{NAME}} — showcase

A static site that shows what {{NAME}} is and what it is built from: its mark, its first screen, its
shell, its flows step by step, its emails, illustrations and states, and the components and tokens
every screen is drawn with. Made with the `showcase` skill; the pages are the reference the product
is held against.

## Open it

From this folder:

```sh
node open.mjs
```

It serves the site at <http://localhost:{{PORT}}> and opens the browser; Ctrl+C stops it.
`SHOWCASE_PORT=4331` picks another port, `SHOWCASE_NO_OPEN=1` serves without opening a window. The
pages also open straight from disk; served over HTTP they swap content in place instead of
reloading. Node 22 or newer. No dependencies.

Add `?present=1` to an address, or press **P**, for presentation mode: no menu, no top bar, the page
alone and larger. **Escape** leaves it.

## What is where

| File | Holds |
|---|---|
| `site.mjs` | Name, mark, port, languages, fonts, and the picks among variants |
| `pages.mjs` | The pages: bands → root sections → their sections or child pages. The one source of the menu, the breadcrumbs, the catalog and the previous / next links |
| `build.mjs` | Writes the navigation into every page as static HTML, and the tab's icon, `assets/favicon.svg`, from the mark in `site.mjs` and the brand color in `tokens.css`. Run after changing `pages.mjs`, `site.mjs` or the brand tokens; `open.mjs` runs it first too |
| `open.mjs` | The local server |
| `tokens.css` | The design tokens, light and dark — every value on the site |
| `base.css` | Reset and the type scale |
| `components.css` | Every component in plain CSS, each block naming its source in the product or marked "proposed" |
| `sample.mjs` | The fictional company, the people and the data every sample uses |
| `i18n/<lang>.js` | A dictionary per interface language besides the default |
| `tools/gen*.mjs` | Generators: a heavy page or a flow as data, written out as static HTML; `tools/parts/` holds the pieces a page's generator imports when the page was made in parts |
| `tools/lib/html.mjs` | The page shell and the blocks the generators are built from |
| `plans/` | The plans approved before a section was built, and each flow's description |
| `DECISIONS.md`, `CHANGELOG.md` | The choices made and why; what changed at each showing — the sources of the Decisions and Changelog pages |
| `assets/showcase.css`, `assets/site.css` | The site's own frame: menu, top bar, sections, swatches, flow player, device frames |
| `assets/showcase.js` | The icon sprite, live swatches and contrast ratios, toasts, modals, motion replay |
| `assets/nav.js`, `assets/i18n.js`, `assets/flow.js` | Menu, in-place page swaps (the stylesheets are re-read at each, so an edited one reaches the next page), theme and presentation mode; languages; the flow player |
| `<section>/index.html` | One page per root section; `flows/<flow>.html` one page per flow |

## Rules of the site

- Every value shown is read from `tokens.css` in the browser, so the pages cannot drift from the
  tokens. No hex value anywhere else (`/showcase audit` looks for them).
- Nothing appears late: the menu, the steps of a flow, the pictures are static markup; scripts only
  decide what is visible.
- A heavy page is a generator (`tools/gen<Page>.mjs`), not hand-written HTML.
- Where the site proposes something the product does not have, it says "proposed".
- Sample data is for a fictional company ({{SAMPLE_COMPANY}}); see `sample.mjs`.
- The texts come from the Microcopy and tone page; every translatable text carries a `data-i18n` key.
- Every animation has a still version: the site honours `prefers-reduced-motion`.

## To add

- **A section to a page:** an entry in `sections` of the page in `pages.mjs`, an element with that
  id on the page, `node build.mjs`.
- **A flow:** `tools/gen<Flow>.mjs` with `flowPlayer(...)`, an entry in `children` of Flows, build —
  the menu and the Flows index list it.
- **A letter:** a `block()` with the letter's id in `tools/genEmails.mjs`, an entry in `sections` of
  Email templates (`emails`) in `pages.mjs`, build — the menu lists it and scrolls to it.
- **A language:** the code in `site.mjs › languages`, a copy of `i18n/<lang>.js` translated, build,
  then `/showcase audit` for the keys still missing.
- **A pick among variants:** `site.mjs › selected`, the `Selected` mark on the variant, a row on the
  Decisions page — or `/showcase pick <section> <variant>`.
