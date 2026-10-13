// The react pack's lint rules, run through ESLint's own Linter (a devDependency of the plugin only: projects use
// their own ESLint). Fixtures are plain JSX, which ESLint's default parser reads; projects parse TypeScript with
// their own parser, which the rules do not depend on.

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { join } from 'node:path';
import { Linter } from 'eslint';
import { createStandards } from '../skills/standards/templates/packs/react/eslint.mjs';
import { makeTempDir, removeTempDirs, writeFiles } from './helpers.mjs';

const SETTINGS = {
  platform: 'web',
  srcDir: 'src',
  sharedDir: 'src/components',
  featuresDir: 'src/features',
  tokensFiles: ['src/theme'],
  aliases: { '@/': 'src/' },
  skipLint: [],
};

const PARSING = { files: ['**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } };

const project = () => {
  const root = makeTempDir();
  writeFiles(root, {
    'src/features/users/index.ts': "export { UsersScreen } from './components/UsersScreen';\nexport { USER_ROLES } from './users.types';\n",
  }, { stage: false });
  return root;
};

/** The messages of the pack's rules for `code` written at `file` (a path from the project root). */
const lint = (code, file, { settings = {}, disabled = {}, root = project() } = {}) => {
  const linter = new Linter({ cwd: root });
  const config = [PARSING, ...createStandards({ settings: { ...SETTINGS, ...settings }, disabled }, root)];
  return linter.verify(code, config, { filename: join(root, file) }).map((message) => ({
    rule: message.ruleId,
    message: message.message,
    line: message.line,
  }));
};

const rules = (messages) => messages.map((message) => message.rule);

after(removeTempDirs);

describe('RCT-01 no-cross-feature-imports', () => {
  const FILE = 'src/features/orders/components/OrdersScreen/OrdersScreen.jsx';

  it("reports a path into another feature's components, by alias and relative", () => {
    const messages = lint([
      "import { UserAvatar } from '@/features/users/components/UserAvatar';",
      "import { UserCard } from '../../../users/components/UserCard';",
    ].join('\n'), FILE);
    assert.deepEqual(rules(messages), ['standards/no-cross-feature-imports', 'standards/no-cross-feature-imports']);
    assert.match(messages[0].message, /"UserAvatar" belongs to the feature "users"/);
  });

  it("reports a component taken through the other feature's index", () => {
    const messages = lint("import { UsersScreen, USER_ROLES } from '@/features/users';", FILE);
    assert.equal(messages.length, 1);
    assert.match(messages[0].message, /"UsersScreen" belongs to the feature "users"/);
  });

  it("allows the other feature's non-component exports, its own components, shared components and packages", () => {
    assert.deepEqual(lint([
      "import { USER_ROLES } from '@/features/users';",
      "import { useUsersQuery } from '@/features/users/users.queries';",
      "import { OrderRow } from '../OrderRow';",
      "import { Button } from '@/components/ui/Button';",
      "import { clsx } from 'clsx';",
    ].join('\n'), FILE), []);
  });

  it('does not apply outside the features folder, nor when RCT-01 is switched off', () => {
    const code = "import { UsersScreen } from '@/features/users/components/UsersScreen';";
    assert.deepEqual(lint(code, 'src/app/users/page.jsx'), []);
    assert.deepEqual(lint(code, FILE, { disabled: { 'RCT-01': { reason: 'x' } } }), []);
  });
});

describe('RCT-02 no-logic-in-component-file', () => {
  const FILE = 'src/features/orders/components/OrderCard/OrderCard.jsx';

  it('reports effects, data hooks, fetch, HTTP clients and API modules in a component file', () => {
    const messages = lint([
      "import { useEffect } from 'react';",
      "import axios from 'axios';",
      "import { getOrders } from '../../orders.api';",
      'export const OrderCard = () => {',
      '  useEffect(() => {}, []);',
      '  React.useLayoutEffect(() => {});',
      '  const { data } = useOrdersQuery();',
      '  const save = useMutation({});',
      "  fetch('/x');",
      "  axios.get('/x');",
      '  return <div>{String(data)}{String(save)}</div>;',
      '};',
    ].join('\n'), FILE);
    assert.deepEqual(messages.map((message) => message.line), [2, 3, 5, 6, 7, 8, 9, 10]);
    assert.match(messages[2].message, /`useEffect` in a component file\. Move it into useOrderCard\.ts/);
    assert.match(messages[4].message, /the data hook `useOrdersQuery`/);
  });

  it('allows view-only state, the own hook and other hooks in the component file', () => {
    assert.deepEqual(lint([
      "import { useState } from 'react';",
      "import { useOrderCard } from './useOrderCard';",
      'export const OrderCard = () => {',
      '  const [open, setOpen] = useState(false);',
      '  const { title } = useOrderCard();',
      '  const client = useQueryClient();',
      '  return <button onClick={() => setOpen(!open)}>{title}{String(client)}</button>;',
      '};',
    ].join('\n'), FILE), []);
  });

  it('does not apply to the hook file, a test, or a file outside the component folders', () => {
    const code = 'export const useOrderCard = () => { useEffect(() => {}); return useOrdersQuery(); };';
    assert.deepEqual(lint(code, 'src/features/orders/components/OrderCard/useOrderCard.jsx'), []);
    assert.deepEqual(lint(`${code}\nconst A = () => <div />;`, 'src/features/orders/components/OrderCard/OrderCard.test.jsx'), []);
    assert.deepEqual(lint('const A = () => { useEffect(() => {}); return <div />; };', 'src/app/Page.jsx'), []);
  });

  it('applies to a single-file subcomponent and to shared components', () => {
    const code = 'export const Badge = () => { useEffect(() => {}); return <i />; };';
    assert.equal(lint(code, 'src/features/orders/components/OrderCard/components/Badge.jsx').length, 1);
    assert.equal(lint(code, 'src/components/ui/Badge/Badge.jsx').length, 1);
  });
});

describe('RCT-03 no-raw-visual-values (web)', () => {
  const FILE = 'src/features/orders/components/OrderCard/OrderCard.styles.js';

  it('reports palette classes, raw black and white, hex values, arbitrary values and dark: pairs', () => {
    const lines = [
      "export const a = 'text-gray-500';",
      "export const b = 'bg-white';",
      "export const c = 'color: #ff0000';",
      "export const d = 'p-[13px]';",
      "export const e = 'dark:bg-surface';",
      'export const f = `hover:border-blue-200 ${x}`;',
    ];
    const messages = lint(lines.join('\n'), FILE);
    assert.deepEqual(messages.map((message) => message.line), [1, 2, 3, 4, 5, 6]);
    assert.match(messages[0].message, /palette class "text-gray-500"\. Use a semantic color token \(src\/theme\)/);
  });

  it('allows token utilities, and raw values inside the tokens files and tests', () => {
    assert.deepEqual(lint("export const a = 'bg-surface text-muted rounded-control p-4';", FILE), []);
    assert.deepEqual(lint("export const a = '#fff';", 'src/theme/colors.js'), []);
    assert.deepEqual(lint("export const a = '#fff';", 'src/features/orders/x.test.js'), []);
  });

  it('is skipped when the project has its own rule of that name', () => {
    assert.deepEqual(lint("export const a = 'text-gray-500';", FILE, { settings: { skipLint: ['no-raw-visual-values'] } }), []);
  });
});

describe('RCT-03 no-raw-style-values (native)', () => {
  const FILE = 'src/features/orders/components/OrderCard/OrderCard.styles.js';
  const native = { settings: { platform: 'native' } };

  it('reports color literals, named colors, raw typography and radii, in styles and in props', () => {
    const messages = lint([
      'export const styles = StyleSheet.create({',
      "  title: { color: '#333', fontSize: 13, fontWeight: '600', fontFamily: 'Inter', lineHeight: 18 },",
      "  card: { backgroundColor: 'white', borderRadius: 8, borderTopLeftRadius: -2, shadowColor: 'rgba(0,0,0,0.2)' },",
      '});',
      'export const Icon = () => <Svg color="red" tintColor={colors.icon} />;',
    ].join('\n'), FILE, native);
    const reported = messages.map((message) => `${message.line}:${/RCT-03: (.*?)\. Use/.exec(message.message)?.[1]}`);
    assert.deepEqual(reported, [
      '2:raw color "#333"',
      '2:raw `fontSize`',
      '2:raw `fontWeight`',
      '2:raw `fontFamily`',
      '2:raw `lineHeight`',
      '3:raw color "white" for `backgroundColor`',
      '3:raw `borderRadius`',
      '3:raw `borderTopLeftRadius`',
      '3:raw color "rgba(0,0,0,0.2)"',
      '5:raw color "red" for `color`',
    ]);
  });

  it('allows theme tokens, spacing numbers, a zero radius and transparent', () => {
    assert.deepEqual(lint([
      'export const styles = StyleSheet.create({',
      "  card: { color: colors.text, fontSize: type.body.size, padding: 12, gap: 8, borderRadius: 0, backgroundColor: 'transparent' },",
      '});',
    ].join('\n'), FILE, native), []);
  });

  it('allows raw values inside the tokens folder', () => {
    assert.deepEqual(lint("export const colors = { text: '#333' };", 'src/theme/colors.js', native), []);
  });
});
