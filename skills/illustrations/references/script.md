# Illustrations — the script

`node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" <command> <dir>` does the mechanical parts, the
same way every time, so that you draw and decide, and never assemble a page by hand. `<dir>` is the
set's folder (its `STATE.json` must have kind `illustrations`). Findings come one per line —
`error: <file>:<line> — <what>`, `warning: …` — and `check` exits 1 on an error.

| Command | Does |
|---------|------|
| `build <dir>` | the review page from `review/manifest.json` and the SVG files: `review/index.html` (opens from disk) and `review/artifact.html` (the fragment the `Artifact` tool publishes); after the save, the set's own `index.html` and `artifact.html` |
| `check <dir>` | the manifest (every file there, ids unique and kebab-case, one mark and one scheme selected, a loader's mark known), every SVG (tokens only, no id, text, gradient, raw duration, delay or easing, its classes and keyframes its own, keyframes on transform, opacity and stroke-dashoffset only and never ending on opacity 0, no ease-in, no delay past one gesture, a warning past 30 animated nodes or 24 KB), the two dark sets of `tokens.css` |
| `save <dir>` | refuses while a tab is not `approved` in `STATE.json` or no scheme is marked chosen; otherwise moves every file out of `review/` (a reduced-motion block written into each animated picture's `<style>`), writes `manifest.json`, the page, `illustrations.js`, removes `review/`, marks the state done |
| `strings <dir> [--out <file>]` | every word of the manifest as keys in `strings.<lang>.json` — `<tab>.<id>.heading|message|action`, `loaders.<place>`, `emails.<id>.subject|heading|message|action|detail|alt`, `emails.template.sender|footer` — for the product's i18n; the save writes it too |
| `sprite <dir> [--out <file>]` | the set as `<symbol>`s in one script — `lg-<id>` a mark, `ld-<id>` a loader, `ic-<id>` an icon, `ill-<id>` a picture — for a showcase or the product; with a reduced-motion sheet for every symbol and a pause while the tab is in the background |
| `loop <dir>` | every picture's, scene's and letter's animation made cyclic: the picture rests, rewinds its gesture, plays it again and rests, on one period of tokens per picture; idempotent, a loader and a picture that already loops are left as they are |
| `spring <dir> [--bounce <b>] [--name <n>]` | a spring's response as a `linear()` easing — printed; with `--name`, written into `tokens.css` as `--ill-spring-<n>` under `@supports`, the fallback on `:root`. The template ships `smooth` (bounce 0) and `snappy` (0.15); run it only when the direction wants another spring |
| `import <dir> logo <file.svg> [--id <id>]` | the customer's mark analysed — groups, shapes, a merged outline, strokes, raw colors, ids, what needs a hand (a gradient, text, a raster), what can move — then kept as received in `review/logo/<id>.source.svg` and copied onto tokens (colors by frequency: the body `currentColor`, white the ground, the next the accents; `<g id>` to prefixed classes; ids dropped) as `review/logo/<id>.svg`, the geometry untouched; it prints the manifest entry to add |
| `import <dir> icons <folder>` | every SVG of the folder analysed and normalised into `review/icons/<id>.svg`: a square viewBox scaled to the 16 grid, every stroke to 1.5, raw colors to `currentColor`, ids dropped, classes prefixed; one not square, with text, a raster or a gradient is named and left for a hand; it prints the entries to add |
| `tokens <dir> [--format json|tailwind] [--out <file>]` | the set's tokens for the product: `tokens.json` in the Style Dictionary shape (every token with its light `value` and its `dark`, a `var()` as a `{group.key}` reference, the springs' `linear()` curves) and `tokens.tailwind.cjs` (a theme extension whose colors, fonts, radii, shadows, durations and easings are `var(--…)` references, so both themes keep working); both unless `--format` names one |

Run `loop` after every drawing round (every picture's and letter's animation made cyclic), `check`
before every publish and fix what it lists; run `build` after every change to the manifest or a
file; never edit `index.html` or `artifact.html` by hand.
