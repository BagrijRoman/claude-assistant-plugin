#!/usr/bin/env node
// illustrations — the mechanical parts of the /illustrations skill, done by code the same way every time: the review
// page built from the manifest and the SVG files, the checks that keep every picture themable and clash-free, the save
// that turns the approved drafts into the set, and the sprite other sites load the set from.
//
//   node bin/illustrations.mjs build  <dir>              the page: review/index.html + review/artifact.html while a review
//                                                        is on (review/manifest.json exists), else the saved set's
//   node bin/illustrations.mjs check  <dir>              the checks of the drafts (or of the saved set)
//   node bin/illustrations.mjs save   <dir>              every tab approved → files moved out of review/, the set's page,
//                                                        manifest and sprite written, review/ removed, STATE.json done
//   node bin/illustrations.mjs sprite <dir> [--out <f>]  illustrations.js: every picture as a <symbol>, with its styles
//
// <dir> is the set's folder, whose STATE.json has kind "illustrations"; a command stops (exit 1) when that file is
// missing, does not parse or belongs to something else. Findings are printed one per line —
// `error: <file>:<line> — <what>` — and `check` exits 1 on an error. Usage errors exit 2.

import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node bin/illustrations.mjs <command> <dir> [options]
  build  <dir>               write the page (review/ while a review is on, the saved set otherwise)
  check  <dir>               the checks: manifest, every SVG, the dark sets of tokens.css
  save   <dir>               move the approved drafts out of review/, write the set's page, manifest and sprite
  sprite <dir> [--out <f>]   write the set as symbols into illustrations.js (or <f>)
`;

const COMMANDS = ['build', 'check', 'save', 'sprite'];
const TEMPLATES = fileURLToPath(new URL('../skills/illustrations/templates/', import.meta.url));
const KINDS = ['scheme', 'marks', 'loaders', 'icons', 'pictures', 'letters'];
const PREFIX = { marks: 'lg', loaders: 'ld', icons: 'ic', pictures: 'ill', letters: 'ill' };
const SIZE_WARNING = 24 * 1024;
const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color|color-mix)\(/;

const print = (text) => process.stdout.write(`${text}\n`);
const fail = (message) => {
  process.stderr.write(`[dev-assistant] illustrations: ${message}\n`);
  process.exit(1);
};
const usage = (message) => {
  process.stderr.write(`[dev-assistant] illustrations: ${message}\n${USAGE}`);
  process.exit(2);
};
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const statOf = (path) => { try { return statSync(path); } catch { return null; } };
const read = (path) => { try { return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n'); } catch { return ''; } };
const today = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (text) => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const finding = (level) => (file, line, what) => ({ level, text: `${level}: ${line ? `${file}:${line}` : file} — ${what}` });
const error = finding('error');
const warning = finding('warning');

// --- the set on disk

const loadState = (dir) => {
  const path = join(dir, 'STATE.json');
  if (!statOf(path)?.isFile()) fail(`${path} not found. Pass the set's folder.`);
  let state;
  try { state = JSON.parse(read(path)); } catch (problem) { fail(`${path} does not parse (${problem.message})`); }
  if (state?.kind !== 'illustrations') fail(`${path} is not an illustration set's: kind ${JSON.stringify(state?.kind ?? null)}`);
  return state;
};

/** Where the manifest and the files are: review/ while a review is on, the folder itself once saved. */
const stageOf = (dir) => {
  if (statOf(join(dir, 'review', 'manifest.json'))?.isFile()) return { base: join(dir, 'review'), review: true };
  if (statOf(join(dir, 'manifest.json'))?.isFile()) return { base: dir, review: false };
  return null;
};

const loadManifest = (base) => {
  const path = join(base, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(read(path)); } catch (problem) { fail(`${path} does not parse (${problem.message})`); }
  if (!Array.isArray(manifest?.tabs)) fail(`${path} has no tabs`);
  manifest.tabs.forEach((tab) => { tab.items = Array.isArray(tab.items) ? tab.items : []; });
  return manifest;
};

const tabOf = (manifest, id) => manifest.tabs.find((tab) => tab.id === id);
const selectedMark = (manifest) => tabOf(manifest, 'logo')?.items.find((item) => item.selected) ?? null;
const symbolId = (tab, item) => `${PREFIX[tab.kind] ?? 'ill'}-${item.id}`;

/** An SVG file taken apart: its viewBox, the styles of its <style> blocks and the drawing without them. */
const parseSvg = (text) => {
  const stripped = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?xml[^>]*>/g, '').trim();
  const open = /<svg\b([^>]*)>/.exec(stripped);
  const close = stripped.lastIndexOf('</svg>');
  if (!open || close < 0) return null;
  const viewBox = /viewBox="([^"]+)"/.exec(open[1])?.[1] ?? null;
  const inner = stripped.slice(open.index + open[0].length, close);
  const styles = [...inner.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1].trim());
  const body = inner.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').trim();
  return { viewBox, style: styles.join('\n'), body, attributes: open[1] };
};

// --- the page

const renderSvg = (tab, item, { className = '', animated = false, style = '', label = '' } = {}) => {
  const aria = label ? ` role="img" aria-label="${escapeHtml(label)}"` : ' aria-hidden="true"';
  return `<svg class="${className}" viewBox="${escapeHtml(item.viewBox ?? '0 0 320 240')}"${aria}${animated ? ' data-animated' : ''}${style ? ` style="${escapeHtml(style)}"` : ''}><use href="#${symbolId(tab, item)}"/></svg>`;
};

const idChip = (tab, item) => `<button type="button" class="item__id" data-copy="${escapeHtml(`${tab.id}/${item.id}`)}" title="Copy the id for a revision">${escapeHtml(item.id)}</button>`;
const replayButton = () => '<button type="button" class="btn btn--ghost btn--sm" data-replay>Replay</button>';
const movingTag = (item) => (item.animated ? '<span class="tag tag--moving">Moving</span>' : '');

const itemHead = (tab, item, tags = '') => `<div class="item__head"><span class="item__title">${escapeHtml(item.title)}</span>${idChip(tab, item)}<span class="item__tags">${tags}</span></div>`;

const groupsOf = (items) => {
  const groups = new Map();
  for (const item of items) {
    const key = item.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()];
};
const groupHeading = (title, count) => (title ? `<div class="group"><h3>${escapeHtml(title)}</h3><span class="group__count">${count}</span></div>` : '');

const renderMarks = (tab, manifest) => {
  const rows = [['', 'On the page'], ['lineup__row--inverted', 'On the inverted surface'], ['lineup__row--brand', 'On the brand color']]
    .map(([cls, title]) => `<div class="lineup__row ${cls}" title="${title}">${tab.items.map((item) => `<div class="lineup__cell">${renderSvg(tab, item)}<span>${escapeHtml(item.id)}</span></div>`).join('')}</div>`);
  rows.push(`<div class="lineup__row" title="At 16 px, a browser tab">${tab.items.map((item) => `<div class="lineup__cell lineup__cell--sm">${renderSvg(tab, item)}<span>${escapeHtml(item.id)}</span></div>`).join('')}</div>`);
  const sizes = [16, 24, 32, 64, 128];
  const cards = tab.items.map((item) => {
    const tags = `${item.selected ? '<span class="tag tag--selected">Selected</span>' : ''}${item.shortlist && !item.selected ? '<span class="tag tag--shortlist">Shortlist</span>' : ''}`;
    return `<article class="item${item.selected ? ' item--selected' : ''}" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, tags)}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="grounds"><div class="ground">${renderSvg(tab, item)}</div><div class="ground ground--inverted">${renderSvg(tab, item)}</div><div class="ground ground--brand">${renderSvg(tab, item)}</div></div>
<div class="sizes"><div class="sizes__cell"><span class="wordmark">${renderSvg(tab, item)}${escapeHtml(item.wordmark ?? manifest.wordmark ?? manifest.project ?? '')}</span><span>wordmark</span></div>${sizes.map((size) => `<div class="sizes__cell">${renderSvg(tab, item, { style: `width:${size}px;height:${size}px` })}<span>${size}</span></div>`).join('')}</div>
${item.from ? `<p class="item__meta"><strong>From the product:</strong> ${escapeHtml(item.from)}</p>` : ''}
</article>`;
  });
  return `<div class="lineup">${rows.join('')}</div><div class="grid">${cards.join('\n')}</div>`;
};

const renderLoaders = (tab, manifest) => {
  const logo = tabOf(manifest, 'logo');
  const markTitle = (id) => logo?.items.find((item) => item.id === id)?.title ?? id;
  const groups = groupsOf(tab.items.map((item) => ({ ...item, group: item.mark ? `From the mark ${markTitle(item.mark)}` : (item.group ?? '') })));
  const cards = groups.map(([title, items]) => `${groupHeading(title, items.length)}<div class="grid">${items.map((item) => `<article class="item" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, '<span class="tag tag--moving">Moving</span>')}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="ld-sizes">${[['lg', 64], ['md', 32], ['sm', 16]].map(([cls, size]) => `<div class="ld-sizes__cell">${renderSvg(tab, item, { className: `ld ld--${cls}`, animated: true })}<span>${size}</span></div>`).join('')}</div>
${item.determinate ? `<div class="progress-row">${[0, 33, 66, 100].map((share) => `<div class="progress-row__cell">${renderSvg(tab, item, { className: 'ld ld--md', style: `--progress:${share / 100}` })}<span>${share}%</span></div>`).join('')}</div>` : ''}
${item.use ? `<p class="item__meta"><strong>For:</strong> ${escapeHtml(item.use)}</p>` : ''}
<div class="item__foot">${replayButton()}</div>
</article>`).join('\n')}</div>`).join('\n');
  const words = { button: 'Saving…', panel: 'Loading your data…', start: `Starting ${manifest.project ?? ''}`.trim(), ...(tab.words ?? {}) };
  const pick = (i) => tab.items[Math.min(i, tab.items.length - 1)];
  const inPlace = tab.items.length ? `${groupHeading('In place', 3)}<div class="grid">
<article class="item" data-item><div class="item__head"><span class="item__title">A button at work</span></div><div class="stage"><button type="button" class="btn btn--primary" disabled>${renderSvg(tab, pick(0), { className: 'ld ld--sm', animated: true })}${escapeHtml(words.button)}</button></div></article>
<article class="item" data-item><div class="item__head"><span class="item__title">A panel loading</span></div><div class="stage"><div class="sample sample--row" role="status">${renderSvg(tab, pick(1), { className: 'ld ld--md', animated: true })}<span class="sample__message">${escapeHtml(words.panel)}</span></div></div></article>
<article class="item" data-item><div class="item__head"><span class="item__title">The application starting</span></div><div class="sample sample--brand" role="status">${renderSvg(tab, pick(2), { className: 'ld ld--lg', animated: true })}<span class="sample__message">${escapeHtml(words.start)}</span></div></article>
</div>` : '';
  return `${cards}\n${inPlace}`;
};

const renderIcons = (tab) => {
  const rows = [['', 'On the page'], ['icon-row--inverted', 'On the inverted surface']]
    .map(([cls, title]) => `<div class="icon-row ${cls}" title="${title}">${tab.items.map((item) => renderSvg(tab, item, { className: 'ic', label: item.title })).join('')}</div>`).join('');
  const cells = groupsOf(tab.items).map(([title, items]) => `${groupHeading(title, items.length)}<div class="icons">${items.map((item) => `<div class="icon-cell" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}"><div class="icon-cell__row">${renderSvg(tab, item, { className: 'ic ic--16' })}${renderSvg(tab, item, { className: 'ic ic--20' })}${renderSvg(tab, item, { className: 'ic ic--24', label: item.title })}</div>${idChip(tab, item)}<span class="icon-cell__name">${escapeHtml(item.title)}</span>${item.usedIn ? `<span class="icon-cell__use">${escapeHtml(item.usedIn)}</span>` : ''}</div>`).join('')}</div>`).join('\n');
  return `${rows}${cells}`;
};

const renderPictures = (tab) => groupsOf(tab.items).map(([title, items]) => `${groupHeading(title, items.length)}<div class="grid">${items.map((item) => {
  const words = item.words ?? null;
  const sample = words ? `<div class="inplace"><div class="sample">${renderSvg(tab, item, { className: 'ill ill--spot', animated: item.animated })}<p class="sample__heading">${escapeHtml(words.heading ?? '')}</p>${words.message ? `<p class="sample__message">${escapeHtml(words.message)}</p>` : ''}${words.action ? `<button type="button" class="btn btn--primary">${escapeHtml(words.action)}</button>` : ''}</div></div>` : '';
  return `<article class="item" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, movingTag(item))}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="stage">${renderSvg(tab, item, { className: `ill${tab.kind === 'letters' || item.wide ? ' ill--wide' : ''}`, animated: item.animated, label: item.title })}</div>
${sample}
${item.usedIn ? `<p class="item__meta"><strong>Used in:</strong> ${escapeHtml(item.usedIn)}</p>` : ''}
${item.animated && item.motion ? `<p class="item__meta"><strong>Moves:</strong> ${escapeHtml(item.motion)}</p>` : ''}
<div class="item__foot">${item.animated ? replayButton() : ''}</div>
</article>`;
}).join('\n')}</div>`).join('\n');

const renderLetter = (tab, item, manifest, { anatomy = false } = {}) => {
  const mark = selectedMark(manifest);
  const logo = tabOf(manifest, 'logo');
  const part = (name) => (anatomy ? ` part" data-part="${name}` : '');
  const template = tab.template ?? {};
  return `<div class="mail${anatomy ? ' mail--anatomy' : ''}">
<div class="mail__meta"><strong>${escapeHtml(item.subject ?? '')}</strong><br>${escapeHtml(item.from ?? template.sender ?? '')} → ${escapeHtml(item.to ?? '')}</div>
<div class="mail__header${part('header')}">${mark && logo ? renderSvg(logo, mark) : ''}${escapeHtml(manifest.wordmark ?? manifest.project ?? '')}</div>
<div class="mail__picture${part('picture')}">${renderSvg(tab, item, { className: 'ill ill--wide', animated: item.animated, label: item.title })}</div>
<div class="mail__body">
<p class="mail__heading${part('heading')}">${escapeHtml(item.heading ?? '')}</p>
${item.message ? `<p class="mail__message${part('message')}">${escapeHtml(item.message)}</p>` : ''}
${item.action ? `<div class="${anatomy ? 'part' : ''}"${anatomy ? ' data-part="action"' : ''}><button type="button" class="btn btn--primary">${escapeHtml(item.action)}</button></div>` : ''}
${item.detail ? `<div class="mail__detail${part('detail')}">${escapeHtml(item.detail)}</div>` : ''}
</div>
<div class="mail__footer${part('footer')}">${escapeHtml(item.footer ?? template.footer ?? '')}</div>
</div>`;
};

const renderLetters = (tab, manifest) => {
  const first = tab.items[0];
  const anatomy = first ? `${groupHeading('Template', 1)}<p class="panel__lead">The one layout every letter is filled into: its parts named on the first letter. ${escapeHtml(tab.template?.note ?? '')}</p><div class="grid grid--wide"><article class="item" data-item id="${escapeHtml(`${tab.id}-template`)}"><div class="stage stage--letter">${renderLetter(tab, first, manifest, { anatomy: true })}</div></article></div>` : '';
  const groups = groupsOf(tab.items).map(([title, items]) => `${groupHeading(title, items.length)}<div class="grid grid--wide">${items.map((item) => `<article class="item" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, movingTag(item))}
${item.moment ? `<p class="item__idea"><strong>Sent</strong> ${escapeHtml(item.moment)}</p>` : ''}
<div class="stage stage--letter">${renderLetter(tab, item, manifest)}</div>
<div class="item__foot">${item.animated ? replayButton() : ''}</div>
</article>`).join('\n')}</div>`).join('\n');
  return `${anatomy}\n${groups}`;
};

/** Three (or so) schemes side by side, each strip on its own values: the one page element allowed raw values. */
const renderSchemes = (tab, files) => {
  const css = [];
  const cards = tab.items.map((item) => {
    const cls = `scheme-${item.id}`;
    const declare = (set) => Object.entries(set ?? {}).map(([name, value]) => `${name}: ${value};`).join(' ');
    // The strip on its own values; and the whole page on them when the viewer tries this scheme (html.use-<cls>)
    css.push(`.${cls}, html.use-${cls} { ${declare(item.light)} }`);
    css.push(`@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) .${cls}, html:not([data-theme='light']).use-${cls} { ${declare(item.dark)} } }`);
    css.push(`:root[data-theme='dark'] .${cls}, html[data-theme='dark'].use-${cls} { ${declare(item.dark)} }`);
    const sample = item.sample && files.get(item.sample) ? `<svg class="ill" viewBox="${escapeHtml(files.get(item.sample).viewBox ?? '0 0 320 240')}" aria-hidden="true" data-animated><use href="#scheme-${escapeHtml(item.id)}"/></svg>` : '';
    return `<article class="scheme ${cls}${item.selected ? ' item--selected' : ''}" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, item.selected ? '<span class="tag tag--selected">Selected</span>' : '')}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="scheme__strip"><div class="scheme__ui"><button type="button" class="btn btn--primary">Save</button><button type="button" class="btn btn--secondary">Cancel</button><span class="scheme__chip">Reviewed</span><a href="#${escapeHtml(tab.id)}">A link</a></div><div class="scheme__row">A selected row</div>${sample}</div>
<div class="swatches">${Object.keys(item.light ?? {}).filter((name) => name.startsWith('--ill-') || name === '--color-primary').slice(0, 8).map((name) => `<div class="swatch"><div class="swatch__chip" style="background: var(${name})"></div><span class="swatch__name">${name}</span></div>`).join('')}</div>
<div class="item__foot"><button type="button" class="btn btn--secondary btn--sm" data-scheme-use="${escapeHtml(item.id)}" aria-pressed="false">Try it on every picture</button></div>
</article>`;
  });
  return { html: `<div class="schemes">${cards.join('\n')}</div>`, css: css.join('\n') };
};

/** The viewer's switch between the schemes considered, when there are several: the chosen one is the page's own. */
const schemeSwitch = (manifest) => {
  const tab = manifest.tabs.find((entry) => entry.kind === 'scheme');
  if (!tab || tab.items.length < 2) return '';
  const chosen = tab.items.find((item) => item.selected) ?? tab.items[0];
  return `<div class="segmented" role="group" aria-label="Color scheme" data-scheme-switch>${tab.items.map((item) => `<button type="button" class="segmented__item" data-scheme-use="${escapeHtml(item.id)}" aria-pressed="${item === chosen ? 'true' : 'false'}" title="${escapeHtml(item.idea ?? '')}">${escapeHtml(item.title)}</button>`).join('')}</div>`;
};

const renderOverview = (manifest, state, stage) => {
  const statusOf = (tab) => {
    const status = state.steps?.[tab.id];
    if (status === 'approved' || status === 'done') return ['approved', 'Approved'];
    if (status === 'skipped') return ['skipped', 'Skipped'];
    if (status === 'awaiting-review') return ['review', `In review${state.rounds?.[tab.id] ? ` · round ${state.rounds[tab.id]}` : ''}`];
    return ['draft', 'Draft'];
  };
  const tokens = ['--color-primary', '--ill-line', '--ill-fill', '--ill-soft', '--ill-muted', '--ill-accent', '--ill-accent-soft', '--ill-ground', '--ill-positive', '--ill-caution', '--ill-negative', '--lg-accent'];
  return `<div class="overview">
<div class="contents">${manifest.tabs.map((tab) => { const [cls, text] = statusOf(tab); return `<a class="contents__row" href="#${escapeHtml(tab.id)}"><span>${escapeHtml(tab.title)} <span class="tab__count">${tab.items.length}</span></span><span class="status status--${cls}">${text}</span></a>`; }).join('')}</div>
<div><div class="group"><h3>The colors every picture is drawn with</h3></div><div class="swatches">${tokens.map((name) => `<div class="swatch" data-token="${name}"><div class="swatch__chip"></div><span class="swatch__name">${name}</span><span class="swatch__value"></span></div>`).join('')}</div></div>
<div class="howto"><div class="group"><h3>How to review</h3></div>
<p><strong>Look in both themes.</strong> The switch at the top; every picture follows it. <strong>Replay</strong> runs a picture's animation again; with reduced motion on, every picture is its still last frame.</p>
<p><strong>To ask for a change</strong>, name the tab and the picture's id — click the id to copy it, <code>states/empty</code> — and say what should change. One message can hold many. To keep one as it is, say nothing.</p>
<p>${stage.review ? '<strong>Nothing here is saved yet.</strong> The set is written to the project once every tab is approved.' : '<strong>This is the saved set.</strong> The files stand beside this page; <code>manifest.json</code> lists them.'}</p>
</div>
</div>`;
};

const buildPage = (dir, state, stage, manifest) => {
  // Every SVG once, as a symbol; its styles once, in the head
  const files = new Map();
  const symbols = [];
  const styles = [];
  // A file parsed once and its styles in the head once, a symbol per id that names it (a scheme's sample is a
  // picture of another tab too)
  const ids = new Set();
  const takeFile = (file, id) => {
    if (!files.has(file)) {
      const text = read(join(stage.base, file));
      const svg = text ? parseSvg(text) : null;
      if (!svg) fail(`${join(stage.review ? 'review' : '.', file)}: not an SVG file, or missing (named in manifest.json)`);
      files.set(file, svg);
      if (svg.style) styles.push(svg.style);
    }
    const svg = files.get(file);
    if (!ids.has(id)) {
      ids.add(id);
      symbols.push(`<symbol id="${escapeHtml(id)}" viewBox="${escapeHtml(svg.viewBox ?? '0 0 320 240')}">${svg.body}</symbol>`);
    }
    return svg;
  };
  for (const tab of manifest.tabs) {
    for (const item of tab.items) {
      if (tab.kind === 'scheme') {
        if (item.sample) item.viewBox = takeFile(item.sample, `scheme-${item.id}`).viewBox;
        continue;
      }
      if (!item.file) fail(`manifest.json: item "${item.id}" of tab "${tab.id}" names no file`);
      item.viewBox = takeFile(item.file, symbolId(tab, item)).viewBox;
    }
  }

  const panels = [];
  const extraCss = [];
  const tabButtons = [`<button type="button" class="tab" role="tab" aria-controls="overview" aria-selected="true">Overview</button>`];
  panels.push(`<section class="panel" role="tabpanel" id="overview"><div class="panel__head"><div><h2>${escapeHtml(manifest.project ?? state.project ?? 'Illustrations')}</h2>${manifest.tagline ? `<p class="panel__lead">${escapeHtml(manifest.tagline)}</p>` : ''}</div></div>${renderOverview(manifest, state, stage)}</section>`);
  for (const tab of manifest.tabs) {
    let body = '';
    if (tab.kind === 'marks') body = renderMarks(tab, manifest);
    else if (tab.kind === 'loaders') body = renderLoaders(tab, manifest);
    else if (tab.kind === 'icons') body = renderIcons(tab);
    else if (tab.kind === 'pictures') body = renderPictures(tab);
    else if (tab.kind === 'letters') body = renderLetters(tab, manifest);
    else if (tab.kind === 'scheme') { const out = renderSchemes(tab, files); body = out.html; extraCss.push(out.css); }
    else fail(`manifest.json: tab "${tab.id}" has an unknown kind "${tab.kind}" (one of ${KINDS.join(', ')})`);
    const animated = tab.kind === 'loaders' || tab.items.some((item) => item.animated);
    tabButtons.push(`<button type="button" class="tab" role="tab" aria-controls="${escapeHtml(tab.id)}" aria-selected="false">${escapeHtml(tab.title)}<span class="tab__count">${tab.items.length}</span></button>`);
    panels.push(`<section class="panel" role="tabpanel" id="${escapeHtml(tab.id)}" hidden><div class="panel__head"><div><h2>${escapeHtml(tab.title)}</h2>${tab.lead ? `<p class="panel__lead">${escapeHtml(tab.lead)}</p>` : ''}</div>${animated ? `<div class="panel__tools"><button type="button" class="btn btn--secondary btn--sm" data-replay>Replay all</button></div>` : ''}</div>\n${body}\n</section>`);
  }

  const mark = selectedMark(manifest);
  const logo = tabOf(manifest, 'logo');
  const name = manifest.project ?? state.project ?? 'Illustrations';
  const title = `${name} illustrations`;
  const style = [read(join(dir, 'tokens.css')) || read(join(TEMPLATES, 'tokens.css')), read(join(TEMPLATES, 'page', 'page.css')), ...styles, ...extraCss].join('\n\n');
  const head = `<title>${escapeHtml(title)}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${style}\n</style>`;
  const body = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols.join('\n')}</svg>
<div class="wrap"${(() => { const tab = manifest.tabs.find((entry) => entry.kind === 'scheme'); const chosen = tab?.items.find((item) => item.selected) ?? tab?.items[0]; return chosen ? ` data-scheme-chosen="${escapeHtml(chosen.id)}"` : ''; })()}>
<header class="top">
<div class="top__brand"><span class="top__mark">${mark && logo ? renderSvg(logo, mark) : escapeHtml((name[0] ?? 'I').toUpperCase())}</span><div><div class="top__name">${escapeHtml(title)}</div><div class="top__tagline">${stage.review ? 'For review' : 'The saved set'}${state.updated ? ` · ${escapeHtml(state.updated)}` : ''}</div></div></div>
<div class="top__right">${schemeSwitch(manifest)}<div class="segmented" role="group" aria-label="Theme"><button type="button" class="segmented__item" data-theme-set="light" aria-pressed="false">Light</button><button type="button" class="segmented__item" data-theme-set="dark" aria-pressed="false">Dark</button><button type="button" class="segmented__item" data-theme-set="system" aria-pressed="false">System</button></div></div>
</header>
<nav class="tabs" role="tablist" aria-label="Topics">${tabButtons.join('')}</nav>
${panels.join('\n')}
</div>
<script>\n${read(join(TEMPLATES, 'page', 'page.js'))}\n</script>`;

  const page = read(join(TEMPLATES, 'page', 'page.html')).replace('{{LANG}}', escapeHtml(manifest.lang ?? state.lang ?? 'en')).replace('{{HEAD}}', head).replace('{{BODY}}', body);
  writeFileSync(join(stage.base, 'index.html'), page);
  writeFileSync(join(stage.base, 'artifact.html'), `${head}\n${body}\n`);
  return { pages: 2, symbols: symbols.length, pictures: files.size, where: stage.review ? 'review/' : './' };
};

const build = (dir) => {
  const state = loadState(dir);
  const stage = stageOf(dir);
  if (!stage) fail('no manifest.json in review/ or in the folder — nothing to build');
  const manifest = loadManifest(stage.base);
  const result = buildPage(dir, state, stage, manifest);
  print(`Wrote ${result.where}index.html and ${result.where}artifact.html with ${plural(result.pictures, 'picture')}`);
};

// --- the checks

const checkSvg = (file, text, tab, item) => {
  const found = [];
  const lines = text.split('\n');
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  const svg = parseSvg(text);
  if (!svg) return [error(file, 0, 'not an SVG: no <svg …>…</svg>')];
  if (!svg.viewBox) found.push(error(file, 1, 'the <svg> has no viewBox; the page sizes a picture by it'));
  if (statOf(file.path)?.size > SIZE_WARNING) found.push(warning(file, 0, `${Math.round(statOf(file.path).size / 1024)} KB — heavier than ${SIZE_WARNING / 1024} KB; simplify the paths`));

  const marklike = ['marks', 'loaders', 'icons'].includes(tab.kind);
  const family = marklike ? '--lg-' : '--ill-';
  const colorOk = (value) => {
    const v = value.trim();
    if (/^(none|currentColor|transparent|inherit)$/.test(v)) return true;
    const token = /^var\((--[\w-]+)(?:,[^)]*)?\)$/.exec(v);
    return Boolean(token && token[1].startsWith(family) && !/--ill-(duration|ease)/.test(token[1]));
  };
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/<!--/.test(line) && !/<\/?[a-z]/.test(line.replace(/<!--[\s\S]*?(-->|$)/, ''))) return;
    for (const [hex] of line.replace(/<!--[\s\S]*?-->/g, '').matchAll(HEX)) found.push(error(file, n, `the color ${hex} is a raw value; draw with ${family}* tokens`));
    if (COLOR_FUNCTION.test(line)) found.push(error(file, n, `a raw color function; draw with ${family}* tokens`));
    if (/<text\b/.test(line)) found.push(error(file, n, 'a <text> element: pictures carry no words, so they need no translation'));
    if (/<(?:image|foreignObject)\b/.test(line)) found.push(error(file, n, 'an <image> or <foreignObject>: a picture is vector, drawn on tokens'));
    if (/<(?:linearGradient|radialGradient|pattern|filter|mask|clipPath|marker)\b/.test(line)) found.push(error(file, n, 'a gradient, pattern, filter, mask, clip or marker needs an id, and ids clash when every picture stands on one page — draw it with flat shapes'));
    for (const [, name] of line.matchAll(/\sid="([^"]*)"/g)) found.push(error(file, n, `id="${name}": no id inside a picture — every picture stands on one page and in one sprite`));
    for (const [, attribute, value] of line.matchAll(/\s(fill|stroke|stop-color|flood-color|lighting-color|color)="([^"]*)"/g)) {
      if (!colorOk(value)) found.push(error(file, n, `${attribute}="${value}" is not a token; use ${marklike ? 'currentColor or a var(--lg-…) token' : `var(${family}…)`}`));
    }
    for (const [, property, value] of line.matchAll(/(?:^|[;{\s])(fill|stroke|stop-color|flood-color|color)\s*:\s*([^;}]+)/g)) {
      if (!colorOk(value)) found.push(error(file, n, `${property}: ${value.trim()} is not a token; use ${family}* tokens`));
    }
    const duration = /animation(?:-duration)?\s*:\s*([^;}]+)/.exec(line);
    if (duration && !/var\(--ill-duration/.test(duration[1])) found.push(error(file, n, `animation: ${duration[1].trim()} — the duration must be a token (var(--ill-duration), -short, -long)`));
    for (const [, classes] of line.matchAll(/\sclass="([^"]*)"/g)) {
      for (const name of classes.split(/\s+/).filter(Boolean)) {
        if (!(name === item.id || name.startsWith(`${item.id}-`) || name.startsWith(`${item.id}__`))) found.push(error(file, n, `class "${name}" does not start with the picture's id "${item.id}": classes clash when every picture stands on one page`));
      }
    }
  });
  for (const match of svg.style.matchAll(/@keyframes\s+([\w-]+)/g)) {
    if (!match[1].startsWith(item.id)) found.push(error(file, lineOf(text.indexOf(match[0])), `@keyframes ${match[1]} does not start with the picture's id "${item.id}"`));
  }
  for (const match of svg.style.matchAll(/(?:^|[}\s,])\.([\w-]+)/g)) {
    if (!(match[1] === item.id || match[1].startsWith(`${item.id}-`) || match[1].startsWith(`${item.id}__`))) found.push(error(file, lineOf(text.indexOf(match[0])), `selector .${match[1]} does not start with the picture's id "${item.id}"`));
  }
  return found;
};

const checkManifest = (stage, manifest) => {
  const found = [];
  const where = stage.review ? 'review/manifest.json' : 'manifest.json';
  const logo = tabOf(manifest, 'logo');
  for (const tab of manifest.tabs) {
    if (!KINDS.includes(tab.kind)) found.push(error(where, 0, `tab "${tab.id}" has an unknown kind "${tab.kind}" (one of ${KINDS.join(', ')})`));
    if (!stage.review && tab.kind === 'scheme' && !tab.items.some((item) => item.selected)) found.push(error(where, 0, `the scheme tab "${tab.id}" has no selected scheme; the saved set says which one tokens.css holds`));
    const seen = new Set();
    for (const item of tab.items) {
      if (!item.id || !/^[a-z][a-z0-9-]*$/.test(item.id)) found.push(error(where, 0, `tab "${tab.id}": item id ${JSON.stringify(item.id ?? null)} is not kebab-case`));
      else if (seen.has(item.id)) found.push(error(where, 0, `tab "${tab.id}": two items share the id "${item.id}"`));
      seen.add(item.id);
      if (tab.kind === 'scheme') continue;
      if (!item.file) { found.push(error(where, 0, `tab "${tab.id}": item "${item.id}" names no file`)); continue; }
      if (!item.file.startsWith(`${tab.id}/`)) found.push(warning(where, 0, `tab "${tab.id}": "${item.file}" is not under ${tab.id}/ — the save keeps the path as it is`));
      if (!statOf(join(stage.base, item.file))?.isFile()) found.push(error(where, 0, `tab "${tab.id}": item "${item.id}" names ${item.file}, and there is no such file`));
      if (tab.kind === 'loaders' && item.mark && logo && !logo.items.some((mark) => mark.id === item.mark)) found.push(error(where, 0, `loader "${item.id}" is drawn from the mark "${item.mark}", which the logo tab does not have`));
    }
    if (tab.kind === 'marks' && tab.items.filter((item) => item.selected).length > 1) found.push(error(where, 0, `tab "${tab.id}": more than one mark is selected`));
  }
  return found;
};

/** The declarations of the first block whose selector starts at `selector`: { name: { value, line } }. */
const declarations = (text, selector) => {
  const at = text.indexOf(selector);
  if (at < 0) return null;
  const open = text.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (; end < text.length; end += 1) {
    if (text[end] === '{') depth += 1;
    if (text[end] === '}' && (depth -= 1) === 0) break;
  }
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  const body = text.slice(open + 1, end);
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], { value: match[2].replace(/\s+/g, ' ').trim(), line: lineOf(open + 1 + match.index) }]));
};

const checkDarkSets = (dir) => {
  const text = read(join(dir, 'tokens.css'));
  if (!text) return [error('tokens.css', 0, 'missing')];
  const at = text.indexOf('prefers-color-scheme: dark');
  const system = at < 0 ? null : declarations(text.slice(at), ":root:not([data-theme='light'])");
  const chosen = declarations(text, ":root[data-theme='dark']");
  if (!system || !chosen) return [error('tokens.css', 0, "the two dark sets are not both there: @media (prefers-color-scheme: dark) and :root[data-theme='dark']")];
  const offset = text.slice(0, at).split('\n').length - 1;
  const found = [];
  for (const [name, { value, line }] of Object.entries(system)) {
    if (!chosen[name]) found.push(error('tokens.css', line + offset, `${name} is in the media-query dark set but not under [data-theme='dark']`));
    else if (chosen[name].value !== value) found.push(error('tokens.css', chosen[name].line, `${name} is ${chosen[name].value} under [data-theme='dark'] but ${value} in the media-query set`));
  }
  for (const [name, { line }] of Object.entries(chosen)) {
    if (!system[name]) found.push(error('tokens.css', line, `${name} is under [data-theme='dark'] but not in the media-query dark set`));
  }
  const light = declarations(text, ':root {') ?? {};
  for (const name of Object.keys(chosen)) {
    if (!light[name]) found.push(error('tokens.css', chosen[name].line, `${name} has a dark value but no light one on :root`));
  }
  return found;
};

const check = (dir) => {
  loadState(dir);
  const stage = stageOf(dir);
  if (!stage) fail('no manifest.json in review/ or in the folder — nothing to check');
  const manifest = loadManifest(stage.base);
  const found = [...checkManifest(stage, manifest), ...checkDarkSets(dir)];
  for (const tab of manifest.tabs) {
    if (tab.kind === 'scheme') continue;
    for (const item of tab.items) {
      if (!item.file || !statOf(join(stage.base, item.file))?.isFile()) continue;
      const path = join(stage.base, item.file);
      const file = { path, toString: () => `${stage.review ? 'review/' : ''}${item.file}` };
      found.push(...checkSvg(file, read(path), tab, item));
    }
  }
  for (const { text } of found) print(text);
  const errors = found.filter(({ level }) => level === 'error').length;
  const pictures = manifest.tabs.reduce((sum, tab) => sum + (tab.kind === 'scheme' ? 0 : tab.items.length), 0);
  print(found.length
    ? `${plural(errors, 'error')}, ${plural(found.length - errors, 'warning')}`
    : `${plural(pictures, 'picture')} checked: every file is there, drawn on tokens with no id, text or raw color, its classes and keyframes its own; the dark sets agree.`);
  if (errors) process.exit(1);
};

// --- the sprite

const spriteOf = (stage, manifest, name) => {
  const symbols = [];
  const styles = [];
  for (const tab of manifest.tabs) {
    if (tab.kind === 'scheme') continue;
    for (const item of tab.items) {
      const svg = parseSvg(read(join(stage.base, item.file)));
      if (!svg) fail(`${item.file}: not an SVG file, or missing`);
      symbols.push(`<symbol id="${symbolId(tab, item)}" viewBox="${svg.viewBox ?? '0 0 320 240'}">${svg.body}</symbol>`);
      if (svg.style) styles.push(svg.style);
    }
  }
  const sheet = styles.join('\n');
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols.join('')}</svg>`;
  return `/* illustrations.js — the ${name} illustration set as <symbol>s: lg-<id> a mark, ld-<id> a loader, ill-<id> a state,
 * scene or letter picture. Generated by dev-assistant's illustrations.mjs from manifest.json; a hand edit is lost on
 * the next run. The pictures draw with the --ill-* and --lg-* tokens of the set's tokens.css: include it, or copy
 * those blocks into your own tokens. Use: <svg class="ill" viewBox="0 0 320 240"><use href="#ill-empty"/></svg>.
 * Every animation ends on its still frame; reduced motion needs no extra rule beyond stopping animations. */
(function () {
  'use strict';
  var css = ${JSON.stringify(sheet)};
  var svg = ${JSON.stringify(sprite)};
  function inject() {
    if (document.getElementById('dev-assistant-illustrations')) return;
    var style = document.createElement('style');
    style.id = 'dev-assistant-illustrations';
    style.textContent = css;
    document.head.appendChild(style);
    var holder = document.createElement('div');
    holder.innerHTML = svg;
    document.body.insertBefore(holder.firstElementChild, document.body.firstChild);
  }
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
})();
`;
};

const sprite = (dir, out) => {
  const state = loadState(dir);
  const stage = stageOf(dir);
  if (!stage) fail('no manifest.json in review/ or in the folder — nothing to put in a sprite');
  const manifest = loadManifest(stage.base);
  const target = resolve(out ?? join(dir, 'illustrations.js'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, spriteOf(stage, manifest, manifest.project ?? state.project ?? ''));
  const count = manifest.tabs.reduce((sum, tab) => sum + (tab.kind === 'scheme' ? 0 : tab.items.length), 0);
  print(`Wrote ${target} with ${plural(count, 'symbol')}${stage.review ? ' (from the drafts in review/)' : ''}`);
};

// --- the save

const save = (dir) => {
  const state = loadState(dir);
  const stage = stageOf(dir);
  if (!stage?.review) fail('nothing to save: no review/manifest.json — the drafts are saved once, and this set has none waiting');
  const manifest = loadManifest(stage.base);
  const notApproved = manifest.tabs.filter((tab) => state.steps?.[tab.id] !== 'approved').map((tab) => `${tab.id} (${state.steps?.[tab.id] ?? 'not in STATE.json'})`);
  if (notApproved.length) fail(`not every tab is approved — ${notApproved.join(', ')}. The set is saved once the operator has approved every tab on the review page.`);
  const scheme = manifest.tabs.find((tab) => tab.kind === 'scheme');
  if (scheme && !scheme.items.some((item) => item.selected)) fail('the scheme tab has no selected scheme; mark the one tokens.css holds');
  const problems = [];
  for (const tab of manifest.tabs) {
    for (const item of tab.items) {
      if (tab.kind === 'scheme') { if (item.sample && !statOf(join(stage.base, item.sample))?.isFile()) problems.push(`${tab.id}/${item.id}: review/${item.sample} is missing`); continue; }
      if (!item.file) problems.push(`${tab.id}/${item.id} names no file`);
      else if (!statOf(join(stage.base, item.file))?.isFile()) problems.push(`${tab.id}/${item.id}: review/${item.file} is missing`);
    }
  }
  if (problems.length) fail(`cannot save — ${problems.join('; ')}`);

  let moved = 0;
  const move = (file) => {
    const target = join(dir, file);
    if (!statOf(join(stage.base, file))?.isFile()) return; // a scheme sample already moved as a picture of another tab
    mkdirSync(dirname(target), { recursive: true });
    if (statOf(target)?.isFile()) rmSync(target);
    renameSync(join(stage.base, file), target);
    moved += 1;
  };
  for (const tab of manifest.tabs) {
    for (const item of tab.items) {
      if (tab.kind === 'scheme') { if (item.sample) move(item.sample); continue; }
      move(item.file);
    }
  }
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  rmSync(stage.base, { recursive: true, force: true });
  const final = { base: dir, review: false };
  state.steps.save = 'done';
  state.step = 'done';
  state.saved = today();
  state.updated = today();
  writeFileSync(join(dir, 'STATE.json'), `${JSON.stringify(state, null, 2)}\n`);
  const result = buildPage(dir, state, final, loadManifest(dir));
  writeFileSync(join(dir, 'illustrations.js'), spriteOf(final, loadManifest(dir), manifest.project ?? state.project ?? ''));
  print(`Saved ${plural(moved, 'picture')} into ${dir}: manifest.json, index.html, artifact.html, illustrations.js written, review/ removed, STATE.json done (${result.symbols} symbols).`);
};

// --- main

const main = () => {
  const [command, dirArg, ...rest] = process.argv.slice(2);
  if (!command) usage('no command given');
  if (!COMMANDS.includes(command)) usage(`unknown command "${command}"`);
  if (!dirArg) usage(`${command} needs the set's folder`);
  const dir = resolve(dirArg);
  if (command === 'sprite') {
    let out;
    for (let i = 0; i < rest.length; i += 1) {
      if (rest[i] === '--out' && rest[i + 1]) { out = rest[i + 1]; i += 1; } else usage(`unknown option for sprite: ${rest[i]}`);
    }
    sprite(dir, out);
    return;
  }
  if (rest.length) usage(`too many arguments for ${command}: ${rest.join(' ')}`);
  if (command === 'build') build(dir);
  if (command === 'check') check(dir);
  if (command === 'save') save(dir);
};

try { main(); } catch (problem) { fail(problem.message); }
