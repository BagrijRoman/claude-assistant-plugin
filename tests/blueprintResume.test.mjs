// blueprint-resume tells a new session where every unfinished blueprint stands. These tests lay blueprints out
// in throwaway folders and run the hook with the SessionStart payload Claude Code sends.

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs, runHook } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/blueprintResume.mjs', import.meta.url));
const SKILL = fileURLToPath(new URL('../skills/blueprint/SKILL.md', import.meta.url));
const TEMPLATE = fileURLToPath(new URL('../skills/blueprint/templates/STATE.json', import.meta.url));
const PHASES = ['intake', 'reading', 'brief', 'architecture', 'modules', 'capabilities', 'consistency', 'adequacy'];

const state = (phase, status = 'pending', extra = {}) => ({
  kind: 'blueprint',
  depth: 'standard',
  phase,
  phases: Object.fromEntries(PHASES.map((key, i) => {
    const at = PHASES.indexOf(phase);
    return [key, i < at ? 'approved' : i === at ? status : 'pending'];
  })),
  modules: [],
  ...extra,
});

const writeState = (root, folder, content) => {
  mkdirSync(join(root, folder), { recursive: true });
  writeFileSync(join(root, folder, 'STATE.json'), typeof content === 'string' ? content : JSON.stringify(content));
};

const start = (cwd, source = 'clear') => runHook(HOOK, { hook_event_name: 'SessionStart', source, cwd });
const output = (result) => JSON.parse(result.stdout);

describe('blueprint-resume', () => {
  after(removeTempDirs);

  it('stays silent where there is no blueprint', () => {
    const root = makeTempDir();
    assert.deepEqual(start(root), { status: 0, stdout: '', stderr: '' });
  });

  it('stays silent for a finished blueprint, another skill\'s state, the skill\'s template and a STATE.json that does not parse', () => {
    const root = makeTempDir();
    writeState(root, 'docs/blueprint', state('done'));
    writeState(root, 'docs/research/run', { kind: 'research', phase: 'curate' });
    writeState(root, 'skills/blueprint/templates', readFileSync(TEMPLATE, 'utf8'));
    writeState(root, 'docs/broken', '{ not json');
    assert.deepEqual(start(root), { status: 0, stdout: '', stderr: '' });
  });

  it('tells the operator and the model where an unfinished blueprint stands', () => {
    const root = makeTempDir();
    writeState(root, 'docs/blueprint', state('capabilities'));
    const result = start(root);
    assert.equal(result.status, 0, result.stderr);
    const { systemMessage, hookSpecificOutput } = output(result);
    assert.equal(systemMessage, '▸ /blueprint · 6/8 Capabilities (L3) · not started · docs/blueprint — /blueprint resumes it');
    assert.equal(hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(hookSpecificOutput.additionalContext, /^\[dev-assistant\] blueprint-resume: unfinished blueprints in this project —\n/);
    assert.match(hookSpecificOutput.additionalContext, /- docs\/blueprint: phase "capabilities" \(6\/8 Capabilities \(L3\)\), not started\n/);
    assert.match(hookSpecificOutput.additionalContext, /mechanics\.md › A fresh context/);
  });

  it('says when a phase waits at its gate, and names the units that failed', () => {
    const root = makeTempDir();
    writeState(root, 'blueprint', state('modules', 'awaiting-approval', {
      modules: [
        { code: 'ORG', l2: 'done', l3: 'pending' },
        { code: 'DAT', l2: 'failed', l3: 'pending' },
        { code: 'OLD', l2: 'failed', l3: 'failed', removed: 'D-004' },
      ],
    }));
    const { systemMessage } = output(start(root, 'startup'));
    assert.equal(systemMessage,
      '▸ /blueprint · 5/8 Modules (L2) · waits for the operator at its gate · failed: DAT l2 · blueprint — /blueprint resumes it');
  });

  it('lists every unfinished blueprint, and finds one in the session\'s own folder', () => {
    const root = makeTempDir();
    writeState(root, '.', state('intake', 'in-progress'));
    writeState(root, 'app/docs/blueprint', state('reading'));
    const lines = output(start(root, 'compact')).systemMessage.split('\n');
    assert.deepEqual(lines, [
      '▸ /blueprint · 1/8 Intake · in progress · . — /blueprint resumes it',
      '▸ /blueprint · 2/8 Reading the input · not started · app/docs/blueprint — /blueprint resumes it',
    ]);
  });

  it('does not look into dot-folders, dependency folders or deeper than four levels', () => {
    const root = makeTempDir();
    writeState(root, '.cache/blueprint', state('brief'));
    writeState(root, 'node_modules/pkg/blueprint', state('brief'));
    writeState(root, 'a/b/c/d/blueprint', state('brief'));
    assert.equal(start(root).stdout, '');
    writeState(root, 'a/b/c/blueprint', state('brief'));
    assert.match(output(start(root)).systemMessage, /a\/b\/c\/blueprint/);
  });

  it('names the phases as SKILL.md\'s stage table does', () => {
    const row = readFileSync(SKILL, 'utf8').split('\n').find((line) => line.startsWith('| `init`, `continue` |'));
    const stages = row.split('|')[2].trim().split(' → ');
    assert.equal(stages.length, PHASES.length);
    PHASES.forEach((phase, i) => {
      const root = makeTempDir();
      writeState(root, 'blueprint', state(phase));
      assert.match(output(start(root)).systemMessage, new RegExp(`· ${i + 1}/8 ${stages[i].replace(/[()]/g, '\\$&')} ·`));
    });
  });

  it('fails open on a payload it cannot read', () => {
    for (const payload of ['not an object', null]) assert.equal(runHook(HOOK, payload).status, 0);
  });
});
