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
//   node bin/illustrations.mjs loop   <dir>              every picture's and letter's one-time animation made cyclic: the
//                                                        picture rests, rewinds its gesture, plays it again and rests
//   node bin/illustrations.mjs import <dir> logo <file.svg> [--id <id>]
//                                                        the customer's mark: analysed (groups, shapes, strokes, colors, ids,
//                                                        what can move), kept as is in review/logo/<id>.source.svg, and a copy
//                                                        on tokens and prefixed classes written as review/logo/<id>.svg —
//                                                        the geometry untouched
//   node bin/illustrations.mjs import <dir> icons <folder>
//                                                        the customer's icons: each analysed and a copy normalised to the 16
//                                                        grid, a 1.5 stroke and currentColor into review/icons/, with what
//                                                        could not be normalised named
//   node bin/illustrations.mjs tokens <dir> [--format json|tailwind] [--out <f>]
//                                                        the tokens for the product: tokens.json (Style Dictionary shape, light
//                                                        and dark, var() as references) and tokens.tailwind.cjs (a theme on var())
//   node bin/illustrations.mjs strings <dir> [--out <f>] every word of the manifest — the states' headings, messages and
//                                                        actions, the loaders' words, the letters' subjects, headings,
//                                                        messages, actions and details — as keys in strings.<lang>.json,
//                                                        for the product's i18n; the save writes it too
//   node bin/illustrations.mjs spring <dir> [--bounce <b>] [--name <smooth|snappy>]
//                                                        a spring easing as linear(): printed, or written into the set's
//                                                        tokens.css as --ill-spring-<name> (under @supports)
//
// <dir> is the set's folder, whose STATE.json has kind "illustrations"; a command stops (exit 1) when that file is
// missing, does not parse or belongs to something else. Findings are printed one per line —
// `error: <file>:<line> — <what>` — and `check` exits 1 on an error. Usage errors exit 2.

import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node bin/illustrations.mjs <command> <dir> [options]
  build  <dir>               write the page (review/ while a review is on, the saved set otherwise)
  check  <dir>               the checks: manifest, every SVG, the dark sets of tokens.css
  save   <dir>               move the approved drafts out of review/, write the set's page, manifest and sprite
  sprite <dir> [--out <f>]   write the set as symbols into illustrations.js (or <f>)
  loop   <dir>               make every picture's and letter's animation cyclic (rest, rewind, play, rest)
  spring <dir> [--bounce <b>] [--name <n>]   a spring easing as linear(); --name writes it into tokens.css as --ill-spring-<n>
  strings <dir> [--out <f>]  every word of the manifest as keys in strings.<lang>.json, for the product's i18n
  tokens <dir> [--format json|tailwind] [--out <f>]   tokens.json (Style Dictionary shape) and tokens.tailwind.cjs (a theme on var())
  import <dir> logo <file.svg> [--id <id>]   the customer's mark analysed and copied onto tokens into review/logo/
  import <dir> icons <folder>                the customer's icons analysed and normalised into review/icons/
`;

const COMMANDS = ['build', 'check', 'save', 'sprite', 'loop', 'spring', 'import', 'strings', 'tokens'];
const HEADING_WORDS = 5;
const MESSAGE_CHARS = 80;
const TEMPLATES = fileURLToPath(new URL('../skills/illustrations/templates/', import.meta.url));
const KINDS = ['scheme', 'directions', 'marks', 'loaders', 'icons', 'pictures', 'letters'];
const SAMPLE_KINDS = ['marks', 'icons', 'pictures', 'letters'];
const PREFIX = { marks: 'lg', loaders: 'ld', icons: 'ic', pictures: 'ill', letters: 'ill' };
const SIZE_WARNING = 24 * 1024;
const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color|color-mix)\(/;
const LITERAL_TIME = /(?<![\w-])\d+(?:\.\d+)?m?s\b/;
const ANIMATABLE = ['transform', 'opacity', 'stroke-dashoffset'];
const NODE_BUDGET = 30;
const PART_BUDGET = 20;
const CONTRAST_FLOOR = 3;
/** The pairs that must read apart at 3:1 (WCAG 1.4.11, graphical objects): the outline against every face it borders, the accent on the faces it sits on. */
const CONTRAST_PAIRS = [['--ill-line', '--ill-fill'], ['--ill-line', '--ill-soft'], ['--ill-line', '--ill-ground'], ['--ill-accent', '--ill-fill'], ['--ill-accent', '--ill-ground'], ['--lg-accent', '--lg-ground']];
const REDUCED_MOTION = 'animation-duration: 0.01ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important;';

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

const renderSvg = (tab, item, { className = '', animated = false, style = '', label = '', symbol = '' } = {}) => {
  const aria = label ? ` role="img" aria-label="${escapeHtml(label)}"` : ' aria-hidden="true"';
  return `<svg class="${className}" viewBox="${escapeHtml(item.viewBox ?? '0 0 320 240')}"${aria}${animated ? ' data-animated' : ''}${style ? ` style="${escapeHtml(style)}"` : ''}><use href="#${symbol || symbolId(tab, item)}"/></svg>`;
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

/** Three (or so) directions of the drawing's manner, each a sheet of samples — a mark, an icon, a state, a letter band — in one hand. */
const renderDirections = (tab) => {
  const AXES = [['line', 'Line'], ['angle', 'Angle'], ['detail', 'Detail'], ['accent', 'Accent'], ['motion', 'Motion']];
  const cards = tab.items.map((item) => {
    const samples = item.samples ?? [];
    const of = (kind) => samples.find((sample) => sample.kind === kind);
    const draw = (sample, opts) => (sample ? renderSvg(tab, sample, { ...opts, symbol: `dir-${sample.id}` }) : '');
    const mark = of('marks');
    const icon = of('icons');
    const state = of('pictures');
    const letter = of('letters');
    return `<article class="direction${item.selected ? ' item--selected' : ''}" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, item.selected ? '<span class="tag tag--selected">Selected</span>' : '')}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="direction__sheet">
<div class="direction__cell direction__cell--mark"><div class="grounds">${mark ? `<div class="ground">${draw(mark)}</div><div class="ground ground--inverted">${draw(mark)}</div><div class="ground ground--brand">${draw(mark)}</div>` : ''}</div><span class="direction__label">mark</span></div>
<div class="direction__cell direction__cell--icon"><div class="icon-cell__row">${icon ? `${draw(icon, { className: 'ic ic--16' })}${draw(icon, { className: 'ic ic--20' })}${draw(icon, { className: 'ic ic--24' })}` : ''}</div><span class="direction__label">icon</span></div>
<div class="direction__cell direction__cell--state"><div class="stage">${draw(state, { className: 'ill', animated: state?.animated })}</div><span class="direction__label">state</span></div>
<div class="direction__cell direction__cell--letter"><div class="stage stage--letter"><div class="mail__picture">${draw(letter, { className: 'ill ill--wide', animated: letter?.animated })}</div></div><span class="direction__label">letter band</span></div>
</div>
${item.axes ? `<dl class="direction__axes">${AXES.filter(([key]) => item.axes[key]).map(([key, name]) => `<div><dt>${name}</dt><dd>${escapeHtml(item.axes[key])}</dd></div>`).join('')}</dl>` : ''}
<div class="item__foot">${samples.some((sample) => sample.animated) ? replayButton() : ''}</div>
</article>`;
  });
  return `<div class="directions">${cards.join('\n')}</div>`;
};

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

const renderPictures = (tab) => `<div class="groups">${groupsOf(tab.items).map(([title, items]) => { const units = items.reduce((sum, item) => sum + (item.wide ? 2 : 1), 0); return `<section class="groupbox" style="--n4:${Math.min(units, 4)};--n3:${Math.min(units, 3)};--n2:${Math.min(units, 2)}">${groupHeading(title, items.length)}<div class="grid">${items.map((item) => {
  const words = item.words ?? null;
  const sample = words ? `<div class="inplace"><div class="sample">${renderSvg(tab, item, { className: 'ill ill--spot', animated: item.animated })}<p class="sample__heading">${escapeHtml(words.heading ?? '')}</p>${words.message ? `<p class="sample__message">${escapeHtml(words.message)}</p>` : ''}${words.action ? `<button type="button" class="btn btn--primary">${escapeHtml(words.action)}</button>` : ''}</div></div>` : '';
  const variantTag = item.place ? (item.selected ? '<span class="tag tag--selected">Selected</span>' : '<span class="tag tag--shortlist">Variant</span>') : '';
  return `<article class="item${item.selected ? ' item--selected' : ''}${item.wide ? ' item--wide' : ''}" data-item id="${escapeHtml(`${tab.id}-${item.id}`)}">
${itemHead(tab, item, `${variantTag}${movingTag(item)}`)}
${item.idea ? `<p class="item__idea">${escapeHtml(item.idea)}</p>` : ''}
<div class="stage">${renderSvg(tab, item, { className: `ill${tab.kind === 'letters' || item.wide ? ' ill--wide' : ''}`, animated: item.animated, label: item.title })}</div>
${sample}
${item.usedIn ? `<p class="item__meta"><strong>Used in:</strong> ${escapeHtml(item.usedIn)}</p>` : ''}
${item.animated && item.motion ? `<p class="item__meta"><strong>Moves:</strong> ${escapeHtml(item.motion)}</p>` : ''}
<div class="item__foot">${item.animated ? replayButton() : ''}</div>
</article>`;
}).join('\n')}</div></section>`; }).join('\n')}</div>`;

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

/** The variants of a place (a sign-in panel, a 404 page drawn several ways): place → its items. */
const placesOf = (tab) => {
  const places = new Map();
  for (const item of tab.items) if (item.place) places.set(item.place, [...(places.get(item.place) ?? []), item]);
  return places;
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
  const tokens = ['--color-primary', '--ill-line', '--ill-fill', '--ill-soft', '--ill-muted', '--ill-deep', '--ill-accent', '--ill-accent-soft', '--ill-ground', '--ill-positive', '--ill-caution', '--ill-negative', '--lg-accent'];
  const about = manifest.about ?? null;
  const aboutHtml = about ? `<div class="about"><div class="group"><h3>${escapeHtml(about.title ?? 'About the product')}</h3></div>
${(Array.isArray(about.lead) ? about.lead : about.lead ? [about.lead] : []).map((para) => `<p class="about__lead">${escapeHtml(para)}</p>`).join('')}
${about.points?.length ? `<div class="about__points">${about.points.map((point) => `<div class="about__point"><strong>${escapeHtml(point.title)}</strong><span>${escapeHtml(point.text)}</span></div>`).join('')}</div>` : ''}
${about.note ? `<p class="about__note">${escapeHtml(about.note)}</p>` : ''}</div>` : '';
  const schemes = manifest.tabs.find((tab) => tab.kind === 'scheme')?.items ?? [];
  const chosenScheme = schemes.find((item) => item.selected) ?? schemes[0];
  const schemeHelp = schemes.length > 1
    ? `<p><strong>${schemes.length} color schemes to try.</strong> The switch at the top right — ${schemes.map((item) => escapeHtml(item.title)).join(' · ')} — redraws every picture on the page in the scheme you pick. <strong>${escapeHtml(chosenScheme.title)}</strong> is the chosen one, marked with a dot; the others are the alternatives that were considered, kept so you can compare. Your pick is remembered in this browser only.</p>`
    : '';
  const usage = `<div class="howto"><div class="group"><h3>How to use this page</h3></div>
<p><strong>Tabs</strong> along the top hold the set by topic: ${manifest.tabs.map((tab) => escapeHtml(tab.title)).join(' · ')}. The number beside a tab is how many pictures it holds; the list below says which tabs are approved and which are in review.</p>
${schemeHelp}
<p><strong>Two themes.</strong> Light and Dark at the top right show every picture on a light and on a dark interface; System follows your device. Every picture is drawn for both, so look at each tab in both.</p>
<p><strong>Motion.</strong> Pictures marked <em>Moving</em> play one short animation when they appear; <strong>Replay</strong> on a picture runs it again, <strong>Replay all</strong> runs every picture of the tab. <strong>¼×</strong> at the top right slows every animation four times, to see a jump or a cut that is too fast to catch at full speed; <strong>1×</strong> brings it back. The page pauses every animation while its tab is in the background. With reduced motion switched on in your system, every picture shows its still last frame.</p>
<p><strong>In place.</strong> Under a picture, a small card shows it the way the product will: at its real size, with its heading, its message and its button.</p>
</div>`;
  return `<div class="overview">
${aboutHtml}
${usage}
<div class="contents">${manifest.tabs.map((tab) => { const [cls, text] = statusOf(tab); return `<a class="contents__row" href="#${escapeHtml(tab.id)}"><span>${escapeHtml(tab.title)} <span class="tab__count">${tab.items.length}</span></span><span class="status status--${cls}">${text}</span></a>`; }).join('')}</div>
<div><div class="group"><h3>The colors every picture is drawn with</h3></div><div class="swatches">${tokens.map((name) => `<div class="swatch" data-token="${name}"><div class="swatch__chip"></div><span class="swatch__name">${name}</span><span class="swatch__value"></span></div>`).join('')}</div></div>
<div class="howto"><div class="group"><h3>How to review</h3></div>
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
      if (svg.style && !styles.includes(svg.style)) styles.push(svg.style); // the same styles once, whatever file they came in
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
      if (tab.kind === 'directions') {
        for (const sample of item.samples ?? []) {
          if (!sample.file) fail(`manifest.json: direction "${item.id}" has a sample with no file`);
          sample.viewBox = takeFile(sample.file, `dir-${sample.id}`).viewBox;
        }
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
    if (tab.kind === 'directions') body = renderDirections(tab);
    else if (tab.kind === 'marks') body = renderMarks(tab, manifest);
    else if (tab.kind === 'loaders') body = renderLoaders(tab, manifest);
    else if (tab.kind === 'icons') body = renderIcons(tab);
    else if (tab.kind === 'pictures') body = renderPictures(tab);
    else if (tab.kind === 'letters') body = renderLetters(tab, manifest);
    else if (tab.kind === 'scheme') { const out = renderSchemes(tab, files); body = out.html; extraCss.push(out.css); }
    else fail(`manifest.json: tab "${tab.id}" has an unknown kind "${tab.kind}" (one of ${KINDS.join(', ')})`);
    const animated = tab.kind === 'loaders' || tab.items.some((item) => item.animated || (item.samples ?? []).some((sample) => sample.animated));
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
<div class="top__right">${schemeSwitch(manifest)}<div class="segmented" role="group" aria-label="Speed"><button type="button" class="segmented__item" data-speed-set="1" aria-pressed="true">1×</button><button type="button" class="segmented__item" data-speed-set="0.25" aria-pressed="false">¼×</button></div><div class="segmented" role="group" aria-label="Theme"><button type="button" class="segmented__item" data-theme-set="light" aria-pressed="false">Light</button><button type="button" class="segmented__item" data-theme-set="dark" aria-pressed="false">Dark</button><button type="button" class="segmented__item" data-theme-set="system" aria-pressed="false">System</button></div></div>
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

const checkSvg = (file, text, tab, item, tokens = durationTokens()) => {
  // The prefix belongs to the file's owner: a picture named by two items (a scene reused as a letter's picture) keeps its first owner's classes
  const owner = String(item.file ?? '').split('/').pop().replace(/\.svg$/, '') || item.id;
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
    return Boolean(token && token[1].startsWith(family) && !/--ill-(duration|ease|spring|stagger)/.test(token[1]));
  };
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/<!--/.test(line) && !/<\/?[a-z]/.test(line.replace(/<!--[\s\S]*?(-->|$)/, ''))) return;
    if (line.includes('prefers-reduced-motion')) return; // the block the save writes: literal times by design, stopping every animation on its last frame
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
    if (duration && !/var\(--ill-duration/.test(duration[1])) found.push(error(file, n, `animation: ${duration[1].trim()} — the duration must be a token (var(--ill-duration), -instant, -short, -long)`));
    for (const [, property, value] of line.matchAll(/(animation(?:-duration|-delay)?)\s*:\s*([^;}]+)/g)) {
      if (LITERAL_TIME.test(value)) found.push(error(file, n, `${property}: ${value.trim()} — a literal time; a delay is var(--ill-stagger) times a count or a --ill-duration token, a duration a --ill-duration token`));
    }
    const easing = /animation(?:-timing-function)?\s*:\s*([^;}]+)/.exec(line);
    if (easing && /cubic-bezier\(|\blinear\(|\bsteps\(/.test(easing[1])) found.push(error(file, n, `animation: ${easing[1].trim()} — a raw easing; use var(--ill-ease), var(--ill-ease-in-out), var(--ill-spring-smooth) or var(--ill-spring-snappy)`));
    for (const [, classes] of line.matchAll(/\sclass="([^"]*)"/g)) {
      for (const name of classes.split(/\s+/).filter(Boolean)) {
        if (!(name === owner || name.startsWith(`${owner}-`) || name.startsWith(`${owner}__`))) found.push(error(file, n, `class "${name}" does not start with the picture's id "${owner}": classes clash when every picture stands on one page`));
      }
    }
  });
  for (const match of svg.style.matchAll(/@keyframes\s+([\w-]+)/g)) {
    if (!match[1].startsWith(owner)) found.push(error(file, lineOf(text.indexOf(match[0])), `@keyframes ${match[1]} does not start with the picture's id "${owner}"`));
  }
  for (const match of svg.style.matchAll(/(?:^|[}\s,])\.([\w-]+)/g)) {
    if (!(match[1] === owner || match[1].startsWith(`${owner}-`) || match[1].startsWith(`${owner}__`))) found.push(error(file, lineOf(text.indexOf(match[0])), `selector .${match[1]} does not start with the picture's id "${owner}"`));
  }
  found.push(...checkMotion(file, text, svg.style, tokens));
  return found;
};

/** The motion rules: what a keyframe may animate, how it ends, how long a part waits, how many parts move. */
const checkMotion = (file, text, style, tokens) => {
  const found = [];
  const lineOf = (snippet) => { const at = text.indexOf(snippet); return at < 0 ? 0 : text.slice(0, at).split('\n').length; };
  let moving = 0;
  for (const block of blocksOf(style)) {
    const name = /^@keyframes\s+([\w-]+)/.exec(block.prelude)?.[1];
    if (name) {
      const stops = blocksOf(block.body).map((stop) => ({ at: splitTop(stop.prelude).map(percentOf), body: stop.body }));
      for (const stop of stops) {
        for (const property of stop.body.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)) {
          if (!ANIMATABLE.includes(property)) found.push(error(file, lineOf(block.prelude), `@keyframes ${name} animates ${property}; a picture animates only ${ANIMATABLE.join(', ')} — cheap to paint and themable`));
        }
        if (/scale\(\s*0(?:\s*,\s*0)?\s*\)|scale[XY]\(\s*0\s*\)/.test(stop.body)) found.push(error(file, lineOf(block.prelude), `@keyframes ${name} passes through scale(0); a part appears from scale(0.9–0.97) and opacity 0, never from nothing`));
      }
      const last = stops.find((stop) => stop.at.includes(100)) ?? stops[stops.length - 1];
      if (last && /opacity\s*:\s*0(?![.\d])/.test(last.body)) found.push(error(file, lineOf(block.prelude), `@keyframes ${name} ends on opacity: 0; the last frame is the whole picture, where reduced motion and the loop rest`));
      continue;
    }
    if (block.prelude.startsWith('@')) continue;
    const decls = block.body.split(';').map((d) => d.trim()).filter(Boolean);
    const anim = decls.find((d) => /^animation\s*:/.test(d));
    if (!anim) continue;
    if (/\bease-in\b(?!-out)/.test(anim)) found.push(error(file, lineOf(block.prelude), `${block.prelude}: ease-in — nothing appears with a slow start and an abrupt end; use var(--ill-ease) or a spring`));
    const delayDecl = decls.find((d) => /^animation-delay\s*:/.test(d));
    const delays = delayDecl ? splitTop(delayDecl.replace(/^animation-delay\s*:/, '')) : [];
    splitTop(anim.replace(/^animation\s*:/, '')).forEach((one, index) => {
      const times = [...one.matchAll(/(calc\([^;]*?\)\)|calc\([^;]*?\)|var\(--ill-duration(?:-instant|-short|-long)?\)|var\(--ill-stagger\))/g)].map((m) => m[1]);
      const delay = times[1] ? timeOf(times[1], tokens) : delays[index] ? timeOf(delays[index], tokens) : 0;
      if (delay != null && delay > tokens['--ill-duration']) found.push(error(file, lineOf(block.prelude), `${block.prelude}: a delay of ${delay} ms is longer than a gesture (--ill-duration, ${tokens['--ill-duration']} ms); parts wait a stagger, an echo waits one gesture`));
    });
    for (const selector of splitTop(block.prelude)) {
      for (const [, cls] of selector.matchAll(/\.([\w-]+)/g)) moving += (text.match(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g')) ?? []).length;
    }
  }
  if (moving > NODE_BUDGET) found.push(warning(file, 0, `${moving} animated nodes — more than ${NODE_BUDGET}; a picture moves a few parts, not every line (a phone paints every one)`));
  return found;
};

/** How many shapes a picture is made of; past the budget it reads as noise at half size. */
const checkParts = (file, text, tab) => {
  if (!['pictures', 'letters'].includes(tab.kind)) return [];
  const parts = (text.replace(/<!--[\s\S]*?-->/g, '').match(/<(?:path|rect|circle|ellipse|line|polygon|polyline)\b/g) ?? []).length;
  return parts > PART_BUDGET ? [warning(file, 0, `${parts} shapes — more than ${PART_BUDGET}; a spot carries about 8 parts, a scene about 14 — take away until the silhouette reads`)] : [];
};

// --- contrast: the tokens of each theme read apart

const luminance = (hex) => {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastOf = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
/** A token's hex in a theme — the theme's set, else the light one as the cascade has it — through one level of var() (--lg-ground: var(--color-surface)). */
const hexOf = (set, light, name) => {
  const value = (set[name] ?? light[name])?.value;
  if (!value) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value.length === 9 ? value.slice(0, 7) : value;
  const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  const target = ref && (set[ref] ?? light[ref])?.value;
  return target && /^#[0-9a-f]{3,8}$/i.test(target) ? target : null;
};
const checkContrast = (dir) => {
  const text = read(join(dir, 'tokens.css'));
  if (!text) return [];
  const light = declarations(text, ':root {') ?? {};
  const themes = { light, dark: declarations(text, ":root[data-theme='dark']") };
  const found = [];
  for (const [theme, set] of Object.entries(themes)) {
    if (!set) continue;
    for (const [a, b] of CONTRAST_PAIRS) {
      const [ha, hb] = [hexOf(set, light, a), hexOf(set, light, b)];
      if (!ha || !hb) continue;
      const ratio = contrastOf(ha, hb);
      if (ratio < CONTRAST_FLOOR) found.push(error('tokens.css', (set[a] ?? light[a]).line, `${a} ${ha} on ${b} ${hb} is ${ratio.toFixed(2)}:1 in the ${theme} theme — below ${CONTRAST_FLOOR}:1 (WCAG 1.4.11); an outline and an accent must read on every face they touch`));
    }
  }
  return found;
};

/** The picture's <style> with a reduced-motion block for its animated rules, so the picture protects itself wherever it is inlined. */
const withReducedMotion = (text) => {
  if (text.includes('prefers-reduced-motion')) return text;
  const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(text);
  if (!styleMatch) return text;
  const selectors = blocksOf(styleMatch[1]).filter((block) => !block.prelude.startsWith('@') && /(?:^|;)\s*animation\s*:/.test(block.body)).map((block) => block.prelude);
  if (!selectors.length) return text;
  const block = `@media (prefers-reduced-motion: reduce) { ${selectors.join(', ')} { ${REDUCED_MOTION} } }`;
  const css = `${styleMatch[1].replace(/\s+$/, '')}\n    ${block}\n  `;
  return text.replace(styleMatch[0], `<style>${css}</style>`);
};

/** The words beside a picture: short enough to be read at a glance and to survive a longer translation; a letter's picture named for the clients that show no image. */
const checkWords = (where, tab, item) => {
  const found = [];
  const words = tab.kind === 'letters' ? { heading: item.heading, message: item.message } : item.words ?? {};
  const heading = String(words.heading ?? '').trim();
  const message = String(words.message ?? '').trim();
  const name = `tab "${tab.id}": item "${item.id}"`;
  if (heading && heading.split(/\s+/).length > HEADING_WORDS) found.push(warning(where, 0, `${name}: the heading "${heading}" is ${heading.split(/\s+/).length} words — keep it to ${HEADING_WORDS}, a glance and room for a longer translation`));
  if (message && message.length > MESSAGE_CHARS) found.push(warning(where, 0, `${name}: the message is ${message.length} characters — keep it under ${MESSAGE_CHARS}; one sentence, one thing to do`));
  if (tab.kind === 'letters' && item.file && !String(item.alt ?? '').trim()) found.push(warning(where, 0, `${name}: no "alt" — the picture goes out as an image, and a client that shows none reads the alt`));
  return found;
};

/** Every word of the manifest as keys: <tab>.<id>.<field>, the loaders' words, the letters' template. */
const stringsOf = (manifest) => {
  const out = {};
  for (const tab of manifest.tabs) {
    if (tab.kind === 'loaders' && tab.words) { out.loaders = { ...tab.words }; continue; }
    if (tab.kind === 'pictures') {
      for (const item of tab.items) if (item.words) { out[tab.id] ??= {}; out[tab.id][item.id] = Object.fromEntries(Object.entries(item.words).filter(([, v]) => v != null && String(v).trim())); }
      continue;
    }
    if (tab.kind === 'letters') {
      out[tab.id] ??= {};
      if (tab.template?.sender || tab.template?.footer) out[tab.id].template = Object.fromEntries(Object.entries({ sender: tab.template.sender, footer: tab.template.footer }).filter(([, v]) => v));
      for (const item of tab.items) out[tab.id][item.id] = Object.fromEntries(Object.entries({ subject: item.subject, heading: item.heading, message: item.message, action: item.action, detail: item.detail, alt: item.alt }).filter(([, v]) => v != null && String(v).trim()));
    }
  }
  return out;
};

const writeStrings = (dir, state, manifest, out) => {
  const lang = manifest.lang ?? state.lang ?? 'en';
  const target = resolve(out ?? join(dir, `strings.${lang}.json`));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(stringsOf(manifest), null, 2)}\n`);
  return target;
};

const strings = (dir, out) => {
  const state = loadState(dir);
  const stage = stageOf(dir);
  if (!stage) fail('no manifest.json in review/ or in the folder — nothing to export');
  const manifest = loadManifest(stage.base);
  const target = writeStrings(dir, state, manifest, out);
  const count = Object.values(stringsOf(manifest)).reduce((sum, tab) => sum + Object.values(tab).reduce((n, entry) => n + (typeof entry === 'string' ? 1 : Object.keys(entry).length), 0), 0);
  print(`Wrote ${target} with ${plural(count, 'string')}${stage.review ? ' (from the drafts in review/)' : ''}: the keys the product's i18n takes — <tab>.<id>.<field>, loaders.<place>, <emails>.template.`);
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
      if (tab.kind === 'directions') {
        const samples = item.samples ?? [];
        if (!samples.length) found.push(error(where, 0, `direction "${item.id}" has no samples — a sheet is a mark, an icon, a state and a letter band`));
        for (const sample of samples) {
          if (!sample.id || !/^[a-z][a-z0-9-]*$/.test(sample.id)) found.push(error(where, 0, `direction "${item.id}": a sample's id ${JSON.stringify(sample.id ?? null)} is not kebab-case`));
          if (!SAMPLE_KINDS.includes(sample.kind)) found.push(error(where, 0, `direction "${item.id}": sample "${sample.id}" has the kind "${sample.kind}" (one of ${SAMPLE_KINDS.join(', ')})`));
          if (!sample.file) found.push(error(where, 0, `direction "${item.id}": sample "${sample.id}" names no file`));
          else if (!statOf(join(stage.base, sample.file))?.isFile()) found.push(error(where, 0, `direction "${item.id}": sample "${sample.id}" names ${sample.file}, and there is no such file`));
        }
        continue;
      }
      if (!item.file) { found.push(error(where, 0, `tab "${tab.id}": item "${item.id}" names no file`)); continue; }
      if (!item.file.startsWith(`${tab.id}/`)) found.push(warning(where, 0, `tab "${tab.id}": "${item.file}" is not under ${tab.id}/ — the save keeps the path as it is`));
      if (!statOf(join(stage.base, item.file))?.isFile()) found.push(error(where, 0, `tab "${tab.id}": item "${item.id}" names ${item.file}, and there is no such file`));
      if (tab.kind === 'loaders' && item.mark && logo && !logo.items.some((mark) => mark.id === item.mark)) found.push(error(where, 0, `loader "${item.id}" is drawn from the mark "${item.mark}", which the logo tab does not have`));
      found.push(...checkWords(where, tab, item));
    }
    if (tab.kind === 'marks' && tab.items.filter((item) => item.selected).length > 1) found.push(error(where, 0, `tab "${tab.id}": more than one mark is selected`));
    if (tab.kind === 'pictures') {
      for (const [place, variants] of placesOf(tab)) {
        const picked = variants.filter((item) => item.selected).length;
        if (picked > 1) found.push(error(where, 0, `tab "${tab.id}": more than one variant of the place "${place}" is selected`));
        if (!stage.review && variants.length > 1 && !picked) found.push(error(where, 0, `tab "${tab.id}": the place "${place}" has ${variants.length} variants and none picked; the saved set says which one the product shows first`));
      }
    }
    if (tab.kind === 'directions' && !stage.review && !tab.items.some((item) => item.selected)) found.push(error(where, 0, `tab "${tab.id}" has no chosen direction; the saved set says which manner it is drawn in`));
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
  const tokens = durationTokens(dir);
  const found = [...checkManifest(stage, manifest), ...checkDarkSets(dir), ...checkContrast(dir)];
  const checkFile = (tab, item) => {
    if (!item.file || !statOf(join(stage.base, item.file))?.isFile()) return;
    const path = join(stage.base, item.file);
    const file = { path, toString: () => `${stage.review ? 'review/' : ''}${item.file}` };
    const text = read(path);
    found.push(...checkSvg(file, text, tab, item, tokens), ...checkParts(file, text, tab));
  };
  for (const tab of manifest.tabs) {
    if (tab.kind === 'scheme') continue;
    for (const item of tab.items) {
      if (tab.kind === 'directions') { for (const sample of item.samples ?? []) checkFile({ id: tab.id, kind: sample.kind }, sample); continue; }
      checkFile(tab, item);
    }
  }
  for (const { text } of found) print(text);
  const errors = found.filter(({ level }) => level === 'error').length;
  const pictures = manifest.tabs.reduce((sum, tab) => sum + (tab.kind === 'scheme' ? 0 : tab.kind === 'directions' ? tab.items.reduce((n, item) => n + (item.samples ?? []).length, 0) : tab.items.length), 0);
  print(found.length
    ? `${plural(errors, 'error')}, ${plural(found.length - errors, 'warning')}`
    : `${plural(pictures, 'picture')} checked: every file is there, drawn on tokens with no id, text or raw color, its classes and keyframes its own; the dark sets agree and read apart.`);
  if (errors) process.exit(1);
};

// --- the sprite

const spriteOf = (stage, manifest, name) => {
  const symbols = [];
  const styles = [];
  for (const tab of manifest.tabs) {
    if (tab.kind === 'scheme' || tab.kind === 'directions') continue;
    for (const item of tab.items) {
      const svg = parseSvg(read(join(stage.base, item.file)));
      if (!svg) fail(`${item.file}: not an SVG file, or missing`);
      symbols.push(`<symbol id="${symbolId(tab, item)}" viewBox="${svg.viewBox ?? '0 0 320 240'}">${svg.body}</symbol>`);
      if (svg.style && !styles.includes(svg.style)) styles.push(svg.style);
    }
  }
  const sheet = `${styles.join('\n')}
@media (prefers-reduced-motion: reduce) { #dev-assistant-illustrations-sprite * { ${REDUCED_MOTION} } }
html.ill-paused #dev-assistant-illustrations-sprite * { animation-play-state: paused !important; }`;
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" id="dev-assistant-illustrations-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols.join('')}</svg>`;
  return `/* illustrations.js — the ${name} illustration set as <symbol>s: lg-<id> a mark, ld-<id> a loader, ill-<id> a state,
 * scene or letter picture. Generated by dev-assistant's illustrations.mjs from manifest.json; a hand edit is lost on
 * the next run. The pictures draw with the --ill-* and --lg-* tokens of the set's tokens.css: include it, or copy
 * those blocks into your own tokens. Use: <svg class="ill" viewBox="0 0 320 240"><use href="#ill-empty"/></svg>.
 * Every animation ends on its still frame, and the sheet below stops every animation there under reduced motion.
 * The symbols share one animation each, so the script pauses them all while the tab is in the background
 * (html.ill-paused); a picture that must start when it scrolls into view, or pause off screen, is inlined from its
 * SVG file instead and driven by an IntersectionObserver:
 *   new IntersectionObserver(function (entries) { entries.forEach(function (e) {
 *     e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; }); }).observe(svg);
 * Show at most three moving pictures on one screen. */
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
  function pause() { document.documentElement.classList.toggle('ill-paused', document.hidden); }
  document.addEventListener('visibilitychange', pause);
  pause();
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
  const count = manifest.tabs.reduce((sum, tab) => sum + (tab.kind === 'scheme' || tab.kind === 'directions' ? 0 : tab.items.length), 0);
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
  const directions = manifest.tabs.find((tab) => tab.kind === 'directions');
  if (directions && !directions.items.some((item) => item.selected)) fail('the directions tab has no chosen direction; mark the one the set is drawn in');
  for (const tab of manifest.tabs.filter((entry) => entry.kind === 'pictures')) for (const [place, variants] of placesOf(tab)) if (variants.length > 1 && !variants.some((item) => item.selected)) fail(`the place "${place}" in "${tab.id}" has ${variants.length} variants and none picked; pick one (pick scene ${place} <id>) before the save`);
  const problems = [];
  for (const tab of manifest.tabs) {
    for (const item of tab.items) {
      if (tab.kind === 'scheme') { if (item.sample && !statOf(join(stage.base, item.sample))?.isFile()) problems.push(`${tab.id}/${item.id}: review/${item.sample} is missing`); continue; }
      if (tab.kind === 'directions') { for (const sample of item.samples ?? []) if (!sample.file || !statOf(join(stage.base, sample.file))?.isFile()) problems.push(`${tab.id}/${item.id}: review/${sample.file ?? '?'} is missing`); continue; }
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
    if (file.endsWith('.svg')) { const text = read(target); const guarded = withReducedMotion(text); if (guarded !== text) writeFileSync(target, guarded); }
    moved += 1;
  };
  for (const tab of manifest.tabs) {
    for (const item of tab.items) {
      if (tab.kind === 'scheme') { if (item.sample) move(item.sample); continue; }
      if (tab.kind === 'directions') { for (const sample of item.samples ?? []) move(sample.file); continue; }
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
  const stringsFile = writeStrings(dir, state, manifest);
  print(`Saved ${plural(moved, 'picture')} into ${dir}: manifest.json, index.html, artifact.html, illustrations.js, ${basename(stringsFile)} written, review/ removed, STATE.json done (${result.symbols} symbols).`);
};

// --- loop: a picture's one-time gesture made cyclic

/** The milliseconds of the duration tokens, from tokens.css (light block), with the template's values as fallback. */
const durationTokens = (dir) => {
  const values = { '--ill-duration-instant': 150, '--ill-duration-short': 300, '--ill-duration': 600, '--ill-duration-long': 1400, '--ill-stagger': 60, '--ill-rest': 6000 };
  const text = dir ? read(join(dir, 'tokens.css')) : '';
  for (const name of Object.keys(values)) {
    const found = new RegExp(`${name}:\\s*([\\d.]+)(ms|s)\\s*;`).exec(text);
    if (found) values[name] = Number(found[1]) * (found[2] === 's' ? 1000 : 1);
  }
  return values;
};

/** A time expression of tokens (var(), calc() with + - * /) in milliseconds. */
const timeOf = (expr, tokens) => {
  const js = expr.replace(/var\((--ill-duration(?:-instant|-short|-long)?|--ill-stagger)\)/g, (_, name) => String(tokens[name])).replace(/calc/g, '');
  if (!/^[\d\s.+\-*/()]+$/.test(js)) return null;
  try { return Function(`"use strict"; return (${js});`)(); } catch { return null; }
};

/** Split on commas outside parentheses. */
const splitTop = (text) => {
  const parts = []; let depth = 0; let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1; else if (text[i] === ')') depth -= 1;
    else if (text[i] === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
};

/** The top-level blocks of a CSS text: [{ prelude, body, start, end }]. */
const blocksOf = (css) => {
  const blocks = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    let depth = 1; let j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth += 1; else if (css[j] === '}') depth -= 1; j += 1; }
    blocks.push({ prelude: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1), start: i, end: j });
    i = j;
  }
  return blocks;
};

const percentOf = (stop) => (stop === 'from' ? 0 : stop === 'to' ? 100 : Number(stop.replace('%', '')));
const fmt = (n) => `${Math.round(n * 100) / 100}%`;

/** One SVG's <style> made cyclic, or null when it has nothing to loop. */
const loopSvg = (text, tokens) => {
  const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(text);
  if (!styleMatch) return null;
  const css = styleMatch[1];
  const blocks = blocksOf(css);
  const keyframes = new Map();
  for (const block of blocks) {
    const name = /^@keyframes\s+([\w-]+)/.exec(block.prelude)?.[1];
    if (name) keyframes.set(name, blocksOf(block.body).map((stop) => ({ stops: splitTop(stop.prelude).map(percentOf), body: stop.body.trim() })));
  }
  // The rules that run a one-time animation
  const runs = [];
  for (const block of blocks) {
    if (block.prelude.startsWith('@')) continue;
    const decls = block.body.split(';').map((d) => d.trim()).filter(Boolean);
    const anim = decls.find((d) => /^animation\s*:/.test(d));
    if (!anim) continue;
    const delayDecl = decls.find((d) => /^animation-delay\s*:/.test(d));
    const delays = delayDecl ? splitTop(delayDecl.replace(/^animation-delay\s*:/, '')) : [];
    const list = splitTop(anim.replace(/^animation\s*:/, ''));
    list.forEach((one, index) => {
      if (/\binfinite\b/.test(one)) return;
      const name = one.split(/\s+/).find((word) => keyframes.has(word));
      if (!name) return;
      const times = [...one.matchAll(/(calc\([^;]*?\)\)|calc\([^;]*?\)|var\(--ill-duration(?:-instant|-short|-long)?\)|var\(--ill-stagger\))/g)].map((m) => m[1]);
      const duration = timeOf(times[0] ?? '', tokens);
      const delay = times[1] ? timeOf(times[1], tokens) : delays[index] ? timeOf(delays[index], tokens) : 0;
      const easing = /var\(--ill-(?:ease(?:-in-out)?|spring-[\w-]+)\)|ease-in-out|ease-in|ease-out|ease|linear/.exec(one)?.[0] ?? 'var(--ill-ease)';
      if (duration == null || delay == null) return;
      runs.push({ block, index, name, duration, delay: delay || 0, easing });
    });
  }
  if (!runs.length) return null;
  const maxEnd = Math.max(...runs.map((run) => run.delay + run.duration));
  const hold = tokens['--ill-rest']; // a gesture repeats rarely: an attention loop, not a spinner
  const unit = tokens['--ill-duration-short'];
  const steps = Math.ceil((hold + 2 * maxEnd) / unit);
  const period = steps * unit;
  const middle = (period - 2 * maxEnd) / 2 + maxEnd; // the rewind ends and the play starts here
  const periodExpr = `calc(var(--ill-duration-short) * ${steps})`;
  let out = css;
  const newFrames = [];
  const perBlock = new Map();
  runs.forEach((run, i) => {
    const frames = keyframes.get(run.name);
    const last = frames.find((f) => f.stops.includes(100)) ?? frames[frames.length - 1];
    const loopName = `${run.name}-loop${runs.filter((r) => r.name === run.name).length > 1 ? i : ''}`;
    const rows = [];
    rows.push([0, last.body]);
    for (const frame of frames) for (const stop of frame.stops) {
      rows.push([(middle - run.delay - run.duration * (stop / 100)) / period * 100, frame.body]);
      rows.push([(middle + run.delay + run.duration * (stop / 100)) / period * 100, frame.body]);
    }
    rows.push([100, last.body]);
    rows.sort((a, b) => a[0] - b[0]);
    newFrames.push(`    @keyframes ${loopName} { ${rows.map(([at, body]) => `${fmt(at)} { ${body} }`).join(' ')} }`);
    const list = perBlock.get(run.block) ?? [];
    list[run.index] = `${loopName} ${periodExpr} ${run.easing} infinite both`;
    perBlock.set(run.block, list);
  });
  // Rewrite each rule's animation (keeping any infinite ones it had) and drop its delay
  for (const [block, list] of perBlock) {
    const decls = block.body.split(';').map((d) => d.trim()).filter(Boolean);
    const anim = decls.find((d) => /^animation\s*:/.test(d));
    const old = splitTop(anim.replace(/^animation\s*:/, ''));
    const merged = old.map((one, index) => list[index] ?? one);
    const body = decls.filter((d) => !/^animation-delay\s*:/.test(d)).map((d) => (d === anim ? `animation: ${merged.join(', ')}` : d)).join('; ');
    out = out.replace(css.slice(block.start, block.end).trim(), `${block.prelude} { ${body}; }`);
  }
  // Drop the keyframes no rule uses any more, add the loops
  const used = new Set([...out.matchAll(/animation\s*:([^;}]+)/g)].flatMap((m) => splitTop(m[1]).map((one) => one.split(/\s+/)[0])));
  for (const block of blocks) {
    const name = /^@keyframes\s+([\w-]+)/.exec(block.prelude)?.[1];
    if (name && !used.has(name)) out = out.replace(css.slice(block.start, block.end).trim(), '');
  }
  out = `${out.replace(/\n\s*\n/g, '\n').replace(/\s+$/, '')}\n${newFrames.join('\n')}\n  `;
  return text.replace(styleMatch[0], `<style>${out}</style>`);
};

// --- spring: a spring's response as a linear() easing

/**
 * The step response of a spring as linear() stops over one duration: bounce 0 is critically damped (no overshoot),
 * a bounce b in (0, 1) a damping ratio of 1 - b (b = 0.15 overshoots by less than a hundredth; 0.3 by about 4 %).
 * The natural frequency is set so that the spring has settled by the end of the duration, so the animation's own
 * --ill-duration token is the whole of its time.
 */
const springCurve = (bounce, points = 24) => {
  if (!(bounce >= 0 && bounce < 1)) fail('--bounce must be 0 or more and below 1');
  const zeta = 1 - bounce;
  const omega = 2 * Math.PI * 1.15;
  const at = (t) => {
    if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + (zeta * omega / damped) * Math.sin(damped * t));
  };
  const values = Array.from({ length: points + 1 }, (_, i) => (i === points ? 1 : Math.round(at(i / points) * 1000) / 1000));
  return `linear(${values.join(', ')})`;
};

const SPRING_BLOCK = /(@supports \(animation-timing-function: linear\(0, 1\)\) \{\s*:root \{)([\s\S]*?)(\n\s*\}\s*\})/;

const spring = (dir, options) => {
  loadState(dir);
  const bounce = Number(options.bounce ?? 0);
  const curve = springCurve(bounce);
  if (!options.name) { print(curve); return; }
  if (!/^[a-z][\w-]*$/.test(options.name)) fail(`--name must be a word in kebab-case, got "${options.name}"`);
  const path = join(dir, 'tokens.css');
  const text = read(path);
  if (!text) fail(`${path} not found`);
  const token = `--ill-spring-${options.name}`;
  const line = `    ${token}: ${curve};`;
  let out;
  if (SPRING_BLOCK.test(text)) {
    out = text.replace(SPRING_BLOCK, (_, head, body, tail) => {
      const rows = body.split('\n').filter((row) => row.trim() && !row.includes(`${token}:`));
      return `${head}${rows.join('\n')}\n${line}${tail}`;
    });
  } else {
    out = `${text.replace(/\s+$/, '')}\n\n/* ── Springs: linear() where the browser has it; the fallback on :root elsewhere ── */\n@supports (animation-timing-function: linear(0, 1)) {\n  :root {\n${line}\n  }\n}\n`;
  }
  if (!new RegExp(`${token}:\\s*var\\(--ill-ease\\)`).test(out)) {
    out = out.replace(/(\n\s*--ill-ease-in-out:[^\n]*\n)/, `$1  ${token}: var(--ill-ease);\n`);
  }
  writeFileSync(path, out);
  print(`Wrote ${token} (bounce ${bounce}) into ${path}`);
};

const loop = (dir) => {
  loadState(dir);
  const stage = stageOf(dir);
  if (!stage) fail('no manifest: nothing to loop');
  const manifest = loadManifest(stage.base);
  const tokens = durationTokens(dir);
  const files = new Set();
  for (const tab of manifest.tabs) {
    // a picture the user meets many times a day plays its small gesture once and stays still: no loop for it
    if (tab.kind === 'pictures' || tab.kind === 'letters') tab.items.forEach((item) => item.file && item.frequency !== 'often' && files.add(item.file));
    if (tab.kind === 'directions') tab.items.forEach((item) => (item.samples ?? []).filter((s) => s.kind === 'pictures' || s.kind === 'letters').forEach((s) => files.add(s.file)));
  }
  let changed = 0;
  for (const file of files) {
    const path = join(stage.base, file);
    const text = read(path);
    if (!text) continue;
    const looped = loopSvg(text, tokens);
    if (looped && looped !== text) { writeFileSync(path, looped); changed += 1; print(`looped ${file}`); }
  }
  print(`${plural(changed, 'picture')} made cyclic; the others already loop or have no animation.`);
};

// --- import: the customer's own files

const NAMED_COLORS = { white: '#ffffff', black: '#000000' };
const COLOR_VALUE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\brgba?\([^)]*\)|\b(?:white|black)\b/g;
const slug = (name) => name.replace(/\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mark';
const isWhite = (color) => /^#(?:fff|ffff|ffffff|ffffffff)$/i.test(color) || /^white$/i.test(color) || /^rgba?\(\s*255\s*,?\s*255\s*,?\s*255/.test(color);

/** What a file is made of, and what of it can move. */
const analyzeSvg = (text, svg) => {
  const body = svg.body;
  const groups = [...body.matchAll(/<g\b([^>]*)>/g)].map((m) => /\s(?:id|class)="([^"]*)"/.exec(m[1])?.[1] ?? '');
  const shapes = {};
  for (const [, tag] of body.matchAll(/<(path|rect|circle|ellipse|line|polygon|polyline)\b/g)) shapes[tag] = (shapes[tag] ?? 0) + 1;
  const paths = [...body.matchAll(/<path\b[^>]*\sd="([^"]*)"/g)].map((m) => (m[1].match(/[Mm]/g) ?? []).length);
  const total = Object.values(shapes).reduce((a, b) => a + b, 0);
  const merged = total === 1 && paths[0] > 1 ? paths[0] : 0;
  const stroked = (body.match(/\sstroke="(?!none)[^"]+"|stroke\s*:\s*(?!none)[^;"]+/g) ?? []).length;
  const colors = {};
  for (const [value] of `${body}\n${svg.style}`.matchAll(COLOR_VALUE)) { const key = NAMED_COLORS[value.toLowerCase()] ?? value.toLowerCase(); colors[key] = (colors[key] ?? 0) + 1; }
  const ids = [...body.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  const refs = [...`${body}\n${svg.style}`.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
  const defs = (body.match(/<(?:linearGradient|radialGradient|pattern|filter|mask|clipPath|marker)\b/g) ?? []).length;
  const text_ = (body.match(/<text\b/g) ?? []).length;
  const images = (body.match(/<(?:image|foreignObject)\b/g) ?? []).length;
  const widths = [...new Set([...body.matchAll(/stroke-width="([^"]+)"|stroke-width\s*:\s*([^;"]+)/g)].map((m) => (m[1] ?? m[2]).trim()))];
  const size = Buffer.byteLength(text);
  return { viewBox: svg.viewBox, groups, shapes, total, merged, stroked, colors, ids, refs, defs, text: text_, images, widths, size };
};

const reportMark = (name, a) => {
  const lines = [];
  lines.push(`${name}: viewBox ${a.viewBox ?? 'none'}, ${a.size > 1024 ? `${Math.round(a.size / 1024)} KB` : `${a.size} B`}`);
  lines.push(`  shapes: ${a.total ? Object.entries(a.shapes).map(([tag, n]) => `${n} ${tag}`).join(', ') : 'none'}${a.merged ? ` — one path of ${a.merged} subpaths (a merged outline)` : ''}`);
  lines.push(`  groups: ${a.groups.length ? a.groups.map((g) => g || '(unnamed)').join(', ') : 'none'}`);
  lines.push(`  strokes: ${a.stroked ? `${a.stroked} stroked shape${a.stroked === 1 ? '' : 's'}, width${a.widths.length === 1 ? '' : 's'} ${a.widths.join(', ') || '?'}` : 'none — filled shapes only'}`);
  lines.push(`  colors: ${Object.keys(a.colors).length ? Object.entries(a.colors).sort((x, y) => y[1] - x[1]).map(([c, n]) => `${c} ×${n}`).join(', ') : 'none raw (currentColor or tokens)'}`);
  if (a.ids.length) lines.push(`  ids: ${a.ids.join(', ')}${a.refs.length ? ` (referenced: ${[...new Set(a.refs)].join(', ')})` : ''}`);
  if (a.defs || a.text || a.images) lines.push(`  needs a hand: ${[a.defs && `${a.defs} gradient/filter/mask/clip`, a.text && `${a.text} <text>`, a.images && `${a.images} raster or foreign`].filter(Boolean).join(', ')} — ask before flattening`);
  const moves = [];
  if (a.groups.filter(Boolean).length) moves.push(`each named group is a part a loader can move on its own: ${a.groups.filter(Boolean).join(', ')}`);
  if (a.merged) moves.push(`the outline is one path of ${a.merged} subpaths; it moves as one — splitting it into parts changes the file and needs the operator's permission`);
  if (a.stroked) moves.push('a stroked shape can draw itself (stroke-dasharray and an animated stroke-dashoffset)');
  if (!a.groups.filter(Boolean).length && !a.stroked) moves.push('a whole mark: a wipe (a rect in --lg-ground sliding off it), an appearance with a shift, a ring or a pulse around it; the mark itself stays still');
  lines.push(`  can move: ${moves.join('; ')}`);
  return lines;
};

/** The mark's copy on tokens: colors mapped by frequency, ids to prefixed classes, geometry untouched. */
const tokenizeMark = (text, svg, id, a) => {
  const ranked = Object.entries(a.colors).sort((x, y) => y[1] - x[1]).map(([c]) => c);
  const map = {};
  const tokens = ['var(--lg-accent)', 'var(--lg-accent-2)', 'var(--lg-soft)'];
  let body = false;
  for (const color of ranked) {
    if (isWhite(color)) { map[color] = 'var(--lg-ground)'; continue; }
    if (!body) { map[color] = 'currentColor'; body = true; continue; }
    map[color] = tokens.shift() ?? null;
  }
  let out = text.replace(/<\?xml[^>]*>\s*/g, '').replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  out = out.replace(COLOR_VALUE, (value) => { const key = NAMED_COLORS[value.toLowerCase()] ?? value.toLowerCase(); return map[key] ?? value; });
  out = out.replace(/<g\b([^>]*)\sid="([^"]*)"/g, (_, before, name) => `<g${before} class="${id}__${slug(name)}"`);
  out = out.replace(/\sid="[^"]*"/g, '');
  out = out.replace(/\sclass="([^"]*)"/g, (_, classes) => ` class="${classes.split(/\s+/).filter(Boolean).map((c) => (c.startsWith(`${id}__`) || c === id ? c : `${id}__${c}`)).join(' ')}"`);
  out = out.replace(/<svg\b([^>]*)>/, (_, attrs) => {
    let kept = attrs.replace(/\s(?:width|height)="[^"]*"/g, '');
    if (!/viewBox=/.test(kept)) { const w = /width="([\d.]+)/.exec(attrs)?.[1]; const h = /height="([\d.]+)/.exec(attrs)?.[1]; if (w && h) kept += ` viewBox="0 0 ${w} ${h}"`; }
    if (!/aria-hidden/.test(kept)) kept += ' aria-hidden="true"';
    return `<svg${kept}>`;
  });
  const left = ranked.filter((c) => map[c] === null);
  // The comment names no raw color: check reads a comment line that also holds markup, and the sprite drops none
  const header = `<!-- The customer's own mark, imported as is (the source beside it, ${id}.source.svg, holds the original colors);
     the geometry untouched, every color mapped to a token — ${Object.keys(map).length || 'no'} color${Object.keys(map).length === 1 ? '' : 's'} mapped. Classes carry the mark's id ("${id}"). -->\n`;
  return { out: `${header}${out}\n`, map, left };
};

const importLogo = (dir, source, idOption) => {
  loadState(dir);
  const path = resolve(source);
  const text = read(path);
  if (!text) fail(`${source} not found`);
  const svg = parseSvg(text);
  if (!svg) fail(`${source} is not an SVG`);
  const id = idOption ?? slug(basename(source));
  if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`--id must be kebab-case, got "${id}"`);
  const a = analyzeSvg(text, svg);
  for (const line of reportMark(basename(source), a)) print(line);
  const folder = join(dir, 'review', 'logo');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${id}.source.svg`), text);
  const { out, map, left } = tokenizeMark(text, svg, id, a);
  writeFileSync(join(folder, `${id}.svg`), out);
  print(`Wrote review/logo/${id}.svg on tokens (${Object.entries(map).map(([c, t]) => `${c} → ${t ?? 'left'}`).join(', ') || 'no raw color'}) and review/logo/${id}.source.svg as received.${left.length ? ` ${left.length} color${left.length === 1 ? '' : 's'} beyond the tokens left as is: ${left.join(', ')} — check will name them; map them by hand or ask.` : ''}`);
  print(`Next: add { "id": "${id}", "file": "logo/${id}.svg", "source": "logo/${id}.source.svg", "from": "the customer's file", "selected": true } to the logo tab, check, build, publish.`);
};

const importIcons = (dir, folder) => {
  loadState(dir);
  const from = resolve(folder);
  if (!statOf(from)?.isDirectory()) fail(`${folder} is not a folder`);
  const files = readdirSync(from).filter((name) => name.toLowerCase().endsWith('.svg')).sort();
  if (!files.length) fail(`${folder} holds no SVG file`);
  const target = join(dir, 'review', 'icons');
  mkdirSync(target, { recursive: true });
  let written = 0;
  const entries = [];
  for (const name of files) {
    const text = read(join(from, name));
    const svg = text && parseSvg(text);
    const id = slug(name);
    if (!svg) { print(`${name}: not an SVG — skipped`); continue; }
    const a = analyzeSvg(text, svg);
    const notes = [];
    const box = (svg.viewBox ?? '').split(/[\s,]+/).map(Number);
    const side = box.length === 4 && box[2] === box[3] ? box[2] : null;
    if (!side) { print(`${name}: viewBox ${svg.viewBox ?? 'none'} is not square — redraw by hand on the 16 grid`); continue; }
    if (a.defs || a.text || a.images) { print(`${name}: ${[a.defs && 'a gradient, filter, mask or clip', a.text && 'text', a.images && 'a raster image'].filter(Boolean).join(', ')} — redraw by hand`); continue; }
    const scale = 16 / side;
    let body = svg.body.replace(/<!--[\s\S]*?-->/g, '');
    if (side !== 16) notes.push(`${side}-grid → 16`);
    const widthsSeen = a.widths;
    const inner = (1.5 / scale);
    body = body.replace(/stroke-width="[^"]+"/g, `stroke-width="${+inner.toFixed(3)}"`).replace(/stroke-width\s*:\s*[^;"]+/g, `stroke-width: ${+inner.toFixed(3)}`);
    if (widthsSeen.length && !(widthsSeen.length === 1 && Math.abs(Number(widthsSeen[0]) * scale - 1.5) < 0.01)) notes.push(`stroke ${widthsSeen.join('/')} → 1.5`);
    const raw = Object.keys(a.colors);
    body = body.replace(COLOR_VALUE, () => 'currentColor');
    if (raw.length) notes.push(`${raw.join(', ')} → currentColor`);
    if (a.ids.length) { body = body.replace(/\sid="[^"]*"/g, ''); notes.push(`${a.ids.length} id${a.ids.length === 1 ? '' : 's'} removed`); }
    body = body.replace(/\sclass="([^"]*)"/g, (_, classes) => ` class="${classes.split(/\s+/).filter(Boolean).map((c) => (c.startsWith(`${id}__`) ? c : `${id}__${c}`)).join(' ')}"`);
    const wrapped = side === 16 ? body.trim() : `<g transform="scale(${+scale.toFixed(4)})">${body.trim()}</g>`;
    const out = `<!-- The customer's own icon "${name}", imported: ${notes.length ? notes.join('; ') : 'already on the 16 grid, a 1.5 stroke and currentColor'}; the drawing untouched. Classes carry the icon's id ("${id}"). -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true">
  ${wrapped}
</svg>
`;
    writeFileSync(join(target, `${id}.svg`), out);
    written += 1;
    entries.push(id);
    print(`${name}: ${notes.length ? notes.join('; ') : 'as is'} → review/icons/${id}.svg`);
  }
  print(`${plural(written, 'icon')} of ${files.length} written into review/icons/; the rest need a hand.${entries.length ? ` Next: add them to the icons tab (${entries.map((id) => `{ "id": "${id}", "file": "icons/${id}.svg", "from": "the customer's file" }`).join(', ')}), check, build, publish.` : ''}`);
};

// --- tokens: the set's values for the product's own tooling

const TOKEN_GROUPS = [['--color-', 'color'], ['--ill-duration', 'motion'], ['--ill-stagger', 'motion'], ['--ill-ease', 'motion'], ['--ill-spring', 'motion'], ['--ill-', 'ill'], ['--lg-', 'lg'], ['--font-', 'font'], ['--radius-', 'radius'], ['--shadow-', 'shadow']];
const tokenGroup = (name) => TOKEN_GROUPS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'other';
const tokenKey = (name) => (tokenGroup(name) === 'motion' ? name.replace(/^--ill-/, '') : name.replace(/^--(?:color|ill|lg|font|radius|shadow)-/, ''));
const asReference = (value) => value.replace(/var\((--[\w-]+)\)/g, (_, name) => `{${tokenGroup(name)}.${tokenKey(name)}}`);

const tokensJsonOf = (text) => {
  const light = declarations(text, ':root {') ?? {};
  const dark = declarations(text, ":root[data-theme='dark']") ?? {};
  const springs = SPRING_BLOCK.exec(text)?.[2] ?? '';
  const curves = Object.fromEntries([...springs.matchAll(/(--ill-spring-[\w-]+)\s*:\s*(linear\([^;]*\));/g)].map((m) => [m[1], m[2]]));
  const out = {};
  for (const [name, { value }] of Object.entries(light)) {
    const group = tokenGroup(name);
    out[group] ??= {};
    const token = { value: asReference(curves[name] ?? value) };
    if (dark[name]) token.dark = asReference(dark[name].value);
    out[group][tokenKey(name)] = token;
  }
  return out;
};

const tailwindOf = (text) => {
  const light = declarations(text, ':root {') ?? {};
  const names = Object.keys(light);
  const ref = (name) => `var(${name})`;
  const colors = Object.fromEntries(names.filter((n) => ['color', 'ill', 'lg'].includes(tokenGroup(n))).map((n) => [tokenGroup(n) === 'color' ? tokenKey(n) : `${tokenGroup(n)}-${tokenKey(n)}`, ref(n)]));
  const fontFamily = Object.fromEntries(names.filter((n) => tokenGroup(n) === 'font').map((n) => [tokenKey(n), ref(n)]));
  const borderRadius = Object.fromEntries(names.filter((n) => tokenGroup(n) === 'radius').map((n) => [tokenKey(n), ref(n)]));
  const boxShadow = Object.fromEntries(names.filter((n) => tokenGroup(n) === 'shadow').map((n) => [tokenKey(n), ref(n)]));
  const transitionDuration = Object.fromEntries(names.filter((n) => /^--ill-(?:duration|stagger)/.test(n)).map((n) => [n.replace(/^--ill-duration-?/, 'ill-').replace(/^--ill-stagger/, 'ill-stagger').replace(/-$/, ''), ref(n)]));
  const transitionTimingFunction = Object.fromEntries(names.filter((n) => /^--ill-(?:ease|spring)/.test(n)).map((n) => [n.replace(/^--ill-ease-?/, 'ill-').replace(/^--ill-spring-/, 'ill-spring-').replace(/-$/, ''), ref(n)]));
  const theme = { theme: { extend: { colors, fontFamily, borderRadius, boxShadow, transitionDuration, transitionTimingFunction } } };
  return `// The illustration set's tokens as a Tailwind theme extension — every value a var() on tokens.css, so the two themes
// keep working and a scheme change is one file. Generated by dev-assistant's illustrations.mjs; a hand edit is lost.
module.exports = ${JSON.stringify(theme, null, 2)};
`;
};

const tokens = (dir, options) => {
  loadState(dir);
  const text = read(join(dir, 'tokens.css'));
  if (!text) fail(`${join(dir, 'tokens.css')} not found`);
  const format = options.format ?? 'both';
  if (!['json', 'tailwind', 'both'].includes(format)) usage(`--format takes json or tailwind, got "${format}"`);
  const out = options.out ? resolve(options.out) : null;
  const written = [];
  if (format !== 'tailwind') {
    const json = tokensJsonOf(text);
    const target = out && format === 'json' ? out : join(out ?? dir, 'tokens.json');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(json, null, 2)}\n`);
    written.push(`${target} (${plural(Object.values(json).reduce((n, group) => n + Object.keys(group).length, 0), 'token')})`);
  }
  if (format !== 'json') {
    const target = out && format === 'tailwind' ? out : join(out ?? dir, 'tokens.tailwind.cjs');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, tailwindOf(text));
    written.push(target);
  }
  print(`Wrote ${written.join(' and ')}`);
};

// --- main

const main = () => {
  const [command, dirArg, ...rest] = process.argv.slice(2);
  if (!command) usage('no command given');
  if (!COMMANDS.includes(command)) usage(`unknown command "${command}"`);
  if (!dirArg) usage(`${command} needs the set's folder`);
  const dir = resolve(dirArg);
  if (command === 'sprite' || command === 'strings') {
    let out;
    for (let i = 0; i < rest.length; i += 1) {
      if (rest[i] === '--out' && rest[i + 1]) { out = rest[i + 1]; i += 1; } else usage(`unknown option for ${command}: ${rest[i]}`);
    }
    if (command === 'sprite') sprite(dir, out); else strings(dir, out);
    return;
  }
  if (command === 'import') {
    const [what, source, ...options] = rest;
    if (what === 'logo') {
      if (!source) usage('import logo needs the file');
      let id;
      for (let i = 0; i < options.length; i += 1) {
        if (options[i] === '--id' && options[i + 1]) { id = options[i + 1]; i += 1; } else usage(`unknown option for import logo: ${options[i]}`);
      }
      importLogo(dir, source, id);
      return;
    }
    if (what === 'icons') {
      if (!source) usage('import icons needs the folder');
      if (options.length) usage(`too many arguments for import icons: ${options.join(' ')}`);
      importIcons(dir, source);
      return;
    }
    usage('import takes "logo <file.svg>" or "icons <folder>"');
  }
  if (command === 'tokens') {
    const options = {};
    for (let i = 0; i < rest.length; i += 1) {
      if ((rest[i] === '--format' || rest[i] === '--out') && rest[i + 1]) { options[rest[i].slice(2)] = rest[i + 1]; i += 1; } else usage(`unknown option for tokens: ${rest[i]}`);
    }
    tokens(dir, options);
    return;
  }
  if (command === 'spring') {
    const options = {};
    for (let i = 0; i < rest.length; i += 1) {
      if ((rest[i] === '--bounce' || rest[i] === '--name') && rest[i + 1]) { options[rest[i].slice(2)] = rest[i + 1]; i += 1; } else usage(`unknown option for spring: ${rest[i]}`);
    }
    spring(dir, options);
    return;
  }
  if (rest.length) usage(`too many arguments for ${command}: ${rest.join(' ')}`);
  if (command === 'build') build(dir);
  if (command === 'check') check(dir);
  if (command === 'save') save(dir);
  if (command === 'loop') loop(dir);
};

try { main(); } catch (problem) { fail(problem.message); }
