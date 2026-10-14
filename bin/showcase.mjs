#!/usr/bin/env node
// showcase — the mechanical checks of the /showcase audit, done by code the same way every time, so that the model
// reads one list of findings instead of grepping the site and comparing dictionaries by eye.
//
//   node bin/showcase.mjs check <dir>
//
// <dir> is the showcase folder, whose STATE.json has kind "showcase"; the command stops (exit 1) when that file is
// missing, does not parse or belongs to something else.
// - check runs the rows of site.md › Audit that need no eyes:
//   - every page pages.mjs gives a path (a root's children included) is a file;
//   - the build is idempotent: `node build.mjs` twice, and the second run reports the navigation up to date (the
//     first may rewrite it, as the gate's build would);
//   - no value outside the tokens: a hex color in a .css, .html or .js file other than tokens.css (an anchor,
//     an entity, a url(#…) reference and a line marked `allow-hex` are not colors), a `font-family:` that is not
//     a `var(--font…)`, a border radius in px in a page;
//   - the two dark sets of tokens.css — under `prefers-color-scheme: dark` and under `[data-theme='dark']` —
//     declare the same tokens with the same values;
//   - every language of site.mjs but the default has a dictionary in i18n/, and every `data-i18n` and
//     `data-i18n-attr` key of every page is in it; a dictionary key that no page, script or generator names is a
//     warning.
//   It prints errors and warnings, one per line — `error: <file>:<line> — <what>` — and exits 1 on an error.
// Usage errors exit 2.

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = `Usage: node bin/showcase.mjs <command> <dir>
  check <dir>   the mechanical checks of the audit: pages, build, values outside the tokens, dark sets, dictionaries
`;

const COMMANDS = ['check'];
// Folders of the showcase that hold no page or style of its own
const SKIPPED = new Set(['node_modules', 'screenshots', 'plans']);
const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const NOT_A_COLOR = /(?:href|xlink:href)="#[^"]*"|url\(#[^)]*\)/g;
const DICTIONARY_KEY = /^\s*(['"])([^'"\n]+)\1\s*:/gm;

const print = (text) => process.stdout.write(`${text}\n`);

const fail = (message) => {
  process.stderr.write(`[dev-assistant] showcase: ${message}\n`);
  process.exit(1);
};

const usage = (message) => {
  process.stderr.write(`[dev-assistant] showcase: ${message}\n${USAGE}`);
  process.exit(2);
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const statOf = (path) => {
  try { return statSync(path); } catch { return null; }
};

const read = (path) => {
  try { return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n'); } catch { return ''; }
};

/** Files under `root`, relative with forward slashes; dot-names and SKIPPED folders are left out. */
const walk = (root, rel = '') => {
  let names = [];
  try { names = readdirSync(join(root, rel)).sort(); } catch { return []; }
  return names.flatMap((name) => {
    const path = rel ? `${rel}/${name}` : name;
    if (name.startsWith('.') || SKIPPED.has(path)) return [];
    return statOf(join(root, path))?.isDirectory() ? walk(root, path) : [path];
  });
};

const loadState = (dir) => {
  const path = join(dir, 'STATE.json');
  if (!statOf(path)?.isFile()) fail(`${path} not found. Pass the showcase folder.`);
  let state;
  try { state = JSON.parse(read(path)); } catch (error) { fail(`${path} does not parse (${error.message})`); }
  if (state?.kind !== 'showcase') fail(`${path} is not a showcase's: kind ${JSON.stringify(state?.kind ?? null)}`);
  return state;
};

const finding = (level) => (file, line, what) => ({ level, text: `${level}: ${line ? `${file}:${line}` : file} — ${what}` });
const error = finding('error');
const warning = finding('warning');

// --- the checks

const checkPages = async (dir) => {
  let bands;
  try {
    ({ BANDS: bands } = await import(pathToFileURL(join(dir, 'pages.mjs')).href));
  } catch (problem) {
    return [error('pages.mjs', 0, `does not load: ${problem.message}`)];
  }
  const pages = (bands ?? []).flatMap((band) => (band.pages ?? []).flatMap((page) => [page, ...(page.children ?? [])]));
  return pages.filter((page) => page.path && !statOf(join(dir, page.path))?.isFile())
    .map((page) => error(page.path, 0, `pages.mjs gives page "${page.id}" this path, and there is no such file — node tools/genPages.mjs lays it`));
};

const checkBuild = (dir) => {
  if (!statOf(join(dir, 'build.mjs'))?.isFile()) return [error('build.mjs', 0, 'missing')];
  const build = () => spawnSync(process.execPath, ['build.mjs'], { cwd: dir, encoding: 'utf8' });
  const first = build();
  if (first.status !== 0) return [error('build.mjs', 0, `fails: ${(first.stderr || first.stdout).trim().split('\n')[0]}`)];
  const second = build();
  if (second.status !== 0 || !/up to date/.test(second.stdout)) {
    return [error('build.mjs', 0, `a second run still rewrites: ${(second.stdout || second.stderr).trim().split('\n')[0]}`)];
  }
  return [];
};

const checkValues = (dir, files) => {
  const found = [];
  for (const file of files.filter((path) => /\.(css|html|js)$/.test(path) && path !== 'tokens.css')) {
    const isPage = file.endsWith('.html');
    read(join(dir, file)).split('\n').forEach((line, i) => {
      if (/allow-hex/.test(line)) return;
      for (const [hex] of line.replace(NOT_A_COLOR, '').matchAll(HEX)) {
        found.push(error(file, i + 1, `the color ${hex} is a raw value; use a token from tokens.css`));
      }
      const family = /font-family\s*:\s*([^;"]+)/.exec(line);
      if (family && !/^var\(--font/.test(family[1].trim())) {
        found.push(error(file, i + 1, `font-family: ${family[1].trim()} is a raw value; use var(--font-…)`));
      }
      const radius = /border-radius\s*:\s*([^;"]*\d+(?:\.\d+)?px[^;"]*)/.exec(line);
      if (isPage && radius) found.push(error(file, i + 1, `border-radius: ${radius[1].trim()} is a raw value; use var(--radius-…)`));
    });
  }
  return found;
};

/** The declarations of the first block whose selector starts at `selector`: { name: { value, line } }. */
const declarations = (text, selector) => {
  const at = text.indexOf(selector);
  if (at < 0) return null;
  const open = text.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (; end < text.length; end += 1) {
    if (text[end] === '{') depth += 1;
    if (text[end] === '}' && (depth -= 1) === 0) break;
  }
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  const body = text.slice(open + 1, end);
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], { value: match[2].replace(/\s+/g, ' ').trim(), line: lineOf(open + 1 + match.index) }]));
};

const checkDarkSets = (dir) => {
  const text = read(join(dir, 'tokens.css'));
  if (!text) return [error('tokens.css', 0, 'missing')];
  const system = declarations(text.slice(Math.max(0, text.indexOf('prefers-color-scheme: dark'))), ":root:not([data-theme='light'])");
  const chosen = declarations(text, ":root[data-theme='dark']");
  if (!system || !chosen) return [error('tokens.css', 0, 'the two dark sets are not both there: @media (prefers-color-scheme: dark) and :root[data-theme=\'dark\']')];
  const offset = text.indexOf('prefers-color-scheme: dark') < 0 ? 0 : text.slice(0, text.indexOf('prefers-color-scheme: dark')).split('\n').length - 1;
  const found = [];
  for (const [name, { value, line }] of Object.entries(system)) {
    if (!chosen[name]) found.push(error('tokens.css', line + offset, `${name} is in the media-query dark set but not under [data-theme='dark']`));
    else if (chosen[name].value !== value) found.push(error('tokens.css', chosen[name].line, `${name} is ${chosen[name].value} under [data-theme='dark'] but ${value} in the media-query set`));
  }
  for (const [name, { line }] of Object.entries(chosen)) {
    if (!system[name]) found.push(error('tokens.css', line, `${name} is under [data-theme='dark'] but not in the media-query dark set`));
  }
  return found;
};

const checkDictionaries = async (dir, files) => {
  let site;
  try {
    ({ SITE: site } = await import(pathToFileURL(join(dir, 'site.mjs')).href));
  } catch (problem) {
    return [error('site.mjs', 0, `does not load: ${problem.message}`)];
  }
  const pages = files.filter((file) => file.endsWith('.html'));
  const used = new Map();
  for (const file of pages) {
    read(join(dir, file)).split('\n').forEach((line, i) => {
      const keys = [
        ...[...line.matchAll(/data-i18n="([^"]+)"/g)].map(([, key]) => key),
        ...[...line.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap(([, spec]) => spec.split(';').map((pair) => pair.split(':')[1]?.trim())),
      ].filter(Boolean);
      for (const key of keys) if (!used.has(key)) used.set(key, `${file}:${i + 1}`);
    });
  }
  // The frame's scripts and generators write keys of their own (the flow player's, the Selected mark's)
  const scripts = files.filter((file) => /\.m?js$/.test(file) && !file.startsWith('i18n/')).map((file) => read(join(dir, file))).join('\n');
  const corpus = `${pages.map((file) => read(join(dir, file))).join('\n')}\n${scripts}`;
  const isUsed = (key) => used.has(key) || new RegExp(`(?<![\\w.-])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`).test(corpus);

  const found = [];
  const languages = (site?.languages ?? []).filter((lang) => lang !== site?.defaultLanguage);
  for (const lang of languages) {
    const file = `i18n/${lang}.js`;
    const text = read(join(dir, file));
    if (!text) {
      found.push(error(file, 0, `site.mjs lists ${lang}, and there is no dictionary for it`));
      continue;
    }
    const keys = new Map([...text.matchAll(DICTIONARY_KEY)].map((match) => [match[2], text.slice(0, match.index).split('\n').length]));
    for (const [key, where] of used) if (!keys.has(key)) found.push(error(file, 0, `no "${key}", which ${where} uses`));
    for (const [key, line] of keys) if (!isUsed(key)) found.push(warning(file, line, `"${key}" is used by no page or script — remove it, or keep it knowingly`));
  }
  return found;
};

const check = async (dir) => {
  loadState(dir);
  const files = walk(dir);
  const found = [
    ...await checkPages(dir),
    ...checkBuild(dir),
    ...checkValues(dir, files),
    ...checkDarkSets(dir),
    ...await checkDictionaries(dir, files),
  ];
  for (const { text } of found) print(text);
  const errors = found.filter(({ level }) => level === 'error').length;
  print(found.length
    ? `${plural(errors, 'error')}, ${plural(found.length - errors, 'warning')}`
    : 'Every page exists, the build is idempotent, no value sits outside the tokens, the dark sets agree and every key is translated.');
  if (errors) process.exit(1);
};

const main = async () => {
  const [command, dirArg, ...rest] = process.argv.slice(2);
  if (!command) usage('no command given');
  if (!COMMANDS.includes(command)) usage(`unknown command "${command}"`);
  if (!dirArg) usage(`${command} needs the showcase folder`);
  if (rest.length) usage(`too many arguments for ${command}: ${rest.join(' ')}`);
  await check(resolve(dirArg));
};

main().catch((problem) => fail(problem.message));
