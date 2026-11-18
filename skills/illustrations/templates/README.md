# {{NAME}} — illustration set

The pictures {{NAME}} is recognised by: its mark, the loaders drawn from it, a picture for every
state a screen can be in, the scenes of its world and the pictures of its letters. Made with the
`illustrations` skill of the dev-assistant plugin; reviewed by the operator on a shared page before
anything here was saved. It lives with the documentation, so the showcase and the product find it here.

## What is where

| Path | Holds |
|---|---|
| `index.html` | The whole set on one page — tabs by topic, light and dark, every animation with a replay. Opens from disk. |
| `artifact.html` | The same page as the fragment the Claude Artifact tool publishes, for sharing a link. |
| `manifest.json` | Every picture with its id, title, idea, file and words — the catalog the page is built from. |
| `tokens.css` | Every color, font, radius and duration, light and dark. The only file with values. |
| `logo/` | The marks, `<id>.svg`: 64-unit grid, `currentColor`, knockouts in `--lg-ground`, one accent in `--lg-accent`. |
| `loaders/` | The loaders, `<id>.svg`: the picked mark's parts in motion; `--progress` for the determinate ones. |
| `states/`, `scenes/`, `emails/` | The pictures, `<id>.svg`: `--ill-*` tokens only, no text, each with its own animation and a still last frame. |
| `illustrations.js` | The sprite: one script that puts every picture into a page as `<symbol>`s with their styles. |
| `tokens.json`, `tokens.tailwind.cjs` | The tokens for the product's tooling (`node bin/illustrations.mjs tokens .`): the Style Dictionary shape with light and dark values, and a Tailwind theme extension on `var()`. |
| `strings.<lang>.json` | Every word beside a picture — the states' headings, messages and actions, the loaders' words, the letters' subjects, headings, messages, actions, details and alt — as keys for the product's i18n. |
| `DECISIONS.md`, `CHANGELOG.md` | What was decided and why; what each round changed. |

## Use a picture

Include `tokens.css` (or copy its `--ill-*` and `--lg-*` blocks into your own tokens), then either
inline an SVG file, or load the sprite once and reference a symbol:

```html
<script src="illustrations.js" defer></script>
<svg class="ill" viewBox="0 0 320 240" role="img" aria-label="Nothing here yet"><use href="#ill-empty"/></svg>
<svg class="lg" viewBox="0 0 64 64" aria-hidden="true"><use href="#lg-{{picked mark}}"/></svg>
<svg class="ld" viewBox="0 0 64 64" role="status" aria-label="Loading"><use href="#ld-{{a loader}}"/></svg>
```

In React, one component wraps the `<use>`; in Vue, the same as a single-file component:

```jsx
// Illustration.jsx — <Illustration id="empty" label="Nothing here yet" />
export function Illustration({ id, label, wide = false }) {
  return (
    <svg className="ill" viewBox={wide ? '0 0 560 240' : '0 0 320 240'} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <use href={\`#ill-\${id}\`} />
    </svg>
  );
}
```

```vue
<!-- Illustration.vue — <Illustration id="empty" label="Nothing here yet" /> -->
<script setup>
defineProps({ id: String, label: String, wide: Boolean });
</script>
<template>
  <svg class="ill" :viewBox="wide ? '0 0 560 240' : '0 0 320 240'" :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : 'true'">
    <use :href="\`#ill-\${id}\`" />
  </svg>
</template>
```

Load `illustrations.js` once (a `<script defer>` in the document, or an import in the app's entry);
it injects the symbols and pauses every animation while the tab is in the background. A picture that
must start when it scrolls into view, or pause off screen, is inlined from its SVG file instead (the
symbols share one animation each) and driven by an observer:

```js
const seen = new IntersectionObserver((entries) => entries.forEach((e) => {
  e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
}));
document.querySelectorAll('svg.ill--inline').forEach((svg) => seen.observe(svg));
```

Symbols are `ill-<id>` for a state, scene or letter picture, `lg-<id>` for a mark, `ld-<id>` for a
loader. A mark takes the color of its parent (`currentColor`); set `--lg-ground` to the color behind
it. A determinate loader reads `--progress` (0 to 1) from its parent. Every animation stops on its
last frame under `prefers-reduced-motion`, which is the complete still picture — nothing else is
needed for that.

## Remake or extend

`/illustrations` in this project resumes from `STATE.json`; `/illustrations tab <id>` remakes one
tab through the same review; `/illustrations add` adds a picture the catalog lacks. A hand edit to an
SVG is kept (the skill never overwrites a saved file without asking), but a hand edit to `index.html`
is lost on the next build — change `manifest.json` and run
`node "${CLAUDE_PLUGIN_ROOT}/bin/illustrations.mjs" build .` instead.
