// Keeps the hook documentation honest: every hook registered in hooks/hooks.json has its own page in
// docs/hooks/, a row in the docs index and a row in the root README's map, and no page describes a hook
// that is no longer registered.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = new URL('../', import.meta.url);
const DOCS = new URL('docs/hooks/', ROOT);
const INDEX_PAGE = 'README.md';
const ROOT_README = new URL('README.md', ROOT);

const registeredHooks = () => {
  const config = JSON.parse(readFileSync(new URL('hooks/hooks.json', ROOT), 'utf8'));
  const commands = Object.values(config.hooks)
    .flat()
    .flatMap((entry) => entry.hooks.map((hook) => hook.command));
  return [...new Set(commands.map((command) => command.match(/bin\/([\w-]+)\.mjs/)?.[1]).filter(Boolean))];
};

describe('hook documentation', () => {
  const hooks = registeredHooks();
  const index = readFileSync(new URL(INDEX_PAGE, DOCS), 'utf8');
  const rootReadme = readFileSync(ROOT_README, 'utf8');

  it('finds the registered hooks', () => {
    assert.ok(hooks.length > 0);
  });

  for (const hook of hooks) {
    it(`${hook} has its own page, a row in the index and a row in the root README`, () => {
      assert.ok(existsSync(new URL(`${hook}.md`, DOCS)), `missing docs/hooks/${hook}.md`);
      assert.ok(index.includes(`(${hook}.md)`), `docs/hooks/${INDEX_PAGE} does not link ${hook}.md`);
      assert.ok(rootReadme.includes(`(docs/hooks/${hook}.md)`), `README.md does not link docs/hooks/${hook}.md`);
    });
  }

  it('has no page for a hook that is not registered', () => {
    const pages = readdirSync(DOCS)
      .filter((file) => file.endsWith('.md') && file !== INDEX_PAGE)
      .map((file) => file.replace(/\.md$/, ''));
    assert.deepEqual(pages.filter((page) => !hooks.includes(page)), []);
  });
});
