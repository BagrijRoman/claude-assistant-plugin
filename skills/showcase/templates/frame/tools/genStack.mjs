// Writes product/stack.html: the Technology stack under Product — each technology of SC-003 with its
// official mark, its version where known, one line of what it does in this product and a link to its
// official site, by layer. The rendering is the frame's; fill LAYERS in the Frame step from SC-003, after
// `node tools/fetchTechMarks.mjs <slug> …` has put the marks in assets/tech/ (marks.json). A technology
// with no mark shows its initials on a tile. Run again when the stack changes.
//
//   node tools/genStack.mjs && node build.mjs
//
// The layers are the sections of the stack page in pages.mjs (product › children › stack): keep their
// ids and titles the same here. Keys: stack.lead, stack.<layer>.<technology>, stack.marks and
// ui.officialSite — add them to every dictionary.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { renderPage, block, escapeHtml } from './lib/html.mjs';
import { SITE } from '../site.mjs';

const root = new URL('..', import.meta.url);
const OUT = new URL('product/stack.html', root);
const PREFIX = '../';
const marks = JSON.parse(await readFile(new URL('assets/tech/marks.json', root), 'utf8').catch(() => '{}'));

// FILL — one sentence of why this stack (SC-003)
const LEAD = 'Why this stack, in one sentence: what the team has, what the documentation decided.';
// FILL — [layer id, title, description, [[key, name, version, Simple Icons slug or null, initials, official site, what it does here], …]]
const LAYERS = [
  ['client', 'Clients', 'What the user’s browser or device runs.', [
    ['example', 'A technology', '', null, 'Ex', 'https://example.com', 'What it does in this product, in one line.'],
  ]],
];

function mark(slug, initials, name) {
  const entry = slug && marks[slug];
  if (!entry) return `<span class="tech-mark tech-mark--initials" aria-hidden="true">${escapeHtml(initials || name.slice(0, 2))}</span>`;
  return `<img class="tech-mark${entry.mono ? ' tech-mark--mono' : ''}" src="${PREFIX}assets/tech/${entry.file}" alt="" width="40" height="40">`;
}

const card = (layer, [key, name, version, slug, initials, url, what]) => [
  '        <div class="card sc-card sc-tech">',
  `          <div class="sc-card__head">${mark(slug, initials, name)}<div class="sc-tech__name"><strong>${escapeHtml(name)}</strong>${version ? `<span class="t-caption sc-tech__version">${escapeHtml(version)}</span>` : ''}</div></div>`,
  `          <p data-i18n="stack.${layer}.${key}">${escapeHtml(what)}</p>`,
  `          <div class="sc-card__foot"><a href="${escapeHtml(url)}" target="_blank" rel="noopener"><span data-i18n="ui.officialSite">Official site</span> ↗</a></div>`,
  '        </div>',
].join('\n');

const body = LAYERS.map(([id, title, desc, items]) => block({
  id,
  title,
  titleKey: `nav.product.stack.${id}`,
  lead: desc,
  leadKey: `nav.product.stack.${id}.desc`,
  body: ['      <div class="sc-cards">', ...items.map((item) => card(id, item)), '      </div>'].join('\n'),
})).join('\n')
  + '\n    <p class="sc-note" data-i18n="stack.marks">The marks are their owners’ trademarks, shown to name each technology; the files come from Simple Icons and the projects’ own sites and are kept in this folder.</p>';

await mkdir(new URL('product/', root), { recursive: true });
await writeFile(OUT, renderPage({
  prefix: PREFIX,
  lang: SITE.defaultLanguage,
  siteName: SITE.name,
  title: 'Technology stack',
  titleKey: 'nav.product.stack',
  overline: '<span data-i18n="nav.product">Product</span>',
  lead: `<p data-i18n="stack.lead">${escapeHtml(LEAD)}</p>`,
  body,
}));
console.log(`Wrote product/stack.html (${LAYERS.reduce((n, layer) => n + layer[3].length, 0)} technologies). Now run node build.mjs`);
