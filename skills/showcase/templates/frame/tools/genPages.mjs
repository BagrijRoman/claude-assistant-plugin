// Writes a starting page for every page in pages.mjs that does not exist yet, so the whole site
// opens from the first minute: each root section with its hero and one block per section marked
// "in progress", the overview with its catalog, the Flows index with the place build.mjs lists the
// flows in. A page that exists is never touched — the sections fill them in, this only lays the floor.
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

function overviewBody() {
  return [
    '    <div data-catalog></div>',
    section({
      title: 'How to read this site',
      titleKey: 'overview.how.title',
      body: [
        '      <ul class="card sc-list">',
        ...HOW.map(([id, title, text]) => `        <li><strong data-i18n="overview.how.${id}.title">${title}</strong> <span data-i18n="overview.how.${id}">${text}</span></li>`),
        '      </ul>',
      ].join('\n'),
    }),
  ].join('\n');
}

// The page of a root with child pages (Flows): build.mjs writes their tiles into data-children
function childrenIndexBody() {
  return section({ title: 'The flows', titleKey: 'flows.list.title', desc: 'Sign-in first, then the flows of the product, in the order they are met.', descKey: 'flows.list.desc', body: '      <div data-children></div>' });
}

function sectionsBody(page) {
  const key = keyOf(page);
  if (!page.sections || page.sections.length === 0) {
    return section({ title: 'In progress', titleKey: 'ui.inProgressTitle', body: inProgress });
  }
  return page.sections.map((item) =>
    block({ id: item.id, title: item.title, titleKey: `${key}.${item.id}`, lead: item.desc, leadKey: `${key}.${item.id}.desc`, body: inProgress })).join('\n');
}

const exists = (file) => access(file).then(() => true, () => false);

const written = [];
for (const page of realPages) {
  const file = new URL(page.path, root);
  if (await exists(file)) continue;
  const body = page === overview ? overviewBody() : page.listsChildren ? childrenIndexBody() : sectionsBody(page);
  const html = renderPage({
    prefix: prefixOf(page),
    lang: SITE.defaultLanguage,
    siteName: SITE.name,
    title: page.title,
    titleKey: keyOf(page),
    overline: page.parent ? `<span data-i18n="${keyOf(page.parent)}">${escapeHtml(page.parent.title)}</span>` : `<span data-i18n="nav.band.${page.band.id}">${escapeHtml(page.band.title)}</span>`,
    lead: page.desc ? `<p data-i18n="${keyOf(page)}.desc">${escapeHtml(page.desc)}</p>` : '',
    body,
    scripts: page.parent ? ['assets/flow.js'] : [],
  });
  await mkdir(dirname(fileURLToPath(file)), { recursive: true });
  await writeFile(file, html);
  written.push(page.path);
}

console.log(written.length === 0
  ? `Every page in pages.mjs exists (${realPages.length} pages); nothing written`
  : `Wrote ${written.length} starting pages: ${written.join(', ')}. Now run node build.mjs`);
