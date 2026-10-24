// The showcase site as the skill lays it, shared by the frame's tests and the check script's: the frame copied,
// the files with placeholders filled, one flow under Flows and a dictionary for a second language.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTempDir } from './helpers.mjs';

export const TEMPLATES = fileURLToPath(new URL('../skills/showcase/templates/', import.meta.url));

export const fill = (text, values) =>
  Object.entries(values).reduce((out, [key, value]) => out.replaceAll(`{{${key}}}`, value), text);

// The flow the scaffold adds under Flows, so a child page exists
export const FLOW = { id: 'signIn', path: 'flows/signIn.html', title: 'Sign in', desc: 'Signing in, step by step.' };

// The copy the skill makes when it lays the frame, as far as the build needs it: the frame as it is;
// tokens.css, components.css and sample.mjs as they are (their placeholders sit only in comments and
// strings); pages.mjs with one flow under Flows; site.mjs with its placeholders filled; a dictionary for
// the second language
export const withFlow = (pages) => {
  assert.equal(pages.split('children: []').length, 2, 'pages.mjs should have exactly one empty children list, under Flows');
  return pages.replace('children: []', `children: [${JSON.stringify(FLOW)}]`);
};

export const scaffold = ({ flow = true } = {}) => {
  const dir = makeTempDir();
  cpSync(join(TEMPLATES, 'frame'), dir, { recursive: true });
  for (const file of ['tokens.css', 'components.css', 'sample.mjs']) {
    cpSync(join(TEMPLATES, file), join(dir, file));
  }
  const pages = readFileSync(join(TEMPLATES, 'pages.mjs'), 'utf8');
  writeFileSync(join(dir, 'pages.mjs'), flow ? withFlow(pages) : pages);
  writeFileSync(join(dir, 'site.mjs'), fill(readFileSync(join(TEMPLATES, 'site.mjs'), 'utf8'), {
    NAME: 'Frame Test', MARK: 'F', PORT: '4399', LANGUAGES: "['en', 'uk']", DEFAULT_LANGUAGE: 'en',
  }));
  mkdirSync(join(dir, 'i18n'));
  writeFileSync(join(dir, 'i18n', 'uk.js'), fill(readFileSync(join(TEMPLATES, 'i18n', 'lang.js'), 'utf8'), {
    LANG: 'uk', LANGUAGE_NAME: 'Ukrainian', NAV_KEYS: "  'nav.product': 'Продукт',",
  }));
  return dir;
};

export const run = (dir, script) => {
  const result = spawnSync('node', [script], { cwd: dir, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
