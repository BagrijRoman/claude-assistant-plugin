// skill-resume tells a new session where every unfinished blueprint and showcase, every backlog with a mode left
// half-way and every research run past its brief stands. These tests lay them out in throwaway folders and run the
// hook with the SessionStart payload Claude Code sends.

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs, runHook } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/skillResume.mjs', import.meta.url));
const skillFile = (skill, path) => fileURLToPath(new URL(`../skills/${skill}/${path}`, import.meta.url));
const PHASES = ['intake', 'reading', 'brief', 'architecture', 'modules', 'capabilities', 'consistency', 'adequacy'];
const SHOWCASE_TEMPLATE = JSON.parse(readFileSync(skillFile('showcase', 'templates/STATE.json'), 'utf8'));
// The showcase's steps in the order of its stage table; step 19 is two keys
const STEPS = Object.keys(SHOWCASE_TEMPLATE.steps);

const blueprint = (phase, status = 'pending', extra = {}) => ({
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

const showcase = (step, status = 'pending', extra = {}) => ({
  kind: 'showcase',
  step,
  steps: Object.fromEntries(STEPS.map((key, i) => {
    const at = STEPS.indexOf(step);
    return [key, i < at ? 'done' : i === at ? status : 'pending'];
  })),
  pending: null,
  ...extra,
});

const backlog = (pending) => ({ kind: 'backlog', batches: [], pending });

const research = (phase, rounds = [{ n: 1, status: 'pending' }]) => ({ kind: 'research', topic: 'Fleet tracking', phase, rounds });

const writeState = (root, folder, content) => {
  mkdirSync(join(root, folder), { recursive: true });
  writeFileSync(join(root, folder, 'STATE.json'), typeof content === 'string' ? content : JSON.stringify(content));
};

const start = (cwd, source = 'clear') => runHook(HOOK, { hook_event_name: 'SessionStart', source, cwd });
const output = (result) => JSON.parse(result.stdout);
const stagesOf = (skill, mode) => {
  const row = readFileSync(skillFile(skill, 'SKILL.md'), 'utf8').split('\n').find((line) => line.startsWith(`| ${mode} |`));
  return row.split('|')[2].trim().split(' → ');
};
const escape = (text) => text.replace(/[()]/g, '\\$&');

describe('skill-resume', () => {
  after(removeTempDirs);

  it('stays silent where there is nothing unfinished', () => {
    const root = makeTempDir();
    assert.deepEqual(start(root), { status: 0, stdout: '', stderr: '' });
  });

  it('stays silent for finished work, a backlog with no mode pending, a research brief not approved, another skill\'s state, the templates and a STATE.json that does not parse', () => {
    const root = makeTempDir();
    writeState(root, 'docs/blueprint', blueprint('done'));
    writeState(root, 'docs/showcase', showcase('done'));
    writeState(root, 'docs/backlog', backlog(null));
    writeState(root, 'docs/research/2026-10-01-done', research('done', [{ n: 1, status: 'done' }]));
    writeState(root, 'docs/research/2026-10-02-draft', research('frame'));
    writeState(root, 'docs/standards', { kind: 'standards', phase: 'installed' });
    writeState(root, 'skills/research/templates', readFileSync(skillFile('research', 'templates/STATE.json'), 'utf8')
      .replace('"phase": "frame"', '"phase": "research"'));
    writeState(root, 'skills/blueprint/templates', readFileSync(skillFile('blueprint', 'templates/STATE.json'), 'utf8'));
    writeState(root, 'skills/showcase/templates', readFileSync(skillFile('showcase', 'templates/STATE.json'), 'utf8'));
    writeState(root, 'skills/backlog/templates', readFileSync(skillFile('backlog', 'templates/STATE.json'), 'utf8')
      .replace('"pending": null', '"pending": { "mode": "init", "step": "read" }'));
    writeState(root, 'docs/broken', '{ not json');
    assert.deepEqual(start(root), { status: 0, stdout: '', stderr: '' });
  });

  it('tells the operator and the model where an unfinished blueprint stands', () => {
    const root = makeTempDir();
    writeState(root, 'docs/blueprint', blueprint('capabilities'));
    const result = start(root);
    assert.equal(result.status, 0, result.stderr);
    const { systemMessage, hookSpecificOutput } = output(result);
    assert.equal(systemMessage, '▸ /blueprint · 6/8 Capabilities (L3) · not started · docs/blueprint — /blueprint resumes it');
    assert.equal(hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(hookSpecificOutput.additionalContext, /^\[dev-assistant\] skill-resume: unfinished work in this project —\n/);
    assert.match(hookSpecificOutput.additionalContext,
      /\n- \/blueprint in docs\/blueprint: phase "capabilities" \(6\/8 Capabilities \(L3\) · not started\); see mechanics\.md › A fresh context\n/);
  });

  it('says when a phase waits at its gate, and names the units that failed', () => {
    const root = makeTempDir();
    writeState(root, 'blueprint', blueprint('modules', 'awaiting-approval', {
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

  it('tells where an unfinished showcase stands, and a question it waits on', () => {
    const root = makeTempDir();
    writeState(root, 'docs/showcase', showcase('components', 'awaiting-approval', { pending: { question: 'Which buttons?' } }));
    const { systemMessage, hookSpecificOutput } = output(start(root));
    assert.equal(systemMessage,
      '▸ /showcase · 7/21 Components · waits for the operator at its gate · a question waits for the operator · docs/showcase — /showcase resumes it');
    assert.match(hookSpecificOutput.additionalContext,
      /\n- \/showcase in docs\/showcase: step "components" \(7\/21 Components · .*\); see phases\.md › A fresh context\n/);
  });

  it('tells which mode a backlog left half-way', () => {
    const root = makeTempDir();
    writeState(root, 'docs/backlog', backlog({ mode: 'detail', step: 'gate', batches: ['03'], since: '2026-10-13T09:00' }));
    const { systemMessage, hookSpecificOutput } = output(start(root));
    assert.equal(systemMessage, '▸ /backlog · detail stopped at gate · docs/backlog — /backlog continue resumes it');
    assert.match(hookSpecificOutput.additionalContext,
      /\n- \/backlog in docs\/backlog: mode "detail", step "gate" \(detail stopped at gate\); see mechanics\.md › Gates and resuming\n/);
  });

  it('tells where a research run past its brief stands, by its last round', () => {
    const root = makeTempDir();
    writeState(root, 'docs/research/2026-10-14-fleet', research('research', [{ n: 1, status: 'done' }, { n: 2, status: 'running' }]));
    const { systemMessage, hookSpecificOutput } = output(start(root));
    assert.equal(systemMessage, '▸ /research · 2/4 Research · round 2 cut off while running · docs/research/2026-10-14-fleet — /research resumes it');
    assert.match(hookSpecificOutput.additionalContext,
      /\n- \/research in docs\/research\/2026-10-14-fleet: phase "research" \(2\/4 Research · round 2 cut off while running\); see phases\.md › A fresh context\n/);
  });

  it('lists every unfinished run, blueprints first, and finds one in the session\'s own folder', () => {
    const root = makeTempDir();
    writeState(root, 'docs/showcase', showcase('intake', 'in-progress'));
    writeState(root, '.', blueprint('intake', 'in-progress'));
    writeState(root, 'app/docs/blueprint', blueprint('reading'));
    const lines = output(start(root, 'compact')).systemMessage.split('\n');
    assert.deepEqual(lines.map((line) => line.split(' · ')[0]), ['▸ /blueprint', '▸ /blueprint', '▸ /showcase']);
    assert.ok(lines.includes('▸ /blueprint · 1/8 Intake · in progress · . — /blueprint resumes it'));
    assert.ok(lines.includes('▸ /blueprint · 2/8 Reading the input · not started · app/docs/blueprint — /blueprint resumes it'));
    assert.ok(lines.includes('▸ /showcase · 1/21 Intake · in progress · docs/showcase — /showcase resumes it'));
  });

  it('does not look into dot-folders, dependency folders or deeper than four levels', () => {
    const root = makeTempDir();
    writeState(root, '.cache/blueprint', blueprint('brief'));
    writeState(root, 'node_modules/pkg/blueprint', blueprint('brief'));
    writeState(root, 'a/b/c/d/blueprint', blueprint('brief'));
    assert.equal(start(root).stdout, '');
    writeState(root, 'a/b/c/blueprint', blueprint('brief'));
    assert.match(output(start(root)).systemMessage, /a\/b\/c\/blueprint/);
  });

  it('names the blueprint\'s phases as its SKILL.md\'s stage table does', () => {
    const stages = stagesOf('blueprint', '`init`, `continue`');
    assert.equal(stages.length, PHASES.length);
    PHASES.forEach((phase, i) => {
      const root = makeTempDir();
      writeState(root, 'blueprint', blueprint(phase));
      assert.match(output(start(root)).systemMessage, new RegExp(`· ${i + 1}/8 ${escape(stages[i])} ·`));
    });
  });

  it('names the showcase\'s steps as its SKILL.md\'s stage table does', () => {
    const stages = stagesOf('showcase', '`init [dir]`, `continue`');
    assert.equal(stages.length, 21);
    // Every step key of the template, in order, with step 19's two keys on one stage
    const stageOfKey = (i) => (i <= 19 ? i : i - 1);
    assert.equal(STEPS.length, 22);
    STEPS.forEach((step, i) => {
      const root = makeTempDir();
      writeState(root, 'showcase', showcase(step));
      assert.match(output(start(root)).systemMessage, new RegExp(`· ${stageOfKey(i) + 1}/21 ${escape(stages[stageOfKey(i)])} ·`), step);
    });
  });

  it('names a research run\'s phases as its SKILL.md\'s stage table does', () => {
    const stages = stagesOf('research', '`<topic>`, `continue [run]`');
    assert.deepEqual(stages, ['Frame', 'Research', 'Curate', 'Review']);
    ['research', 'curate', 'review'].forEach((phase, i) => {
      const root = makeTempDir();
      writeState(root, 'run', research(phase));
      assert.match(output(start(root)).systemMessage, new RegExp(`· ${i + 2}/4 ${stages[i + 1]} ·`));
    });
  });

  it('fails open on a payload it cannot read', () => {
    for (const payload of ['not an object', null]) assert.equal(runHook(HOOK, payload).status, 0);
  });
});
