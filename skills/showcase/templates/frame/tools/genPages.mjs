// Writes a starting page for every page in pages.mjs that does not exist yet, so the whole site
// opens from the first minute: each page with its hero and one block per section marked "in
// progress"; the home page (the Product page) with the catalog and how to read the site in its
// `site` section; a root with child pages with the place build.mjs lists them in. A page that exists
// is never touched — the sections fill them in, this only lays the floor.
// Every text carries its key: the frame's own (ui.*, overview.how.*, flows.list.*) are in the
// dictionary skeleton, i18n/lang.js in the skill's templates.
//
// Run it from the showcase folder, then `node build.mjs` (open.mjs runs the build itself):
//   node tools/genPages.mjs
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyOf, realPages } from '../build.mjs';
import { SITE } from '../site.mjs';
import { renderPage, section, block, escapeHtml } from './lib/html.mjs';

const root = new URL('..', import.meta.url);
const overview = realPages[0];
const prefixOf = (page) => '../'.repeat(page.path.split('/').length - 1);

const inProgress = '      <p class="sc-note" data-i18n="ui.inProgress">Being prepared.</p>';

// How to read this site: [id, title, text]; a text may hold markup, its dictionary entry then too
const HOW = [
  ['theme', 'Theme.', 'The switch in the top bar sets light, dark or follow the device; every page follows.'],
  ['navigation', 'Navigation.', 'The menu lists every section; a root section is one page, its items scroll to its parts, and opening one folds the one that was open. ← → step through them; each page ends with previous and next.'],
  ['presentation', 'Presentation.', 'Press P, or add <code>?present=1</code> to the address: the page alone, larger. Escape leaves it.'],
  ['selected', 'Selected and alternative.', 'Where several variants are shown, the one chosen carries a <span class="tag tag--selected">Selected</span> mark; the Decisions page says why.'],
  ['sample', 'Sample data.', 'Names and figures are invented for a fictional company; see <code>sample.mjs</code>.'],
];

// The catalog of every page and how to read the site: on the home page, in its `site` section
const siteGuide = [
  '      <div data-catalog></div>',
  `      <h3 class="t-card-title" data-i18n="overview.how.title">How to read this site</h3>`,
  '      <ul class="card sc-list">',
  ...HOW.map(([id, title, text]) => `        <li><strong data-i18n="overview.how.${id}.title">${title}</strong> <span data-i18n="overview.how.${id}">${text}</span></li>`),
  '      </ul>',
].join('\n');

// The list of a root's child pages: build.mjs writes their tiles into data-children. Flows has its own
// words; any other root lists its pages under "In this section"
function childrenBody(page) {
  return page.id === 'flows'
    ? section({ title: 'The flows', titleKey: 'flows.list.title', desc: 'Sign-in first, then the flows of the product, in the order they are met.', descKey: 'flows.list.desc', body: '      <div data-children></div>' })
    : section({ title: 'In this section', titleKey: 'ui.inThisSection', body: '      <div data-children></div>' });
}

function sectionsBody(page) {
  const key = keyOf(page);
  const home = page === overview;
  const parts = (page.sections ?? []).map((item) =>
    block({ id: item.id, title: item.title, titleKey: `${key}.${item.id}`, lead: item.desc, leadKey: `${key}.${item.id}.desc`, body: home && item.id === 'site' ? siteGuide : inProgress }));
  if (home && !(page.sections ?? []).some((item) => item.id === 'site')) parts.push(siteGuide);
  if (page.listsChildren) parts.push(childrenBody(page));
  if (parts.length === 0) parts.push(section({ title: 'In progress', titleKey: 'ui.inProgressTitle', body: inProgress }));
  return parts.join('\n');
}

const exists = (file) => access(file).then(() => true, () => false);

const written = [];
for (const page of realPages) {
  const file = new URL(page.path, root);
  if (await exists(file)) continue;
  const body = sectionsBody(page);
  const html = renderPage({
    prefix: prefixOf(page),
    lang: SITE.defaultLanguage,
    siteName: SITE.name,
    title: page.title,
    titleKey: keyOf(page),
    overline: page.parent ? `<span data-i18n="${keyOf(page.parent)}">${escapeHtml(page.parent.title)}</span>` : `<span data-i18n="nav.band.${page.band.id}">${escapeHtml(page.band.title)}</span>`,
    lead: page.desc ? `<p data-i18n="${keyOf(page)}.desc">${escapeHtml(page.desc)}</p>` : '',
    body,
    scripts: page.parent?.id === 'flows' ? ['assets/flow.js'] : [],
  });
  await mkdir(dirname(fileURLToPath(file)), { recursive: true });
  await writeFile(file, html);
  written.push(page.path);
}

console.log(written.length === 0
  ? `Every page in pages.mjs exists (${realPages.length} pages); nothing written`
  : `Wrote ${written.length} starting pages: ${written.join(', ')}. Now run node build.mjs`);
