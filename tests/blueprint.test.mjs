// bin/blueprint.mjs does the /blueprint skill's bookkeeping. These tests build a small but complete blueprint
// — two sources, one with a two-item index and its Coverage rows; one module, ORG, with two capabilities and
// lastCapability 2; D-001 and D-002; A-001; Q-001 open and Q-002 closed → D-002; G-01, N-01 and RK-01 — and run
// every command on it: stamp's counts, time and key order; next for each kind and the capability reservation;
// changed by mtime; validate on the clean fixture and once per error; export.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs } from './helpers.mjs';

const SCRIPT = fileURLToPath(new URL('../bin/blueprint.mjs', import.meta.url));
const NOW = '2026-10-09T14:05';

const STATE = {
  kind: 'blueprint',
  version: 1,
  project: 'Fixture',
  created: '2026-10-01',
  updated: '2026-10-02T09:30',
  depth: 'standard',
  phase: 'consistency',
  phases: {
    intake: 'approved', reading: 'approved', brief: 'approved', architecture: 'approved',
    modules: 'approved', capabilities: 'approved', consistency: 'in-progress', adequacy: 'pending',
  },
  research: { allowed: false, scope: [], grantedOn: null },
  counts: { sources: 2, decisions: 2, assumptions: 1, openQuestions: 1, goals: 1, nfrs: 1, risks: 1, capabilities: 2 },
  modules: [{
    name: 'Organization', slug: 'organization', code: 'ORG', file: 'modules/organization.md', stage: 'MVP',
    surfaces: ['web'], sources: ['S-01', 'S-02'], lastCapability: 2, l2: 'done', l3: 'done',
  }],
};

const FILES = {
  '00-sources.md': `# Sources

| Id | Type | Location | Read as | Note from the operator | Reliability |
|----|------|----------|---------|------------------------|-------------|
| S-01 | document | \`docs/requirements.md\` | direct | The requirements the customer sent | primary |
| S-02 | idea | conversation, 2026-10-01 | direct | What the operator said | primary |

---

## S-01 — Requirements

**Type:** document · **Location:** \`docs/requirements.md\` · **Read as:** direct · **Reliability:** primary

### Extract

**Facts**
- Teams invite their members by email — §2

**Decided**
- D23 — Email is the only invitation channel — 2026-09, §5

**Index** — only for a catalogue; not capped

| Item | Title | Where | Status |
|------|-------|-------|--------|
| ORG-01 | Invite a member | requirements › Teams | keep |
| ORG-02 | Recalculate totals | requirements › Totals | keep |

**Terms**
- *Team* — the people of one organization

---

## S-02 — The operator's idea

**Type:** idea · **Location:** conversation, 2026-10-01 · **Read as:** direct · **Reliability:** primary

**Requirements**
- Members see their team's totals — conversation

## Decided in the sources

| Source | Id | Decision | Kind |
|--------|----|----------|------|
| S-01 | D23 | Email is the only invitation channel | product |

## Coverage

| Source | Item | Covered by | Note |
|--------|------|------------|------|
| S-01 | ORG-01 | ORG-C01 | |
| S-01 | ORG-02 | ORG-C02 | |
`,
  '01-brief.md': `# Brief

## Idea

Teams track their totals together. (S-01, S-02)

## Goals

| Id | Goal | How we would know | Ref |
|----|------|-------------------|-----|
| G-01 | Teams onboard without help | most invitations accepted within a day [A-001] | (S-02) |

## Non-functional requirements

| Id | Area | Requirement | Ref |
|----|------|-------------|-----|
| N-01 | Security | Invitations go by email only | (S-01 §D23) |

## Risks

| Id | Risk | What it would break | Ref |
|----|------|---------------------|-----|
| RK-01 | Invitations land in spam | onboarding stalls | (D-001) |
`,
  '02-architecture.md': `# Architecture

## Module map

| Module | Code | Stage | Sources |
|--------|------|-------|---------|
| [Organization](modules/organization.md) | ORG | MVP | S-01, S-02 |

One web app, as [the guide](https://example.com/guide) describes. (D-001)
`,
  'DECISIONS.md': `# Decisions

| Id | Date | Decided by | Phase | Title | Status |
|----|------|------------|-------|-------|--------|
| D-001 | 2026-10-01 | operator | brief | Web only | accepted |
| D-002 | 2026-10-02 | operator | architecture | One module for teams | accepted |

---

## D-001 — Web only

**Choice**
Web only, no native app. (S-02)

## D-002 — One module for teams

**Choice**
Teams and totals stay in Organization; this closes Q-002.
`,
  'ASSUMPTIONS.md': `# Assumptions

| Id | Date | Phase | Assumption | Where | Reviewed |
|----|------|-------|------------|-------|----------|
| A-001 | 2026-10-02 | capabilities | The edge cases of ORG-C01 as written | modules/organization.md › ORG-C01 | no |
`,
  'OPEN-QUESTIONS.md': `# Open questions

| Id | Date | Phase | Question | Where | Status |
|----|------|-------|----------|-------|--------|
| Q-001 | 2026-10-02 | capabilities | How long does an invitation stay valid? | modules/organization.md › ORG-C01 | open |
| Q-002 | 2026-10-01 | architecture | One module or two? | 02-architecture.md › Module map | closed → D-002 |

---

## Q-001 — Invitation lifetime

**Provisional choice in the text**
Seven days.

## Q-002 — One module or two

Closed by D-002.
`,
  'modules/organization.md': `# Organization

Code: ORG · Stage: MVP · Surfaces: web
Sources: S-01, S-02 — read in full by whoever writes this file

<!-- L2 — the module -->

## Purpose

Teams manage their members and see their totals (S-01, D-002); see [the goals](../01-brief.md#goals).

<!-- L3 — capabilities -->

## Capabilities

### Members

#### ORG-C01 · Invite a team member
**Who:** Administrator
**Source:** ORG-01, S-01 §2
**What:** An administrator invites a member by email; the invitation stays valid for seven days [?Q-001].
**Refs:** (S-01) (D-001) [A-001]

#### ORG-C02 · System: Recalculate totals
**Trigger:** a member joins or leaves
**Source:** ORG-02
**What:** The team's totals are recalculated, as [Purpose](#purpose) promises.
**Refs:** (S-02) G-01 N-01 RK-01
`,
  'README.md': `# Fixture — Blueprint

Phase: **consistency** · depth: standard · updated 2026-10-02T09:30.

## Documents

| File | What it holds |
|------|---------------|
| [01-brief.md](01-brief.md) | Idea, goals, risks |
| [modules/organization.md](modules/organization.md) | Organization |

## How to read the references

\`(S-03)\` a fact from source 03 · \`(S-01 §D14)\` a decision the source records · \`(D-014)\` a decision ·
\`[A-007]\` an assumption · \`[?Q-002]\` an open question · \`ORG-C03\` a capability, by its id.
`,
  'GLOSSARY.md': `# Glossary

| Term | Definition | Also called | Ref |
|------|------------|-------------|-----|
| Team | The people of one organization | group | (S-01) |
`,
};

const CHANGELOG = `# Changelog

| When | Mode | What changed | Ids | Modules |
|------|------|--------------|-----|---------|
| 2026-10-05T10:00 | module | Removed a capability nobody needs | ORG-C05 | ORG |
`;

const write = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};
const readState = (dir) => JSON.parse(readFileSync(join(dir, 'STATE.json'), 'utf8'));
const writeState = (dir, state) => write(join(dir, 'STATE.json'), `${JSON.stringify(state, null, 2)}\n`);
const changeState = (dir, change) => {
  const state = readState(dir);
  change(state);
  writeState(dir, state);
};
const edit = (dir, file, change) => writeFileSync(join(dir, file), change(readFileSync(join(dir, file), 'utf8')));
const append = (dir, file, text) => edit(dir, file, (content) => `${content}${text}`);
const lineOf = (dir, file, text) => readFileSync(join(dir, file), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;

/** The fixture in a fresh folder: <root>/blueprint is the blueprint, <root>/docs/requirements.md its source S-01. */
const makeBlueprint = () => {
  const root = makeTempDir();
  const dir = join(root, 'blueprint');
  for (const [file, content] of Object.entries(FILES)) write(join(dir, file), content);
  writeState(dir, STATE);
  write(join(root, 'docs', 'requirements.md'), '# Requirements\n');
  return { root, dir };
};

const run = (args, options = {}) => {
  const result = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', ...options });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
const withNow = (now) => ({ env: { ...process.env, BLUEPRINT_NOW: now } });

const findings = (result, level) => result.stdout.split('\n').filter((line) => line.startsWith(`${level}: `));
const assertErrors = (result, expected) => {
  assert.deepEqual(findings(result, 'error'), expected, result.stdout);
  assert.equal(result.status, 1);
};

const T0 = new Date('2026-01-01T10:00:00Z');
const T1 = new Date('2026-01-01T11:00:00Z');
const T2 = new Date('2026-01-01T12:00:00Z');
const touch = (path, time) => utimesSync(path, time, time);
const touchAll = (dir, time) => {
  for (const entry of readdirSync(dir, { recursive: true })) touch(join(dir, entry), time);
};
const listed = (result) => result.stdout.split('\n').filter((line) => line.startsWith('  ')).map((line) => line.trim());

describe('blueprint script', () => {
  after(removeTempDirs);

  describe('stamp', () => {
    it('recounts every log from the files and stamps the time from BLUEPRINT_NOW', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.counts = { sources: 0, decisions: 0, assumptions: 0, openQuestions: 0, goals: 0, nfrs: 0, risks: 0, capabilities: 0 };
      });
      const result = run(['stamp', dir], withNow(NOW));
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout,
        `updated ${NOW} · sources 2 · decisions 2 · assumptions 1 · openQuestions 1 · goals 1 · nfrs 1 · risks 1 · capabilities 2\n`);
      const state = readState(dir);
      assert.equal(state.updated, NOW);
      assert.deepEqual(state.counts, STATE.counts);
    });

    it('keeps every other key in its place and writes two-space JSON with a trailing newline', () => {
      const { dir } = makeBlueprint();
      const custom = { notes: 'kept', ...STATE, counts: { capabilities: 9, custom: 7, sources: 9 }, extra: { nested: [1, 2] } };
      writeState(dir, custom);
      assert.equal(run(['stamp', dir], withNow(NOW)).status, 0);
      const state = readState(dir);
      assert.deepEqual(Object.keys(state), Object.keys(custom));
      assert.deepEqual(Object.keys(state.counts),
        ['capabilities', 'custom', 'sources', 'decisions', 'assumptions', 'openQuestions', 'goals', 'nfrs', 'risks']);
      assert.equal(state.counts.custom, 7);
      assert.deepEqual({ ...state, updated: custom.updated, counts: custom.counts }, custom);
      assert.equal(readFileSync(join(dir, 'STATE.json'), 'utf8'), `${JSON.stringify(state, null, 2)}\n`);
    });

    it('stamps the local time to the minute when BLUEPRINT_NOW is not set', () => {
      const { dir } = makeBlueprint();
      const env = { ...process.env };
      delete env.BLUEPRINT_NOW;
      const minute = () => {
        const date = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };
      const before = minute();
      const result = run(['stamp', dir], { env });
      const after = minute();
      assert.equal(result.status, 0, result.stderr);
      assert.ok([before, after].includes(readState(dir).updated), readState(dir).updated);
    });

    it('counts sources from the registry only, ids once, open questions only, headings in modules/ only', () => {
      const { dir } = makeBlueprint();
      append(dir, '00-sources.md', '| S-05 | ORG-03 | ORG-C02 | |\n');
      edit(dir, 'DECISIONS.md', (text) => text.replace(/(\| D-002 .*\n)/, '$1$1'));
      append(dir, '02-architecture.md', '\n#### ORG-C09 · A heading outside modules/\n');
      assert.equal(run(['stamp', dir], withNow(NOW)).status, 0);
      assert.deepEqual(readState(dir).counts, STATE.counts);
    });

    it('refuses a STATE.json that is missing, does not parse or is not a blueprint\'s', () => {
      const { dir: missing } = makeBlueprint();
      rmSync(join(missing, 'STATE.json'));
      const result = run(['stamp', missing], withNow(NOW));
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^\[dev-assistant\] blueprint: .*STATE\.json not found\./);
      assert.ok(!existsSync(join(missing, 'STATE.json')));

      for (const [content, message] of [['{ "kind": ', /does not parse/], ['{ "kind": "backlog" }\n', /is not a blueprint's: kind "backlog"/]]) {
        const { dir } = makeBlueprint();
        write(join(dir, 'STATE.json'), content);
        const refused = run(['stamp', dir], withNow(NOW));
        assert.equal(refused.status, 1);
        assert.match(refused.stderr, message);
        assert.equal(readFileSync(join(dir, 'STATE.json'), 'utf8'), content);
      }
    });
  });

  describe('next', () => {
    it('gives the next id of every log from the highest in its file, and writes nothing', () => {
      const { dir } = makeBlueprint();
      const before = readFileSync(join(dir, 'STATE.json'), 'utf8');
      const expected = { source: 'S-03', decision: 'D-003', assumption: 'A-002', question: 'Q-003', goal: 'G-02', nfr: 'N-02', risk: 'RK-02' };
      for (const [kind, id] of Object.entries(expected)) {
        const result = run(['next', dir, kind]);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout, `${id}\n`, kind);
      }
      assert.equal(readFileSync(join(dir, 'STATE.json'), 'utf8'), before);
    });

    it('prints N ids in a row with --count, and keeps the digits of a number past the width', () => {
      const { dir } = makeBlueprint();
      assert.equal(run(['next', dir, 'decision', '--count', '3']).stdout, 'D-003\nD-004\nD-005\n');
      append(dir, 'DECISIONS.md', '\n| D-999 | 2026-10-03 | operator | modules | Far ahead | accepted |\n');
      assert.equal(run(['next', dir, 'decision', '--count=2']).stdout, 'D-1000\nD-1001\n');
      append(dir, '01-brief.md', '| RK-99 | Late delivery | the launch | (D-001) |\n');
      assert.equal(run(['next', dir, 'risk']).stdout, 'RK-100\n');
    });

    it('starts at 1 when the log does not exist yet, and counts a section without its row', () => {
      const { dir } = makeBlueprint();
      rmSync(join(dir, 'ASSUMPTIONS.md'));
      assert.equal(run(['next', dir, 'assumption']).stdout, 'A-001\n');
      append(dir, 'OPEN-QUESTIONS.md', '\n## Q-004 — Written before its row\n');
      assert.equal(run(['next', dir, 'question']).stdout, 'Q-005\n');
    });

    it('does not take a source\'s own ids, placeholders or code for this blueprint\'s', () => {
      const { dir } = makeBlueprint();
      append(dir, 'DECISIONS.md', '\nKeeps S-01 §D-140 and the source\'s D-77; see `D-500` and {{D-600}}.\n\n```text\nD-700\n```\n');
      assert.equal(run(['next', dir, 'decision']).stdout, 'D-003\n');
    });

    it('reserves capability ids by raising lastCapability, and keeps every other key', () => {
      const { dir } = makeBlueprint();
      const before = readState(dir);
      const result = run(['next', dir, 'capability', 'ORG']);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, 'ORG-C03\n');
      const state = readState(dir);
      assert.equal(state.modules[0].lastCapability, 3);
      assert.deepEqual(Object.keys(state), Object.keys(before));
      assert.deepEqual(Object.keys(state.modules[0]), Object.keys(before.modules[0]));
      assert.deepEqual({ ...state, modules: [{ ...state.modules[0], lastCapability: 2 }] }, before);
      assert.equal(run(['next', dir, 'capability', 'org', '--count', '2']).stdout, 'ORG-C04\nORG-C05\n');
      assert.equal(readState(dir).modules[0].lastCapability, 5);
    });

    it('numbers capabilities past any used under the code anywhere, and past lastCapability', () => {
      const { dir } = makeBlueprint();
      write(join(dir, 'CHANGELOG.md'), CHANGELOG);
      assert.equal(run(['next', dir, 'capability', 'ORG']).stdout, 'ORG-C06\n');
      changeState(dir, (state) => {
        state.modules[0].lastCapability = 12;
      });
      assert.equal(run(['next', dir, 'capability', 'ORG']).stdout, 'ORG-C13\n');
    });

    it('exits 1 on an unknown kind, an unknown module code or a removed module\'s code', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.modules.push({ name: 'Legacy', slug: 'legacy', code: 'LEG', file: 'modules/legacy.md', stage: 'MVP', lastCapability: 4, removed: 'D-002' });
      });
      const before = readFileSync(join(dir, 'STATE.json'), 'utf8');
      for (const [args, message] of [
        [['milestone'], /unknown kind "milestone"/],
        [['capability', 'XYZ'], /no module has the code XYZ in STATE\.json \(codes: ORG, LEG\)/],
        [['capability', 'LEG'], /module LEG was removed \(D-002\)/],
      ]) {
        const result = run(['next', dir, ...args]);
        assert.equal(result.status, 1, args.join(' '));
        assert.match(result.stderr, message);
        assert.equal(result.stdout, '');
      }
      assert.equal(readFileSync(join(dir, 'STATE.json'), 'utf8'), before);
    });

    it('treats a missing kind or code, a code on a log, and a bad --count as usage errors', () => {
      const { dir } = makeBlueprint();
      for (const args of [[], ['capability'], ['decision', 'ORG'], ['decision', '--count', '0'], ['decision', '--count', 'two']]) {
        const result = run(['next', dir, ...args]);
        assert.equal(result.status, 2, args.join(' '));
        assert.match(result.stderr, /\nUsage: /);
      }
    });
  });

  describe('changed', () => {
    it('lists newer files and document sources, and leaves out dotfiles, export/ and STATE.json', () => {
      const { root, dir } = makeBlueprint();
      write(join(dir, '.DS_Store'), 'x');
      write(join(dir, '.obsidian', 'workspace.json'), '{}');
      write(join(dir, 'export', 'blueprint.md'), '# Export\n');
      touchAll(root, T0);
      touch(join(dir, 'STATE.json'), T1);
      for (const file of ['modules/organization.md', '.DS_Store', '.obsidian/workspace.json', 'export/blueprint.md']) touch(join(dir, file), T2);
      touch(join(root, 'docs', 'requirements.md'), T2);
      const result = run(['changed', dir, '--root', root]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, [
        'Changed in the blueprint folder since STATE.json was last written:',
        '  modules/organization.md',
        'Changed document sources:',
        '  S-01 · docs/requirements.md',
        '',
      ].join('\n'));
    });

    it('says when nothing changed — a file as old as STATE.json is the same write — and "none" for an empty list', () => {
      const { root, dir } = makeBlueprint();
      touchAll(root, T0);
      touch(join(dir, 'STATE.json'), T1);
      touch(join(dir, 'README.md'), T1);
      const result = run(['changed', dir, '--root', root]);
      assert.equal(result.status, 0);
      assert.equal(result.stdout, 'Nothing changed since STATE.json was last written.\n');
      touch(join(dir, '01-brief.md'), T2);
      assert.deepEqual(listed(run(['changed', dir, '--root', root])), ['01-brief.md', 'none']);
    });

    it('reads a relative location from the current directory by default, an absolute one as it is', () => {
      const { root, dir } = makeBlueprint();
      touchAll(root, T0);
      touch(join(dir, 'STATE.json'), T1);
      touch(join(root, 'docs', 'requirements.md'), T2);
      assert.deepEqual(listed(run(['changed', dir], { cwd: root })), ['none', 'S-01 · docs/requirements.md']);

      const absolute = join(root, 'docs', 'requirements.md');
      edit(dir, '00-sources.md', (text) => text.replace('| `docs/requirements.md` |', `| \`${absolute}\` |`));
      touch(join(dir, '00-sources.md'), T0);
      assert.deepEqual(listed(run(['changed', dir], { cwd: dir })), ['none', `S-01 · ${absolute}`]);
    });

    it('lists a document source it cannot find — moved, deleted, or read from the wrong root', () => {
      const { root, dir } = makeBlueprint();
      touchAll(root, T0);
      touch(join(dir, 'STATE.json'), T1);
      const fromBlueprint = run(['changed', dir], { cwd: dir });
      assert.equal(fromBlueprint.status, 0);
      assert.equal(fromBlueprint.stdout, [
        'Changed in the blueprint folder since STATE.json was last written:',
        '  none',
        'Changed document sources:',
        '  none',
        `Document sources not found (a relative location is read from ${realpathSync(dir)}):`,
        '  S-01 · docs/requirements.md',
        '',
      ].join('\n'));
      rmSync(join(root, 'docs', 'requirements.md'));
      assert.deepEqual(listed(run(['changed', dir, '--root', root])), ['none', 'none', 'S-01 · docs/requirements.md']);
    });
  });

  describe('validate', () => {
    it('passes the clean fixture', () => {
      const { dir } = makeBlueprint();
      const result = run(['validate', dir]);
      assert.equal(result.stdout, '0 errors, 0 warnings\n');
      assert.equal(result.status, 0);
    });

    it('does not check a source\'s own ids, ids in code, {{…}}, URLs or link targets, or ids narrower than their kind', () => {
      const { dir } = makeBlueprint();
      append(dir, 'modules/organization.md', [
        '',
        'Kept from S-01 §D-140 and §G-07; the source\'s D-77 and G-1; `(D-014)`; {{see D-099}}.',
        'Read [the notes](notes/D-123-call.md) and https://wiki.example.com/S-99/page first.',
        '', '```text', '(D-555) [?Q-002] ORG-C?? [A-??]', '```', '',
      ].join('\n'));
      const result = run(['validate', dir]);
      assert.equal(result.status, 0, result.stdout);
      assert.deepEqual(findings(result, 'warning'), [
        `warning: modules/organization.md:${lineOf(dir, 'modules/organization.md', 'Kept from')} — 1 template placeholder ({{…}}) left, the first on this line`,
      ]);
    });

    it('reports a STATE.json that is missing, does not parse or is not a blueprint\'s', () => {
      for (const [content, expected] of [
        [null, /^error: STATE\.json — not found$/],
        ['{ "kind": ', /^error: STATE\.json — does not parse \(/],
        ['{ "kind": "backlog" }\n', /^error: STATE\.json — is not a blueprint's: kind "backlog"$/],
      ]) {
        const { dir } = makeBlueprint();
        if (content === null) rmSync(join(dir, 'STATE.json'));
        else write(join(dir, 'STATE.json'), content);
        const result = run(['validate', dir]);
        assert.equal(result.status, 1);
        assert.equal(findings(result, 'error').length, 1, result.stdout);
        assert.match(findings(result, 'error')[0], expected);
      }
    });

    it('reports an id with two rows in its log table', () => {
      for (const [file, id] of [['00-sources.md', 'S-02'], ['DECISIONS.md', 'D-002'], ['ASSUMPTIONS.md', 'A-001'],
        ['OPEN-QUESTIONS.md', 'Q-001'], ['01-brief.md', 'G-01'], ['01-brief.md', 'N-01'], ['01-brief.md', 'RK-01']]) {
        const { dir } = makeBlueprint();
        const line = lineOf(dir, file, `| ${id} |`);
        edit(dir, file, (text) => text.replace(new RegExp(`(\\| ${id} \\|.*\\n)`), '$1$1'));
        assertErrors(run(['validate', dir]), [`error: ${file}:${line + 1} — ${id} has a second row (the first is on line ${line})`]);
      }
    });

    it('reports every cited id that no table defines, at its file and line', () => {
      const { dir } = makeBlueprint();
      const file = 'modules/organization.md';
      append(dir, file, '\nSee (S-07) (D-009) [A-004] [?Q-009] G-07 N-05 RK-03, and (D-009) once more.\n');
      append(dir, '00-sources.md', '\n## S-03 — A section with no row in the registry\n');
      const line = lineOf(dir, file, 'See (S-07)');
      assertErrors(run(['validate', dir]), [
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '## S-03')} — S-03 has no row in the sources table of 00-sources.md`,
        `error: ${file}:${line} — S-07 has no row in the sources table of 00-sources.md`,
        `error: ${file}:${line} — D-009 has no row in DECISIONS.md`,
        `error: ${file}:${line} — A-004 has no row in ASSUMPTIONS.md`,
        `error: ${file}:${line} — Q-009 has no row in OPEN-QUESTIONS.md`,
        `error: ${file}:${line} — G-07 has no row in 01-brief.md`,
        `error: ${file}:${line} — N-05 has no row in 01-brief.md`,
        `error: ${file}:${line} — RK-03 has no row in 01-brief.md`,
      ]);
    });

    it('reports a [?Q-] marker for a closed question', () => {
      const { dir } = makeBlueprint();
      append(dir, 'modules/organization.md', '\nWhether teams split is still open [?Q-002].\n');
      const line = lineOf(dir, 'modules/organization.md', '[?Q-002]');
      assertErrors(run(['validate', dir]), [
        `error: modules/organization.md:${line} — [?Q-002] marks a question that is closed → D-002; write the outcome in its place`,
      ]);
    });

    it('reports a capability named in the documents that no module has as a heading, but not in history files', () => {
      const { dir } = makeBlueprint();
      append(dir, 'modules/organization.md', '\n**Depends on:** BIL-C04 · Send an invoice, and ORG-C01\n');
      append(dir, 'DECISIONS.md', '\nBIL-C04 was folded into ORG-C01.\n');
      write(join(dir, 'modules', 'removed', 'legacy.md'), '# Legacy\n\n#### LEG-C01 · Old thing\n\nSee BIL-C04.\n');
      assertErrors(run(['validate', dir]), [
        `error: modules/organization.md:${lineOf(dir, 'modules/organization.md', 'BIL-C04 · Send')} — BIL-C04 names a capability that no module file has as a heading`,
      ]);
    });

    it('reports a capability id used as a heading twice', () => {
      const { dir } = makeBlueprint();
      append(dir, 'modules/organization.md', '\n#### ORG-C01 · Invite a member, again\n**Source:** ORG-01\n');
      const first = lineOf(dir, 'modules/organization.md', '#### ORG-C01');
      const second = lineOf(dir, 'modules/organization.md', '#### ORG-C01 · Invite a member, again');
      assertErrors(run(['validate', dir]), [
        `error: modules/organization.md:${second} — ORG-C01 is already a heading at modules/organization.md:${first}`,
      ]);
    });

    it('reports a capability placeholder and an assumption placeholder left in the text', () => {
      const { dir } = makeBlueprint();
      const file = 'modules/organization.md';
      append(dir, file, '\n#### ORG-C?? · Export the member list\n**Refs:** (S-01) [A-??: edge cases]\n');
      assertErrors(run(['validate', dir]), [
        `error: ${file}:${lineOf(dir, file, 'ORG-C??')} — capability placeholder ORG-C?? left; number it with next capability`,
        `error: ${file}:${lineOf(dir, file, '[A-??')} — assumption placeholder [A-??: edge cases] left; give it an id with next assumption`,
      ]);
    });

    it('reports a source placeholder a researcher left in a profile, once the page should be registered', () => {
      const { dir } = makeBlueprint();
      const file = 'references/competitors/acme.md';
      write(join(dir, file), '# Acme\n\n**Who it is for:** small teams (S-?? https://acme.example/about) [web]\n');
      assertErrors(run(['validate', dir]), [
        `error: ${file}:${lineOf(dir, file, 'S-??')} — id placeholder S-?? left; give it an id with next source`,
      ]);
    });

    it('reports a module without its file and a module file that no module points to', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.modules.push({
          name: 'Billing', slug: 'billing', code: 'BIL', file: 'modules/billing.md', stage: 'next', surfaces: ['web'],
          sources: ['S-02'], lastCapability: 0, l2: 'pending', l3: 'pending',
        });
      });
      write(join(dir, 'modules', 'stray.md'), '# Stray\n');
      assertErrors(run(['validate', dir]), [
        `error: STATE.json:${lineOf(dir, 'STATE.json', '"slug": "billing"')} — module Billing has no file modules/billing.md`,
        'error: modules/stray.md — no module in STATE.json points to this file',
      ]);
    });

    it('needs no file for a removed module or one out of scope', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.modules.push({ name: 'Legacy', slug: 'legacy', code: 'LEG', file: 'modules/legacy.md', stage: 'MVP', lastCapability: 0, removed: 'D-002' });
        state.modules.push({ name: 'Reports', slug: 'reports', code: 'REP', file: 'modules/reports.md', stage: 'out of scope', lastCapability: 0 });
      });
      const result = run(['validate', dir]);
      assert.equal(result.status, 0, result.stdout);
    });

    it('reports lastCapability lower than the highest number used under its code anywhere', () => {
      const { dir } = makeBlueprint();
      const line = lineOf(dir, 'STATE.json', '"slug": "organization"');
      changeState(dir, (state) => {
        state.modules[0].lastCapability = 1;
      });
      assertErrors(run(['validate', dir]), [`error: STATE.json:${line} — ORG lastCapability is 1, but ORG-C02 is in use; raise it to 2`]);
      changeState(dir, (state) => {
        state.modules[0].lastCapability = 2;
      });
      write(join(dir, 'CHANGELOG.md'), CHANGELOG);
      assertErrors(run(['validate', dir]), [`error: STATE.json:${line} — ORG lastCapability is 2, but ORG-C05 is in use; raise it to 5`]);
    });

    it('reports counts that differ from a recount', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.counts.decisions = 5;
        delete state.counts.risks;
      });
      assertErrors(run(['validate', dir]), [
        `error: STATE.json:${lineOf(dir, 'STATE.json', '"counts"')} — counts differ from the files (decisions 5 → 2, risks missing → 1); run stamp`,
      ]);
    });

    it('reports an index item without a Coverage row that says what covers it', () => {
      const { dir } = makeBlueprint();
      const expected = () => [
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '| ORG-01 | Invite')} — S-01 ORG-01 is not covered: no Coverage row says what deals with it`,
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '| ORG-02 | Recalculate')} — S-01 ORG-02 is not covered: no Coverage row says what deals with it`,
      ];
      edit(dir, '00-sources.md', (text) => text
        .replace('| S-01 | ORG-02 | ORG-C02 | |\n', '')
        .replace('| S-01 | ORG-01 | ORG-C01 | |', '| S-01 | ORG-01 | — | |'));
      assertErrors(run(['validate', dir]), expected());
      edit(dir, '00-sources.md', (text) => text.replace('| S-01 | ORG-01 | — | |', '| S-01 | ORG-01 | not covered | |'));
      assertErrors(run(['validate', dir]), expected());
    });

    it('checks coverage only once the consistency review has started, rows or no rows', () => {
      const { dir } = makeBlueprint();
      edit(dir, '00-sources.md', (text) => text.replace(/\| S-01 \| ORG-02 \| ORG-C02 \| \|\n/, ''));
      changeState(dir, (state) => {
        state.phases.consistency = 'pending';
      });
      assert.equal(run(['validate', dir]).status, 0, 'a row written before phase 6 blocks nothing');
      edit(dir, '00-sources.md', (text) => text.replace(/\| S-01 \| ORG-01 \| ORG-C01 \| \|\n/, ''));
      changeState(dir, (state) => {
        state.phases.consistency = 'in-progress';
      });
      assertErrors(run(['validate', dir]), [
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '| ORG-01 | Invite')} — S-01 ORG-01 is not covered: no Coverage row says what deals with it`,
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '| ORG-02 | Recalculate')} — S-01 ORG-02 is not covered: no Coverage row says what deals with it`,
      ]);
    });

    it('reads an index written as a heading, every table under it, and an item without an id by its title', () => {
      const { dir } = makeBlueprint();
      edit(dir, '00-sources.md', (text) => text
        .replace('**Index** — only for a catalogue; not capped', '#### Index')
        .replace('| ORG-02 | Recalculate totals | requirements › Totals | keep |\n', [
          '| ORG-02 | Recalculate totals | requirements › Totals | keep |', '', 'Roles, which have no ids:', '',
          '| Id | Role | Where | Status |', '|----|------|-------|--------|', '| none | Auditor | requirements › Roles | keep |', '',
        ].join('\n')));
      assertErrors(run(['validate', dir]), [
        `error: 00-sources.md:${lineOf(dir, '00-sources.md', '| none | Auditor')} — S-01 Auditor is not covered: no Coverage row says what deals with it`,
      ]);
      append(dir, '00-sources.md', '| S-01 | Auditor | Roles and access › Auditor | |\n');
      assert.equal(run(['validate', dir]).status, 0);
    });

    it('warns when an index lists the same item twice', () => {
      const { dir } = makeBlueprint();
      edit(dir, '00-sources.md', (text) => text.replace('| ORG-02 | Recalculate totals | requirements › Totals | keep |',
        '| ORG-02 | Recalculate totals | requirements › Totals | keep |\n| ORG-02 | Recalculate totals again | requirements › Totals | later |'));
      const result = run(['validate', dir]);
      assert.equal(result.status, 0, result.stdout);
      assert.deepEqual(findings(result, 'warning'), [
        `warning: 00-sources.md:${lineOf(dir, '00-sources.md', 'totals again')} — the index lists S-01 ORG-02 2 times; key each item by its own id, or by its title when it has none`,
      ]);
    });

    it('warns on an open point, template placeholders, a Coverage row for no item and a section with no row', () => {
      const { dir } = makeBlueprint();
      append(dir, 'modules/organization.md', '\n## Open points\n\n- [?pending] Who pays for invitations?\n');
      append(dir, 'GLOSSARY.md', '\n{{owner}} decides on {{terms}}.\n');
      append(dir, '00-sources.md', '| S-01 | ORG-09 | ORG-C01 | |\n');
      append(dir, 'DECISIONS.md', '\n## D-003 — Not in the index yet\n');
      const result = run(['validate', dir]);
      assert.equal(result.status, 0, result.stdout);
      assert.deepEqual(findings(result, 'warning'), [
        `warning: DECISIONS.md:${lineOf(dir, 'DECISIONS.md', '## D-003')} — D-003 has a section but no row in the index table`,
        `warning: GLOSSARY.md:${lineOf(dir, 'GLOSSARY.md', '{{owner}}')} — 2 template placeholders ({{…}}) left, the first on this line`,
        `warning: modules/organization.md:${lineOf(dir, 'modules/organization.md', '[?pending]')} — [?pending] open point`,
        `warning: 00-sources.md:${lineOf(dir, '00-sources.md', 'ORG-09')} — Coverage names S-01 ORG-09, which no index lists`,
      ]);
      assert.match(result.stdout, /\n0 errors, 4 warnings\n$/);
    });
  });

  describe('export', () => {
    it('writes one document: headings one level down, files in order, the module in place, comments gone', () => {
      const { dir } = makeBlueprint();
      const result = run(['export', dir]);
      assert.equal(result.status, 0, result.stderr);
      const out = join(dir, 'export', 'blueprint.md');
      assert.equal(result.stdout, `${out}\n`);
      const text = readFileSync(out, 'utf8');
      assert.ok(text.startsWith('# Fixture — Blueprint\n\nOne document made from the blueprint folder: phase consistency · '
        + 'depth standard · updated 2026-10-02T09:30 · 8 files.\n\n---\n\n## Contents\n'), text.slice(0, 300));
      assert.equal(text.indexOf('Fixture — Blueprint', 3), -1, 'the README\'s title is not repeated under the document\'s');
      const at = (heading) => text.indexOf(`\n---\n\n${heading}\n`);
      const order = ['## Brief', '## Architecture', '## Organization', '## Decisions', '## Open questions', '## Assumptions', '## Glossary'].map(at);
      assert.ok(order.every((position, i) => position > 0 && (i === 0 || position > order[i - 1])), order.join(' '));
      assert.match(text, /^### Purpose$/m);
      assert.match(text, /^#### Members$/m);
      assert.match(text, /^##### ORG-C01 · Invite a team member$/m);
      assert.doesNotMatch(text, /^# Brief$/m);
      assert.doesNotMatch(text, /<!--|-->/);
      assert.doesNotMatch(text, /^## Sources$/m);
      assert.ok(text.endsWith('| Team | The people of one organization | group | (S-01) |\n'));
    });

    it('turns links to local files into their text, keeps web links and anchors, adds the competitor profiles', () => {
      const { dir } = makeBlueprint();
      write(join(dir, 'references', 'competitors', 'acme.md'), '# Acme\n\nSee [the brief](../../01-brief.md).\n');
      run(['export', dir]);
      const local = readFileSync(join(dir, 'export', 'blueprint.md'), 'utf8');
      assert.ok(local.includes('| Organization | ORG |'));
      assert.ok(local.includes('| 01-brief.md |'));
      assert.ok(local.indexOf('\n## Acme\n') > local.indexOf('\n## Glossary\n'), 'profiles come last');
      assert.ok(local.includes('See the brief.'));

      // A folder two levels below the blueprint's root, so every relative link has to be re-aimed
      const out = join(dir, 'export', 'share', 'blueprint.md');
      assert.equal(run(['export', dir, '--out', out]).stdout, `${out}\n`);
      const shared = readFileSync(out, 'utf8');
      assert.equal(shared.includes(']('.concat('../')), false, 'no link points into a folder the reader does not have');
      assert.ok(shared.includes('the goals'));
      assert.ok(shared.includes('[Purpose](#purpose)'));
      assert.ok(shared.includes('[the guide](https://example.com/guide)'));
    });

    it('leaves fenced code alone, caps headings at six, shifts a setext heading, keeps text between comments', () => {
      const { dir } = makeBlueprint();
      append(dir, 'GLOSSARY.md', [
        '', '###### Deepest', '', 'Setext title', '============', '',
        '<!-- a note --> Kept between two comments.', '<!-- another,', 'on two lines -->', '',
        '```text', '# not a heading', '<!-- kept: it is code -->', '[link](modules/organization.md)', '```', '',
      ].join('\n'));
      assert.equal(run(['export', dir]).status, 0);
      const text = readFileSync(join(dir, 'export', 'blueprint.md'), 'utf8');
      assert.match(text, /^###### Deepest$/m);
      assert.match(text, /^## Setext title$/m);
      assert.match(text, /^ Kept between two comments\.\n\n```text\n/m);
      assert.ok(!text.includes('<!-- a note') && !text.includes('on two lines'));
      assert.ok(text.includes('```text\n# not a heading\n<!-- kept: it is code -->\n[link](modules/organization.md)\n```'));
    });

    it('follows the STATE order of modules, leaves out removed ones, puts the sources after the README', () => {
      const { dir } = makeBlueprint();
      changeState(dir, (state) => {
        state.modules.unshift({ name: 'Zeta', slug: 'zeta', code: 'ZET', file: 'modules/zeta.md', stage: 'later', lastCapability: 0 });
        state.modules.push({ name: 'Legacy', slug: 'legacy', code: 'LEG', file: 'modules/legacy.md', stage: 'MVP', lastCapability: 0, removed: 'D-002' });
      });
      write(join(dir, 'modules', 'zeta.md'), '# Zeta\n');
      write(join(dir, 'modules', 'legacy.md'), '# Legacy\n');
      const out = join(dir, 'export', 'full.md');
      assert.equal(run(['export', dir, '--with-sources', '--out', out]).status, 0);
      const text = readFileSync(out, 'utf8');
      const at = (heading) => text.indexOf(`\n${heading}\n`);
      assert.ok(at('## Contents') < at('## Sources') && at('## Sources') < at('## Brief'));
      assert.ok(at('## Zeta') > 0 && at('## Zeta') < at('## Organization'));
      assert.equal(at('## Legacy'), -1);
      assert.match(text, /^### S-01 — Requirements$/m);
    });

    it('refuses an --out outside the blueprint folder and writes nothing there', () => {
      const { root, dir } = makeBlueprint();
      // A sibling whose name starts with the folder's own must not pass for a path inside it
      for (const out of [join(root, 'x.md'), join(root, 'share'), `${dir}-copy/x.md`]) {
        const result = run(['export', dir, '--out', out]);
        assert.equal(result.status, 1, out);
        assert.match(result.stderr, /is outside the blueprint folder .*; the export stays inside it/);
      }
      for (const path of [join(root, 'x.md'), join(root, 'share'), `${dir}-copy`]) assert.ok(!existsSync(path), `${path} was written`);
    });
  });

  describe('usage', () => {
    it('prints the usage and exits 2 without a command, with an unknown one, without a folder or with a stray argument', () => {
      const { dir } = makeBlueprint();
      for (const args of [[], ['frobnicate', dir], ['stamp'], ['validate', dir, '--out', 'x.md'], ['stamp', dir, 'extra']]) {
        const result = run(args);
        assert.equal(result.status, 2, args.join(' '));
        assert.match(result.stderr, /^\[dev-assistant\] blueprint: .*\nUsage: node bin\/blueprint\.mjs <command> <dir> \[args\]\n/);
      }
    });
  });
});
