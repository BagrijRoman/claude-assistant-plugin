// bin/showcase.mjs runs the mechanical checks of the /showcase audit. These tests lay the frame the way the skill
// does (tests/showcaseFixture.mjs), give it every starting page and a complete second dictionary, and check that
// the clean site passes; then they break it once per check — a page gone, a build that keeps rewriting, a raw
// color, font or radius, dark sets that disagree, a key missing from a dictionary, a dictionary missing — and
// check that each is reported where it is.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { removeTempDirs } from './helpers.mjs';
import { TEMPLATES, fill, run, scaffold } from './showcaseFixture.mjs';

const SCRIPT = fileURLToPath(new URL('../bin/showcase.mjs', import.meta.url));

const htmlFiles = (dir, rel = '') => readdirSync(join(dir, rel)).flatMap((name) => {
  const path = rel ? `${rel}/${name}` : name;
  if (statSync(join(dir, path)).isDirectory()) return htmlFiles(dir, path);
  return path.endsWith('.html') ? [path] : [];
});

/** The site after the Frame step: every starting page, the navigation built, STATE.json, and uk.js holding every key. */
const site = () => {
  const dir = scaffold();
  cpSync(join(TEMPLATES, 'STATE.json'), join(dir, 'STATE.json'));
  assert.equal(run(dir, 'tools/genPages.mjs').status, 0);
  assert.equal(run(dir, 'build.mjs').status, 0);
  const template = readFileSync(join(TEMPLATES, 'i18n', 'lang.js'), 'utf8');
  const keys = new Set(htmlFiles(dir).flatMap((file) => [...readFileSync(join(dir, file), 'utf8').matchAll(/data-i18n="([^"]+)"/g)].map(([, key]) => key)));
  const missing = [...keys].filter((key) => !template.includes(`'${key}':`)).sort();
  writeFileSync(join(dir, 'i18n', 'uk.js'), fill(template, {
    LANG: 'uk', LANGUAGE_NAME: 'Ukrainian', NAV_KEYS: missing.map((key) => `  '${key}': 'переклад',`).join('\n'),
  }));
  return dir;
};

const check = (dir) => {
  const result = spawnSync('node', [SCRIPT, 'check', dir], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

const edit = (dir, file, from, to) => {
  const text = readFileSync(join(dir, file), 'utf8');
  assert.ok(text.includes(from), `${file} does not contain ${from}`);
  writeFileSync(join(dir, file), text.replace(from, to));
};

describe('showcase.mjs check', () => {
  after(removeTempDirs);

  it('passes the site the Frame step lays', () => {
    const result = check(site());
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim().split('\n').pop(), 'Every page exists, the build is idempotent, no value sits outside the tokens, the dark sets agree and every key is translated.');
  });

  it('reports a page pages.mjs names that is not there', () => {
    const dir = site();
    rmSync(join(dir, 'icons/index.html'));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: icons\/index\.html — pages\.mjs gives page "icons" this path, and there is no such file/m);
  });

  it('reports a raw color, a raw font and a radius in px on a page, and lets anchors, entities and marked lines pass', () => {
    const dir = site();
    appendFileSync(join(dir, 'components/index.html'), [
      '<a href="#add">add</a> <span>&#123;</span> <svg><rect fill="url(#bad)"/></svg>',
      '<div style="color: #ff0000">red</div>',
      '<div style="background: #abc">grey</div> <!-- allow-hex -->',
      '<p style="font-family: Arial">text</p>',
      '<div style="border-radius: 6px">box</div>',
      '',
    ].join('\n'));
    appendFileSync(join(dir, 'components.css'), '.x { color: #0a0a0a; font-family: var(--font-sans); }\n');
    const result = check(dir);
    assert.equal(result.status, 1);
    const errors = result.stdout.split('\n').filter((line) => line.startsWith('error:'));
    assert.equal(errors.length, 4, errors.join('\n'));
    assert.match(result.stdout, /^error: components\/index\.html:\d+ — the color #ff0000 is a raw value/m);
    assert.match(result.stdout, /^error: components\/index\.html:\d+ — font-family: Arial is a raw value/m);
    assert.match(result.stdout, /^error: components\/index\.html:\d+ — border-radius: 6px is a raw value/m);
    assert.match(result.stdout, /^error: components\.css:\d+ — the color #0a0a0a is a raw value/m);
  });

  it('reports dark sets that disagree, in either direction', () => {
    const dir = site();
    const text = readFileSync(join(dir, 'tokens.css'), 'utf8');
    const chosen = text.indexOf(":root[data-theme='dark']");
    const after = text.slice(chosen).replace('--color-danger: #f87171;', '--color-danger: #ff0000;').replace(/\n\s*--color-muted: [^;]+;/, '');
    writeFileSync(join(dir, 'tokens.css'), text.slice(0, chosen) + after);
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --color-danger is #ff0000 under \[data-theme='dark'\] but #f87171 in the media-query set$/m);
    assert.match(result.stdout, /^error: tokens\.css:\d+ — --color-muted is in the media-query dark set but not under \[data-theme='dark'\]$/m);
  });

  it('reports a key a page uses that a dictionary lacks, and warns of one nothing uses', () => {
    const dir = site();
    edit(dir, 'i18n/uk.js', "  'nav.icons': 'переклад',\n", '');
    edit(dir, 'i18n/uk.js', "  'ui.allPages':", "  'old.unused': 'стара',\n  'ui.allPages':");
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^error: i18n\/uk\.js — no "nav\.icons", which [\w/.]+\.html:\d+ uses$/m);
    assert.match(result.stdout, /^warning: i18n\/uk\.js:\d+ — "old\.unused" is used by no page or script/m);
  });

  it('reports a language without a dictionary', () => {
    const dir = site();
    rmSync(join(dir, 'i18n', 'uk.js'));
    assert.match(check(dir).stdout, /^error: i18n\/uk\.js — site\.mjs lists uk, and there is no dictionary for it$/m);
  });

  it('reports a build that rewrites the navigation every time', () => {
    const dir = site();
    appendFileSync(join(dir, 'build.mjs'), "\nconsole.log('Navigation rewritten in 1 of 1 pages: index.html');\n");
    edit(dir, 'build.mjs', '? `Navigation is up to date', '? `Navigation is current');
    assert.match(check(dir).stdout, /^error: build\.mjs — a second run still rewrites/m);
  });

  it('stops on a folder that is not a showcase, and rejects a bad command line', () => {
    const dir = site();
    writeFileSync(join(dir, 'STATE.json'), JSON.stringify({ kind: 'backlog' }));
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not a showcase's: kind "backlog"/);
    assert.equal(spawnSync('node', [SCRIPT, 'audit', dir]).status, 2);
    assert.equal(spawnSync('node', [SCRIPT, 'check']).status, 2);
  });
});
