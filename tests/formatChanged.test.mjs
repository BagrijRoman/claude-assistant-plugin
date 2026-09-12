import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs, runHook } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/formatChanged.mjs', import.meta.url));

// A stand-in for a formatter or lint fixer: it records how it was called and rewrites the file it was given.
// The hook's job is to call the right tool, from the right directory, on the right file — not to format.
const FAKE_TOOL = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const name = path.basename(process.argv[1]);
const file = process.argv[process.argv.length - 1];
fs.appendFileSync(path.join(process.cwd(), 'calls.log'), name + ' ' + process.cwd() + ' ' + process.argv.slice(2).join(' ') + '\\n');
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^/, '// ' + name + '\\n'));
`;

const write = (dir, path, content) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), content);
};

/** A project with package.json, the given config files, and fake tools installed under node_modules/.bin. */
const makeProject = ({ configs = [], tools = [], pkg = {} } = {}) => {
  const dir = realpathSync(makeTempDir()); // the tools report the real path (macOS puts /tmp behind a symlink)
  write(dir, 'package.json', JSON.stringify({ name: 'fixture', ...pkg }));
  for (const config of configs) write(dir, config, '{}');
  for (const tool of tools) {
    const bin = join(dir, 'node_modules', '.bin', tool);
    write(dir, join('node_modules', '.bin', tool), FAKE_TOOL);
    chmodSync(bin, 0o755);
  }
  return dir;
};

const calls = (dir) => (existsSync(join(dir, 'calls.log')) ? readFileSync(join(dir, 'calls.log'), 'utf8').trim().split('\n') : []);
const content = (dir, path) => readFileSync(join(dir, path), 'utf8');

const edit = (dir, path) => runHook(HOOK, { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, path) }, cwd: dir });

describe('format-changed', () => {
  after(removeTempDirs);

  it('runs prettier on the edited file when the project configures it', () => {
    const dir = makeProject({ configs: ['.prettierrc'], tools: ['prettier'] });
    write(dir, 'src/a.ts', 'const a=1\n');
    const result = edit(dir, 'src/a.ts');
    assert.equal(result.status, 0);
    assert.deepEqual(calls(dir), [`prettier ${dir} --write --log-level error src/a.ts`]);
    assert.equal(content(dir, 'src/a.ts'), '// prettier\nconst a=1\n');
  });

  it('runs eslint --fix and oxlint --fix on source files, after prettier', () => {
    const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs', '.oxlintrc.json'], tools: ['prettier', 'eslint', 'oxlint'] });
    write(dir, 'src/a.ts', 'x\n');
    edit(dir, 'src/a.ts');
    assert.deepEqual(calls(dir).map((line) => line.split(' ')[0]), ['prettier', 'eslint', 'oxlint']);
    assert.match(calls(dir)[1], /eslint .* --fix --quiet src\/a\.ts$/);
    assert.match(calls(dir)[2], /oxlint .* --fix --quiet src\/a\.ts$/);
  });

  it('does not lint files that are not source code', () => {
    const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs'], tools: ['prettier', 'eslint'] });
    write(dir, 'README.md', '# hi\n');
    edit(dir, 'README.md');
    assert.deepEqual(calls(dir).map((line) => line.split(' ')[0]), ['prettier']);
  });

  it('detects tools declared in package.json without a config file', () => {
    const dir = makeProject({ tools: ['prettier', 'eslint', 'oxlint'], pkg: { prettier: {}, eslintConfig: {}, devDependencies: { oxlint: '^1' } } });
    write(dir, 'src/a.js', 'x\n');
    edit(dir, 'src/a.js');
    assert.deepEqual(calls(dir).map((line) => line.split(' ')[0]), ['prettier', 'eslint', 'oxlint']);
  });

  it('runs nothing when the project has no formatter configured, even if one is installed', () => {
    const dir = makeProject({ tools: ['prettier'] });
    write(dir, 'src/a.ts', 'const a=1\n');
    edit(dir, 'src/a.ts');
    assert.deepEqual(calls(dir), []);
    assert.equal(content(dir, 'src/a.ts'), 'const a=1\n');
  });

  it('runs nothing when the tool is configured but not installed', () => {
    const dir = makeProject({ configs: ['.prettierrc'] });
    write(dir, 'src/a.ts', 'const a=1\n');
    assert.equal(edit(dir, 'src/a.ts').status, 0);
    assert.equal(content(dir, 'src/a.ts'), 'const a=1\n');
  });

  it('uses the nearest package.json as the project root and finds a hoisted install above it', () => {
    const repo = makeProject({ tools: ['prettier'] });
    write(repo, 'apps/api/package.json', '{}');
    write(repo, 'apps/api/.prettierrc', '{}');
    write(repo, 'apps/api/src/a.ts', 'x\n');
    edit(repo, 'apps/api/src/a.ts');
    assert.deepEqual(calls(join(repo, 'apps', 'api')), [`prettier ${join(repo, 'apps', 'api')} --write --log-level error src/a.ts`]);
  });

  it('skips generated, vendored and unsupported files', () => {
    const dir = makeProject({ configs: ['.prettierrc'], tools: ['prettier'] });
    for (const path of ['node_modules/x/index.js', 'dist/a.js', 'src/__generated__/types.ts', 'src/logo.png', 'src/data.csv']) {
      write(dir, path, 'x\n');
      edit(dir, path);
    }
    assert.deepEqual(calls(dir), []);
  });

  it('resolves a relative path against the payload cwd', () => {
    const dir = makeProject({ configs: ['.prettierrc'], tools: ['prettier'] });
    write(dir, 'a.json', '{}\n');
    runHook(HOOK, { tool_name: 'Write', tool_input: { file_path: 'a.json' }, cwd: dir });
    assert.equal(calls(dir).length, 1);
  });

  it('never blocks: exits 0 on a missing file, a broken payload or a crashing tool', () => {
    const dir = makeProject({ configs: ['.prettierrc'], tools: ['prettier'] });
    assert.equal(edit(dir, 'src/missing.ts').status, 0);
    assert.equal(spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' }).status, 0);
    write(dir, 'node_modules/.bin/prettier', '#!/usr/bin/env node\nprocess.exit(3);\n');
    write(dir, 'src/a.ts', 'x\n');
    assert.equal(edit(dir, 'src/a.ts').status, 0);
  });
});
