import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { makeTempDir, removeTempDirs, runHook } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/lintFeedback.mjs', import.meta.url));

// Stand-ins for the real tools. Each records how it was called; the formatter rewrites the file; a linter
// prints the report found in `<name>.report.json` next to package.json, or an empty one. The hook's job is
// to call the right tool from the right directory on the right file and to relay what it reports.
const FAKE_TOOL = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const name = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const file = args[args.length - 1];
fs.appendFileSync(path.join(process.cwd(), 'calls.log'), name + ' ' + process.cwd() + ' ' + args.join(' ') + '\\n');
if (name === 'prettier') {
  fs.writeFileSync(file, '// prettier\\n' + fs.readFileSync(file, 'utf8'));
} else {
  const report = path.join(process.cwd(), name + '.report.json');
  const empty = name === 'eslint' ? '[{"filePath":"x","messages":[]}]' : '{"diagnostics":[]}';
  process.stdout.write(fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : empty);
}
`;

const write = (dir, path, content) => {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), typeof content === 'string' ? content : JSON.stringify(content));
};

/** A project with package.json, the given config files, and fake tools installed under node_modules/.bin. */
const makeProject = ({ configs = [], tools = [], pkg = {} } = {}) => {
  const dir = realpathSync(makeTempDir()); // the tools report the real path (macOS puts /tmp behind a symlink)
  write(dir, 'package.json', JSON.stringify({ name: 'fixture', ...pkg }));
  for (const config of configs) write(dir, config, '{}');
  for (const tool of tools) {
    write(dir, join('node_modules', '.bin', tool), FAKE_TOOL);
    chmodSync(join(dir, 'node_modules', '.bin', tool), 0o755);
  }
  return dir;
};

const calls = (dir) => (existsSync(join(dir, 'calls.log')) ? readFileSync(join(dir, 'calls.log'), 'utf8').trim().split('\n') : []);
const programs = (dir) => calls(dir).map((line) => line.split(' ')[0]);
const content = (dir, path) => readFileSync(join(dir, path), 'utf8');

const edit = (dir, path) => runHook(HOOK, { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, path) }, cwd: dir });

const eslintReport = (messages) => [{ filePath: 'x', messages }];
const oxlintReport = (diagnostics) => ({ diagnostics });
const eslintMessage = (line, ruleId, message, severity = 2) => ({ line, column: 1, ruleId, message, severity });
const oxlintDiagnostic = (line, code, message, severity = 'error') => ({ code, message, severity, labels: [{ span: { line, column: 1 } }] });

describe('lint-feedback', () => {
  after(removeTempDirs);

  describe('formatting and fixing', () => {
    it('formats with prettier, then applies eslint and oxlint fixes, from the project root on the relative path', () => {
      const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs', '.oxlintrc.json'], tools: ['prettier', 'eslint', 'oxlint'] });
      write(dir, 'src/a.ts', 'const a=1\n');
      const result = edit(dir, 'src/a.ts');
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(calls(dir), [
        `prettier ${dir} --write --log-level error src/a.ts`,
        `eslint ${dir} --fix --format json src/a.ts`,
        `oxlint ${dir} --fix --format json src/a.ts`,
      ]);
      assert.equal(content(dir, 'src/a.ts'), '// prettier\nconst a=1\n');
    });

    it('formats but does not lint files that are not source code', () => {
      const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs'], tools: ['prettier', 'eslint'] });
      write(dir, 'README.md', '# hi\n');
      edit(dir, 'README.md');
      assert.deepEqual(programs(dir), ['prettier']);
    });

    it('detects tools declared in package.json without a config file', () => {
      const dir = makeProject({ tools: ['prettier', 'eslint', 'oxlint'], pkg: { prettier: {}, eslintConfig: {}, devDependencies: { oxlint: '^1' } } });
      write(dir, 'src/a.js', 'x\n');
      edit(dir, 'src/a.js');
      assert.deepEqual(programs(dir), ['prettier', 'eslint', 'oxlint']);
    });

    it('runs nothing when a tool is not configured, even if installed, or configured but not installed', () => {
      const installedOnly = makeProject({ tools: ['prettier', 'eslint'] });
      write(installedOnly, 'src/a.ts', 'const a=1\n');
      edit(installedOnly, 'src/a.ts');
      assert.deepEqual(calls(installedOnly), []);
      assert.equal(content(installedOnly, 'src/a.ts'), 'const a=1\n');

      const configuredOnly = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs'] });
      write(configuredOnly, 'src/a.ts', 'const a=1\n');
      assert.equal(edit(configuredOnly, 'src/a.ts').status, 0);
      assert.equal(content(configuredOnly, 'src/a.ts'), 'const a=1\n');
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
  });

  describe('feedback to the model', () => {
    it('relays the errors that remain after auto-fix, with line, rule and message, and the way out', () => {
      const dir = makeProject({ configs: ['eslint.config.mjs'], tools: ['eslint'] });
      write(dir, 'eslint.report.json', eslintReport([
        eslintMessage(30, '@typescript-eslint/no-explicit-any', 'Unexpected any. Specify a different type.'),
        eslintMessage(12, '@typescript-eslint/no-floating-promises', 'Promises must be awaited.'),
      ]));
      write(dir, 'src/a.ts', 'x\n');
      const result = edit(dir, 'src/a.ts');
      assert.equal(result.status, 2);
      assert.match(result.stderr, /^\[dev-assistant\] lint-feedback: 2 lint errors remain in "src\/a\.ts" after formatting and auto-fix:/);
      assert.match(result.stderr, /line 12 · @typescript-eslint\/no-floating-promises · Promises must be awaited\.\n  line 30 · @typescript-eslint\/no-explicit-any/);
      assert.match(result.stderr, /Do this instead: fix the code at those lines in "a\.ts"\. Never disable a rule/);
    });

    it('reads oxlint diagnostics and merges them with eslint errors', () => {
      const dir = makeProject({ configs: ['eslint.config.mjs', '.oxlintrc.json'], tools: ['eslint', 'oxlint'] });
      write(dir, 'eslint.report.json', eslintReport([eslintMessage(3, 'prefer-const', "'b' is never reassigned.")]));
      write(dir, 'oxlint.report.json', oxlintReport([oxlintDiagnostic(5, 'typescript(no-explicit-any)', 'Unexpected `any`.')]));
      write(dir, 'src/a.ts', 'x\n');
      const result = edit(dir, 'src/a.ts');
      assert.equal(result.status, 2);
      assert.match(result.stderr, /2 lint errors remain/);
      assert.match(result.stderr, /line 3 · prefer-const/);
      assert.match(result.stderr, /line 5 · typescript\(no-explicit-any\) · Unexpected `any`\./);
    });

    it('reports a single error in the singular', () => {
      const dir = makeProject({ configs: ['.oxlintrc.json'], tools: ['oxlint'] });
      write(dir, 'oxlint.report.json', oxlintReport([oxlintDiagnostic(1, 'eslint(func-style)', 'Expected a function expression.')]));
      write(dir, 'src/a.ts', 'x\n');
      assert.match(edit(dir, 'src/a.ts').stderr, /1 lint error remains in/);
    });

    it('does not report warnings', () => {
      const dir = makeProject({ configs: ['eslint.config.mjs', '.oxlintrc.json'], tools: ['eslint', 'oxlint'] });
      write(dir, 'eslint.report.json', eslintReport([eslintMessage(1, 'no-unused-vars', 'unused', 1)]));
      write(dir, 'oxlint.report.json', oxlintReport([oxlintDiagnostic(2, 'eslint(no-unused-vars)', 'unused', 'warning')]));
      write(dir, 'src/a.ts', 'x\n');
      const result = edit(dir, 'src/a.ts');
      assert.equal(result.status, 0);
      assert.equal(result.stderr, '');
    });

    it('names a parse error when eslint has no rule for it', () => {
      const dir = makeProject({ configs: ['eslint.config.mjs'], tools: ['eslint'] });
      write(dir, 'eslint.report.json', eslintReport([{ line: 4, column: 1, ruleId: null, severity: 2, fatal: true, message: 'Parsing error: Unexpected token' }]));
      write(dir, 'src/a.ts', 'x\n');
      assert.match(edit(dir, 'src/a.ts').stderr, /line 4 · parse error · Parsing error: Unexpected token/);
    });

    it('caps the report and says how many more there are', () => {
      const dir = makeProject({ configs: ['eslint.config.mjs'], tools: ['eslint'] });
      const messages = Array.from({ length: 25 }, (_, k) => eslintMessage(k + 1, 'rule', `problem ${k + 1}`));
      write(dir, 'eslint.report.json', eslintReport(messages));
      write(dir, 'src/a.ts', 'x\n');
      const result = edit(dir, 'src/a.ts');
      assert.match(result.stderr, /25 lint errors remain/);
      assert.match(result.stderr, /line 20 · rule · problem 20\n  … and 5 more; run the lint command/);
      assert.doesNotMatch(result.stderr, /problem 21/);
    });

    it('is silent on a clean file', () => {
      const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs', '.oxlintrc.json'], tools: ['prettier', 'eslint', 'oxlint'] });
      write(dir, 'src/a.ts', 'x\n');
      const result = edit(dir, 'src/a.ts');
      assert.equal(result.status, 0);
      assert.equal(result.stderr, '');
    });
  });

  describe('failing open', () => {
    it('exits 0 on a missing file, a broken payload, a crashing tool or unreadable tool output', () => {
      const dir = makeProject({ configs: ['.prettierrc', 'eslint.config.mjs'], tools: ['prettier', 'eslint'] });
      assert.equal(edit(dir, 'src/missing.ts').status, 0);
      assert.equal(spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' }).status, 0);
      write(dir, 'eslint.report.json', 'not json at all');
      write(dir, 'src/a.ts', 'x\n');
      assert.equal(edit(dir, 'src/a.ts').status, 0);
      write(dir, 'node_modules/.bin/prettier', '#!/usr/bin/env node\nprocess.exit(3);\n');
      assert.equal(edit(dir, 'src/a.ts').status, 0);
    });
  });
});
