// The showcase skill ships a frame — build.mjs, genPages, the page shell — that is copied into every
// project. These tests scaffold it the way the skill does, with one flow added, then check what genPages
// and the build write: a starting page for every entry in pages.mjs that has a path; a menu whose
// foldable roots share the name that keeps one of them open at a time and no band label above them; the
// root of the page on show open, the Product root on the home page; a flow's root open with its title marked; the language switch and the
// dictionary wired in; a second build that changes nothing, and a second genPages run that writes nothing.
// A second scaffold lays the frame with no flow, as the Frame step does, and adds one later, as the
// Flows step does: the Flows index lists it after the next build, under a key of its own. The Color
// scheme step's scratch page survives a build until STATE.json records the scheme chosen, and not after.
// The tab's icon (assets/favicon.svg, from the mark and the brand tokens, linked from every head) and
// nav.js's refresh of the stylesheets at each in-place move are held to what they promise too.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import vm from 'node:vm';
import { BANDS } from '../skills/showcase/templates/pages.mjs';
import { removeTempDirs } from './helpers.mjs';
import { FLOW, run, scaffold, TEMPLATES, withFlow } from './showcaseFixture.mjs';

// Every page that has a path, a root's children right after it — the pages build.mjs writes into
const PAGES = BANDS
  .flatMap((band) => band.pages.flatMap((page) => [page, ...(page.children ?? [])]))
  .filter((page) => page.path);

const rootsOf = (html) => [...html.matchAll(/<details class="sc-side__group"([^>]*)>/g)].map(([, attributes]) => attributes);
const isOpen = (attributes) => /\bopen\b/.test(attributes);

describe('showcase frame', () => {
  let dir;
  before(() => {
    dir = scaffold();
  });
  after(removeTempDirs);

  it('lays a starting page for every entry in pages.mjs', () => {
    const result = run(dir, 'tools/genPages.mjs');
    assert.equal(result.status, 0, result.stderr);
    for (const page of PAGES) assert.ok(existsSync(join(dir, page.path)), `missing ${page.path}`);
  });

  it('writes the navigation, and a second build changes nothing', () => {
    const first = run(dir, 'build.mjs');
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Navigation rewritten in \d+ of \d+ pages/);
    const second = run(dir, 'build.mjs');
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /Navigation is up to date/);
  });

  it('gives every root the shared name, and opens at most one', () => {
    for (const page of PAGES) {
      const roots = rootsOf(readFileSync(join(dir, page.path), 'utf8'));
      assert.ok(roots.length > 0, `${page.path}: no foldable roots in the menu`);
      for (const attributes of roots) assert.match(attributes, /\bname="sc-side"/, `${page.path}: a root without the shared name`);
      assert.ok(roots.filter(isOpen).length <= 1, `${page.path}: more than one root open`);
    }
  });

  it('opens the root that holds the page on show, the Product root on the home page', () => {
    const openOn = (path) => [...readFileSync(join(dir, path), 'utf8').matchAll(/<details class="sc-side__group"[^>]*\bopen\b[^>]*>\s*<summary[^>]*>.*?href="([^"]+)"/gs)]
      .map(([, href]) => href);
    assert.deepEqual(openOn('components/index.html'), ['../components/index.html']);
    assert.deepEqual(openOn('index.html'), ['index.html']);
    assert.deepEqual(openOn('design/colors.html'), ['../design/index.html']);
  });

  it('shows no band label in the menu, only a gap between the groups', () => {
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const menu = html.match(/<!-- nav:start[^]*?<!-- nav:end -->/)?.[0] ?? '';
    assert.doesNotMatch(menu, /data-i18n="nav\.band\./);
    assert.equal(menu.split('<hr class="sc-side__gap">').length - 1, BANDS.length - 1);
  });

  it('lists a root\'s child pages on its own page, and gives the flow player only to flows', () => {
    const design = readFileSync(join(dir, 'design/index.html'), 'utf8');
    assert.match(design, /data-i18n="ui\.inThisSection"/);
    assert.match(design, /<a class="card sc-tile" href="\.\.\/design\/colors\.html">/);
    assert.doesNotMatch(readFileSync(join(dir, 'design/colors.html'), 'utf8'), /assets\/flow\.js/);
    assert.match(readFileSync(join(dir, FLOW.path), 'utf8'), /assets\/flow\.js/);
  });

  it('opens the root of a flow and marks its title, with the flow itself as the page on show', () => {
    const html = readFileSync(join(dir, FLOW.path), 'utf8');
    const open = [...html.matchAll(/<details class="sc-side__group"[^>]*\bopen\b[^>]*>\s*<summary[^>]*>.*?<a ([^>]*)>/gs)]
      .map(([, attributes]) => attributes);
    assert.equal(open.length, 1, 'exactly the flows root is open');
    assert.match(open[0], /href="\.\.\/flows\/index\.html"/);
    assert.match(open[0], /aria-current="true"/);
    assert.match(html, /<a class="navlink" href="\.\.\/flows\/signIn\.html"[^>]*aria-current="page"/);
  });

  it('wires the language switch and the dictionary in', () => {
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /data-lang-set="uk"/);
    assert.match(html, /<script src="i18n\/uk\.js" defer><\/script>/);
  });

  it('leaves existing pages alone on a second genPages run', () => {
    const result = run(dir, 'tools/genPages.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /nothing written/);
  });

  it('keys a flow under Flows, apart from the layout page that has the same id', () => {
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /href="flows\/signIn\.html"[^>]*><span data-i18n="nav\.flows\.signIn">Sign in<\/span>/);
    assert.match(html, /href="layouts\/signIn\.html"[^>]*><span data-i18n="nav\.layouts\.signIn">Auth layout<\/span>/);
    assert.doesNotMatch(html, /data-i18n="nav\.layouts\.signIn">Sign in</);
  });
});

describe('showcase flow player markup', () => {
  const html = import(new URL('../skills/showcase/templates/frame/tools/lib/html.mjs', import.meta.url));

  it('gives the bar a Hints button only when a step marks what the user acts on', async () => {
    const { flowPlayer } = await html;
    const marked = flowPlayer({ id: 'f', title: 'F', steps: [{ title: 'A', screen: '<button class="btn" data-flow-target="1">Go</button>' }] });
    const plain = flowPlayer({ id: 'f', title: 'F', steps: [{ title: 'A', screen: '<button class="btn">Go</button>' }] });
    assert.match(marked, /data-flow-hints aria-pressed="true" data-i18n="flow\.hints"/);
    assert.doesNotMatch(plain, /data-flow-hints/);
  });

  it('writes a step target number for the note as its badge', async () => {
    const { flowMark } = await html;
    assert.equal(flowMark(2), '<span class="flow__mark">2</span>');
  });
});

describe('showcase frame, a flow added after the frame', () => {
  let dir;
  before(() => {
    dir = scaffold({ flow: false });
  });
  after(removeTempDirs);

  const flowsIndex = () => readFileSync(join(dir, 'flows/index.html'), 'utf8');

  it('says the Flows index is being prepared while there is no flow', () => {
    assert.equal(run(dir, 'tools/genPages.mjs').status, 0);
    const result = run(dir, 'build.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.match(flowsIndex(), /<!-- children:start \(written by build\.mjs\) --><p class="sc-note" data-i18n="ui\.inProgress">/);
  });

  it('lists the flow on the Flows index with the next build, and a build after that changes nothing', () => {
    writeFileSync(join(dir, 'pages.mjs'), withFlow(readFileSync(join(dir, 'pages.mjs'), 'utf8')));
    assert.equal(run(dir, 'tools/genPages.mjs').status, 0);
    const first = run(dir, 'build.mjs');
    assert.equal(first.status, 0, first.stderr);
    const list = flowsIndex().match(/<!-- children:start[^]*?<!-- children:end -->/)?.[0] ?? '';
    assert.match(list, /<a class="card sc-tile" href="\.\.\/flows\/signIn\.html"><h3 class="t-card-title" data-i18n="nav\.flows\.signIn">Sign in<\/h3>/);
    assert.match(run(dir, 'build.mjs').stdout, /Navigation is up to date/);
  });

  it('keeps the scheme scratch page while the scheme is open, and removes it once it is chosen', () => {
    const scratch = join(dir, 'scheme.html');
    const state = (scheme) => writeFileSync(join(dir, 'STATE.json'), JSON.stringify({ kind: 'showcase', steps: { scheme } }));
    writeFileSync(scratch, '<!doctype html><title>Schemes</title>');
    state('awaiting-approval');
    assert.equal(run(dir, 'build.mjs').status, 0);
    assert.ok(existsSync(scratch), 'removed before the scheme was chosen');
    state('done');
    const result = run(dir, 'build.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Removed scheme\.html/);
    assert.ok(!existsSync(scratch), 'scheme.html outlived the choice');
    assert.doesNotMatch(run(dir, 'build.mjs').stdout, /Removed/);
  });

  it('refuses two entries that would share an i18n key', () => {
    const pages = readFileSync(join(dir, 'pages.mjs'), 'utf8');
    writeFileSync(join(dir, 'pages.mjs'), pages.replace("{ id: 'sizes', title: 'Sizes and spacing'", "{ id: 'sideBySide', title: 'Sizes and spacing'"));
    const result = run(dir, 'build.mjs');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /share the i18n key nav\.design\.logo\.sideBySide/);
    writeFileSync(join(dir, 'pages.mjs'), pages);
  });
});

// The tab's icon: build.mjs writes assets/favicon.svg from site.mjs's mark and tokens.css's brand colors
// and links it from every page's head. These tests change the mark and the tokens of one scaffold and
// build again; the originals come back before each test.
describe('showcase frame, the tab icon', () => {
  let dir;
  let site;
  before(() => {
    dir = scaffold({ flow: false });
    site = readFileSync(join(dir, 'site.mjs'), 'utf8');
    assert.equal(run(dir, 'tools/genPages.mjs').status, 0);
  });
  after(removeTempDirs);
  beforeEach(() => {
    writeFileSync(join(dir, 'site.mjs'), site);
    writeFileSync(join(dir, 'tokens.css'), readFileSync(join(TEMPLATES, 'tokens.css'), 'utf8'));
  });

  const setMark = (mark) => writeFileSync(join(dir, 'site.mjs'), site.replace("mark: 'F'", `mark: ${JSON.stringify(mark)}`));
  const setTokens = (css) => writeFileSync(join(dir, 'tokens.css'), css);
  const favicon = () => join(dir, 'assets/favicon.svg');
  const icon = () => {
    const result = run(dir, 'build.mjs');
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(favicon(), 'utf8');
  };
  // Neither "undefined" nor an unfilled {{placeholder}} nor an empty declaration may reach the file
  const clean = (svg) => {
    assert.doesNotMatch(svg, /undefined|null|NaN|\{\{|:\s*[;}]/);
    assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>\n$/);
  };

  it('writes the favicon and links it from every page\'s head, with the prefix of its folder', () => {
    icon();
    assert.ok(existsSync(favicon()), 'no assets/favicon.svg');
    for (const page of PAGES) {
      const head = readFileSync(join(dir, page.path), 'utf8').match(/<!-- head:start[^]*?<!-- head:end -->/)?.[0] ?? '';
      const prefix = '../'.repeat(page.path.split('/').length - 1);
      assert.ok(head.includes(`<link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg">`), `${page.path}: the head does not link the icon`);
    }
  });

  it('draws the letter of the mark on a brand tile, in the brand colors of both themes, until a mark is picked', () => {
    const svg = icon();
    clean(svg);
    assert.match(svg, /<rect width="64" height="64" rx="14" style="fill:currentColor"\/>/);
    assert.match(svg, />F<\/text>/);
    // The starter tokens: --color-primary #18181b and its foreground #ffffff, then #fafafa and #18181b in the dark set
    assert.match(svg, /<style>svg\{color:#18181b;--on-brand:#ffffff\}@media \(prefers-color-scheme:dark\)\{svg\{color:#fafafa;--on-brand:#18181b\}\}<\/style>/);
    assert.match(svg, /style="fill:var\(--on-brand,#fff\)"/);
  });

  it('writes the picked mark itself, in the brand color of each theme', () => {
    setMark('<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20" style="fill:currentColor"/></svg>');
    const svg = icon();
    clean(svg);
    assert.doesNotMatch(svg, /aria-hidden|<rect|<text|--lg-ground/);
    assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>svg{color:#18181b}@media (prefers-color-scheme:dark){svg{color:#fafafa}}</style><circle cx="32" cy="32" r="20" style="fill:currentColor"/></svg>\n');
  });

  it('gives a mark with knockouts the page\'s ground of each theme, which a file on its own has no page to inherit', () => {
    setMark('<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" style="fill:currentColor"/><circle cx="32" cy="32" r="8" style="fill:var(--lg-ground)"/></svg>');
    const svg = icon();
    clean(svg);
    assert.match(svg, /<style>svg\{color:#18181b;--lg-ground:#ffffff\}@media \(prefers-color-scheme:dark\)\{svg\{color:#fafafa;--lg-ground:#09090b\}\}<\/style>/);
    assert.match(svg, /style="fill:var\(--lg-ground\)"\/><\/svg>\n$/);
  });

  it('does not repeat a namespace the picked mark already has', () => {
    setMark('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/></svg>');
    const svg = icon();
    assert.equal(svg.split('xmlns=').length - 1, 1);
  });

  it('escapes a mark that is a letter the file would otherwise mistake for markup', () => {
    setMark('<');
    assert.match(icon(), />&lt;<\/text>/);
    setMark('&');
    assert.match(icon(), />&amp;<\/text>/);
  });

  it('takes the name\'s first letter when the mark is empty or still a placeholder', () => {
    setMark('');
    assert.match(icon(), />F<\/text>/);
    setMark('{{MARK}}');
    const svg = icon();
    clean(svg);
    assert.match(svg, />F<\/text>/);
  });

  it('follows a token that names another, and takes the light value where the dark set has none', () => {
    setTokens(`:root { --color-primary: var(--brand); --brand: #047857; --color-primary-foreground: #ffffff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { --brand: #34d399; } }`);
    const svg = icon();
    clean(svg);
    assert.match(svg, /svg\{color:#047857;--on-brand:#ffffff\}/);
    assert.match(svg, /@media \(prefers-color-scheme:dark\)\{svg\{color:#34d399\}\}/);
  });

  it('writes no style, and no "undefined", when the tokens are missing, empty or placeholders', () => {
    const cases = {
      'no brand token': ':root { --color-page: #fafafa; }',
      'placeholders': ':root { --color-primary: {{PRIMARY}}; --color-primary-foreground: {{ON_PRIMARY}}; }',
      'a value that leads nowhere': ':root { --color-primary: var(--missing); }',
      'an empty file': '',
    };
    for (const [name, css] of Object.entries(cases)) {
      setTokens(css);
      const svg = icon();
      clean(svg);
      assert.doesNotMatch(svg, /<style>/, name);
      assert.match(svg, /<rect [^>]*\/>.*>F<\/text>/, `${name}: the tile with its letter`);
    }
    setMark('<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/></svg>');
    setTokens(':root { --color-primary: {{PRIMARY}}; }');
    const svg = icon();
    clean(svg);
    assert.doesNotMatch(svg, /<style>/);
  });

  it('keeps the light value when there is no dark set, and builds with no tokens.css at all', () => {
    setTokens(':root { --color-primary: #047857; }');
    const svg = icon();
    clean(svg);
    assert.match(svg, /svg\{color:#047857\}/);
    assert.doesNotMatch(svg, /@media/);
    rmSync(join(dir, 'tokens.css'));
    const bare = icon();
    clean(bare);
    assert.doesNotMatch(bare, /<style>/);
  });

  it('does not read a mention of dark in a comment as the dark set', () => {
    setTokens(`/* the dark set applies under prefers-color-scheme: dark; --color-primary: #ff0000 is only an example */
:root { --color-primary: #047857; }
@media (prefers-color-scheme: dark) { :root { --color-primary: #34d399; } }`);
    const svg = icon();
    assert.match(svg, /svg\{color:#047857\}/);
    assert.match(svg, /dark\)\{svg\{color:#34d399\}\}/);
    assert.doesNotMatch(svg, /ff0000/);
  });

  it('writes the file only when it changed', () => {
    icon();
    const before = statSync(favicon()).mtimeMs;
    const second = run(dir, 'build.mjs');
    assert.match(second.stdout, /Navigation is up to date/);
    assert.equal(statSync(favicon()).mtimeMs, before, 'the unchanged icon was written again');
    setMark('Q');
    assert.match(icon(), />Q<\/text>/);
  });
});

// nav.js is browser code with no DOM here to run it in; what a test can hold it to is that it parses and
// that a page swapped in asks for the stylesheets afresh
describe('showcase frame, nav.js keeps the styles fresh across in-place moves', () => {
  const source = readFileSync(join(TEMPLATES, 'frame/assets/nav.js'), 'utf8');

  it('parses', () => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: 'nav.js' }));
  });

  it('reads the site\'s own stylesheets at load and again, uncached, at each swap', () => {
    assert.match(source, /function readSheet\(path\)[^]*?fetch\(path, \{ cache: 'no-store' \}\)/);
    assert.match(source, /new URL\(link\.href\)\.origin === location\.origin/, 'only the site\'s own sheets');
    assert.match(source, /if \(swaps\) \{\s*ownSheets\(\)\.forEach/, 'read once at load, only where swaps happen');
    const go = source.match(/function go\(href, push\) \{[^]*?\n  \}\n/)?.[0] ?? '';
    assert.match(go, /\brefreshStyles\(\);/, 'go() does not refresh the styles');
  });

  it('loads a changed sheet beside the old one, which leaves once the new one has loaded', () => {
    assert.match(source, /link\.after\(fresh\)/);
    assert.match(source, /fresh\.addEventListener\('load', function \(\) \{ link\.remove\(\); \}\)/);
  });
});

describe('showcase frame, the Product page and the stack from their template generators', () => {
  let dir;
  before(() => {
    dir = scaffold({ flow: false });
    assert.equal(run(dir, 'tools/genPages.mjs').status, 0);
  });
  after(removeTempDirs);

  it('writes the Product page over its starting page, with the catalog and the stack listed', () => {
    const result = run(dir, 'tools/genProduct.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(run(dir, 'build.mjs').status, 0);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    for (const id of ['about', 'roles', 'modules', 'loop', 'sample', 'site']) assert.match(html, new RegExp(`<article class="sc-block" id="${id}"`));
    assert.match(html, /<!-- catalog:start[^]*?href="architecture\/index\.html"/);
    assert.match(html, /<!-- children:start[^]*?<a class="card sc-tile" href="product\/stack\.html">/);
  });

  it('writes the stack page, a technology without a mark on an initials tile, and the build stays idempotent', () => {
    const result = run(dir, 'tools/genStack.mjs');
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(dir, 'product/stack.html'), 'utf8');
    assert.match(html, /<span class="tech-mark tech-mark--initials" aria-hidden="true">Ex<\/span>/);
    assert.match(html, /target="_blank" rel="noopener"><span data-i18n="ui\.officialSite">/);
    run(dir, 'build.mjs');
    assert.match(run(dir, 'build.mjs').stdout, /Navigation is up to date/);
  });
});
