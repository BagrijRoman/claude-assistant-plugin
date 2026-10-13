import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { detectSettings, loadPack, parseRules, renderRules } from '../bin/lib/standards.mjs';
import { GIT_ENV, makeRepo, makeTempDir, removeTempDirs, writeFiles } from './helpers.mjs';

const SCRIPT = new URL('../bin/standards.mjs', import.meta.url).pathname;

const run = (args, input) => {
  const result = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', input, env: GIT_ENV });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

const WEB_PACKAGE = JSON.stringify({ name: 'web', dependencies: { react: '19', next: '16' } });
const NATIVE_PACKAGE = JSON.stringify({ name: 'app', dependencies: { react: '19', 'react-native': '0.80', expo: '54' } });

/** A small web project laid out the way the pack expects, with one reference component and one screen. */
const webProject = (dir = makeTempDir(), extra = {}) => {
  writeFiles(dir, {
    'package.json': WEB_PACKAGE,
    'tsconfig.json': '{\n  // comment\n  "compilerOptions": { "paths": { "@/*": ["./src/*"] }, },\n}\n',
    'eslint.config.mjs': 'export default [];\n',
    'src/app/globals.css': ':root { --surface: #fff; }\n',
    'src/components/ui/Button/index.ts': "export { Button } from './Button';\n",
    'src/components/ui/Button/Button.tsx': 'export const Button = () => <button />;\n',
    'src/components/ui/Button/Button.styles.ts': "export const base = 'rounded-control';\n",
    'src/features/users/components/UsersScreen/index.ts': "export { UsersScreen } from './UsersScreen';\n",
    'src/features/users/components/UsersScreen/UsersScreen.tsx': 'export const UsersScreen = () => <div />;\n',
    'src/features/users/components/UsersScreen/useUsersScreen.ts': 'export const useUsersScreen = () => ({});\n',
    ...extra,
  }, { stage: false });
  return dir;
};

const state = (dir) => JSON.parse(readFileSync(join(dir, '.claude/standards/standards.json'), 'utf8'));
const findings = (dir) => JSON.parse(readFileSync(join(dir, '.claude/standards/findings.json'), 'utf8'));

after(removeTempDirs);

describe('the react pack', () => {
  const pack = loadPack('react');

  it('declares RCT-01…03, each with its layers', () => {
    assert.deepEqual(pack.rules.map((rule) => rule.id), ['RCT-01', 'RCT-02', 'RCT-03']);
    for (const rule of pack.rules) assert.ok(rule.enforcedBy.some((item) => item.layer === 'review'), `${rule.id} has no review layer`);
    assert.deepEqual(pack.rules[1].enforcedBy.map((item) => [item.layer, item.name]),
      [['check', 'componentLayout'], ['lint', 'standards/no-logic-in-component-file'], ['review', null]]);
  });

  it('names in its rules file only lint rules its lint file defines', async () => {
    const { createStandards } = await import('../skills/standards/templates/packs/react/eslint.mjs');
    const defined = new Set();
    for (const platform of ['web', 'native']) {
      const settings = { platform, srcDir: 'src', sharedDir: 'src/components', featuresDir: 'src/features', tokensFiles: [] };
      for (const entry of createStandards({ settings }, '/tmp')) for (const rule of Object.keys(entry.rules)) defined.add(rule);
    }
    const named = pack.rules.flatMap((rule) => rule.enforcedBy).filter((item) => item.layer === 'lint').map((item) => item.name);
    assert.deepEqual([...new Set(named)].sort(), [...defined].sort());
  });

  it('parses an `Enforced by:` line with notes', () => {
    const [rule] = parseRules('## PRJ-01 Errors\n\nText.\n\nEnforced by: lint `x/y` (web) · review (swallowed errors)\n');
    assert.deepEqual(rule, { id: 'PRJ-01', title: 'Errors', enforcedBy: [
      { layer: 'lint', name: 'x/y', note: 'web' }, { layer: 'review', name: null, note: 'swallowed errors' }] });
  });

  it('renders the platform blocks, references and a switched-off rule', () => {
    const template = readFileSync(join(pack.dir, 'rules.md'), 'utf8');
    const settings = { platform: 'native', srcDir: 'src', sharedDir: 'src/components', featuresDir: 'src/features',
      tokensFiles: ['src/theme'], aliases: { '@/': 'src/' }, referenceComponent: null, referenceScreen: 'src/features/a/components/AScreen' };
    const text = renderRules(template, { settings, version: '1.0.0', disabled: { 'RCT-01': { reason: 'one feature only', date: '2026-10-13' } } });
    assert.match(text, /StyleSheet\.create/);
    assert.doesNotMatch(text, /bg-blue-500|Next\.js route/);
    assert.doesNotMatch(text, /Reference component/);
    assert.match(text, /Reference screen to copy: `src\/features\/a\/components\/AScreen\/`/);
    assert.match(text, /from '@\/components\/UserAvatar'/);
    assert.match(text, /## RCT-01 Shared components\n\n> \*\*Switched off in this project\*\* \(2026-10-13\): one feature only\./);
    assert.doesNotMatch(text, /\{\{|<!--/);
  });
});

describe('detected settings', () => {
  it('reads a web project: folders, the token file, tsconfig aliases with comments, the references', () => {
    const settings = detectSettings(webProject());
    assert.deepEqual(settings, {
      platform: 'web',
      srcDir: 'src',
      sharedDir: 'src/components',
      featuresDir: 'src/features',
      tokensFiles: ['src/app/globals.css'],
      aliases: { '@/': 'src/' },
      skipLint: [],
      referenceComponent: 'src/components/ui/Button',
      referenceScreen: 'src/features/users/components/UsersScreen',
    });
  });

  it('reads a native project and skips nothing', () => {
    const dir = makeTempDir();
    writeFiles(dir, { 'package.json': NATIVE_PACKAGE, 'src/theme/index.ts': 'export const colors = {};\n' }, { stage: false });
    const settings = detectSettings(dir);
    assert.equal(settings.platform, 'native');
    assert.deepEqual(settings.tokensFiles, ['src/theme']);
    assert.equal(settings.referenceComponent, null);
  });

  it("skips the pack's web token rule when the project has its own of that name", () => {
    const dir = webProject(undefined, { 'eslint.config.mjs': "import { noRawVisualValues } from './eslint/x.mjs';\nexport default [{ rules: { 'ds/no-raw-visual-values': 'error' } }];\n" });
    assert.deepEqual(detectSettings(dir).skipLint, ['no-raw-visual-values']);
  });
});

describe('install and update', () => {
  it('a dry run writes nothing', () => {
    const dir = webProject();
    const { status, stdout } = run(['install', 'react', '--dry-run', '--dir', dir]);
    assert.equal(status, 0);
    assert.match(stdout, /would be installed/);
    assert.ok(!existsSync(join(dir, '.claude')));
  });

  it('writes the rules file, the lint file and the state, and says how to wire the lint', () => {
    const dir = webProject();
    const { status, stdout } = run(['install', 'react', '--dir', dir]);
    assert.equal(status, 0);
    assert.match(stdout, /created \.claude\/rules\/react\.md/);
    assert.match(stdout, /created eslint\/standards\/react\.mjs/);
    assert.match(stdout, /import \{ reactStandards \} from '\.\/eslint\/standards\/react\.mjs';/);
    const rules = readFileSync(join(dir, '.claude/rules/react.md'), 'utf8');
    assert.match(rules, /^---\npaths:\n {2}- "src\/\*\*\/\*\.\{ts,tsx,js,jsx\}"\n---/);
    assert.match(rules, /Reference component to copy: `src\/components\/ui\/Button\/`/);
    const installed = state(dir).packs.react;
    assert.equal(installed.version, loadPack('react').version);
    assert.deepEqual(Object.keys(installed.files).sort(), ['.claude/rules/react.md', 'eslint/standards/react.mjs']);
  });

  it('a second install changes nothing', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    const before = readFileSync(join(dir, '.claude/standards/standards.json'), 'utf8');
    const { stdout } = run(['install', 'react', '--dir', dir]);
    assert.match(stdout, /already up to date/);
    assert.equal(readFileSync(join(dir, '.claude/standards/standards.json'), 'utf8'), before);
  });

  it('applies --set, keeps it on the next run, and refuses an unknown key', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir, '--set', 'sharedDir=src/shared', '--set', 'tokensFiles=src/a.css,src/b.css', '--set', 'referenceScreen=none']);
    run(['install', 'react', '--dir', dir]);
    const { settings } = state(dir).packs.react;
    assert.equal(settings.sharedDir, 'src/shared');
    assert.deepEqual(settings.tokensFiles, ['src/a.css', 'src/b.css']);
    assert.equal(settings.referenceScreen, null);
    const bad = run(['install', 'react', '--dir', dir, '--set', 'colour=red']);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /unknown setting "colour"/);
  });

  it("keeps the project's edit of an installed file", () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    const file = join(dir, '.claude/rules/react.md');
    writeFileSync(file, `${readFileSync(file, 'utf8')}\nA note of this project.\n`);
    const { stdout } = run(['install', 'react', '--dir', dir]);
    assert.match(stdout, /kept: edited in the project/);
    assert.match(readFileSync(file, 'utf8'), /A note of this project\./);
  });

  it('puts a new version beside an edited file, and `resolve` takes the merge', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    const file = join(dir, '.claude/rules/react.md');
    writeFileSync(file, `${readFileSync(file, 'utf8')}\nA note of this project.\n`);
    const { stdout } = run(['install', 'react', '--dir', dir, '--set', 'sharedDir=src/shared']);
    assert.match(stdout, /not replaced \.claude\/rules\/react\.md/);
    const incoming = join(dir, '.claude/standards/incoming/.claude/rules/react.md');
    assert.match(readFileSync(incoming, 'utf8'), /src\/shared/);
    assert.match(readFileSync(file, 'utf8'), /A note of this project\./);

    writeFileSync(file, `${readFileSync(incoming, 'utf8')}\nA note of this project.\n`);
    assert.equal(run(['resolve', '.claude/rules/react.md', '--dir', dir]).status, 0);
    assert.ok(!existsSync(incoming));
    assert.match(run(['install', 'react', '--dir', dir]).stdout, /kept: edited in the project/);
  });

  it('reports a wired lint file and a project without an ESLint config', () => {
    const dir = webProject(undefined, { 'eslint.config.mjs': "import { reactStandards } from './eslint/standards/react.mjs';\nexport default [...reactStandards];\n" });
    assert.match(run(['install', 'react', '--dir', dir]).stdout, /eslint\.config\.mjs imports eslint\/standards\/react\.mjs/);
    const bare = makeTempDir();
    writeFiles(bare, { 'package.json': WEB_PACKAGE }, { stage: false });
    assert.match(run(['install', 'react', '--dir', bare]).stdout, /no ESLint config/);
  });

  it('refuses a pack the plugin does not have', () => {
    const { status, stderr } = run(['install', 'vue', '--dir', webProject()]);
    assert.equal(status, 1);
    assert.match(stderr, /no pack "vue"; available: react/);
  });

  it('`update` reinstalls with the same settings; `status` reports files and findings', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir, '--set', 'sharedDir=src/shared']);
    assert.match(run(['update', '--dir', dir]).stdout, /already up to date/);
    assert.equal(state(dir).packs.react.settings.sharedDir, 'src/shared');
    const { stdout } = run(['status', '--dir', dir]);
    assert.match(stdout, /\.claude\/rules\/react\.md: up to date/);
    assert.match(stdout, /Findings: 0/);
  });
});

describe('switching a rule off', () => {
  it('needs a reason, marks the rule in the rules file, and switches back on', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    assert.equal(run(['disable', 'RCT-01', '--dir', dir]).status, 1);
    assert.equal(run(['disable', 'RCT-01', '--reason', 'a single-feature app', '--dir', dir]).status, 0);
    assert.equal(state(dir).packs.react.disabled['RCT-01'].reason, 'a single-feature app');
    assert.match(readFileSync(join(dir, '.claude/rules/react.md'), 'utf8'), /Switched off in this project\*\* \([\d-]+\): a single-feature app/);
    assert.equal(run(['enable', 'RCT-01', '--dir', dir]).status, 0);
    assert.deepEqual(state(dir).packs.react.disabled, {});
    assert.doesNotMatch(readFileSync(join(dir, '.claude/rules/react.md'), 'utf8'), /Switched off/);
  });

  it('refuses a rule no pack has', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    assert.match(run(['disable', 'RCT-99', '--reason', 'x', '--dir', dir]).stderr, /no installed pack has the rule "RCT-99"/);
  });
});

describe('check', () => {
  it('exits 1 with the findings, 0 on a clean project, and skips a rule switched off', () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    assert.equal(run(['check', '--dir', dir]).status, 0);
    writeFiles(dir, { 'src/components/ui/Card/Card.tsx': 'export const Card = () => <div />;\n' }, { stage: false });
    const { status, stdout } = run(['check', '--dir', dir]);
    assert.equal(status, 1);
    assert.match(stdout, /RCT-02 · src\/components\/ui\/Card · no index\.ts/);
    run(['disable', 'RCT-02', '--reason', 'legacy layout', '--dir', dir]);
    assert.equal(run(['check', '--dir', dir]).status, 0);
  });
});

describe('findings and promotion', () => {
  const installed = () => {
    const dir = webProject();
    run(['install', 'react', '--dir', dir]);
    return dir;
  };

  it('records a finding with an id and proposes nothing after the first one', () => {
    const dir = installed();
    const { status, stdout } = run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'src/a.tsx', '--summary', 'borrowed component']);
    assert.equal(status, 0);
    assert.match(stdout, /F-001 · RCT-01 · src\/a\.tsx · fixed · borrowed component/);
    assert.match(stdout, /No promotion to decide/);
  });

  it('proposes a stronger layer at the second finding on one rule', () => {
    const dir = installed();
    run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'src/a.tsx', '--summary', 'one']);
    const { stdout } = run(['finding', '--dir', dir, '--stdin'], JSON.stringify([{ rule: 'RCT-01', file: 'src/b.tsx', line: 3, summary: 'two', status: 'waived' }]));
    assert.match(stdout, /RCT-01 Shared components — 2 findings since the last promotion \(F-001, F-002\)/);
    assert.match(stdout, /stronger: a script check, if it shows in the files and folders; or a sharper rule text/);
    assert.equal(findings(dir).findings[1].line, 3);
  });

  it('proposes a new rule for a finding that fits none', () => {
    const dir = installed();
    const { stdout } = run(['finding', '--dir', dir, '--rule', 'none', '--file', 'src/a.ts', '--summary', 'swallowed error']);
    assert.match(stdout, /No rule — F-001: "swallowed error"/);
  });

  it("accepts a rule from the project's own rules files", () => {
    const dir = installed();
    writeFiles(dir, { '.claude/rules/errors.md': '# Errors\n\n## PRJ-01 No swallowed errors\n\nText.\n' }, { stage: false });
    assert.equal(run(['finding', '--dir', dir, '--rule', 'PRJ-01', '--file', 'src/a.ts', '--summary', 'x']).status, 0);
    assert.match(run(['finding', '--dir', dir, '--rule', 'XYZ-01', '--file', 'src/a.ts', '--summary', 'x']).stderr, /has the rule "XYZ-01"/);
  });

  it('records a promotion, after which the rule starts counting again', () => {
    const dir = installed();
    run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'src/a.tsx', '--summary', 'one']);
    run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'src/b.tsx', '--summary', 'two']);
    assert.match(run(['promote', '--dir', dir]).stdout, /RCT-01 Shared components — 2 findings/);
    assert.equal(run(['promote', '--dir', dir, '--rule', 'RCT-01', '--to', 'sideways']).status, 1);
    assert.equal(run(['promote', '--dir', dir, '--rule', 'RCT-01', '--to', 'lint', '--note', 'restricted import']).status, 0);
    assert.deepEqual(findings(dir).promotions[0].findings, ['F-001', 'F-002']);
    assert.match(run(['promote', '--dir', dir]).stdout, /No promotion to decide/);
    run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'src/c.tsx', '--summary', 'three']);
    assert.match(run(['promote', '--dir', dir]).stdout, /No promotion to decide/);
  });

  it('refuses a finding without a file or summary, and a bad status', () => {
    const dir = installed();
    assert.equal(run(['finding', '--dir', dir, '--rule', 'RCT-01', '--summary', 'x']).status, 1);
    assert.equal(run(['finding', '--dir', dir, '--rule', 'RCT-01', '--file', 'a', '--summary', 'x', '--status', 'maybe']).status, 1);
  });
});

describe('review-context', () => {
  it('lists the change, writes the diff, and names the rules to review', () => {
    const dir = makeRepo({ branch: 'dev' });
    webProject(dir);
    run(['install', 'react', '--dir', dir]);
    spawnSync('git', ['add', '.'], { cwd: dir, env: GIT_ENV });
    spawnSync('git', ['commit', '-qm', 'base'], { cwd: dir, env: GIT_ENV });
    writeFiles(dir, { 'src/components/ui/Button/Button.tsx': 'export const Button = () => <button type="button" />;\n' }, { stage: false });
    writeFiles(dir, { 'src/features/orders/x.ts': 'export {};\n' }, { stage: false });
    const { status, stdout } = run(['review-context', '--dir', dir]);
    assert.equal(status, 0);
    const context = JSON.parse(stdout);
    assert.deepEqual(context.changed, ['src/components/ui/Button/Button.tsx']);
    assert.deepEqual(context.untracked, ['src/features/orders/x.ts']);
    assert.deepEqual(context.rulesFiles, ['.claude/rules/react.md']);
    assert.deepEqual(context.reviewRules.map((rule) => rule.id), ['RCT-01', 'RCT-02', 'RCT-03']);
    assert.match(readFileSync(context.diffFile, 'utf8'), /type="button"/);
  });
});
