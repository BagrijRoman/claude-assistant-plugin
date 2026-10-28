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

// An agent without `model` runs on the session's model. One that names a model must name one Claude Code knows,
// and /blueprint's agents run on the models its Subagents table promises — a reader moved to another model
// changes what every blueprint is built from.
describe('agent models', () => {
  const ALIASES = ['sonnet', 'opus', 'haiku', 'fable', 'inherit'];
  const modelOf = (agent) => frontmatter(readFileSync(new URL(`${agent}.md`, AGENTS), 'utf8')).model;

  it('every model an agent names is an alias Claude Code knows', () => {
    const unknown = agentFiles().map((file) => file.replace(/\.md$/, ''))
      .filter((agent) => modelOf(agent) !== undefined && !ALIASES.includes(modelOf(agent)));
    assert.deepEqual(unknown, []);
  });

  it('blueprint\'s agents run on the models of mechanics.md › Subagents', () => {
    const mechanics = readFileSync(new URL('blueprint/references/mechanics.md', SKILLS), 'utf8');
    const rows = mechanics.split('\n').filter((line) => line.includes(`\`${PLUGIN_NAME}:blueprint-`));
    assert.equal(rows.length, 4, 'the Subagents table should list the four blueprint agents');
    for (const row of rows) {
      const [, , type, model] = row.split('|').map((cell) => cell.trim());
      const agent = type.replace(/`/g, '').split(':')[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const promised = /^`([a-z]+)`$/.exec(model)?.[1];
      assert.equal(modelOf(agent), promised, `agents/${agent}.md runs on ${modelOf(agent) ?? "the session's model"}, mechanics.md says ${model}`);
    }
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
  // A reference may shorten a heading to its first words: `sections.md › Technology stack` for "Technology stack (…)".
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

const filesIn = (folder, extension) => {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : filesIn(new URL(`${entry.name}/`, folder), extension);
    return entry.name.endsWith(extension) ? [new URL(entry.name, folder)] : [];
  });
};
const relativeName = (file) => file.pathname.slice(ROOT.pathname.length);

// Rule 7 of docs/skills/README.md: everything a skill creates stays in its working folder, temporary files too.
describe('writes stay in the working folder', () => {
  const INVARIANT = 'Writes stay in the working folder: nothing is created outside it, not even for a moment.';
  const WITH_WORKING_FOLDER = ['research', 'blueprint', 'backlog', 'showcase', 'standards'];

  it('no script reaches for the system temporary folder', () => {
    const scripts = [...filesIn(new URL('bin/', ROOT), '.mjs'), ...filesIn(SKILLS, '.mjs')];
    const found = scripts.filter((file) => /\btmpdir\s*\(|os\.tmpdir/.test(readFileSync(file, 'utf8'))).map(relativeName);
    assert.deepEqual(found, []);
  });

  it('no skill or agent names a temporary folder or the scratchpad except to forbid it', () => {
    const texts = [...filesIn(SKILLS, '.md'), ...filesIn(AGENTS, '.md')];
    const found = [];
    // Judged per sentence, since a sentence that forbids it may wrap before it names the place
    for (const file of texts) {
      const sentences = readFileSync(file, 'utf8').replace(/\s*\n\s*/g, ' ').split(/(?<=[.:;])\s+/);
      for (const sentence of sentences) {
        if (/\/tmp\b|mktemp|\$TMPDIR|tmpdir|scratchpad/i.test(sentence) && !/\b(never|not|nor|nothing|no)\b/i.test(sentence)) {
          found.push(`${relativeName(file)}: ${sentence.slice(0, 80)}`);
        }
      }
    }
    assert.deepEqual(found, []);
  });

  for (const skill of WITH_WORKING_FOLDER) {
    it(`${skill} states the invariant in its SKILL.md`, () => {
      const text = readFileSync(new URL(`${skill}/SKILL.md`, SKILLS), 'utf8');
      assert.ok(text.includes(INVARIANT), `skills/${skill}/SKILL.md lacks "${INVARIANT}"`);
    });
  }
});

// Rule 8 of docs/skills/README.md: every skill shows the operator where it is, from a stage table per mode.
describe('progress is visible', () => {
  const SENTENCE = 'The operator always sees which stage the run is in, what is done and what comes next.';
  const skills = readdirSync(SKILLS).filter((entry) => !entry.startsWith('.'));
  const section = (text, level) => {
    const start = text.search(new RegExp(`^${level} Progress\\n`, 'm'));
    if (start < 0) return null;
    const rest = text.slice(start).split('\n').slice(1).join('\n');
    const end = rest.search(new RegExp(`^${level} `, 'm'));
    return end < 0 ? rest : rest.slice(0, end);
  };
  const tableRows = (text) => text.split('\n').filter((line) => line.startsWith('|'));
  // The modes of `How to read the arguments` (or `Modes`): the first word of each backticked argument, a
  // placeholder left out
  const modesOf = (text) => {
    const table = text.split(/^## (?:How to read the arguments|Modes)\n/m)[1]?.split(/^## /m)[0] ?? '';
    return [...new Set(tableRows(table).slice(2).map((row) => row.split('|')[1].trim().match(/^`([a-z][\w-]*)/)?.[1]).filter(Boolean))];
  };

  for (const skill of skills) {
    const text = readFileSync(new URL(`${skill}/SKILL.md`, SKILLS), 'utf8');
    const progress = section(text, '##');

    it(`${skill} has a Progress section with its stage table`, () => {
      assert.ok(progress, `skills/${skill}/SKILL.md has no "## Progress" section`);
      assert.ok(progress.includes(SENTENCE), `skills/${skill}/SKILL.md: Progress lacks "${SENTENCE}"`);
      const rows = tableRows(progress);
      assert.match(rows[0] ?? '', /^\| Mode \| Stages \|$/, `skills/${skill}/SKILL.md: Progress has no "| Mode | Stages |" table`);
      assert.ok(rows.length >= 3, `skills/${skill}/SKILL.md: the stage table has no row`);
      for (const row of rows.slice(2)) assert.ok(row.split('|')[2]?.trim(), `skills/${skill}/SKILL.md: a mode without stages: ${row}`);
    });

    it(`${skill} lists the stages of every mode it documents`, () => {
      const cells = tableRows(progress ?? '').slice(2).map((row) => row.split('|')[1]).join(' ');
      const missing = modesOf(text).filter((mode) => !new RegExp(`\`${mode}[\` ]`).test(cells));
      assert.deepEqual(missing, [], `skills/${skill}/SKILL.md: modes without a row in the stage table`);
    });

    it(`${skill}'s page repeats the stage table`, () => {
      const page = section(readFileSync(new URL(`${skill}.md`, SKILL_DOCS), 'utf8'), '##');
      assert.ok(page, `docs/skills/${skill}.md has no "## Progress" section`);
      assert.deepEqual(tableRows(page), tableRows(progress ?? ''), `docs/skills/${skill}.md: the stage table differs from SKILL.md`);
    });
  }
});

// Every skill with gates recommends a fresh context at them and says why, and the skill-resume hook knows its
// state, so that a /clear after the gate loses nothing (docs/hooks/skillResume.md).
describe('a fresh context at the gates', () => {
  const GATED = {
    blueprint: { file: 'references/mechanics.md', command: '/blueprint' },
    showcase: { file: 'references/phases.md', command: '/showcase' },
    backlog: { file: 'references/mechanics.md', command: '/backlog' },
    research: { file: 'references/phases.md', command: '/research' },
  };
  const hook = readFileSync(new URL('bin/skillResume.mjs', ROOT), 'utf8');

  for (const [skill, { file, command }] of Object.entries(GATED)) {
    it(`${skill} recommends /clear at its gates, with the reason, and the hook resumes it`, () => {
      const text = readFileSync(new URL(`${skill}/${file}`, SKILLS), 'utf8');
      const section = text.split(/^## A fresh context\n/m)[1]?.split(/^## /m)[0];
      assert.ok(section, `skills/${skill}/${file} has no "## A fresh context" section`);
      for (const line of ['Recommended: type /clear, then', 'Why: every message sends this whole conversation to the model again',
        'Not /compact:', 'Or say "go on here"']) {
        assert.ok(section.includes(line), `skills/${skill}/${file} › A fresh context lacks "${line}"`);
      }
      assert.ok(section.includes(command), `skills/${skill}/${file} › A fresh context does not name ${command}`);
      assert.match(hook, new RegExp(`const KINDS = \\{[^}]*\\b${skill}\\b`), `bin/skillResume.mjs's KINDS lacks ${skill}`);
    });
  }
});

// Claude Code installs the plugin into a cache folder named by its version, from a directory marketplace too, so a
// change ships only with a new version, and the marketplace entry must name the same one (T50).
describe('plugin version', () => {
  it('is the same in plugin.json and marketplace.json', () => {
    const plugin = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', ROOT), 'utf8'));
    const market = JSON.parse(readFileSync(new URL('.claude-plugin/marketplace.json', ROOT), 'utf8'));
    const entry = market.plugins.find(({ name }) => name === plugin.name);
    assert.equal(entry?.version, plugin.version, `marketplace.json names ${plugin.name} ${entry?.version}, plugin.json ${plugin.version}`);
  });
});
