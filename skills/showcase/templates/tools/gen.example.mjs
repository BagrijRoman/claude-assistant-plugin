// How a generator is written. One generator per heavy page or flow: it holds the page's content as
// data and writes the page's HTML as static markup, so nothing on the page appears late, the texts
// can carry their i18n keys, and a change is made here, never in the HTML — a hand edit to the HTML
// is lost on the next run. Run it from the showcase folder, then `node build.mjs`.
//
//   node tools/gen.example.mjs
//
// Copy this file to tools/gen<Page>.mjs, point OUT at the page, replace the content, and add the
// page (or the flow as a child of Flows) to pages.mjs.
import { writeFile } from 'node:fs/promises';
import { renderPage, section, block, escapeHtml } from './lib/html.mjs';
import { SITE } from '../site.mjs';
import { COMPANY, PEOPLE } from '../sample.mjs';

const OUT = new URL('../example/index.html', import.meta.url);
const PREFIX = '../'; // one folder below the site root

// ── Content as data: titles carry their i18n keys, so the dictionaries can translate them ──
const PAGE = {
  id: 'example',
  title: 'Example page',
  lead: `A page about ${escapeHtml(COMPANY.name)}, written by a generator.`,
};

const ITEMS = [
  { id: 'first', title: 'First thing', desc: 'What it is for.' },
  { id: 'second', title: 'Second thing', desc: 'What it is for.' },
];

const body = [
  section({
    id: 'intro',
    title: 'What this shows',
    titleKey: `${PAGE.id}.intro.title`,
    desc: `Samples use the people of ${escapeHtml(COMPANY.name)}: ${Object.values(PEOPLE).map((person) => escapeHtml(person.name)).join(', ') || 'see sample.mjs'}.`,
    descKey: `${PAGE.id}.intro.desc`,
  }),
  ...ITEMS.map((item) =>
    block({
      id: item.id,
      title: item.title,
      titleKey: `nav.${PAGE.id}.${item.id}`,
      lead: item.desc,
      leadKey: `nav.${PAGE.id}.${item.id}.desc`,
      source: 'Source: <span class="badge sc-proposed">proposed</span>',
      body: '      <div class="sc-row"><div class="sc-row__items"><button type="button" class="btn btn--primary">Sample</button></div></div>',
    })),
].join('\n');

await writeFile(
  OUT,
  renderPage({
    prefix: PREFIX,
    lang: SITE.defaultLanguage,
    siteName: SITE.name,
    title: PAGE.title,
    titleKey: `nav.${PAGE.id}`,
    // The lead is this page's own text, not the menu's description of it: its own key
    lead: `<p data-i18n="${PAGE.id}.lead">${PAGE.lead}</p>`,
    body,
  }),
);
console.log(`Wrote ${OUT.pathname}; now run node build.mjs`);
