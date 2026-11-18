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
    { id: 'direction', kind: 'directions', title: 'Direction', lead: 'Manners.', items: [
      { id: 'linework', title: 'Linework', idea: 'Outlines, three-quarter view.', selected: true, axes: { line: '2.5 outline', angle: 'three-quarter', detail: 'two faces and a shadow', accent: 'once' }, samples: [
        { id: 'brayer', kind: 'marks', file: 'direction/brayer.svg' },
        { id: 'ream', kind: 'icons', file: 'direction/ream.svg' },
        { id: 'empty', kind: 'pictures', file: 'direction/empty.svg', animated: true },
        { id: 'invitation', kind: 'letters', file: 'direction/invitation.svg', animated: true },
      ] },
      { id: 'flat', title: 'Flat', idea: 'No outlines.', samples: [
        { id: 'brayer', kind: 'marks', file: 'direction/brayer.svg' },
      ] },
    ] },
    { id: 'logo', kind: 'marks', title: 'Logo', lead: 'Marks.', items: [
      { id: 'brayer', title: 'Valley', idea: 'The ink roller and its stripe.', file: 'logo/brayer.svg', selected: true, from: 'the sites' },
    ] },
    { id: 'loaders', kind: 'loaders', title: 'Loaders', lead: 'The mark in motion.', items: [
      { id: 'brayer-roll', title: 'Rolling', mark: 'brayer', idea: 'The roller rocks and the stripe draws itself.', file: 'loaders/brayer-roll.svg', use: 'a panel loading', determinate: true },
    ] },
    { id: 'icons', kind: 'icons', title: 'Icons', lead: 'Icons.', items: [
      { id: 'ream', title: 'Ream', group: 'From the domain', file: 'icons/ream.svg', usedIn: 'the stock list' },
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
  // the direction sheet reuses the examples as its samples, under the tab's folder
  mkdirSync(join(dir, 'review', 'direction'));
  for (const [folder, file] of [['logo', 'brayer'], ['icons', 'ream'], ['states', 'empty'], ['emails', 'invitation']]) cpSync(join(TEMPLATES, 'examples', folder, `${file}.svg`), join(dir, 'review', 'direction', `${file}.svg`));
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
    assert.match(result.stdout, /Wrote review\/index\.html and review\/artifact\.html with 9 pictures/);
    const page = readFileSync(join(dir, 'review', 'index.html'), 'utf8');
    const fragment = readFileSync(join(dir, 'review', 'artifact.html'), 'utf8');
    assert.match(page, /^<!doctype html>/);
    assert.match(fragment, /^<title>Smoke illustrations<\/title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>/);
    assert.doesNotMatch(fragment, /<!doctype|<html lang|<head>|<body>/);
    // the tabs in the manifest's order, after the overview; one panel each, the overview on show
    const tabs = [...page.matchAll(/role="tab" aria-controls="([^"]+)"/g)].map(([, id]) => id);
    assert.deepEqual(tabs, ['overview', 'scheme', 'direction', 'logo', 'loaders', 'icons', 'states', 'emails']);
    assert.match(page, /<section class="panel" role="tabpanel" id="overview">/);
    assert.match(page, /<section class="panel" role="tabpanel" id="states" hidden>/);
    // every picture once as a symbol with its own prefix, its styles in the head, referenced by <use>
    for (const id of ['lg-brayer', 'ld-brayer-roll', 'ic-ream', 'ill-empty', 'ill-invitation']) {
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
    assert.match(page, /<article class="item item--selected" data-item id="logo-brayer">/);
    assert.match(page, /<span class="top__mark"><svg[^>]*><use href="#lg-brayer"\/><\/svg><\/span>/);
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
    // a direction is a sheet of its samples, each a symbol of its own, the chosen one marked, its axes listed
    assert.match(page, /<article class="direction item--selected" data-item id="direction-linework">/);
    for (const id of ['dir-brayer', 'dir-ream', 'dir-empty', 'dir-invitation']) assert.equal(page.split(`<symbol id="${id}"`).length - 1, 1, `${id} once`);
    assert.match(page, /<div class="direction__cell direction__cell--letter">.*<use href="#dir-invitation"\/>/);
    assert.match(page, /<dt>Angle<\/dt><dd>three-quarter<\/dd>/);
    // the chosen scheme marked, its sample drawn once as a symbol of its own; icons at three sizes on two grounds
    assert.match(page, /<article class="scheme scheme-slate item--selected"/);
    assert.match(page, /<symbol id="scheme-slate"/);
    assert.match(page, /<div class="icon-row icon-row--inverted"/);
    assert.match(page, /<svg class="ic ic--16"[^>]*><use href="#ic-ream"\/>/);
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
    assert.match(result.stdout, /^10 pictures checked: every file is there/m);
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
    edit(dir, 'review/logo/brayer.svg', 'fill="var(--lg-accent)"', 'fill="var(--ill-accent)"');
    edit(dir, 'review/states/empty.svg', 'fill="var(--ill-accent)"', 'fill="var(--lg-accent)"');
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/logo\/brayer\.svg:\d+ — fill="var\(--ill-accent\)" is not a token; use currentColor or a var\(--lg-…\) token$/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — fill="var\(--lg-accent\)" is not a token; use var\(--ill-…\)$/m);
  });

  it('reports a gradient, which needs an id', () => {
    const dir = set();
    edit(dir, 'review/states/empty.svg', '<ellipse cx="160" cy="196"', '<linearGradient x1="0"></linearGradient><ellipse cx="160" cy="196"');
    assert.match(run('check', dir).stdout, /^error: review\/states\/empty\.svg:\d+ — a gradient, pattern, filter, mask, clip or marker needs an id/m);
  });

  it('reports the manifest\'s faults: a missing file, two items on one id, a loader from an unknown mark, two marks selected, an id not in kebab-case', () => {
    const dir = set({ manifest: withManifest((manifest) => {
      manifest.tabs[2].items.push({ id: 'Peak', title: 'Peak', file: 'logo/peak.svg', selected: true });
      manifest.tabs[3].items[0].mark = 'river';
      manifest.tabs[5].items.push({ id: 'empty', title: 'Again', file: 'states/empty.svg' });
      manifest.tabs[1].items[1].samples = [{ id: 'Bad', kind: 'marks', file: 'direction/none.svg' }, { id: 'odd', kind: 'loaders', file: 'direction/brayer.svg' }];
    }) });
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": item id "Peak" is not kebab-case$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": item "Peak" names logo\/peak\.svg, and there is no such file$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "logo": more than one mark is selected$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — loader "brayer-roll" is drawn from the mark "river", which the logo tab does not have$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — tab "states": two items share the id "empty"$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — direction "flat": a sample's id "Bad" is not kebab-case$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — direction "flat": sample "Bad" names direction\/none\.svg, and there is no such file$/m);
    assert.match(result.stdout, /^error: review\/manifest\.json — direction "flat": sample "odd" has the kind "loaders" \(one of marks, icons, pictures, letters\)$/m);
  });

  it('checks a direction\'s samples as pictures of their kind', () => {
    const dir = set();
    edit(dir, 'review/direction/brayer.svg', 'fill="var(--lg-accent)"', 'fill="#123456"');
    assert.match(run('check', dir).stdout, /^error: review\/direction\/brayer\.svg:\d+ — the color #123456 is a raw value; draw with --lg-\* tokens$/m);
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
    assert.match(result.stderr, /not every tab is approved — scheme \(awaiting-review\), direction \(awaiting-review\), logo \(awaiting-review\), loaders \(awaiting-review\), icons \(awaiting-review\), states \(awaiting-review\), emails \(awaiting-review\)/);
    assert.ok(existsSync(join(dir, 'review', 'manifest.json')), 'nothing moved');
  });

  it('refuses a directions tab with no chosen direction', () => {
    const dir = set({ manifest: withManifest((manifest) => { delete manifest.tabs[1].items[0].selected; }) });
    assert.match(run('save', dir).stderr, /the directions tab has no chosen direction/);
  });

  it('refuses a scheme tab with no chosen scheme', () => {
    const dir = set({ manifest: withManifest((manifest) => { delete manifest.tabs[0].items[0].selected; }) });
    assert.match(run('save', dir).stderr, /the scheme tab has no selected scheme/);
  });

  it('moves the approved drafts out of review/, writes the set\'s page, manifest and sprite, and marks the state done', () => {
    const dir = set();
    const result = run('save', dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Saved 9 pictures into .*: manifest\.json, index\.html, artifact\.html, illustrations\.js written, review\/ removed, STATE\.json done/m);
    assert.ok(!existsSync(join(dir, 'review')), 'review/ is gone');
    for (const file of ['logo/brayer.svg', 'loaders/brayer-roll.svg', 'icons/ream.svg', 'states/empty.svg', 'emails/invitation.svg', 'direction/invitation.svg', 'manifest.json', 'index.html', 'artifact.html', 'illustrations.js']) {
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
    for (const id of ['lg-brayer', 'ld-brayer-roll', 'ic-ream', 'ill-empty', 'ill-invitation']) assert.ok(sprite.includes(`<symbol id=\\"${id}\\"`), `${id} in the sprite`);
    assert.match(sprite, /@keyframes empty-settle/);
    assert.match(sprite, /dev-assistant-illustrations/);
    assert.doesNotMatch(sprite, /dir-brayer/, 'a direction sheet is not part of the product\'s sprite');
    // a second save has nothing to save; check and build still work on the saved set
    assert.match(run('save', dir).stderr, /nothing to save: no review\/manifest\.json/);
    assert.equal(run('check', dir).status, 0);
    assert.match(run('build', dir).stdout, /Wrote \.\/index\.html and \.\/artifact\.html with 9 pictures/);
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

describe('illustrations.mjs motion tokens', () => {
  after(removeTempDirs);

  it('accepts a stagger delay and a spring easing, and reports a literal time and a raw easing', () => {
    const dir = set();
    const file = 'review/states/empty.svg';
    edit(dir, file, 'animation-delay: var(--ill-duration);', 'animation-delay: calc(var(--ill-stagger) * 2);');
    edit(dir, file, 'animation: empty-settle var(--ill-duration) var(--ill-ease) 1 both;', 'animation: empty-settle var(--ill-duration) var(--ill-spring-snappy) 1 both;');
    assert.equal(run('check', dir).status, 0);
    edit(dir, file, 'animation-delay: calc(var(--ill-stagger) * 2);', 'animation-delay: 120ms;');
    edit(dir, file, 'animation: empty-settle var(--ill-duration) var(--ill-spring-snappy) 1 both;', 'animation: empty-settle var(--ill-duration) cubic-bezier(0.2, 0, 0, 1) 1 both;');
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — animation-delay: 120ms — a literal time/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — animation: empty-settle var\(--ill-duration\) cubic-bezier\(0\.2, 0, 0, 1\) 1 both — a raw easing/m);
  });

  it('loops a one-time gesture on a period of --ill-duration-short and keeps a spring easing', () => {
    const dir = set();
    const file = 'review/states/empty.svg';
    edit(dir, file, 'animation: empty-settle var(--ill-duration) var(--ill-ease) 1 both;', 'animation: empty-settle var(--ill-duration) var(--ill-spring-smooth) 1 both;');
    const result = run('loop', dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /looped states\/empty\.svg/);
    const text = readFileSync(join(dir, file), 'utf8');
    assert.match(text, /animation: empty-settle-loop calc\(var\(--ill-duration-short\) \* \d+\) var\(--ill-spring-smooth\) infinite both/);
    assert.match(text, /@keyframes empty-settle-loop \{ 0% \{ transform: translateY\(0\) rotate\(0deg\); \}/);
    assert.equal(run('check', dir).status, 0);
    assert.match(run('loop', dir).stdout, /^0 pictures made cyclic/m);
  });

  it('prints a spring curve and writes it into tokens.css under @supports, with the fallback on :root', () => {
    const dir = set();
    const printed = run('spring', dir, '--bounce', '0.3');
    assert.equal(printed.status, 0, printed.stderr);
    const values = printed.stdout.match(/[\d.]+/g).map(Number);
    assert.equal(values[0], 0);
    assert.equal(values[values.length - 1], 1);
    assert.ok(Math.max(...values) > 1.02, 'a bounce of 0.3 overshoots');
    const smooth = run('spring', dir, '--bounce', '0').stdout.match(/[\d.]+/g).map(Number);
    assert.ok(Math.max(...smooth) <= 1, 'no bounce, no overshoot');
    const written = run('spring', dir, '--bounce', '0.3', '--name', 'lively');
    assert.match(written.stdout, /Wrote --ill-spring-lively \(bounce 0\.3\)/);
    const css = readFileSync(join(dir, 'tokens.css'), 'utf8');
    assert.match(css, /@supports \(animation-timing-function: linear\(0, 1\)\) \{\s*:root \{[^}]*--ill-spring-smooth: linear\([^}]*--ill-spring-lively: linear\(/);
    assert.match(css, /--ill-spring-lively: var\(--ill-ease\);/);
    assert.equal(run('check', dir).status, 0, 'the dark sets still agree');
    run('spring', dir, '--bounce', '0.1', '--name', 'lively');
    assert.equal((readFileSync(join(dir, 'tokens.css'), 'utf8').match(/--ill-spring-lively:/g) ?? []).length, 2, 'rewritten in place, not added again');
    assert.equal(run('spring', dir, '--bounce', '1').status, 1);
  });
});

describe('illustrations.mjs motion rules and where motion runs', () => {
  after(removeTempDirs);

  it('reports a keyframe on fill, a last frame on opacity 0, ease-in, a delay past one gesture, and warns past 30 animated nodes', () => {
    const dir = set();
    const file = 'review/states/empty.svg';
    edit(dir, file, '@keyframes empty-glint { 0% { opacity: 0; } 100% { opacity: 1; } }', '@keyframes empty-glint { 0% { opacity: 0; fill: var(--ill-accent); } 100% { opacity: 0; } }');
    edit(dir, file, 'animation: empty-settle var(--ill-duration) var(--ill-ease) 1 both;', 'animation: empty-settle var(--ill-duration) ease-in 1 both;');
    edit(dir, file, 'animation-delay: var(--ill-duration);', 'animation-delay: calc(var(--ill-duration) * 2);');
    edit(dir, file, '<circle class="empty__glint" cx="116"', '<circle class="empty__lid" cx="1" cy="1" r="1" fill="var(--ill-soft)"/>'.repeat(31) + '<circle class="empty__glint" cx="116"');
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — @keyframes empty-glint animates fill; a picture animates only transform, opacity, stroke-dashoffset/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — @keyframes empty-glint ends on opacity: 0/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — \.empty__lid: ease-in/m);
    assert.match(result.stdout, /^error: review\/states\/empty\.svg:\d+ — \.empty__glint: a delay of 1200 ms is longer than a gesture \(--ill-duration, 600 ms\)/m);
    assert.match(result.stdout, /^warning: review\/states\/empty\.svg — \d+ animated nodes — more than 30/m);
  });

  it('writes a reduced-motion block into every animated picture at the save, and the sprite protects and pauses its symbols', () => {
    const dir = set();
    assert.equal(run('save', dir).status, 0);
    const picture = readFileSync(join(dir, 'states', 'empty.svg'), 'utf8');
    assert.match(picture, /@media \(prefers-reduced-motion: reduce\) \{ \.empty__lid, \.empty__leaf, \.empty__glint \{ animation-duration: 0\.01ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; \} \}/);
    assert.equal((picture.match(/prefers-reduced-motion/g) ?? []).length, 1);
    assert.doesNotMatch(readFileSync(join(dir, 'icons', 'ream.svg'), 'utf8'), /prefers-reduced-motion/, 'a still picture gets no block');
    assert.equal(run('check', dir).status, 0, 'the block passes the checks');
    const sprite = readFileSync(join(dir, 'illustrations.js'), 'utf8');
    assert.match(sprite, /id=\\"dev-assistant-illustrations-sprite\\"/);
    assert.match(sprite, /@media \(prefers-reduced-motion: reduce\) \{ #dev-assistant-illustrations-sprite \* \{ animation-duration: 0\.01ms !important/);
    assert.match(sprite, /html\.ill-paused #dev-assistant-illustrations-sprite \* \{ animation-play-state: paused !important; \}/);
    assert.match(sprite, /visibilitychange/);
    assert.match(sprite, /IntersectionObserver/);
  });

  it('gives the page a speed switch and a pause in a background tab', () => {
    const dir = set();
    assert.equal(run('build', dir).status, 0);
    const page = readFileSync(join(dir, 'review', 'index.html'), 'utf8');
    assert.match(page, /<div class="segmented" role="group" aria-label="Speed"><button type="button" class="segmented__item" data-speed-set="1" aria-pressed="true">1×<\/button><button type="button" class="segmented__item" data-speed-set="0.25" aria-pressed="false">¼×<\/button><\/div>/);
    assert.match(page, /html\.is-hidden svg \* \{ animation-play-state: paused !important; \}/);
    assert.match(page, /data-speed-set/);
    assert.match(page, /visibilitychange/);
  });
});

describe('illustrations.mjs graphics in numbers', () => {
  after(removeTempDirs);

  it('measures the contrast of the tokens in both themes and refuses an accent that fades into its ground', () => {
    const dir = set();
    assert.equal(run('check', dir).status, 0, 'the template reads apart');
    const css = readFileSync(join(dir, 'tokens.css'), 'utf8');
    // the accent of the light theme turned pale; the dark sets left alone, so only one theme fails
    writeFileSync(join(dir, 'tokens.css'), css.replace('--ill-accent: #3b5bdb;', '--ill-accent: #dfe3f5;'));
    const result = run('check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --ill-accent #dfe3f5 on --ill-fill #ffffff is 1\.2\d:1 in the light theme — below 3:1 \(WCAG 1\.4\.11\)/m);
    assert.match(result.stdout, /--ill-accent #dfe3f5 on --ill-ground #eef0f6 is 1\.\d+:1 in the light theme/);
    assert.doesNotMatch(result.stdout, /in the dark theme/);
    // the mark's accent on its ground, through var(--color-surface), in the dark theme (both dark sets changed)
    writeFileSync(join(dir, 'tokens.css'), css.replaceAll('--lg-accent: #8da2f2;', '--lg-accent: #202228;'));
    assert.match(run('check', dir).stdout, /^error: tokens\.css:\d+ — --lg-accent #202228 on --lg-ground #17181d is 1\.\d+:1 in the dark theme/m);
  });

  it('warns past 20 shapes in a picture, and says nothing of a mark', () => {
    const dir = set();
    edit(dir, 'review/states/empty.svg', '<circle class="empty__glint" cx="116"', '<circle cx="1" cy="1" r="1" fill="var(--ill-soft)"/>'.repeat(12) + '<circle class="empty__glint" cx="116"');
    const result = run('check', dir);
    assert.equal(result.status, 0, 'a warning only');
    assert.match(result.stdout, /^warning: review\/states\/empty\.svg — 2\d shapes — more than 20; a spot carries about 8 parts, a scene about 14/m);
    assert.doesNotMatch(result.stdout, /logo\/brayer\.svg — \d+ shapes/);
  });

  it('ships examples that pass every check, with the deep face and no stock image', () => {
    const dir = set();
    const result = run('check', dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /read apart\.$/m);
    const empty = readFileSync(join(dir, 'review', 'states', 'empty.svg'), 'utf8');
    assert.match(empty, /var\(--ill-deep\)/);
    assert.match(empty, /press bed/, 'the product\'s own object, named in the comment');
    const mark = readFileSync(join(dir, 'review', 'logo', 'brayer.svg'), 'utf8');
    assert.match(mark, /class="brayer__roller"/);
  });
});
