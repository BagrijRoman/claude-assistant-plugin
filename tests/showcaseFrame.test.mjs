// The showcase skill ships a frame — build.mjs, genPages, the page shell — that is copied into every
// project. These tests scaffold it the way the skill does, with one flow added, then check what genPages
// and the build write: a starting page for every entry in pages.mjs that has a path; a menu whose
// foldable roots share the name that keeps one of them open at a time and no band label above them; the
// root of the page on show open, the Product root on the home page; a flow's root open with its title marked; the language switch and the
// dictionary wired in; a second build that changes nothing, and a second genPages run that writes nothing.
// A second scaffold lays the frame with no flow, as the Frame step does, and adds one later, as the
// Flows step does: the Flows index lists it after the next build, under a key of its own. The Color
// scheme step's scratch page survives a build until STATE.json records the scheme chosen, and not after.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { BANDS } from '../skills/showcase/templates/pages.mjs';
import { removeTempDirs } from './helpers.mjs';
import { FLOW, run, scaffold, withFlow } from './showcaseFixture.mjs';

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

  it('keys a flow under Flows, apart from the screens page that has the same id', () => {
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /href="flows\/signIn\.html"[^>]*><span data-i18n="nav\.flows\.signIn">Sign in<\/span>/);
    assert.match(html, /href="screens\/signIn\.html"[^>]*><span data-i18n="nav\.screens\.signIn">Sign-in layouts<\/span>/);
    assert.doesNotMatch(html, /data-i18n="nav\.screens\.signIn">Sign in</);
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
