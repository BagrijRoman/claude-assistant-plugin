// Writes the home page, index.html: the Product page — what the product is, who uses it, its modules,
// how it works, the sample company, and about this site (the catalog, where the content comes from, how
// to read it), then the list of its child pages (the Technology stack). The rendering is the frame's;
// the content is the project's: fill the arrays marked FILL in the Frame step from SOURCES.md (the
// reading) and keep the people and the company in sample.mjs. Run again when they change (step 20).
//
//   node tools/genProduct.mjs && node build.mjs
//
// Every text carries its key (product.<section>.<item>.<field>); add the keys this page introduces to
// every dictionary in i18n/ with their translations. Icons are the sprite's (assets/showcase.js, #i-…).
import { readFile, writeFile } from 'node:fs/promises';
import { renderPage, section, block, escapeHtml } from './lib/html.mjs';
import { SITE } from '../site.mjs';
import { COMPANY, PEOPLE, DATA, WHEN } from '../sample.mjs';

const root = new URL('..', import.meta.url);
const OUT = new URL('index.html', root);
const icon = (name, size = 20) => `<svg class="icon icon--${size}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const t = (key, text, tag = 'span', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} data-i18n="${key}">${escapeHtml(text)}</${tag}>`;

// FILL — one line under the title: the product's promise
const TAGLINE = `${SITE.name} in one line: what it does and for whom.`;
// FILL — what it is, in one paragraph: what it does, for whom, the problem it solves
const LEAD = `${SITE.name} is … for … who today …`;
// FILL — three or four promises from the brief's goals: [id, icon, title, one sentence]
const PROMISES = [
  ['first', 'check-circle', 'A promise', 'One sentence of what the product keeps to.'],
];
// FILL — one per role, keyed as in sample.mjs › PEOPLE: [id, what they do, where (web, phone, a link…)]
const ROLES = Object.keys(PEOPLE).map((id) => [id, 'What this role does in the product.', 'Web']);
// FILL — the modules: [id, icon, title, one line, in the first release?]
const MODULES = [
  ['first', 'home', 'A module', 'What it is for, in one line.', true],
];
// FILL — the main loop of the product: [id, title, one sentence]
const LOOP = [
  ['first', 'First', 'What happens in this step.'],
];
const LOOP_NOTE = 'One sentence of what holds the loop together.';
// FILL — one line of what the sample company is, after its name
const SAMPLE_WHAT = 'what the company does, where, and how it is built.';
// The labels of the node types of DATA.structure / DATA.sites, when sample.mjs has them
const TYPES = { group: 'Group', 'legal entity': 'Legal entity', 'business unit': 'Business unit', site: 'Site' };

// ── About this site: the table of SOURCES.md › What was read ──
const sources = await readFile(new URL('SOURCES.md', root), 'utf8').catch(() => '');
const table = (sources.split('## What was read')[1] ?? '').split('\n## ')[0];
const rows = table.split('\n')
  .filter((line) => line.startsWith('|') && !line.startsWith('|--') && !line.startsWith('| Group'))
  .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, next) => (next ? next.toUpperCase() : ''));
const code = (text) => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
const HOW = [
  ['theme', 'Theme.', 'The switch in the top bar sets light, dark or follow the device; every page follows.'],
  ['navigation', 'Navigation.', 'The menu lists every section; a root section is one page, its items scroll to its parts, and opening one folds the one that was open. ← → step through them; each page ends with previous and next.'],
  ['presentation', 'Presentation.', 'Press P, or add <code>?present=1</code> to the address: the page alone, larger. Escape leaves it.'],
  ['selected', 'Selected and alternative.', 'Where several variants are shown, the one chosen carries a <span class="tag tag--selected">Selected</span> mark; the Decisions page says why.'],
  ['sample', 'Sample data.', 'Names and figures are invented for a fictional company; see <code>sample.mjs</code>.'],
];

// ── The sample company's structure, when sample.mjs gives one ──
const typeKey = (type) => `product.sample.type.${type.replace(/ (.)/g, (_, c) => c.toUpperCase())}`;
const nodes = [...(DATA?.structure ?? []), ...(DATA?.sites ?? []).map((site) => ({ ...site, site: true }))];
const typeLabel = (type) => t(typeKey(type), TYPES[type] ?? type, 'span', 'sc-tree__type t-caption');
function tree(parent) {
  const children = nodes.filter((node) => node.parent === parent);
  if (children.length === 0) return '';
  return `<ul>${children.map((node) => {
    const share = node.ownership && node.ownership < 100 ? `<span class="t-caption sc-tree__type">· ${node.ownership}%</span>` : '';
    return `<li>${node.site ? icon('building', 16) : ''} ${escapeHtml(node.name)}${typeLabel(node.type)}${share}${tree(node.name)}</li>`;
  }).join('')}</ul>`;
}
const top = nodes.find((node) => !node.parent);
const structureCard = top
  ? `        <div class="card sc-card">${t('product.sample.structure', 'Structure', 'h3', 't-card-title')}<div class="sc-tree"><ul><li>${escapeHtml(top.name)}${typeLabel(top.type)}${tree(top.name)}</li></ul></div></div>`
  : '';
const years = (DATA?.years ?? []).map((year) => `<li><strong>${year.year}</strong> ${year.base ? `<span class="badge badge--info">${t('product.sample.base', 'Base year')}</span> ` : ''}${year.state === 'locked' ? `<span class="badge">${icon('lock', 16)} ${t('product.sample.locked', 'Locked')}</span>` : `<span class="badge badge--success">${t('product.sample.open', 'Open')}</span>`}</li>`).join('');
const peopleCard = [
  '        <div class="card sc-card">',
  years ? `${t('product.sample.years', 'Reporting years', 'h3', 't-card-title')}<ul class="sc-list">${years}</ul>` : '',
  `${t('product.sample.people', 'People', 'h3', 't-card-title')}<ul class="sc-list">${Object.entries(PEOPLE).map(([id, person]) => `<li><strong>${escapeHtml(person.name)}</strong> · ${t(`product.roles.${id}.title`, person.role)}</li>`).join('')}</ul>`,
  WHEN?.today ? `<p class="t-caption"><span data-i18n="product.sample.today">“Today” on every screen is</span> ${escapeHtml(WHEN.today)}.</p>` : '',
  '</div>',
].join('');

const head = (id, title, desc) => ({ id, title, titleKey: `nav.product.${id}`, lead: desc, leadKey: `nav.product.${id}.desc` });
const cards = (items) => ['      <div class="sc-cards">', ...items, '      </div>'].join('\n');

const body = [
  block({
    ...head('about', 'What it is', 'The product in one paragraph: what it does, for whom, the problem it solves.'),
    body: [
      `      <p class="t-body" data-i18n="product.about.lead">${escapeHtml(LEAD)}</p>`,
      cards(PROMISES.map(([id, ic, title, text]) => `        <div class="card sc-card"><div class="sc-card__head"><span class="sc-icon-chip">${icon(ic)}</span>${t(`product.about.${id}.title`, title, 'h3', 't-card-title')}</div>${t(`product.about.${id}.text`, text, 'p')}</div>`)),
    ].join('\n'),
  }),
  block({
    ...head('roles', 'Who uses it', 'Every role, what it does in the product and where.'),
    body: cards(ROLES.map(([id, what, where]) => {
      const person = PEOPLE[id] ?? { name: '', role: id, initials: id.slice(0, 2).toUpperCase() };
      return `        <div class="card sc-card"><div class="sc-card__head"><span class="sc-avatar" aria-hidden="true">${escapeHtml(person.initials ?? '')}</span><div>${t(`product.roles.${id}.title`, person.role, 'h3', 't-card-title')}<span class="t-caption">${escapeHtml(person.name)}${person.company ? `, ${escapeHtml(person.company)}` : ''}</span></div></div>${t(`product.roles.${id}.what`, what, 'p')}<div class="sc-card__foot"><span class="tag">${t(`product.roles.${id}.where`, where)}</span></div></div>`;
    })),
  }),
  block({
    ...head('modules', 'Modules', 'The parts of the product, each in a line, and which come first.'),
    body: cards(MODULES.map(([id, ic, title, line, first]) => `        <div class="card sc-card${first ? '' : ' sc-tile--muted'}"><div class="sc-card__head"><span class="sc-icon-chip">${icon(ic)}</span>${t(`product.modules.${id}.title`, title, 'h3', 't-card-title')}</div>${t(`product.modules.${id}.line`, line, 'p')}<div class="sc-card__foot">${first ? `<span class="badge badge--success">${t('product.modules.first', 'First release')}</span>` : `<span class="badge">${t('product.modules.next', 'Next release')}</span>`}</div></div>`)),
  }),
  block({
    ...head('loop', 'How it works', 'The product’s main loop, drawn step by step.'),
    body: [
      '      <ol class="sc-cycle">',
      ...LOOP.map(([id, title, text]) => `        <li class="card sc-cycle__step">${t(`product.loop.${id}.title`, title, 'h3', 't-card-title')}${t(`product.loop.${id}.text`, text, 'p')}</li>`),
      '      </ol>',
      `      <p class="sc-note" data-i18n="product.loop.note">${escapeHtml(LOOP_NOTE)}</p>`,
    ].join('\n'),
  }),
  block({
    ...head('sample', 'Sample company', 'The fictional company and people every sample on this site uses.'),
    body: [
      `      <p class="t-body"><strong>${escapeHtml(COMPANY.name)}</strong> — <span data-i18n="product.sample.what">${escapeHtml(SAMPLE_WHAT)}</span></p>`,
      `      <div class="sc-grid-2">\n${structureCard}\n${peopleCard}\n      </div>`,
    ].join('\n'),
  }),
  block({
    ...head('site', 'About this site', 'Every page of this site, where its content comes from, and how to read it.'),
    body: [
      '      <p class="t-body" data-i18n="product.site.about">This site shows the product before it is built: what it is and how it is built, its design, its pictures and components, its screens and its flows step by step. It is the reference the product is held against; where it proposes something the product does not have yet, it says “proposed”.</p>',
      '      <div data-catalog></div>',
      ...(rows.length ? [
        '      <h3 class="t-card-title" data-i18n="overview.sources.title">Where this comes from</h3>',
        '      <div class="table-wrap card">',
        '        <table class="table">',
        '          <thead><tr><th data-i18n="overview.sources.group">What</th><th data-i18n="overview.sources.files">Files</th><th data-i18n="overview.sources.gave">What it gave</th></tr></thead>',
        '          <tbody>',
        ...rows.map(([group, files, gave]) => `            <tr><td><strong data-i18n="overview.sources.${slug(group)}">${escapeHtml(group)}</strong></td><td class="t-caption">${code(files)}</td><td data-i18n="overview.sources.${slug(group)}.gave">${escapeHtml(gave)}</td></tr>`),
        '          </tbody>',
        '        </table>',
        '      </div>',
      ] : []),
      '      <h3 class="t-card-title" data-i18n="overview.how.title">How to read this site</h3>',
      '      <ul class="card sc-list">',
      ...HOW.map(([id, title, text]) => `        <li><strong data-i18n="overview.how.${id}.title">${title}</strong> <span data-i18n="overview.how.${id}">${text}</span></li>`),
      '      </ul>',
    ].join('\n'),
  }),
  section({ title: 'In this section', titleKey: 'ui.inThisSection', body: '      <div data-children></div>' }),
].join('\n');

await writeFile(OUT, renderPage({
  prefix: '',
  lang: SITE.defaultLanguage,
  siteName: SITE.name,
  title: SITE.name,
  titleKey: 'product.title',
  overline: '<span data-i18n="nav.product">Product</span>',
  lead: `<p data-i18n="product.lead">${escapeHtml(TAGLINE)}</p>`,
  body,
}));
console.log(`Wrote index.html (${rows.length} source groups). Now run node build.mjs`);
