// Writes the navigation into every page of the showcase as static HTML, from site.mjs and pages.mjs:
// the side menu (bands → root sections → their items), the breadcrumbs, the previous / next links,
// the catalog on the overview page, the list of child pages on their root's page (the Flows index),
// the tab's icon (assets/favicon.svg, from the selected mark), the fonts and the language scripts in
// <head>, and the language switch in the top bar. Static markup is on screen with the page's first
// paint, so nothing appears late or moves when a page opens.
//
// Run it after changing pages.mjs or site.mjs, from the showcase folder: `node build.mjs`.
// `node open.mjs` runs it first as well. It rewrites only the blocks between its own markers and
// leaves the rest of each page alone; running it twice changes nothing.
//
// Menu model: a band is a label that does not fold ("Product", "Design", "Project"); a root section
// is one page. A root with items — the sections of that page (anchors the menu scrolls to) or, for
// Flows, child pages of their own — folds, and only one is open at a time; a root without items is a
// plain link. Every label carries a data-i18n key, so i18n.js can swap it. The page of a root with
// children needs <div data-children></div> where their list goes (genPages writes it).
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BANDS } from './pages.mjs';
import { SITE } from './site.mjs';

const root = new URL('.', import.meta.url);

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Every page in menu order, a child right after its parent. An entry without a path is planned:
// listed in the menu and the catalog, never visited. `listsChildren` marks a root whose entry has a
// `children` list (Flows): its page shows them, even while the list is empty.
export const allPages = [];
for (const band of BANDS) {
  for (const page of band.pages) {
    const entry = { ...page, band, children: [], listsChildren: Array.isArray(page.children) };
    entry.children = (page.children ?? []).map((child) => ({ ...child, band, parent: entry }));
    allPages.push(entry, ...entry.children);
  }
}
export const realPages = allPages.filter((page) => page.path);
const overview = realPages[0];

const idOf = (page) => page.id ?? page.path.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\//g, '.');
// The i18n key of a page: nav.<page id>; a child sits under its root, nav.<root id>.<child id>, so a
// flow named like a root section (signIn) does not share that section's label
export const keyOf = (page) => (page.parent ? `nav.${idOf(page.parent)}.${idOf(page)}` : `nav.${idOf(page)}`);
// "../" once per folder between a page and the site root, so links work from disk and from a server
const prefixOf = (page) => '../'.repeat(page.path.split('/').length - 1);

// Every label is looked up by its key, and a section's id is also its anchor: two entries with one key
// would show one text for both in every other language. Refused here, before anything is written.
const claimed = new Map();
const claim = (key, what) => {
  for (const name of [key, `${key}.desc`]) {
    if (claimed.has(name)) throw new Error(`pages.mjs: ${what} and ${claimed.get(name)} share the i18n key ${name}; give one of them another id`);
    claimed.set(name, what);
  }
};
for (const band of BANDS) claim(`nav.band.${band.id}`, `band "${band.id}"`);
for (const page of allPages) {
  claim(keyOf(page), `page "${page.path ?? page.id}"`);
  for (const section of page.sections ?? []) claim(`${keyOf(page)}.${section.id}`, `section "${section.id}" of "${page.id}"`);
}

const label = (text, key) => `<span data-i18n="${key}">${escapeHtml(text)}</span>`;

// `current` is "page" for the page on show, "true" for the root title of a child page on show
function navLink(href, text, key, { section, page, current } = {}) {
  const classes = ['navlink', page ? 'navlink--page' : ''].filter(Boolean).join(' ');
  const attrs = [
    `class="${classes}"`,
    `href="${href}"`,
    section ? `data-section="${section}"` : '',
    // data-label feeds the hidden Semibold copy that keeps a link the same size active and inactive
    `data-label="${escapeHtml(text)}"`,
    current ? `aria-current="${current}"` : '',
  ].filter(Boolean).join(' ');
  return `<a ${attrs}>${label(text, key)}</a>`;
}

const planned = (text, key, indent) =>
  `${indent}<span class="navlink sc-side__planned">${label(text, key)}<span class="tag sc-side__soon" data-i18n="ui.soon">soon</span></span>`;

function renderRoot(page, current, prefix) {
  const key = keyOf(page);
  if (!page.path) return planned(page.title, key, '      ');
  const items = [
    // The first section is the one on show when the page opens; nav.js moves the mark from there
    ...(page.sections ?? []).map((section, index) =>
      `        ${navLink(`${prefix}${page.path}#${section.id}`, section.title, `${key}.${section.id}`, { section: section.id, current: page === current && index === 0 ? 'page' : '' })}`),
    ...page.children.map((child) =>
      child.path
        ? `        ${navLink(`${prefix}${child.path}`, child.title, keyOf(child), { current: child === current ? 'page' : '' })}`
        : planned(child.title, keyOf(child), '        ')),
  ];
  const pageLink = navLink(`${prefix}${page.path}`, page.title, key, {
    page: true,
    current: page === current ? 'page' : current.parent === page ? 'true' : '',
  });
  if (items.length === 0) return `      ${pageLink}`;
  // A root folds like a <details>; the one that holds the page on show is open. Every root carries the
  // same name, so the browser keeps one open at a time: opening another folds it (nav.js does the same
  // where the name is not supported)
  const open = page === current || current.parent === page ? ' open' : '';
  return [
    `      <details class="sc-side__group" name="sc-side"${open}>`,
    `        <summary class="sc-side__title"><span class="sc-side__chevron"></span>${pageLink}</summary>`,
    '        <div class="sc-side__list">',
    ...items,
    '        </div>',
    '      </details>',
  ].join('\n');
}

// The menu is the root sections and nothing above them: a band shows only as the gap before its group
// The mark carries its size as attributes too (components.css › .brand__mark svg draws it at 18 px): a page
// painted before its stylesheets arrive would otherwise show the mark as wide as the window
const brandMark = SITE.mark.includes(' width=') ? SITE.mark : SITE.mark.replace('<svg ', '<svg width="18" height="18" ');

function renderSide(current, prefix) {
  const bands = BANDS.map((band, index) => [
    ...(index > 0 ? ['    <hr class="sc-side__gap">'] : []),
    ...allPages.filter((page) => page.band === band && !page.parent).map((page) => renderRoot(page, current, prefix)),
  ].join('\n'));
  return [
    '  <aside class="sc-side" id="sc-side" aria-label="All pages">',
    `    <a class="brand" href="${prefix}${overview.path}"><span class="brand__mark" aria-hidden="true">${brandMark}</span><span>${escapeHtml(SITE.name)}</span></a>`,
    ...bands,
    '    <p class="t-caption sc-side__hint" data-i18n="ui.keysHint">The ← → keys step through the sections and pages.</p>',
    '  </aside>',
    '  <div class="sc-scrim"></div>',
    `  <script src="${prefix}assets/nav.js"></script>`,
  ].join('\n');
}

function renderCrumb(current) {
  // A page in sections names the section on show; nav.js changes it as the page scrolls
  const first = current.sections?.[0];
  const key = first ? `${keyOf(current)}.${first.id}` : keyOf(current);
  const page = `<span class="sc-crumb__page" data-i18n="${key}">${escapeHtml(first ? first.title : current.title)}</span>`;
  return current.parent
    ? `${label(current.parent.title, keyOf(current.parent))}<span>/</span>${page}`
    : page;
}

function renderPager(current, prefix) {
  const index = realPages.indexOf(current);
  const link = (page, text, key, side) =>
    `        <a class="sc-pager__link sc-pager__link--${side}" href="${prefix}${page.path}"><span class="t-caption" data-i18n="${key}">${text}</span><span class="sc-pager__title" data-i18n="${keyOf(page)}">${escapeHtml(page.title)}</span></a>`;
  return [
    '      <nav class="sc-pager" aria-label="Neighboring pages">',
    ...(index > 0 ? [link(realPages[index - 1], '← Previous', 'ui.previous', 'prev')] : []),
    ...(index < realPages.length - 1 ? [link(realPages[index + 1], 'Next →', 'ui.next', 'next')] : []),
    '      </nav>',
  ].join('\n');
}

// A tile of the catalog or of a root's list of child pages: a link, or a planned page that is not one yet
function renderTile(page, prefix, indent) {
  const key = keyOf(page);
  const body = `<h3 class="t-card-title" data-i18n="${key}">${escapeHtml(page.title)}</h3><p data-i18n="${key}.desc">${escapeHtml(page.desc ?? '')}</p>`;
  return page.path
    ? `${indent}<a class="card sc-tile" href="${prefix}${page.path}">${body}</a>`
    : `${indent}<div class="card sc-tile sc-tile--planned"><span class="tag" data-i18n="ui.planned">Planned</span>${body}</div>`;
}

function renderCatalog(prefix) {
  return BANDS.map((band) => {
    const pages = allPages.filter((page) => page.band === band && !page.parent && page !== overview);
    if (pages.length === 0) return null;
    const tiles = pages.map((page) => renderTile(page, prefix, '          '));
    return [
      '      <section class="sc-section">',
      `        <div class="sc-section__head"><h2 class="t-section-title" data-i18n="nav.band.${band.id}">${escapeHtml(band.title)}</h2><p data-i18n="nav.band.${band.id}.desc">${escapeHtml(band.desc ?? '')}</p></div>`,
      '        <div class="sc-tiles">',
      ...tiles,
      '        </div>',
      '      </section>',
    ].join('\n');
  })
    .filter(Boolean)
    .join('\n');
}

// A root's child pages as tiles on the root's own page — the Flows index — so a flow added to pages.mjs
// is listed there by the next build, as it is in the menu. A root with none yet says so.
function renderChildren(page, prefix) {
  if (page.children.length === 0) return '<p class="sc-note" data-i18n="ui.inProgress">Being prepared.</p>';
  return [
    '        <div class="sc-tiles">',
    ...page.children.map((child) => renderTile(child, prefix, '          ')),
    '        </div>',
  ].join('\n');
}

// The value a token has in one theme, as plain text: the declaration is looked up in the scopes in
// order (the dark set first, then the light one it falls back to), and a `var(--other)` is followed to
// the token it names, as the browser would on :root. A token that is missing, still holds a
// {{placeholder}}, or leads to anything that is not a plain value gives undefined.
function tokenIn(scopes, name, depth = 0) {
  if (depth > 4) return undefined;
  for (const css of scopes) {
    const value = css.match(new RegExp(`(?<![\\w-])${name}\\s*:\\s*([^;}]+)`))?.[1].trim();
    if (value === undefined) continue;
    const ref = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/);
    const plain = ref ? (tokenIn(scopes, ref[1], depth + 1) ?? ref[2]?.trim()) : value;
    return plain && !/\{\{|var\(|[<&]/.test(plain) ? plain : undefined;
  }
  return undefined;
}

// The browser tab's icon (assets/favicon.svg): the selected mark in the brand color, as the Logo page
// shows it in a tab at 16 px, and in the dark theme's brand color on a dark browser; until a mark is
// picked, the brand tile's letter on the brand color. The colors are tokens.css's: --color-primary
// (the mark, the tile), --color-primary-foreground (the letter) and, for a mark with knockouts,
// --lg-ground, each for light and, under prefers-color-scheme: dark, for dark. One that cannot be read
// (missing, a {{placeholder}}) is left out, never written as "undefined": the mark then draws in the
// browser's own ink, the tile in black with a white letter, and a theme without its own value takes
// the light one.
function renderFavicon(tokens) {
  const css = tokens.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = css.search(/prefers-color-scheme:\s*dark|\[data-theme=['"]dark['"]\]/);
  const light = start < 0 ? css : css.slice(0, start);
  const dark = start < 0 ? null : css.slice(start);
  // The <style> for the properties a drawing uses: the light values, then those the dark set changes
  const styleFor = (props) => {
    const pick = (scopes) => Object.fromEntries(props.map(([prop, token]) => [prop, tokenIn(scopes, token)]));
    const block = (set, base = {}) => Object.entries(set).filter(([prop, value]) => value && value !== base[prop]).map(([prop, value]) => `${prop}:${value}`).join(';');
    const day = pick([light]);
    const night = dark === null ? {} : pick([dark, light]);
    const rules = [
      block(day) && `svg{${block(day)}}`,
      block(night, day) && `@media (prefers-color-scheme:dark){svg{${block(night, day)}}}`,
    ].filter(Boolean).join('');
    return rules ? `<style>${rules}</style>` : '';
  };
  const mark = String(SITE.mark ?? '').trim();
  if (/^<svg[\s>]/.test(mark)) {
    // A mark with knockouts draws them in --lg-ground, which this file has no page to inherit from: it
    // gets the page's ground of each theme, as the tab of a light or a dark browser would show it
    const props = [['color', '--color-primary'], ...(mark.includes('--lg-ground') ? [['--lg-ground', '--lg-ground']] : [])];
    const open = (_, attrs) => `<svg${/\sxmlns=/.test(attrs) ? '' : ' xmlns="http://www.w3.org/2000/svg"'}${attrs.replace(/\s+aria-hidden="true"/, '')}>${styleFor(props)}`;
    return `${mark.replace(/^<svg\b([^>]*)>/, open)}\n`;
  }
  // A letter: the mark when it is one (two at most), else the name's first; none when neither is usable
  const usable = (value) => String(value ?? '').trim() !== '' && !String(value).includes('{{');
  const letters = usable(SITE.mark) ? Array.from(mark).slice(0, 2).join('')
    : usable(SITE.name) ? Array.from(String(SITE.name).trim())[0].toUpperCase() : '';
  const size = Array.from(letters).length > 1 ? 30 : 36;
  const text = letters
    ? `<text x="32" y="45" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size}" font-weight="600" style="fill:var(--on-brand,#fff)">${escapeHtml(letters)}</text>`
    : '';
  const style = styleFor([['color', '--color-primary'], ['--on-brand', '--color-primary-foreground']]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${style}<rect width="64" height="64" rx="14" style="fill:currentColor"/>${text}</svg>\n`;
}

// Fonts and the language machinery live in <head>: the dictionaries first, then i18n.js, all deferred,
// so the texts are swapped before the first paint and in the right order
function renderHead(prefix) {
  const languages = SITE.languages ?? ['en'];
  const defaultLanguage = SITE.defaultLanguage ?? languages[0];
  const fonts = (SITE.fonts?.links ?? []).flatMap((href) => [
    `  <link rel="stylesheet" href="${href}">`,
  ]);
  const preconnect = fonts.length > 0
    ? ['  <link rel="preconnect" href="https://fonts.googleapis.com">', '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>']
    : [];
  const config = JSON.stringify({ name: SITE.name, languages, defaultLanguage });
  const dictionaries = languages.filter((lang) => lang !== defaultLanguage).map((lang) => `  <script src="${prefix}i18n/${lang}.js" defer></script>`);
  const icon = `  <link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg">`;
  return [icon, ...preconnect, ...fonts, `  <script>window.SHOWCASE_SITE = ${config};</script>`, ...dictionaries, `  <script src="${prefix}assets/i18n.js" defer></script>`].join('\n');
}

const LANGUAGE_NAMES = { en: 'English', uk: 'Українська', de: 'Deutsch', fr: 'Français', es: 'Español', pl: 'Polski', it: 'Italiano', pt: 'Português', nl: 'Nederlands', cs: 'Čeština' };

function renderLanguageSwitch() {
  const languages = SITE.languages ?? ['en'];
  if (languages.length < 2) return '';
  const buttons = languages.map((lang) =>
    `<button type="button" class="segmented__item" data-lang-set="${lang}" aria-pressed="false" lang="${lang}">${escapeHtml(LANGUAGE_NAMES[lang] ?? lang.toUpperCase())}</button>`);
  return `<div class="segmented" role="group" aria-label="Language">${buttons.join('')}</div>`;
}

// Replaces what stands between a block's markers. A page that has no markers yet gets the block
// through `insert`, which must find the block's place or throw: a page is never left half built.
function writeBlock(html, name, content, indent, insert) {
  const start = `<!-- ${name}:start (written by build.mjs) -->`;
  const end = `<!-- ${name}:end -->`;
  const block = content.includes('\n') ? `${start}\n${content}\n${indent}${end}` : `${start}${content}${end}`;
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  if (from >= 0 && to > from) return html.slice(0, from) + block + html.slice(to + end.length);
  return insert(block);
}

function replaceOnce(html, target, replacement, page, what) {
  if (html.split(target).length !== 2) {
    throw new Error(`${page.path}: expected exactly one "${target.trim()}" to place the ${what}`);
  }
  return html.replace(target, () => replacement);
}

function buildPage(html, page) {
  const prefix = prefixOf(page);
  let next = html;
  next = writeBlock(next, 'head', renderHead(prefix), '', (block) =>
    replaceOnce(next, '</head>', `${block}\n</head>`, page, 'fonts and language scripts'));
  next = writeBlock(next, 'nav', renderSide(page, prefix), '  ', (block) =>
    replaceOnce(next, '<body>\n', `<body>\n  ${block}\n`, page, 'menu'));
  next = writeBlock(next, 'crumb', renderCrumb(page), '', (block) =>
    replaceOnce(next, '<div class="sc-crumb" data-crumb></div>', `<div class="sc-crumb">${block}</div>`, page, 'breadcrumbs'));
  next = writeBlock(next, 'lang', renderLanguageSwitch(), '', (block) =>
    replaceOnce(next, '<div data-lang-switch></div>', `<div class="sc-lang">${block}</div>`, page, 'language switch'));
  next = writeBlock(next, 'pager', renderPager(page, prefix), '      ', (block) =>
    replaceOnce(next, '  </main>\n', `      ${block}\n  </main>\n`, page, 'previous / next links'));
  if (page === overview) {
    next = writeBlock(next, 'catalog', renderCatalog(prefix), '    ', (block) =>
      replaceOnce(next, '<div data-catalog></div>', `<div class="sc-catalog">\n      ${block}\n    </div>`, page, 'catalog'));
  }
  if (page.listsChildren) {
    next = writeBlock(next, 'children', renderChildren(page, prefix), '      ', (block) =>
      replaceOnce(next, '<div data-children></div>', `<div class="sc-children">\n      ${block}\n      </div>`, page, 'list of its child pages'));
  }
  return next;
}

// The Color scheme step leaves a scratch page, scheme.html, with the proposed schemes side by side. It is
// needed only until the operator picks one: once STATE.json records the step done, the next build removes
// it, so nothing of the choice outlives it. Returns whether it removed the page.
export async function removeSchemeScratch() {
  let state;
  try {
    state = JSON.parse(await readFile(new URL('STATE.json', root), 'utf8'));
  } catch {
    return false;
  }
  if (state?.steps?.scheme !== 'done') return false;
  try {
    await unlink(new URL('scheme.html', root));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

// Returns the paths of the pages it had to rewrite; the tab's icon is written only when it changed
export async function build() {
  const changed = [];
  const favicon = new URL('assets/favicon.svg', root);
  const icon = renderFavicon(await readFile(new URL('tokens.css', root), 'utf8').catch(() => ''));
  if (icon !== await readFile(favicon, 'utf8').catch(() => null)) {
    await mkdir(new URL('assets/', root), { recursive: true });
    await writeFile(favicon, icon);
  }
  for (const page of realPages) {
    const file = new URL(page.path, root);
    const html = await readFile(file, 'utf8');
    const next = buildPage(html, page);
    if (next !== html) {
      await writeFile(file, next);
      changed.push(page.path);
    }
  }
  return changed;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const changed = await build();
  if (await removeSchemeScratch()) console.log('Removed scheme.html: the color scheme is chosen');
  console.log(
    changed.length === 0
      ? `Navigation is up to date in all ${realPages.length} pages of ${fileURLToPath(root)}`
      : `Navigation rewritten in ${changed.length} of ${realPages.length} pages: ${changed.join(', ')}`,
  );
}
