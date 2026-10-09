// Keeps the documentation honest: every hook registered in hooks/hooks.json, every skill under skills/ and
// every agent under agents/ has its own page in docs/, a row in the docs index and a row in the root
// README's map, and no page describes something that no longer exists. Every file a skill tells the model
// to read or copy exists, every `file.md › Heading` it points to resolves, and every agent it delegates to
// is defined.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = new URL('../', import.meta.url);
const DOCS = new URL('docs/hooks/', ROOT);
const SKILL_DOCS = new URL('docs/skills/', ROOT);
const AGENT_DOCS = new URL('docs/agents/', ROOT);
const SKILLS = new URL('skills/', ROOT);
const AGENTS = new URL('agents/', ROOT);
const INDEX_PAGE = 'README.md';
const ROOT_README = new URL('README.md', ROOT);
const PLUGIN_NAME = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', ROOT), 'utf8')).name;

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

const agentFiles = () => (existsSync(AGENTS) ? readdirSync(AGENTS).filter((file) => file.endsWith('.md')) : []);
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe('agent documentation', () => {
  const agents = agentFiles().map((file) => file.replace(/\.md$/, ''));
  const index = existsSync(new URL(INDEX_PAGE, AGENT_DOCS)) ? readFileSync(new URL(INDEX_PAGE, AGENT_DOCS), 'utf8') : '';
  const rootReadme = readFileSync(ROOT_README, 'utf8');

  for (const agent of agents) {
    it(`${agent} is a camelCase file whose name is the kebab-case agent, with a description and plain tools`, () => {
      assert.match(agent, /^[a-z][A-Za-z0-9]*$/, `agents/${agent}.md is not camelCase`);
      const meta = frontmatter(readFileSync(new URL(`${agent}.md`, AGENTS), 'utf8'));
      assert.equal(meta.name, kebab(agent), `agents/${agent}.md: name "${meta.name}" is not ${kebab(agent)}`);
      assert.ok((meta.description ?? '').length >= 40, `agents/${agent}.md: description too short`);
      const tools = (meta.tools ?? '').split(',').map((tool) => tool.trim()).filter(Boolean);
      assert.ok(tools.length > 0, `agents/${agent}.md: no tools — an agent without a list gets every tool`);
      for (const tool of tools) assert.match(tool, /^[A-Z][A-Za-z]*$/, `agents/${agent}.md: "${tool}" is not a plain tool name`);
    });

    it(`${agent} has its own page, a row in the index and a row in the root README`, () => {
      assert.ok(existsSync(new URL(`${agent}.md`, AGENT_DOCS)), `missing docs/agents/${agent}.md`);
      assert.ok(index.includes(`(${agent}.md)`), `docs/agents/${INDEX_PAGE} does not link ${agent}.md`);
      assert.ok(rootReadme.includes(`(docs/agents/${agent}.md)`), `README.md does not link docs/agents/${agent}.md`);
    });
  }

  it('has no page for an agent that does not exist', () => {
    const pages = existsSync(AGENT_DOCS)
      ? readdirSync(AGENT_DOCS).filter((file) => file.endsWith('.md') && file !== INDEX_PAGE).map((file) => file.replace(/\.md$/, ''))
      : [];
    assert.deepEqual(pages.filter((page) => !agents.includes(page)), []);
  });
});

// A skill reaches its files as `${CLAUDE_PLUGIN_ROOT}/…` (from the plugin root) or as a `templates/…` or
// `references/…` path in backticks or a link (from its own folder). A file moved without its skill must fail
// here, not in a session.
describe('files a skill names', () => {
  const skills = readdirSync(SKILLS).filter((entry) => !entry.startsWith('.'));
  const isPlaceholder = (path) => /[<>{}*]/.test(path);

  const markdownIn = (folder) => {
    if (!existsSync(folder)) return [];
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return markdownIn(new URL(`${entry.name}/`, folder));
      return entry.name.endsWith('.md') ? [new URL(entry.name, folder)] : [];
    });
  };

  const procedureFiles = (skill) => {
    const references = new URL(`${skill}/references/`, SKILLS);
    const pages = existsSync(references) ? readdirSync(references).filter((file) => file.endsWith('.md')) : [];
    return [new URL(`${skill}/SKILL.md`, SKILLS), ...pages.map((file) => new URL(file, references))];
  };

  // A placeholder — `{{YYYY-MM-DD}}` in a template's heading, `<date>` in the reference — matches any text.
  const normalise = (text) => text.replace(/[*`]/g, '').replace(/\{\{[^}]*\}\}|<[^>]*>/g, '…').trim();
  const headings = (file) => [...readFileSync(file, 'utf8').matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(([, text]) => normalise(text));
  // A reference may shorten a heading to its first words: `sections.md › Microcopy` for "Microcopy and tone".
  const names = (heading, wanted) => heading === wanted || heading.startsWith(`${wanted} `);

  for (const skill of skills) {
    const folder = new URL(`${skill}/`, SKILLS);

    it(`${skill} names only files that exist`, () => {
      const missing = [];
      for (const file of procedureFiles(skill)) {
        const text = readFileSync(file, 'utf8');
        for (const [, found] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)) {
          const path = found.replace(/\.+$/, '');
          if (!existsSync(new URL(path, ROOT))) missing.push(path);
        }
        // `references/competitors/` is also a folder of the output, so only a named .md file there is checked.
        for (const [, path] of text.matchAll(/[`(]((?:templates\/[^`)\s]*)|(?:references\/[^`)\s]*\.md))[`)]/g)) {
          if (!isPlaceholder(path) && !existsSync(new URL(path, folder))) missing.push(`skills/${skill}/${path}`);
        }
      }
      assert.deepEqual(missing, [], `skills/${skill} names files that do not exist`);
    });

    // `mechanics.md › Depth` names a file of the skill — its SKILL.md, a reference or a template — and a heading
    // in it; a renamed heading or a split file must not leave the model looking for a section that is gone.
    it(`${skill} points only to headings that exist`, () => {
      const own = [new URL('SKILL.md', folder), ...markdownIn(new URL('references/', folder)), ...markdownIn(new URL('templates/', folder))];
      const byName = new Map();
      for (const file of own) byName.set(file.pathname.split('/').pop(), [...(byName.get(file.pathname.split('/').pop()) ?? []), file]);
      const dangling = [];
      for (const file of own) {
        const text = readFileSync(file, 'utf8');
        for (const [, name, trail] of text.matchAll(/`([\w.-]+\.md)((?: › [^`›]+)+)`/g)) {
          const candidates = byName.get(name);
          if (!candidates) continue; // another skill's or the project's file — not this skill's to resolve
          const wanted = trail.split(' › ').slice(1).map((part) => normalise(part));
          const found = candidates.some((candidate) => {
            const present = headings(candidate);
            return wanted.every((part) => present.some((heading) => names(heading, part)));
          });
          if (!found) dangling.push(`${file.pathname.split('/skills/')[1]}: ${name} › ${wanted.join(' › ')}`);
        }
      }
      assert.deepEqual(dangling, [], `skills/${skill} points to headings that do not exist`);
    });

    it(`${skill} delegates only to agents that exist`, () => {
      const names = agentFiles().map((file) => kebab(file.replace(/\.md$/, '')));
      const unknown = [];
      for (const file of procedureFiles(skill)) {
        for (const [, name] of readFileSync(file, 'utf8').matchAll(new RegExp(`${PLUGIN_NAME}:([a-z][a-z0-9-]*)`, 'g'))) {
          if (!names.includes(name)) unknown.push(name);
        }
      }
      assert.deepEqual(unknown, [], `skills/${skill} delegates to agents that are not defined in agents/`);
    });
  }
});
