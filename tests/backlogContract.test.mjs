// Keeps /backlog and /blueprint agreeing: the backlog reads fields, phases and modes of the blueprint, and
// when the blueprint changes one of them the backlog must fail here, not on its first real run. Also checks
// that the backlog's templates parse and that every mode of its argument hint has a procedure.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const SKILLS = new URL('../skills/', import.meta.url);
const read = (path) => readFileSync(new URL(path, SKILLS), 'utf8');
const json = (path) => JSON.parse(read(path));
const argumentHint = (path) => /^argument-hint:\s*"(.*)"$/m.exec(read(path))?.[1] ?? '';
const modesOf = (hint) => hint.replace(/^\[|\]$/g, '').split('|').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);

const BACKLOG_PROCEDURES = ['backlog/SKILL.md', 'backlog/references/mechanics.md', 'backlog/references/modes.md', 'backlog/references/slicing.md'];

describe('backlog templates', () => {
  it('STATE.json parses, is of kind backlog and holds what the procedures write', () => {
    const state = json('backlog/templates/STATE.json');
    assert.equal(state.kind, 'backlog');
    for (const key of ['blueprint', 'repositories', 'strategy', 'lastTask', 'batches', 'currentBatch', 'pending']) {
      assert.ok(key in state, `STATE.json has no "${key}"`);
    }
    for (const key of ['updated', 'phase', 'depth', 'counts', 'openQuestions', 'modules', 'takenAt']) {
      assert.ok(key in state.blueprint.fingerprint, `the fingerprint has no "${key}"`);
    }
    for (const key of ['id', 'slug', 'stage', 'flow', 'detailed', 'closed']) {
      assert.ok(key in state.batches[0], `a batch entry has no "${key}"`);
    }
  });
});

describe('backlog modes', () => {
  const modes = modesOf(argumentHint('backlog/SKILL.md'));
  const procedures = read('backlog/references/modes.md');
  const skill = read('backlog/SKILL.md');

  it('finds the modes', () => {
    assert.ok(modes.length >= 8);
  });

  for (const mode of modes) {
    it(`${mode} has a procedure and a row in the mode table`, () => {
      assert.match(procedures, new RegExp(`^## \`${mode}[\` ]`, 'm'), `references/modes.md has no section for ${mode}`);
      assert.match(skill, new RegExp(`^\\| \`${mode}[\` ]`, 'm'), `SKILL.md has no row for ${mode}`);
    });
  }
});

describe('what the backlog reads from the blueprint', () => {
  const state = json('blueprint/templates/STATE.json');
  const mechanics = read('blueprint/references/mechanics.md');

  it('the blueprint STATE.json still has the fields the fingerprint copies', () => {
    for (const key of ['updated', 'phase', 'depth', 'counts', 'modules']) assert.ok(key in state, `blueprint STATE.json has no "${key}"`);
  });

  it('the blueprint still has the phases the backlog checks', () => {
    for (const phase of ['capabilities', 'consistency', 'adequacy']) assert.ok(phase in state.phases, `blueprint has no phase "${phase}"`);
  });

  it('a blueprint module entry still has the keys the fingerprint copies', () => {
    const entry = mechanics.split('\n').find((line) => line.includes('"lastCapability"')) ?? '';
    for (const key of ['code', 'slug', 'file', 'stage', 'surfaces', 'lastCapability', 'l3']) {
      assert.ok(entry.includes(`"${key}"`), `the blueprint's modules entry no longer has "${key}"`);
    }
    assert.match(mechanics, /"removed"/, 'the blueprint no longer marks a removed module');
  });

  it('every /blueprint mode the backlog sends the operator to exists', () => {
    const blueprintModes = modesOf(argumentHint('blueprint/SKILL.md'));
    const named = new Set(BACKLOG_PROCEDURES.flatMap((path) => [...read(path).matchAll(/\/blueprint ([a-z]+)/g)].map(([, mode]) => mode)));
    assert.ok(named.size > 0);
    for (const mode of named) assert.ok(blueprintModes.includes(mode), `/backlog points at /blueprint ${mode}, which does not exist`);
  });

  it('capability ids still look the way the inventory greps for them', () => {
    assert.match(read('blueprint/templates/modules/MODULE.md'), /^#### \{\{[A-Z]+-C\d{2}\}\} · /m, 'the capability heading no longer starts with its id');
  });
});
