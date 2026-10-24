// bin/backlog.mjs does the /backlog skill's bookkeeping. These tests build a small backlog cut from a small
// blueprint — batch 01 (T-001 done, T-002 in progress, T-003 ready, T-004 blocked by Q-001), batch 02 (T-005
// waiting on T-002 and on an outside blocker, built on Q-003's provisional choice; T-006 ready, on mobile) and an
// outline batch 03 (T-007, no file yet) — and run every command on it: status and next on the clean fixture and
// on the states their procedure branches on, next-id, tick, render's views, and validate once per break.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs } from './helpers.mjs';

const SCRIPT = fileURLToPath(new URL('../bin/backlog.mjs', import.meta.url));
const NOW = '2026-10-14T16:20';

const BLUEPRINT_STATE = {
  kind: 'blueprint',
  project: 'Fixture',
  updated: '2026-10-02T09:30',
  depth: 'standard',
  phase: 'done',
  phases: { capabilities: 'approved', consistency: 'approved', adequacy: 'approved' },
  counts: { capabilities: 9 },
  modules: [],
};

const OPEN_QUESTIONS = `# Open questions

| Id | Date | Phase | Question | Where | Status |
|----|------|-------|----------|-------|--------|
| Q-001 | 2026-10-01 | brief | Who may approve an invitation? | 01-brief.md › Roles | open |
| Q-002 | 2026-10-01 | brief | Does sign-in need a second factor? | 01-brief.md › Access | closed → D-002 |
| Q-003 | 2026-10-04 | modules | Which mail provider sends invitations? | modules/accounts.md › Invite | open |
`;

const STATE = {
  kind: 'backlog',
  version: 2,
  project: 'Fixture',
  created: '2026-10-03',
  updated: '2026-10-03T10:00',
  blueprint: {
    path: '../blueprint',
    adequacyApprovedAtInit: true,
    fingerprint: {
      updated: '2026-10-02T09:30', phase: 'done', depth: 'standard', counts: { capabilities: 9 },
      openQuestions: ['Q-001', 'Q-002'], modules: [], takenAt: '2026-10-03T10:00',
    },
  },
  repositories: ['backend'],
  strategy: {},
  lastTask: 7,
  batches: [
    { id: '01', slug: 'sign-in', stage: 'MVP', flow: 'Flow 1 — Sign in', detailed: true, closed: null },
    { id: '02', slug: 'invite', stage: 'MVP', flow: 'widening of 01', detailed: true, closed: null },
    { id: '03', slug: 'export', stage: 'next', flow: null, detailed: false, closed: null },
  ],
  currentBatch: '01',
  currentPinned: null,
  pending: null,
};

const HEADER = `| # | Task | Title | Capabilities | Module | Platforms | Type | Priority | Size | Depends | Status |
|---|------|-------|--------------|--------|-----------|------|----------|------|---------|--------|`;

const batchFile = (id, title, stateLine, rows) => `# Batch ${id} — ${title}

${stateLine}

## Goal

The step forward of batch ${id}.

## What works after this batch

A member of an organisation signs in with email and sees their dashboard.

## Tasks

${HEADER}
${rows.join('\n')}

## Not in this batch

- exports → batch 03

## Notes

- none yet
`;

const taskFile = ({
  id, title, batch, status = 'todo', capabilities = [], platforms = ['web'], priority = 'P1', size = 'M',
  depends = '[]', blockedBy = [], review = '', subtasks, criteria = ['- [ ] the member sees the result'], notes = '- none',
}) => `---
id: ${id}
title: ${title}
module: ACC            # the blueprint's module code; a chore may have —
submodule: Team
capabilities: [${capabilities.join(', ')}]  # blueprint capability ids
source_items: []
platforms: [${platforms.join(', ')}]           # exactly one platform
type: feature              # feature | foundation | …
priority: ${priority}
size: ${size}
batch: "${batch}"
status: ${status}               # todo | in-progress | done | dropped
depends: ${depends}
blocked_by: [${blockedBy.map((item) => JSON.stringify(item)).join(', ')}]
review: ${review}
refs: []
source: blueprint
---

## What the user gets

Someone can do something.

## Subtasks

${subtasks.map(([mark, n, text, doneWhen]) => `- [${mark}] ${id}.${n} — ${text}\n      done when: ${doneWhen}`).join('\n')}

## Acceptance criteria

${criteria.join('\n')}

## How to verify

Sign in as the owner and look.

## Notes

${notes}
`;

const TASKS = {
  'T-001-skeleton.md': taskFile({
    id: 'T-001', title: 'Walking skeleton', batch: '01', status: 'done', capabilities: ['ORG-C01'], priority: 'P0', size: 'S',
    subtasks: [['x', 1, 'The app runs', 'the empty app opens'], ['x', 2, 'Deploys', 'a push deploys it']],
    criteria: ['- [x] the empty app opens'],
  }),
  'T-002-sign-in.md': taskFile({
    id: 'T-002', title: 'Sign in with email', batch: '01', status: 'in-progress', capabilities: ['ACC-C01'], priority: 'P0',
    depends: '[T-001]',
    subtasks: [['x', 1, 'The form', 'a member signs in'], [' ', 2, 'Rules: lockout', 'five failures lock the account'], [' ', 3, 'Edge cases: expired link', 'an expired link says so']],
    criteria: ['- [ ] a member signs in', '- [ ] five failures lock the account'],
  }),
  'T-003-dashboard.md': taskFile({
    id: 'T-003', title: 'See the dashboard', batch: '01', capabilities: ['ACC-C02'], depends: '\n  - T-001',
    subtasks: [[' ', 1, 'The empty dashboard', 'it opens after sign-in'], [' ', 2, 'The figures', 'the figures show']],
  }),
  'T-004-approve.md': taskFile({
    id: 'T-004', title: 'Approve an invitation', batch: '01', capabilities: ['ACC-C03'], blockedBy: ['Q-001'], priority: 'P2',
    subtasks: [[' ', 1, 'Approve', 'an approver approves']],
  }),
  'T-005-invite.md': taskFile({
    id: 'T-005', title: 'Invite a member', batch: '02', capabilities: ['ACC-C04'], depends: '[T-002]',
    blockedBy: ['ext: credentials for the mail sandbox (2026-10-01)'],
    subtasks: [[' ', 1, 'Send the invitation', 'the invitee gets a letter']],
    notes: '- built on the provisional choice of Q-003: the provider is the one the backend has',
  }),
  'T-006-invite-mobile.md': taskFile({
    id: 'T-006', title: 'Invite a member on the phone', batch: '02', capabilities: ['ACC-C04', 'ACC-C05'], platforms: ['mobile'],
    subtasks: [[' ', 1, 'Send it from the phone', 'the invitee gets a letter'], [' ', 2, 'Share a link', 'the link opens the app']],
  }),
};

const BATCHES = {
  '01-sign-in.md': batchFile('01', 'Members sign in', 'MVP · Flow 1 — Sign in · detailed: yes · todo', [
    '| 1 | [T-001](../tasks/T-001-skeleton.md) | Walking skeleton | ORG-C01 | ACC | web | foundation | P0 | S | — | todo |',
    '| 2 | [T-002](../tasks/T-002-sign-in.md) | Sign in | ACC-C01 | ACC | web | feature | P0 | M | T-001 | todo |',
    '| 3 | [T-003](../tasks/T-003-dashboard.md) | See the dashboard | ACC-C02 | ACC | web | feature | P1 | M | T-001 | todo |',
    '| 4 | [T-004](../tasks/T-004-approve.md) | Approve an invitation | ACC-C03 | ACC | web | feature | P2 | M | — | todo |',
  ]),
  '02-invite.md': batchFile('02', 'Members invite others', 'MVP · widening of 01 · detailed: yes · todo', [
    '| 1 | [T-005](../tasks/T-005-invite.md) | Invite a member | ACC-C04 | ACC | web | feature | P1 | M | T-002 | todo |',
    '| 2 | [T-006](../tasks/T-006-invite-mobile.md) | Invite on the phone | ACC-C04, ACC-C05 | ACC | mobile | feature | P1 | M | — | todo |',
  ]),
  '03-export.md': batchFile('03', 'Exports', 'next · detailed: no · outline', [
    '| 1 | T-007 | Export the members | ORG-C03 | ORG | web | feature | P2 | M? | T-002 | outline |',
  ]),
};

const COVERAGE = `# Coverage

Every capability in the blueprint, by id.

Blueprint 2026-10-02T09:30 · 0 capabilities: 0 planned · 0 covered · 0 done · 0 outline · 0 list-only · 0 exists · 0 partly · 0 deferred · 0 gaps · 0 dropped

## Capabilities → tasks

| Id | Capability | Module › Sub-module | Surfaces | Stage | R/E/S | Q | Task(s) | Status |
|----|------------|---------------------|----------|-------|-------|---|---------|--------|
| ORG-C01 | Run the app | ORG › Core | web | MVP | 0/0/0 | — | | planned — batch 01 |
| ACC-C01 | Sign in | ACC › Access | web | MVP | 2/1/0 | — | | planned — batch 01 |
| ACC-C02 | See the dashboard | ACC › Home | web | MVP | 1/0/0 | — | | planned — batch 01 |
| ACC-C03 | Approve an invitation | ACC › Team | web | MVP | 1/0/0 | Q-001 | | planned — batch 01 |
| ACC-C04 | Invite a member | ACC › Team | web, mobile | MVP | 1/1/0 | Q-003 | | planned — batch 02 |
| ACC-C05 | Share an invitation link | ACC › Team | mobile | MVP | 0/0/0 | — | | planned — batch 02 |
| ORG-C03 | Export the members | ORG › Export | web | next | —/—/— | — | | outline — batch 03 |
| ORG-C04 | Audit log | ORG › Audit | web | MVP | 1/0/0 | — | — | exists — backend |
| ORG-C05 | Bulk import | ORG › Import | web | MVP | 1/0/0 | — | — | deferred: not needed for the pilot (P-004) |

## Tasks without a capability

| Task | Type | Source | Why it exists |
|------|------|--------|---------------|
`;

const write = (root, files) => {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  }
};

const BASE = Math.floor(Date.now() / 1000) - 600;
const touch = (path, offset) => utimesSync(path, BASE + offset, BASE + offset);
const filesUnder = (dir, rel = '') => readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((entry) => (entry.isDirectory()
  ? filesUnder(dir, join(rel, entry.name)) : [join(rel, entry.name)]));

/**
 * The fixture under a fresh root: the blueprint in docs/blueprint, the backlog in docs/backlog, every file older
 * than its folder's STATE.json — as right after a mode wrote STATE.json last. `change(files)` edits the files first.
 */
const makeBacklog = ({ state = STATE, change = () => {} } = {}) => {
  const root = makeTempDir();
  const files = {
    'docs/blueprint/STATE.json': BLUEPRINT_STATE,
    'docs/blueprint/OPEN-QUESTIONS.md': OPEN_QUESTIONS,
    'docs/backlog/STATE.json': state,
    'docs/backlog/COVERAGE.md': COVERAGE,
    ...Object.fromEntries(Object.entries(TASKS).map(([name, text]) => [`docs/backlog/tasks/${name}`, text])),
    ...Object.fromEntries(Object.entries(BATCHES).map(([name, text]) => [`docs/backlog/batches/${name}`, text])),
  };
  change(files);
  write(root, files);
  for (const file of filesUnder(root)) touch(join(root, file), file.endsWith('STATE.json') ? 60 : 0);
  return { root, dir: join(root, 'docs/backlog'), blueprint: join(root, 'docs/blueprint') };
};

const run = (args, { cwd, env = {} } = {}) => {
  const result = spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8', env: { ...process.env, BACKLOG_NOW: NOW, ...env } });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

const ok = (result) => {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const replaceIn = (files, path, from, to) => {
  assert.ok(files[path].includes(from), `${path} does not contain ${from}`);
  files[path] = files[path].replace(from, to);
};

describe('backlog.mjs', () => {
  after(removeTempDirs);

  describe('validate', () => {
    it('passes the clean fixture', () => {
      const { dir } = makeBacklog();
      assert.match(ok(run(['validate', dir])), /The task files, the batch tables and STATE\.json agree\./);
    });

    const breaks = [
      ['a task whose batch has no row', (files) => replaceIn(files, 'docs/backlog/batches/01-sign-in.md', '| 4 | [T-004](../tasks/T-004-approve.md) | Approve an invitation | ACC-C03 | ACC | web | feature | P2 | M | — | todo |\n', ''),
        /error: tasks\/T-004-approve\.md — batch 01 has no row for T-004/],
      ['a ticked subtask on a todo task', (files) => replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', '- [ ] T-003.1', '- [x] T-003.1'),
        /error: tasks\/T-003-dashboard\.md — a subtask is ticked but the task is todo/],
      ['a dependency on a later batch', (files) => replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', '  - T-001', '  - T-005'),
        /error: tasks\/T-003-dashboard\.md — T-003 depends on T-005, which is in a later batch \(02\)/],
      ['a dependency that is not in the backlog', (files) => replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', 'depends: [T-001]', 'depends: [T-001, T-099]'),
        /error: tasks\/T-002-sign-in\.md — T-002 depends on T-099, which is not in the backlog/],
      ['a dependency cycle', (files) => replaceIn(files, 'docs/backlog/tasks/T-001-skeleton.md', 'depends: []', 'depends: [T-002]'),
        /error: tasks\/T-00[12]-[\w-]+\.md — a dependency cycle: T-00[12] → T-00[12] → T-00[12]/],
      ['a status that is none of the four', (files) => replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', 'status: todo', 'status: ready'),
        /error: tasks\/T-003-dashboard\.md — status "ready" is none of todo, in-progress, done, dropped/],
      ['an id its file name does not give', (files) => replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', 'id: T-003', 'id: T-030'),
        /error: tasks\/T-003-dashboard\.md — its id T-030 is not the one its file name gives \(T-003\)/],
      ['a task whose row sits in another batch', (files) => replaceIn(files, 'docs/backlog/tasks/T-006-invite-mobile.md', 'batch: "02"', 'batch: "01"'),
        /error: tasks\/T-006-invite-mobile\.md — its batch is 01, but its row is in batch 02/],
    ];

    for (const [name, change, expected] of breaks) {
      it(`reports ${name}`, () => {
        const { dir } = makeBacklog({ change });
        const result = run(['validate', dir]);
        assert.equal(result.status, 1, result.stdout);
        assert.match(result.stdout, expected);
      });
    }

    it('reports a dependency on a dropped task by name', () => {
      const { dir } = makeBacklog({ change: (files) => replaceIn(files, 'docs/backlog/tasks/T-001-skeleton.md', 'status: done', 'status: dropped') });
      const result = run(['validate', dir]);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /error: tasks\/T-002-sign-in\.md — T-002 depends on T-001, which is dropped/);
      assert.match(result.stdout, /error: tasks\/T-003-dashboard\.md — T-003 depends on T-001, which is dropped/);
    });

    it('stops on a STATE.json that is missing, does not parse or is another skill\'s', () => {
      for (const content of [null, '{ not json', { kind: 'blueprint' }]) {
        const { dir } = makeBacklog();
        if (content === null) rmSync(join(dir, 'STATE.json'));
        else write(dir, { 'STATE.json': content });
        const result = run(['validate', dir]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /\[dev-assistant\] backlog: .*STATE\.json (not found|does not parse|is not a backlog's)/);
      }
    });
  });

  describe('status', () => {
    it('reports the batches, what is in progress, ready and blocked, and the blueprint checks', () => {
      const { root, dir } = makeBacklog();
      const out = ok(run(['status', dir, '--root', root]));
      assert.match(out, /^Backlog Fixture · updated 2026-10-03T10:00 · current batch 01\n/);
      assert.match(out, /\nHand edits since STATE\.json was last written: none\n/);
      assert.match(out, /\nBlueprint \.\.\/blueprint: as at the last sync \(2026-10-02T09:30\)\.\n/);
      assert.match(out, /\n {2}questions opened since the sync: Q-003 — Which mail provider sends invitations\?\n/);
      assert.match(out, /\n {2}questions closed since the sync: Q-002\n/);
      assert.doesNotMatch(out, /unrecorded edits/);
      assert.match(out, /\n {2}01 sign-in · MVP · in progress · 4 tasks: 1 done · 1 in progress · 1 ready · 0 todo · 1 blocked · 0 dropped\n/);
      assert.match(out, /\n {2}02 invite · MVP · todo · 2 tasks: 0 done · 0 in progress · 1 ready · 0 todo · 1 blocked · 0 dropped\n/);
      assert.match(out, /\n {2}03 export · next · outline · 1 row, not detailed\n/);
      assert.match(out, /\nWhat works after batch 01: A member of an organisation signs in with email and sees their dashboard\.\n/);
      assert.match(out, /\nIn progress:\n {2}T-002 Sign in with email · batch 01 · next T-002\.2 Rules: lockout — done when: five failures lock the account\n/);
      assert.match(out, /\nReady:\n {2}T-003 See the dashboard · P1 · M · ACC · web · first T-003\.1 The empty dashboard — done when: it opens after sign-in · batch 01\n {2}T-006 Invite a member on the phone · P1 · M · ACC · mobile · first T-006\.1 .* · batch 02\n/);
      assert.match(out, /\nBlocked by blueprint questions:\n {2}Q-001 Who may approve an invitation\? · holds up T-004 · batch 01\n {2}Q-003 Which mail provider sends invitations\? · built on its provisional choice: T-005 · batch 02\n/);
      assert.match(out, /\nBlocked outside the blueprint:\n {2}T-005 waits for credentials for the mail sandbox \(since 2026-10-01\)\n/);
      assert.match(out, /\nNeeds attention:\n {2}none\n/);
      assert.match(out, /\nNot detailed: 03\n/);
    });

    it('lists the files edited since STATE.json was last written', () => {
      const { root, dir } = makeBacklog();
      touch(join(dir, 'tasks/T-003-dashboard.md'), 120);
      assert.match(ok(run(['status', dir, '--root', root])), /\nHand edits since STATE\.json was last written: tasks\/T-003-dashboard\.md\n/);
    });

    it('says when the blueprint moved, and relays the edits it has not recorded', () => {
      const { root, dir, blueprint } = makeBacklog();
      write(blueprint, { 'STATE.json': { ...BLUEPRINT_STATE, updated: '2026-10-12T11:00' } });
      touch(join(blueprint, 'STATE.json'), 60);
      touch(join(blueprint, 'OPEN-QUESTIONS.md'), 120);
      const out = ok(run(['status', dir, '--root', root]));
      assert.match(out, /\nBlueprint \.\.\/blueprint: moved — updated 2026-10-12T11:00, last synced 2026-10-02T09:30; .* — \/backlog resync\.\n/);
      assert.match(out, /\n {2}unrecorded edits — \/blueprint takes them in first, then \/backlog resync:\n {4}Changed in the blueprint folder since STATE\.json was last written:\n {6}OPEN-QUESTIONS\.md\n/);
    });

    it('names a pending mode and what the files break', () => {
      const { root, dir } = makeBacklog({
        state: { ...STATE, pending: { mode: 'detail', step: 'gate', batches: ['02'], since: '2026-10-13T09:00' } },
        change: (files) => replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', '- [ ] T-003.1', '- [x] T-003.1'),
      });
      const out = ok(run(['status', dir, '--root', root]));
      assert.match(out, /\nPending: detail stopped at gate since 2026-10-13T09:00 — \/backlog continue\n/);
      assert.match(out, /\nNeeds attention:\n {2}T-003 a subtask is ticked but the task is todo\n/);
      assert.match(out, /\nReady:\n {2}T-003 /, 'a task whose batch gate is pending is not offered — T-006 drops out');
      assert.doesNotMatch(out, /\nReady:[\s\S]*T-006[\s\S]*\nBlocked by/);
    });
  });

  describe('next', () => {
    it('shows the task in progress first, then the ready tasks of the current batch', () => {
      const { root, dir } = makeBacklog();
      const out = ok(run(['next', dir, '--root', root]));
      assert.equal(out, [
        'Current batch 01 sign-in · in progress',
        'In progress:',
        '  T-002 Sign in with email · batch 01 · next T-002.2 Rules: lockout — done when: five failures lock the account',
        'Ready in batch 01:',
        '  T-003 See the dashboard · P1 · M · ACC · web · first T-003.1 The empty dashboard — done when: it opens after sign-in',
        '',
      ].join('\n'));
    });

    it('says what the current batch waits for, and offers what is ready ahead of it', () => {
      const { root, dir } = makeBacklog({
        change: (files) => {
          replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', 'status: in-progress', 'status: todo');
          replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', '- [x] T-002.1', '- [ ] T-002.1');
          replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', 'blocked_by: []', 'blocked_by: [Q-001]');
          replaceIn(files, 'docs/backlog/tasks/T-003-dashboard.md', 'review: ', 'review: needs-review');
        },
      });
      const out = ok(run(['next', dir, '--root', root]));
      assert.match(out, /\nReady in batch 01:\n {2}none\nWaiting:\n {2}T-002 waits for Q-001\n {2}T-003 waits for needs-review\n {2}T-004 waits for Q-001\n/);
      assert.match(out, /\nAhead of batch 02 — safe, a batch never depends forward:\n {2}T-006 Invite a member on the phone /);
      assert.match(out, /\nNeeds attention:\n {2}T-003 needs-review\n/);
    });

    it('offers to close a batch that is complete', () => {
      const { root, dir } = makeBacklog({
        change: (files) => {
          for (const name of ['T-002-sign-in.md', 'T-003-dashboard.md']) {
            files[`docs/backlog/tasks/${name}`] = files[`docs/backlog/tasks/${name}`].replace(/status: [\w-]+/, 'status: done').replaceAll('- [ ]', '- [x]');
          }
          replaceIn(files, 'docs/backlog/tasks/T-004-approve.md', 'status: todo', 'status: dropped');
        },
      });
      assert.match(ok(run(['next', dir, '--root', root])), /\nBatch 01 is complete but not closed — ask whether what works holds \(mechanics\.md › Batches\)\.\n/);
    });

    it('offers to detail a current batch that is not, with the blueprint checks', () => {
      const closed = STATE.batches.map((batch) => (batch.id === '03' ? batch : { ...batch, closed: '2026-10-10' }));
      const { root, dir } = makeBacklog({ state: { ...STATE, batches: closed } });
      const out = ok(run(['next', dir, '--root', root]));
      assert.match(out, /^Current batch 03 export · outline\n1\. Batch 03 is not detailed — offer \/backlog detail 03\.\nBlueprint \.\.\/blueprint: as at the last sync/);
    });

    it('follows a pinned batch until it closes', () => {
      const { root, dir } = makeBacklog({ state: { ...STATE, currentPinned: '02' } });
      assert.match(ok(run(['next', dir, '--root', root])), /^Current batch 02 invite \(pinned\) · todo\n[\s\S]*\nReady in batch 02:\n {2}T-006 /);
    });

    it('stops while init is pending', () => {
      const { root, dir } = makeBacklog({ state: { ...STATE, pending: { mode: 'init', step: 'gate-outline', since: '2026-10-13T09:00' } } });
      assert.equal(ok(run(['next', dir, '--root', root])), 'The backlog is not cut yet: init stopped at gate-outline — /backlog continue\n');
    });
  });

  describe('next-id', () => {
    it('gives the id after lastTask and reserves it', () => {
      const { dir } = makeBacklog();
      assert.equal(ok(run(['next-id', dir])), 'T-008\n');
      assert.equal(readJson(join(dir, 'STATE.json')).lastTask, 8);
      assert.equal(ok(run(['next-id', dir, '--count', '2'])), 'T-009\nT-010\n');
      assert.equal(readJson(join(dir, 'STATE.json')).lastTask, 10);
    });

    it('goes past an id that a lost session left in tasks/ or a batch table', () => {
      const { dir } = makeBacklog({
        state: { ...STATE, lastTask: 3 },
        change: (files) => replaceIn(files, 'docs/backlog/batches/03-export.md', '| 1 | T-007 |', '| 1 | T-012 |'),
      });
      assert.equal(ok(run(['next-id', dir])), 'T-013\n');
    });
  });

  describe('tick', () => {
    it('ticks a subtask, starts a todo task, and names the next subtask', () => {
      const { dir } = makeBacklog();
      assert.equal(ok(run(['tick', dir, 'T-003.1'])), [
        'Ticked T-003.1 The empty dashboard.',
        'T-003 is in progress now.',
        'T-003: 1 of 2 subtasks closed · next T-003.2 The figures — done when: the figures show',
        '',
      ].join('\n'));
      const text = readFileSync(join(dir, 'tasks/T-003-dashboard.md'), 'utf8');
      assert.match(text, /^- \[x\] T-003\.1 — The empty dashboard$/m);
      assert.match(text, /^status: in-progress {15}# todo \| in-progress \| done \| dropped$/m);
    });

    it('asks for the acceptance criteria once every subtask is closed', () => {
      const { dir } = makeBacklog({ change: (files) => replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', '- [ ] T-002.3 — Edge cases: expired link', '- [ ] ~~T-002.3 — Edge cases: expired link~~ moved → T-005.2') });
      assert.equal(ok(run(['tick', dir, 'T-002.2'])), [
        'Ticked T-002.2 Rules: lockout.',
        'T-002: every subtask is closed — ask whether its acceptance criteria hold:',
        '  - a member signs in',
        '  - five failures lock the account',
        '',
      ].join('\n'));
    });

    it('refuses a done task, a struck subtask, an unknown one and a task id', () => {
      const { dir } = makeBacklog({ change: (files) => replaceIn(files, 'docs/backlog/tasks/T-002-sign-in.md', '- [ ] T-002.3 — Edge cases', '- [ ] ~~T-002.3 — Edge cases~~') });
      assert.match(run(['tick', dir, 'T-001.1']).stderr, /T-001 is done, and a done task is never reopened/);
      assert.match(run(['tick', dir, 'T-002.3']).stderr, /T-002\.3 is struck through/);
      assert.match(run(['tick', dir, 'T-002.9']).stderr, /has no subtask T-002\.9/);
      assert.match(run(['tick', dir, 'T-099.1']).stderr, /no task file for T-099/);
      assert.equal(run(['tick', dir, 'T-002']).status, 2);
    });
  });

  describe('render', () => {
    it('writes BACKLOG.md from the template with every table generated', () => {
      const { dir } = makeBacklog();
      ok(run(['render', dir]));
      const text = readFileSync(join(dir, 'BACKLOG.md'), 'utf8');
      assert.doesNotMatch(text, /\{\{/);
      assert.match(text, /^# Fixture — Backlog\n/);
      assert.match(text, /Work cut from the blueprint at \[\.\.\/blueprint\]\(\.\.\/blueprint\/README\.md\)/);
      assert.match(text, /Updated 2026-10-14T16:20 · current batch \*\*01\*\*\./);
      assert.match(text, /\n\| 01 \| \[sign-in\]\(batches\/01-sign-in\.md\) \| MVP \| 4 \| 1 \| 1 \| 1 \| 1 \| 0 \| yes \| in progress \|\n\| 02 \| \[invite\]\(batches\/02-invite\.md\) \| MVP \| 2 \| 0 \| 0 \| 1 \| 1 \| 0 \| yes \| todo \|\n\| 03 \| \[export\]\(batches\/03-export\.md\) \| next \| 1 \(outline\) \|  \|  \|  \|  \|  \| no \| outline \|\n/);
      assert.match(text, /## Ready now\n\n\| Task .*\n\|-.*\n\| \[T-003\]\(tasks\/T-003-dashboard\.md\) \| See the dashboard \| ACC \| web \| M \| T-003\.1 — The empty dashboard \|\n\| \[T-006\]/);
      assert.match(text, /## In progress\n\n\| Task .*\n\|-.*\n\| \[T-002\]\(tasks\/T-002-sign-in\.md\) \| Sign in with email \| T-002\.2 — Rules: lockout \|\n\n/);
      assert.match(text, /\| Q-001 — Who may approve an invitation\? \| T-004 \| — \| 01 \|\n\| Q-003 — Which mail provider sends invitations\? \| — \| T-005 \| 02 \|/);
      assert.match(text, /\| \[T-005\]\(tasks\/T-005-invite\.md\) \| credentials for the mail sandbox \| 2026-10-01 \|/);
      assert.match(text, /## Legend\n/);
    });

    it('refreshes the batch rows that have a file and the state line, and leaves an outline row as written', () => {
      const { dir } = makeBacklog();
      ok(run(['render', dir]));
      const first = readFileSync(join(dir, 'batches/01-sign-in.md'), 'utf8');
      assert.match(first, /^# Batch 01 — Members sign in\n\nMVP · Flow 1 — Sign in · detailed: yes · in progress\n/);
      assert.match(first, /\n\| 1 \| \[T-001\]\(\.\.\/tasks\/T-001-skeleton\.md\) \| Walking skeleton \| ORG-C01 \| ACC \| web \| feature \| P0 \| S \| — \| done \|\n/);
      assert.match(first, /\n\| 2 \| \[T-002\]\(\.\.\/tasks\/T-002-sign-in\.md\) \| Sign in with email \| ACC-C01 \| ACC \| web \| feature \| P0 \| M \| T-001 \| in progress \|\n/);
      assert.equal(readFileSync(join(dir, 'batches/03-export.md'), 'utf8'), BATCHES['03-export.md']);
    });

    it('fills COVERAGE.md\'s Task(s) cells, the statuses task files can tell, and the count line', () => {
      const { dir } = makeBacklog();
      ok(run(['render', dir]));
      const text = readFileSync(join(dir, 'COVERAGE.md'), 'utf8');
      const rowOf = (id) => text.split('\n').find((line) => line.startsWith(`| ${id} |`)).split('|').map((cell) => cell.trim()).slice(-3, -1);
      assert.deepEqual(rowOf('ORG-C01'), ['T-001', 'done']);
      assert.deepEqual(rowOf('ACC-C01'), ['T-002', 'covered']);
      assert.deepEqual(rowOf('ACC-C04'), ['web: T-005 · mobile: T-006', 'covered']);
      assert.deepEqual(rowOf('ORG-C03'), ['T-007', 'outline — batch 03']);
      assert.deepEqual(rowOf('ORG-C04'), ['—', 'exists — backend']);
      assert.deepEqual(rowOf('ORG-C05'), ['—', 'deferred: not needed for the pilot (P-004)']);
      assert.match(text, /^Blueprint 2026-10-02T09:30 · 9 capabilities: 0 planned · 5 covered · 1 done · 1 outline · 0 list-only · 1 exists · 0 partly · 1 deferred · 0 gaps · 0 dropped$/m);
    });

    it('stamps STATE.json last, recomputes the current batch and ends a pin on a closed batch', () => {
      const closed = STATE.batches.map((batch) => (batch.id === '01' ? { ...batch, closed: '2026-10-12' } : batch));
      const { dir } = makeBacklog({ state: { ...STATE, batches: closed, currentPinned: '01' } });
      const out = ok(run(['render', dir]));
      assert.match(out, /^Rendered BACKLOG\.md · batch files changed: 01, 02 · COVERAGE\.md: 9 rows\nCurrent batch 02 · STATE\.json updated 2026-10-14T16:20\n/);
      const state = readJson(join(dir, 'STATE.json'));
      assert.equal(state.updated, NOW);
      assert.equal(state.currentBatch, '02');
      assert.equal(state.currentPinned, null);
      assert.deepEqual(Object.keys(state), Object.keys(STATE), 'the keys keep their order');
      // Nothing is newer than STATE.json afterwards: the next hand-edit check starts clean
      assert.match(ok(run(['status', dir, '--root', dirname(dirname(dir))])), /Hand edits since STATE\.json was last written: none/);
    });

    it('changes nothing but the stamp on a second run', () => {
      const { dir } = makeBacklog();
      ok(run(['render', dir]));
      const snapshot = () => filesUnder(dir).filter((file) => file !== 'STATE.json').map((file) => readFileSync(join(dir, file), 'utf8'));
      const first = snapshot();
      assert.match(ok(run(['render', dir], { env: { BACKLOG_NOW: '2026-10-14T16:21' } })), /batch files changed: none/);
      assert.deepEqual(snapshot().map((text) => text.replace('2026-10-14T16:21', NOW)), first);
    });
  });

  it('rejects an unknown command, a foreign option and a missing folder', () => {
    assert.equal(run(['frobnicate', '.']).status, 2);
    assert.equal(run(['render', '.', '--count', '2']).status, 2);
    assert.equal(run(['status']).status, 2);
  });
});
