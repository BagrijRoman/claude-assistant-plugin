import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { buildAllowRules, buildDenyRules } from '../bin/lib/permissionRules.mjs';
import { makeTempDir, removeTempDirs } from './helpers.mjs';

const SCRIPT = fileURLToPath(new URL('../bin/setupPermissions.mjs', import.meta.url));
const TEMPLATE = fileURLToPath(new URL('../skills/setupPermissions/templates/permissions.json', import.meta.url));
const PLUGIN_VERSION = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')).version;

const run = (...args) => {
  const result = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

const settingsPath = (dir) => join(dir, '.claude', 'settings.json');
const readSettings = (dir) => JSON.parse(readFileSync(settingsPath(dir), 'utf8'));
const writeSettings = (dir, value) => {
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(settingsPath(dir), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};

describe('setup-permissions', () => {
  after(removeTempDirs);

  it('builds Read and Edit rules for every secret glob, plus the irreversible commands', () => {
    const rules = buildDenyRules();
    assert.ok(rules.includes('Read(./**/.env)'));
    assert.ok(rules.includes('Edit(./**/.env)'));
    assert.ok(rules.includes('Read(~/.ssh/**)'));
    assert.ok(rules.includes('Bash(git push --force:*)'));
    assert.ok(rules.includes('Bash(npm publish:*)'));
    assert.equal(new Set(rules).size, rules.length, 'no duplicate rules');
  });

  it('allows routine git commands and nothing that publishes, discards work or rewrites history', () => {
    const rules = buildAllowRules();
    assert.ok(rules.includes('Bash(git status:*)'));
    assert.ok(rules.includes('Bash(git commit:*)'));
    for (const command of ['push', 'reset', 'restore', 'checkout', 'clean', 'rebase', 'stash', 'filter-branch']) {
      assert.ok(!rules.some((rule) => rule.startsWith(`Bash(git ${command}`)), `git ${command} must not be allowed`);
    }
    assert.equal(new Set(rules).size, rules.length, 'no duplicate rules');
    assert.ok(!rules.some((rule) => buildDenyRules().includes(rule)), 'no rule is both allowed and denied');
  });

  it('keeps the skill\'s permissions.json template in sync with the rule builder', () => {
    const template = JSON.parse(readFileSync(TEMPLATE, 'utf8'));
    assert.deepEqual(template, { permissions: { allow: buildAllowRules(), deny: buildDenyRules() } },
      'regenerate it: node bin/setupPermissions.mjs --template > skills/setupPermissions/templates/permissions.json');
    assert.equal(run('--template').stdout, readFileSync(TEMPLATE, 'utf8'));
  });

  it('creates .claude/settings.json in a fresh project and records the plugin version', () => {
    const dir = makeTempDir();
    const result = run(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /created/);
    assert.match(result.stdout, new RegExp(`allow rules added: ${buildAllowRules().length}`));
    assert.match(result.stdout, new RegExp(`deny rules added: ${buildDenyRules().length}`));
    assert.deepEqual(readSettings(dir), {
      permissions: { allow: buildAllowRules(), deny: buildDenyRules() },
      devAssistant: { version: PLUGIN_VERSION },
    });
  });

  it('changes nothing on a second run', () => {
    const dir = makeTempDir();
    run(dir);
    const before = readFileSync(settingsPath(dir), 'utf8');
    const result = run(dir);
    assert.match(result.stdout, /already up to date/);
    assert.match(result.stdout, /allow rules added: 0/);
    assert.match(result.stdout, /deny rules added: 0/);
    assert.equal(readFileSync(settingsPath(dir), 'utf8'), before);
  });

  it('keeps foreign entries, other keys and their order', () => {
    const dir = makeTempDir();
    writeSettings(dir, {
      model: 'opus',
      permissions: { allow: ['Bash(npm test:*)', 'Bash(git status:*)'], deny: ['Read(./secrets/**)', 'Read(./**/.env)'], defaultMode: 'default' },
      hooks: { Stop: [] },
    });
    const result = run(dir);
    assert.match(result.stdout, /updated/);
    assert.match(result.stdout, /allow rules already present: 1\b/);
    assert.match(result.stdout, /other allow entries kept: 1\b/);
    assert.match(result.stdout, /deny rules already present: 1\b/);
    assert.match(result.stdout, /other deny entries kept: 1\b/);
    const settings = readSettings(dir);
    assert.deepEqual(Object.keys(settings), ['model', 'permissions', 'hooks', 'devAssistant']);
    assert.equal(settings.model, 'opus');
    assert.deepEqual(settings.permissions.allow.slice(0, 2), ['Bash(npm test:*)', 'Bash(git status:*)']);
    assert.equal(settings.permissions.allow.filter((rule) => rule === 'Bash(git status:*)').length, 1);
    for (const rule of buildAllowRules()) assert.ok(settings.permissions.allow.includes(rule), rule);
    assert.equal(settings.permissions.defaultMode, 'default');
    assert.deepEqual(settings.hooks, { Stop: [] });
    assert.deepEqual(settings.permissions.deny.slice(0, 2), ['Read(./secrets/**)', 'Read(./**/.env)']);
    assert.equal(settings.permissions.deny.filter((rule) => rule === 'Read(./**/.env)').length, 1);
    for (const rule of buildDenyRules()) assert.ok(settings.permissions.deny.includes(rule), rule);
  });

  it('writes nothing with --dry-run but still reports', () => {
    const dir = makeTempDir();
    const result = run(dir, '--dry-run');
    assert.match(result.stdout, /would be created/);
    assert.ok(!existsSync(settingsPath(dir)));
  });

  it('leaves a settings file that is not valid JSON alone and says so', () => {
    const dir = makeTempDir();
    writeSettings(dir, '{ "permissions": ');
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not valid JSON/);
    assert.equal(readFileSync(settingsPath(dir), 'utf8'), '{ "permissions": ');
  });

  it('defaults to the current directory', () => {
    const dir = makeTempDir();
    const result = spawnSync('node', [SCRIPT], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(settingsPath(dir)));
  });
});
