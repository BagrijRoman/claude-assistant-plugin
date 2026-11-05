// bin/illustrations.mjs builds the review page of an illustration set, checks the drafts, saves the approved set and
// writes its sprite. These tests lay a set the way the skill does — the templates' tokens and STATE.json, the four
// example pictures under review/ with a manifest naming them — and check the clean set builds and passes; then they
// break it once per check and look for each finding where it is; then they save it and read what the save wrote.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs } from './helpers.mjs';

const SCRIPT = fileURLToPath(new URL('../bin/illustrations.mjs', import.meta.url));
const TEMPLATES = fileURLToPath(new URL('../skills/illustrations/templates/', import.meta.url));

const MANIFEST = {
  kind: 'illustrations-manifest',
  project: 'Smoke',
  tagline: 'A product under test.',
  wordmark: 'Smoke',
  tabs: [
    { id: 'scheme', kind: 'scheme', title: 'Color scheme', lead: 'Schemes.', items: [
      { id: 'slate', title: 'Slate', idea: 'Quiet.', selected: true, light: { '--color-primary': '#334455', '--ill-accent': '#334455' }, dark: { '--color-primary': '#aabbcc', '--ill-accent': '#aabbcc' }, sample: 'states/empty.svg' },
      { id: 'moss', title: 'Moss', idea: 'Green.', light: { '--color-primary': '#225533' }, dark: { '--color-primary': '#88cc99' } },
    ] },
    { id: 'logo', kind: 'marks', title: 'Logo', lead: 'Marks.', items: [
      { id: 'valley', title: 'Valley', idea: 'Two ridges and a sun.', file: 'logo/valley.svg', selected: true, from: 'the sites' },
    ] },
    { id: 'loaders', kind: 'loaders', title: 'Loaders', lead: 'The mark in motion.', items: [
      { id: 'valley-turn', title: 'Sunrise', mark: 'valley', idea: 'The sun travels its arc.', file: 'loaders/valley-turn.svg', use: 'a panel loading', determinate: true },
    ] },
    { id: 'icons', kind: 'icons', title: 'Icons', lead: 'Icons.', items: [
      { id: 'site', title: 'Site', group: 'From the domain', file: 'icons/site.svg', usedIn: 'the sites list' },
    ] },
    { id: 'states', kind: 'pictures', title: 'States', lead: 'Pictures.', items: [
      { id: 'empty', title: 'Nothing here yet', group: 'Empty', idea: 'A tray whose lid settles.', file: 'states/empty.svg', animated: true, usedIn: 'every list', words: { heading: 'No sites yet', message: 'Add the first one.', action: 'Add a site' } },
    ] },
    { id: 'emails', kind: 'letters', title: 'Email templates', lead: 'Letters.', template: { sender: 'Smoke <hello@smoke.example>', footer: 'Why you got this.' }, items: [
      { id: 'invitation', title: 'Invitation', group: 'Common letters', moment: 'when a colleague is invited', subject: 'You are invited', to: 'taras@example.com', heading: 'Welcome', message: 'Accept to set your password.', action: 'Accept', detail: 'Valid 7 days.', file: 'emails/invitation.svg', animated: true },
    ] },
  ],
};

const run = (command, dir, ...rest) => {
  const result = spawnSync('node', [SCRIPT, command, dir, ...rest], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/** The set after the Logo step has drawn: the four examples as drafts under review/, every step but save approved. */
const set = ({ approved = true, manifest = MANIFEST } = {}) => {
  const dir = makeTempDir();
  cpSync(join(TEMPLATES, 'tokens.css'), join(dir, 'tokens.css'));
  const state = JSON.parse(readFileSync(join(TEMPLATES, 'STATE.json'), 'utf8').replaceAll('{{NAME}}', 'Smoke').replaceAll('{{YYYY-MM-DD}}', '2026-11-05'));
  for (const key of Object.keys(state.steps)) state.steps[key] = key === 'save' ? 'pending' : (approved ? 'approved' : 'awaiting-review');
  state.step = approved ? 'save' : 'logo';
  writeFileSync(join(dir, 'STATE.json'), JSON.stringify(state, null, 2));
  mkdirSync(join(dir, 'review'));
  for (const folder of ['logo', 'loaders', 'icons', 'states', 'emails']) cpSync(join(TEMPLATES, 'examples', folder), join(dir, 'review', folder), { recursive: true });
  writeFileSync(join(dir, 'review', 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
};

const edit = (dir, file, from, to) => {
  const text = readFileSync(join(dir, file), 'utf8');
  assert.ok(text.includes(from), `${file} does not contain ${from}`);
  writeFileSync(join(dir, file), text.replace(from, to));
};

const withManifest = (change) => {
  const manifest = structuredClone(MANIFEST);
  change(manifest);
  return manifest;
};

describe('illustrations.mjs build', () => {
  after(removeTempDirs);

  it('writes the review page and the artifact fragment from the drafts', () => {
    const dir = set();
    const result = run('build', dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Wrote review\/index\.html and review\/artifact\.html with 5 pictures/);
    const page = readFileSync(join(dir, 'review', 'index.html'), 'utf8');
    const fragment = readFileSync(join(dir, 'review', 'artifact.html'), 'utf8');
    assert.match(page, /^<!doctype html>/);
    assert.match(fragment, /^<title>Smoke illustrations<\/title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>/);
    assert.doesNotMatch(fragment, /<!doctype|<html lang|<head>|<body>/);
    // the tabs in the manifest's order, after the overview; one panel each, the overview on show
    const tabs = [...page.matchAll(/role="tab" aria-controls="([^"]+)"/g)].map(([, id]) => id);
    assert.deepEqual(tabs, ['overview', 'scheme', 'logo', 'loaders', 'icons', 'states', 'emails']);
    assert.match(page, /<section class="panel" role="tabpanel" id="overview">/);
    assert.match(page, /<section class="panel" role="tabpanel" id="states" hidden>/);
    // every picture once as a symbol with its own prefix, its styles in the head, referenced by <use>
    for (const id of ['lg-valley', 'ld-valley-turn', 'ic-site', 'ill-empty', 'ill-invitation']) {
      assert.equal(page.split(`<symbol id="${id}"`).length - 1, 1, `${id} should be one symbol`);
      assert.ok(page.includes(`<use href="#${id}"/>`), `${id} should be used`);
    }
    assert.match(page, /@keyframes empty-settle/);
    assert.equal(page.split('@keyframes empty-settle').length - 1, 1, 'a picture\'s styles are in the page once');
    assert.doesNotMatch(page.slice(page.indexOf('<symbol')), /<style>/, 'no <style> inside a symbol');
    // the two dark sets of the tokens, the body on a token background
    assert.match(page, /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\)/);
    assert.match(page, /:root\[data-theme='dark'\]/);
    assert.match(page, /body \{[^}]*background: var\(--color-page\)/);
    // marks on three grounds and at five sizes with the wordmark; the selected one marked; the mark in the top bar
    assert.match(page, /<div class="ground ground--inverted">/);
    assert.match(page, /style="width:16px;height:16px"/);
    assert.match(page, /<span class="wordmark">.*Smoke<\/span>/);
    assert.match(page, /<article class="item item--selected" data-item id="logo-valley">/);
    assert.match(page, /<span class="top__mark"><svg[^>]*><use href="#lg-valley"\/><\/svg><\/span>/);
    // loaders at three sizes, animated, with the determinate row and the three in-place samples
    assert.match(page, /<svg class="ld ld--sm"[^>]*data-animated/);
    assert.match(page, /--progress:0\.66/);
    assert.match(page, /The application starting/);
    // a picture with its words in place and a replay; a letter with its parts named once and its words
    assert.match(page, /<p class="sample__heading">No sites yet<\/p>/);
    assert.match(page, /data-replay>Replay</);
    assert.match(page, /class="mail mail--anatomy"/);
    assert.match(page, /data-part="picture"/);
    assert.match(page, /<strong>You are invited<\/strong><br>Smoke &lt;hello@smoke\.example&gt; → taras@example\.com/);
    assert.match(page, /<div class="mail__detail">Valid 7 days\.<\/div>/);
    // the id chips carry tab/id for a revision
    assert.match(page, /data-copy="states\/empty"/);
    // the schemes' values on their strips and, when the viewer tries one, on the whole page; the switch in the top bar
    assert.match(page, /\.scheme-moss, html\.use-scheme-moss \{ --color-primary: #225533; \}/);
    assert.match(page, /html\[data-theme='dark'\]\.use-scheme-moss \{ --color-primary: #88cc99; \}/);
    assert.match(page, /<div class="wrap" data-scheme-chosen="slate">/);
    assert.match(page, /data-scheme-switch>.*data-scheme-use="slate" aria-pressed="true".*data-scheme-use="moss" aria-pressed="false"/);
    assert.match(page, /data-scheme-use="moss" aria-pressed="false">Try it on every picture</);
    // the chosen scheme marked, its sample drawn once as a symbol of its own; icons at three sizes on two grounds
    assert.match(page, /<article class="scheme scheme-slate item--selected"/);
    assert.match(page, /<symbol id="scheme-slate"/);
    assert.match(page, /<div class="icon-row icon-row--inverted"/);
    assert.match(page, /<svg class="ic ic--16"[^>]*><use href="#ic-site"\/>/);
  });

  it('shows the scheme proposals on their own values, with a sample picture', () => {
    const dir = set({ manifest: withManifest((manifest) => {
      manifest.tabs = [{ id: 'scheme', kind: 'scheme', title: 'Color scheme', items: [
        { id: 'a', title: 'Slate', idea: 'Quiet.', light: { '--color-primary': '#334455', '--ill-accent': '#334455' }, dark: { '--color-primary': '#aabbcc', '--ill-accent': '#aabbcc' }, sample: 'states/empty.svg' },
        { id: 'b', title: 'Moss', idea: 'Green.', light: { '--color-primary': '#225533' }, dark: { '--color-primary': '#88cc99' } },
      ] }];
    }) });
    const result = run('build', dir);
    assert.equal(result.status, 0, result.stderr);
    const page = readFileSync(join(dir, 'review', 'index.html'), 'utf8');
    assert.match(page, /\.scheme-a, html\.use-scheme-a \{ --color-primary: #334455; --ill-accent: #334455; \}/);
    assert.match(page, /:root\[data-theme='dark'\] \.scheme-b, html\[data-theme='dark'\]\.use-scheme-b \{ --color-primary: #88cc99; \}/);
    assert.match(page, /<symbol id="scheme-a"/);
    assert.match(page, /<use href="#scheme-a"\/>/);
  });

  it('stops on a file the manifest names that is not an SVG', () => {
    const dir = set();
    writeFileSync(join(dir, 'review', 'states', 'empty.svg'), 'not a drawing');
    const result = run('build', dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /review\/states\/empty\.svg: not an SVG file/);
  });
});

describe('illustrations.mjs check', () => {
  after(removeTempDirs);

  it('passes the four example pictures', () => {
    const result = run('check', set());
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^5 pictures checked: every file is there/m);
  });

  it('reports a raw color, a raw duration, a text, an id and a class or keyframe not the picture\'s own', () => {
    const dir = set();
    const file = 'review/states/empty.svg';
    edit(dir, file, 'fill="var(--ill-ground)"', 'fill="#abcdef"');
    edit(dir, file, 'fill="var(--ill-muted)"', 'fill="rgb(1 2 3)"');
    edit(dir, file, 'animation: empty-glint var(--ill-duration-short)', 'animation: empty-glint 600ms');
    edit(dir, file, '<circle class="empty__glint" cx="116"', '<text x="1" y="1">words</text><circle id="dot" class="other" cx="116"');
    edit(dir, file, '@keyframes empty-drift', '@keyframes drift');
    edit(dir, file, '.empty__leaf {', '.leaf {');
    const result = run('check', dir);
    assert.equal(result.status, 1);
    const errors = result.stdout.split('\n').filter((line) => line.startsWith('error:'));
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — the color #abcdef is a raw value; draw with --ill-\* tokens$/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — a raw color function/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — animation: empty-glint 600ms.*must be a token/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — a <text> element/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — id="dot": no id inside a picture/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — class "other" does not start with the picture's id "empty"/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — @keyframes drift does not start with the picture's id "empty"$/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — selector \.leaf does not start with the picture's id "empty"$/m);
    assert.ok(errors.length >= 8, errors.join('\n'));
  });

  it('holds a mark to currentColor and the --lg-* tokens, and a picture to the --ill-* tokens', () => {
    const dir = set();
    edit(dir, 'review/logo/valley.svg', 'fill="var(--lg-accent)"', 'fill="var(--ill-accent)"');
    edit(dir, 'review/states/empty.svg', 'fill="var(--ill-accent)"', 'fill="var(--lg-accent)"');
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/logo\/valley\.svg:\d+ — fill="var\(--ill-accent\)" is not a token; use currentColor or a var\(--lg-…\) token$/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — fill="var\(--lg-accent\)" is not a token; use var\(--ill-…\)$/m);
  });

  it('reports a gradient, which needs an id', () => {
    const dir = set();
    edit(dir, 'review/states/empty.svg', '<ellipse cx="160" cy="196"', '<linearGradient x1="0"></linearGradient><ellipse cx="160" cy="196"');
    assert.match(run('check', dir).stdout, /^error: review\/states\/empty\.svg:\d+ — a gradient, pattern, filter, mask, clip or marker needs an id/m);
  });

  it('reports the manifest\'s faults: a missing file, two items on one id, a loader from an unknown mark, two marks selected, an id not in kebab-case', () => {
    const dir = set({ manifest: withManifest((manifest) => {
      manifest.tabs[1].items.push({ id: 'Peak', title: 'Peak', file: 'logo/peak.svg', selected: true });
      manifest.tabs[2].items[0].mark = 'river';
      manifest.tabs[4].items.push({ id: 'empty', title: 'Again', file: 'states/empty.svg' });
    }) });
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": item id "Peak" is not kebab-case$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": item "Peak" names logo\/peak\.svg, and there is no such file$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": more than one mark is selected$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — loader "valley-turn" is drawn from the mark "river", which the logo tab does not have$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "states": two items share the id "empty"$/m);
  });

  it('reports dark sets that disagree, in either direction, and a dark value with no light one', () => {
    const dir = set();
    const text = readFileSync(join(dir, 'tokens.css'), 'utf8');
    const chosen = text.indexOf(":root[data-theme='dark']");
    const after = text.slice(chosen).replace('--ill-accent: #8da2f2;', '--ill-accent: #ff0000;').replace(/\n\s*--ill-ground: [^;]+;/, '').replace('--lg-accent: #8da2f2;', '--lg-accent: #8da2f2;\n  --ill-extra: #000000;');
    writeFileSync(join(dir, 'tokens.css'), text.slice(0, chosen) + after);
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --ill-accent is #ff0000 under \[data-theme='dark'\] but #8da2f2 in the media-query set$/m);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --ill-ground is in the media-query dark set but not under \[data-theme='dark'\]$/m);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --ill-extra is under \[data-theme='dark'\] but not in the media-query dark set$/m);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --ill-extra has a dark value but no light one on :root$/m);
  });

  it('stops on a folder that is not an illustration set, and rejects a bad command line', () => {
    const dir = set();
    writeFileSync(join(dir, 'STATE.json'), JSON.stringify({ kind: 'showcase' }));
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not an illustration set's: kind "showcase"/);
    assert.equal(run('audit', dir).status, 2);
    assert.equal(spawnSync('node', [SCRIPT, 'check']).status, 2);
    assert.equal(run('sprite', dir, '--bogus').status, 2);
  });
});

describe('illustrations.mjs save and sprite', () => {
  after(removeTempDirs);

  it('refuses while a tab is not approved, naming it', () => {
    const dir = set({ approved: false });
    const result = run('save', dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not every tab is approved — scheme \(awaiting-review\), logo \(awaiting-review\), loaders \(awaiting-review\), icons \(awaiting-review\), states \(awaiting-review\), emails \(awaiting-review\)/);
    assert.ok(existsSync(join(dir, 'review', 'manifest.json')), 'nothing moved');
  });

  it('refuses a scheme tab with no chosen scheme', () => {
    const dir = set({ manifest: withManifest((manifest) => { delete manifest.tabs[0].items[0].selected; }) });
    assert.match(run('save', dir).stderr, /the scheme tab has no selected scheme/);
  });

  it('moves the approved drafts out of review/, writes the set\'s page, manifest and sprite, and marks the state done', () => {
    const dir = set();
    const result = run('save', dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Saved 5 pictures into .*: manifest\.json, index\.html, artifact\.html, illustrations\.js written, review\/ removed, STATE\.json done/m);
    assert.ok(!existsSync(join(dir, 'review')), 'review/ is gone');
    for (const file of ['logo/valley.svg', 'loaders/valley-turn.svg', 'icons/site.svg', 'states/empty.svg', 'emails/invitation.svg', 'manifest.json', 'index.html', 'artifact.html', 'illustrations.js']) {
      assert.ok(existsSync(join(dir, file)), `missing ${file}`);
    }
    const state = JSON.parse(readFileSync(join(dir, 'STATE.json'), 'utf8'));
    assert.equal(state.step, 'done');
    assert.equal(state.steps.save, 'done');
    assert.match(state.saved, /^\d{4}-\d{2}-\d{2}$/);
    const page = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(page, /This is the saved set\./);
    assert.match(page, /The saved set/);
    const sprite = readFileSync(join(dir, 'illustrations.js'), 'utf8');
    for (const id of ['lg-valley', 'ld-valley-turn', 'ic-site', 'ill-empty', 'ill-invitation']) assert.ok(sprite.includes(`<symbol id=\\"${id}\\"`), `${id} in the sprite`);
    assert.match(sprite, /@keyframes empty-settle/);
    assert.match(sprite, /dev-assistant-illustrations/);
    // a second save has nothing to save; check and build still work on the saved set
    assert.match(run('save', dir).stderr, /nothing to save: no review\/manifest\.json/);
    assert.equal(run('check', dir).status, 0);
    assert.match(run('build', dir).stdout, /Wrote \.\/index\.html and \.\/artifact\.html with 5 pictures/);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /<symbol id="scheme-slate"/, 'the chosen scheme keeps its sample after the save');
  });

  it('writes the sprite where it is told, from the drafts while a review is on', () => {
    const dir = set({ approved: false });
    const out = join(dir, 'out', 'pictures.js');
    const result = run('sprite', dir, '--out', out);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Wrote .*pictures\.js with 5 symbols \(from the drafts in review\/\)/);
    const sprite = readFileSync(out, 'utf8');
    assert.ok(sprite.includes('<symbol id=\\"ill-empty\\" viewBox=\\"0 0 320 240\\">'));
    assert.doesNotMatch(sprite, /<style>/);
    rmSync(out);
  });
});
