import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { checkFiles, checkTree, onlyReExports } from '../bin/lib/componentLayout.mjs';
import { commit, GIT_ENV, makeRepo, makeTempDir, removeTempDirs, runBashHook, runHook, writeFiles } from './helpers.mjs';

const HOOK = new URL('../bin/standardsCheck.mjs', import.meta.url).pathname;
const STANDARDS = new URL('../bin/standards.mjs', import.meta.url).pathname;
const SCAFFOLD = new URL('../bin/scaffold.mjs', import.meta.url).pathname;
const SETTINGS = { sharedDir: 'src/components', featuresDir: 'src/features' };

const GOOD = {
  'src/features/orders/components/OrderCard/index.ts': "export { OrderCard } from './OrderCard';\n",
  'src/features/orders/components/OrderCard/OrderCard.tsx': 'export const OrderCard = () => null;\n',
  'src/features/orders/components/OrderCard/useOrderCard.ts': 'export const useOrderCard = () => ({});\n',
  'src/features/orders/components/OrderCard/OrderCard.styles.ts': "export const root = '';\n",
  'src/features/orders/components/OrderCard/OrderCard.test.tsx': '',
  'src/features/orders/components/OrderCard/components/OrderBadge.tsx': 'export const OrderBadge = () => null;\n',
  'src/features/orders/components/OrderCard/components/OrderHeader/index.ts': "export { OrderHeader } from './OrderHeader';\n",
  'src/features/orders/components/OrderCard/components/OrderHeader/OrderHeader.tsx': 'export const OrderHeader = () => null;\n',
  'src/features/orders/orders.api.ts': 'export {};\n',
  'src/components/ui/index.ts': "export * from './Button';\n",
  'src/components/ui/Button/index.ts': "'use client';\n// the button\nexport { Button } from './Button';\nexport type { ButtonProps } from './Button';\n",
  'src/components/ui/Button/Button.tsx': 'export const Button = () => null;\n',
};

const layoutOf = (files) => {
  const root = makeTempDir();
  writeFiles(root, files, { stage: false });
  return checkTree(root, SETTINGS).map(({ folder, message }) => `${folder} · ${message}`);
};

after(removeTempDirs);

describe('componentLayout', () => {
  it('passes the layout the rule describes', () => {
    assert.deepEqual(layoutOf(GOOD), []);
  });

  it('finds a missing index, a missing component file, and a folder named apart from its component', () => {
    assert.deepEqual(layoutOf({
      'src/components/Card/Card.tsx': 'export const Card = () => null;\n',
      'src/components/Toast/index.ts': "export { Toaster } from './Toaster';\n",
      'src/components/Toast/Toaster.tsx': 'export const Toaster = () => null;\n',
    }), [
      'src/components/Card · no index.ts',
      'src/components/Toast · no Toast.tsx',
      'src/components/Toast · "Toaster.tsx" does not fit the layout',
    ]);
  });

  it('finds code in index.ts, a stray file, a subcomponent outside components/ and junk in components/', () => {
    assert.deepEqual(layoutOf({
      'src/components/Card/index.ts': "export { Card } from './Card';\nexport const size = 2;\n",
      'src/components/Card/Card.tsx': 'export const Card = () => null;\n',
      'src/components/Card/helpers.ts': '',
      'src/components/Card/CardTitle/CardTitle.tsx': '',
      'src/components/Card/components/utils.ts': '',
      'src/components/Card/components/parts/x.tsx': '',
    }), [
      'src/components/Card · index.ts holds code besides re-exports',
      'src/components/Card · "helpers.ts" does not fit the layout',
      'src/components/Card · the subcomponent "CardTitle" sits outside components/',
      'src/components/Card/components · "utils.ts" is not a subcomponent',
      'src/components/Card/components · the folder "parts" is not a subcomponent',
    ]);
  });

  it('finds a component written as a loose file in a feature', () => {
    assert.deepEqual(layoutOf({ 'src/features/orders/components/OrderRow.tsx': '' }),
      ['src/features/orders/components · the component "OrderRow.tsx" is a loose file']);
  });

  it('checks, for changed files, only the outermost component they touch', () => {
    const root = makeTempDir();
    writeFiles(root, {
      ...GOOD,
      'src/features/orders/components/OrderCard/components/OrderHeader/index.ts': 'export const x = 1;\n',
      'src/components/Other/Other.tsx': '',
    }, { stage: false });
    const found = checkFiles(root, SETTINGS, ['src/features/orders/components/OrderCard/OrderCard.tsx', 'src/app/page.tsx', 'README.md']);
    assert.deepEqual(found.map((finding) => finding.folder), ['src/features/orders/components/OrderCard/components/OrderHeader']);
  });

  it('reads re-exports, comments and directives as an index with no code', () => {
    assert.ok(onlyReExports("/* a */\n'use client';\nexport * from './a';\nexport * as b from './b';\nexport { c, type D } from './c';\n"));
    assert.ok(!onlyReExports("import { a } from './a';\nexport { a };\n"));
  });
});

/** A web project in a repository on `dev`, with the react pack installed and committed. */
const installedRepo = () => {
  const dir = makeRepo({ branch: 'dev' });
  writeFiles(dir, { 'package.json': '{"name":"web","dependencies":{"react":"19"}}', ...GOOD }, { stage: false });
  spawnSync('node', [STANDARDS, 'install', 'react', '--dir', dir], { env: GIT_ENV });
  spawnSync('git', ['add', '.'], { cwd: dir, env: GIT_ENV });
  commit(dir, 'base');
  return dir;
};

const transcript = (dir, entries) => {
  const path = join(makeTempDir(), 'transcript.jsonl');
  writeFileSync(path, entries.map((entry) => JSON.stringify(entry)).join('\n'));
  return path;
};
const said = (text) => ({ type: 'user', message: { role: 'user', content: text } });
const wrote = (file, tool = 'Write') => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: tool, input: { file_path: file } }] } });
const result = () => ({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });
const stop = (dir, entries, extra = {}) => runHook(HOOK, { hook_event_name: 'Stop', cwd: dir, transcript_path: transcript(dir, entries), stop_hook_active: false, ...extra });

describe('standards-check at Stop', () => {
  it("holds the turn when a component written this turn breaks the layout, with the rule and the fix", () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' }, { stage: false });
    const { status, stderr } = stop(dir, [said('add a card'), wrote(join(dir, 'src/components/Card/Card.tsx')), result()]);
    assert.equal(status, 2);
    assert.match(stderr, /\[dev-assistant\] standards-check: the components written this turn break the project's standards\. 1 standards finding:/);
    assert.match(stderr, /RCT-02 · src\/components\/Card · no index\.ts → add src\/components\/Card\/index\.ts/);
    assert.match(stderr, /Do this instead: fix them before handing the work over/);
  });

  it('follows relative paths, Edit and MultiEdit', () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '', 'src/components/Tile/Tile.tsx': '' }, { stage: false });
    const { status, stderr } = stop(dir, [said('x'), wrote('src/components/Card/Card.tsx', 'Edit'), wrote('src/components/Tile/Tile.tsx', 'MultiEdit')]);
    assert.equal(status, 2);
    assert.match(stderr, /2 standards findings/);
  });

  it('passes when the turn wrote nothing that breaks, or wrote it before the last operator message', () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' }, { stage: false });
    assert.equal(stop(dir, [said('x'), wrote(join(dir, 'src/features/orders/components/OrderCard/OrderCard.tsx'))]).status, 0);
    assert.equal(stop(dir, [said('x'), wrote(join(dir, 'src/components/Card/Card.tsx')), said('now something else')]).status, 0);
  });

  it('holds a turn only once: passes when the stop hook already held it', () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' }, { stage: false });
    assert.equal(stop(dir, [said('x'), wrote(join(dir, 'src/components/Card/Card.tsx'))], { stop_hook_active: true }).status, 0);
  });

  it('passes in a project without installed standards, and on a transcript it cannot read', () => {
    const dir = makeTempDir();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' }, { stage: false });
    assert.equal(stop(dir, [said('x'), wrote(join(dir, 'src/components/Card/Card.tsx'))]).status, 0);
    assert.equal(runHook(HOOK, { hook_event_name: 'Stop', cwd: dir, transcript_path: join(dir, 'missing.jsonl') }).status, 0);
  });

  it('skips a rule switched off in the project', () => {
    const dir = installedRepo();
    spawnSync('node', [STANDARDS, 'disable', 'RCT-02', '--reason', 'legacy', '--dir', dir], { env: GIT_ENV });
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' }, { stage: false });
    assert.equal(stop(dir, [said('x'), wrote(join(dir, 'src/components/Card/Card.tsx'))]).status, 0);
  });
});

describe('standards-check at commit', () => {
  it('blocks a commit that records a component breaking the layout', () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' });
    const { status, stderr } = runBashHook(HOOK, 'git commit -m "add card"', dir);
    assert.equal(status, 2);
    assert.match(stderr, /standards-check blocked this command: the components this commit records break the project's standards/);
    assert.match(stderr, /Standards-skipped: <rule id> <reason>/);
  });

  it('follows `cd` into the repository and `-a` to the tracked changes', () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/ui/Button/index.ts': "export { Button } from './Button';\nexport const x = 1;\n" }, { stage: false });
    assert.equal(runBashHook(HOOK, `cd ${dir} && git commit -am wip`, makeTempDir()).status, 2);
    assert.equal(runBashHook(HOOK, 'git commit -m wip', dir).status, 0);
  });

  it("passes with the operator's `Standards-skipped:` for that rule", () => {
    const dir = installedRepo();
    writeFiles(dir, { 'src/components/Card/Card.tsx': '' });
    const command = 'git commit -m "$(cat <<\'EOF\'\nadd card\n\nStandards-skipped: RCT-02 moved in the next task\nEOF\n)"';
    assert.equal(runBashHook(HOOK, command, dir).status, 0);
  });

  it('passes a clean component, a command that is not a commit, and a project without standards', () => {
    const dir = installedRepo();
    writeFiles(dir, {
      'src/components/Card/index.ts': "export { Card } from './Card';\n",
      'src/components/Card/Card.tsx': 'export const Card = () => null;\n',
    });
    assert.equal(runBashHook(HOOK, 'git commit -m card', dir).status, 0);
    writeFiles(dir, { 'src/components/Tile/Tile.tsx': '' });
    assert.equal(runBashHook(HOOK, 'git status && echo "git commit -m x"', dir).status, 0);
    const bare = makeRepo({ branch: 'dev' });
    writeFiles(bare, { 'src/components/Tile/Tile.tsx': '' });
    assert.equal(runBashHook(HOOK, 'git commit -m tile', bare).status, 0);
  });
});

describe('scaffold', () => {
  const scaffold = (dir, ...args) => spawnSync('node', [SCAFFOLD, 'component', ...args, '--dir', dir], { encoding: 'utf8', env: GIT_ENV });
  const project = (pkg = '{"name":"web","dependencies":{"react":"19"}}') => {
    const dir = makeTempDir();
    writeFiles(dir, { 'package.json': pkg, 'tsconfig.json': '{}', 'src/components/ui/index.ts': '' }, { stage: false });
    return dir;
  };

  it('lays out a feature component with hook and styles that the check passes', () => {
    const dir = project();
    const { status, stdout } = scaffold(dir, 'OrderCard', '--feature', 'orders', '--hook', '--styles');
    assert.equal(status, 0);
    for (const file of ['index.ts', 'OrderCard.tsx', 'useOrderCard.ts', 'OrderCard.styles.ts']) {
      assert.match(stdout, new RegExp(`\\+ src/features/orders/components/OrderCard/${file.replace('.', '\\.')}`));
    }
    assert.equal(scaffold(dir, 'OrderBadge', '--in', 'src/features/orders/components/OrderCard', '--single').status, 0);
    assert.equal(scaffold(dir, 'OrderHeader', '--in', 'src/features/orders/components/OrderCard', '--hook').status, 0);
    assert.deepEqual(checkTree(dir, SETTINGS), []);
  });

  it('puts a shared component into its group and points at the barrel', () => {
    const dir = project();
    const { stdout } = scaffold(dir, 'Chip', '--shared', 'ui');
    assert.match(stdout, /\+ src\/components\/ui\/Chip\/Chip\.tsx/);
    assert.match(stdout, /src\/components\/ui\/index\.ts exports its neighbours: add Chip there/);
  });

  it('writes React Native markup and StyleSheet styles on a native project', () => {
    const dir = project('{"name":"app","dependencies":{"react-native":"0.80"}}');
    scaffold(dir, 'Avatar', '--shared', '--styles');
    const code = spawnSync('cat', [join(dir, 'src/components/Avatar/Avatar.tsx'), join(dir, 'src/components/Avatar/Avatar.styles.ts')], { encoding: 'utf8' }).stdout;
    assert.match(code, /import \{ Text, View \} from 'react-native';/);
    assert.match(code, /<View style=\{styles\.root\}>/);
    assert.match(code, /StyleSheet\.create/);
  });

  it('refuses an existing folder, a bad name, a missing place and --single with a hook', () => {
    const dir = project();
    scaffold(dir, 'Chip', '--shared');
    assert.match(scaffold(dir, 'Chip', '--shared').stderr, /already exists; nothing written/);
    assert.match(scaffold(dir, 'chip', '--shared').stderr, /not a PascalCase component name/);
    assert.match(scaffold(dir, 'Tag').stderr, /exactly one of --feature/);
    assert.match(scaffold(dir, 'Tag', '--in', 'src/components/Chip', '--single', '--hook').stderr, /drop --single/);
  });
});
