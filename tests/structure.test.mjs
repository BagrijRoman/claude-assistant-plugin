// Keeps the documentation honest: every hook registered in hooks/hooks.json and every skill under skills/
// has its own page in docs/, a row in the docs index and a row in the root README's map, and no page
// describes something that no longer exists.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = new URL('../', import.meta.url);
const DOCS = new URL('docs/hooks/', ROOT);
const SKILL_DOCS = new URL('docs/skills/', ROOT);
const SKILLS = new URL('skills/', ROOT);
const INDEX_PAGE = 'README.md';
const ROOT_README = new URL('README.md', ROOT);

const frontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  return Object.fromEntries([...(match?.[1] ?? '').matchAll(/^([\w-]+):\s*(.*)$/gm)].map(([, key, value]) => [key, value]));
};

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

describe('skill documentation', () => {
  const skills = readdirSync(SKILLS).filter((entry) => !entry.startsWith('.'));
  const index = readFileSync(new URL(INDEX_PAGE, SKILL_DOCS), 'utf8');
  const rootReadme = readFileSync(ROOT_README, 'utf8');

  it('finds the skills', () => {
    assert.ok(skills.length > 0);
  });

  for (const skill of skills) {
    it(`${skill} is a camelCase directory with a SKILL.md whose name is the kebab-case command`, () => {
      assert.match(skill, /^[a-z][A-Za-z0-9]*$/, `skills/${skill} is not camelCase`);
      const file = new URL(`${skill}/SKILL.md`, SKILLS);
      assert.ok(existsSync(file), `missing skills/${skill}/SKILL.md`);
      const meta = frontmatter(readFileSync(file, 'utf8'));
      assert.match(meta.name ?? '', /^[a-z][a-z0-9-]*$/, `skills/${skill}: name "${meta.name}" is not a kebab-case command`);
      assert.ok((meta.description ?? '').length >= 40, `skills/${skill}: description too short to trigger reliably`);
    });

    it(`${skill} has its own page, a row in the index and a row in the root README`, () => {
      assert.ok(existsSync(new URL(`${skill}.md`, SKILL_DOCS)), `missing docs/skills/${skill}.md`);
      assert.ok(index.includes(`(${skill}.md)`), `docs/skills/${INDEX_PAGE} does not link ${skill}.md`);
      assert.ok(rootReadme.includes(`(docs/skills/${skill}.md)`), `README.md does not link docs/skills/${skill}.md`);
    });
  }

  it('has no page for a skill that does not exist', () => {
    const pages = readdirSync(SKILL_DOCS)
      .filter((file) => file.endsWith('.md') && file !== INDEX_PAGE)
      .map((file) => file.replace(/\.md$/, ''));
    assert.deepEqual(pages.filter((page) => !skills.includes(page)), []);
  });
});
