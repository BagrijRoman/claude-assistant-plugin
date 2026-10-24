// Lint rules of the `react` standards pack (RCT-01…RCT-03), installed by the dev-assistant plugin (/standards).
// Settings — folders, platform, tokens, rules switched off — are read from docs/standards/standards.json,
// so a change of settings needs no edit here. This file is replaced by `/standards update`; a hand edit is kept,
// and the next update then asks to merge it.
//
// Wire it into eslint.config.mjs once:
//   import { reactStandards } from './eslint/standards/react.mjs';
//   export default defineConfig([ …, ...reactStandards ]);

import { existsSync, readFileSync } from 'node:fs';
import { dirname, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACK = 'react';
const TESTS = ['**/*.test.*', '**/*.spec.*', '**/*.stories.*', '**/__tests__/**', '**/__mocks__/**'];

const toPosix = (path) => path.split(sep).join('/');
const under = (dir, glob) => (dir === '.' || dir === '' ? glob : `${dir}/${glob}`);

/** A project path or glob from the settings, as an ESLint `ignores` pair: the file itself and all below it. */
const pathGlobs = (path) => [path, `${path}/**`];

// ── RCT-01 ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Where an import points, as a path from the project root; null for a package. */
const importTarget = (source, file, root, aliases) => {
  if (source.startsWith('.')) return toPosix(relative(root, resolve(dirname(file), source)));
  for (const [prefix, target] of Object.entries(aliases)) {
    if (source.startsWith(prefix)) return posix.normalize(`${target}${source.slice(prefix.length)}`).replace(/\/$/, '');
  }
  return null;
};

/** The names a feature's index re-exports from its own components/ folder. */
const componentExports = (root, featureDir, cache) => {
  if (cache.has(featureDir)) return cache.get(featureDir);
  const names = new Set();
  for (const name of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    const file = resolve(root, featureDir, name);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const [, list, from] of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g)) {
      if (!/^\.\/components(\/|$)/.test(from)) continue;
      for (const part of list.split(',')) {
        const exported = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim();
        if (exported) names.add(exported);
      }
    }
  }
  cache.set(featureDir, names);
  return names;
};

const noCrossFeatureImports = ({ root, featuresDir, aliases }) => ({
  meta: {
    type: 'problem',
    docs: { description: "RCT-01: a feature never imports another feature's components" },
    schema: [],
  },
  create: (context) => {
    const featureOf = (path) => (path.startsWith(`${featuresDir}/`) ? path.slice(featuresDir.length + 1).split('/')[0] : null);
    const own = featureOf(toPosix(relative(root, context.filename)));
    if (!own) return {};
    const cache = new Map();

    const check = (node, source, names) => {
      if (typeof source !== 'string') return;
      const target = importTarget(source, context.filename, root, aliases);
      const theirs = target && featureOf(target);
      if (!theirs || theirs === own) return;
      const rest = target.slice(featuresDir.length + theirs.length + 2);
      const borrowed = rest === 'components' || rest.startsWith('components/')
        ? rest.split('/')[1] ?? 'a component'
        : rest === '' || /^index(\.\w+)?$/.test(rest)
          ? names.find((name) => componentExports(root, `${featuresDir}/${theirs}`, cache).has(name))
          : null;
      if (!borrowed) return;
      context.report({
        node,
        message: `RCT-01: "${borrowed}" belongs to the feature "${theirs}". A component two features use lives in the shared components folder: move it there, then import it from there in both.`,
      });
    };

    const importedNames = (node) => (node.specifiers ?? []).map((s) => s.imported?.name ?? s.exported?.name ?? s.local?.name).filter(Boolean);
    return {
      ImportDeclaration: (node) => check(node.source, node.source.value, importedNames(node)),
      ExportNamedDeclaration: (node) => node.source && check(node.source, node.source.value, importedNames(node)),
      ExportAllDeclaration: (node) => check(node.source, node.source.value, ['*']),
      ImportExpression: (node) => node.source.type === 'Literal' && check(node.source, node.source.value, []),
    };
  },
});

// ── RCT-02 ─────────────────────────────────────────────────────────────────────────────────────────────────

const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const DATA_HOOK = /^use\w*(Query|Queries|Mutation|Subscription)$/;
const HTTP_CLIENTS = new Set(['axios', 'ky', 'apiClient', 'api', 'http']);
const API_MODULE = /(^|[/.])(api|apiClient|httpClient)(\.\w+)?$|^(axios|ky)$/;

const noLogicInComponentFile = () => ({
  meta: {
    type: 'problem',
    docs: { description: 'RCT-02: a component file renders; effects, data and API calls live in its hook' },
    schema: [],
  },
  create: (context) => {
    const base = context.filename.split(/[\\/]/).pop() ?? '';
    const name = base.replace(/\.[jt]sx$/, '');
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) return {};
    const hook = `use${name}`;
    const report = (node, what) => context.report({
      node,
      message: `RCT-02: ${what} in a component file. Move it into ${hook}.ts and have ${name} render what ${hook}() returns.`,
    });

    return {
      CallExpression: (node) => {
        const { callee } = node;
        const called = callee.type === 'Identifier' ? callee.name
          : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : null;
        const object = callee.type === 'MemberExpression' && callee.object.type === 'Identifier' ? callee.object.name : null;
        if (!called) return;
        if (EFFECT_HOOKS.has(called)) report(node, `\`${called}\``);
        else if (DATA_HOOK.test(called)) report(node, `the data hook \`${called}\``);
        else if (called === 'fetch' && !object) report(node, '`fetch`');
        else if (object && HTTP_CLIENTS.has(object)) report(node, `the API call \`${object}.${called}\``);
      },
      ImportDeclaration: (node) => {
        if (node.importKind === 'type') return;
        const source = String(node.source.value);
        if (API_MODULE.test(source)) report(node, `an import of the API module "${source}"`);
      },
    };
  },
});

// ── RCT-03, web ────────────────────────────────────────────────────────────────────────────────────────────

const PALETTES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITIES = 'bg|text|border|ring|outline|from|via|to|fill|stroke|divide|placeholder|accent|caret|decoration|shadow|inset-ring';

const WEB_CHECKS = [
  {
    pattern: new RegExp(`(?:^|[\\s:"'\`])(?:[a-z-]+:)*(?:${COLOR_UTILITIES})-(?:${PALETTES})-\\d{2,3}(?:/\\d+)?(?=$|[\\s"'\`])`),
    message: 'RCT-03: palette class "{{match}}". Use a semantic color token ({{tokens}}).',
  },
  {
    pattern: new RegExp(`(?:^|[\\s:"'\`])(?:[a-z-]+:)*(?:${COLOR_UTILITIES})-(?:white|black)(?:/\\d+)?(?=$|[\\s"'\`])`),
    message: 'RCT-03: raw color class "{{match}}". Use a semantic color token ({{tokens}}).',
  },
  {
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    message: 'RCT-03: hex color "{{match}}". Add a token ({{tokens}}) and use it.',
  },
  {
    pattern: /\[[^\]\s]*?(?:\d(?:px|rem|em|%|vh|vw)|#[0-9a-fA-F]{3,8}|rgb|hsl)[^\]\s]*\]/,
    message: 'RCT-03: arbitrary value "{{match}}". Add a token ({{tokens}}) instead of hard-coding it.',
  },
  {
    pattern: new RegExp(`(?:^|[\\s"'\`])dark:(?:[a-z-]+:)*(?:${COLOR_UTILITIES})-`),
    message: 'RCT-03: dark color pair "{{match}}". Light and dark are defined once, in the tokens ({{tokens}}).',
  },
];

const noRawVisualValues = ({ tokens }) => ({
  meta: {
    type: 'problem',
    docs: { description: 'RCT-03 (web): no palette classes, hex colors, arbitrary values or dark: pairs outside the tokens' },
    schema: [],
  },
  create: (context) => {
    const check = (node, text) => {
      for (const { pattern, message } of WEB_CHECKS) {
        const found = pattern.exec(text);
        if (found) {
          context.report({ node, message, data: { match: found[0].trim(), tokens } });
          return;
        }
      }
    };
    return {
      Literal: (node) => typeof node.value === 'string' && check(node, node.value),
      TemplateElement: (node) => check(node, node.value.raw),
    };
  },
});

// ── RCT-03, native ─────────────────────────────────────────────────────────────────────────────────────────

const COLOR_LITERAL = /^\s*(#[0-9a-fA-F]{3,8}|(rgba?|hsla?|hwb)\(.*\))\s*$/;
const COLOR_KEY = /color$/i;
const COLOR_KEYWORDS = new Set(['transparent', 'inherit', 'currentColor', 'currentcolor']);
const TYPE_KEYS = new Set(['fontSize', 'lineHeight', 'letterSpacing', 'fontWeight', 'fontFamily']);
const RADIUS_KEY = /^border(\w*)Radius$/;

const keyName = (key) => (key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null);
const isRawNumber = (node) => (node.type === 'Literal' && typeof node.value === 'number')
  || (node.type === 'UnaryExpression' && node.argument.type === 'Literal' && typeof node.argument.value === 'number');
const isString = (node) => node.type === 'Literal' && typeof node.value === 'string';

const noRawStyleValues = ({ tokens }) => ({
  meta: {
    type: 'problem',
    docs: { description: 'RCT-03 (native): colors, typography and radii come from the theme tokens' },
    schema: [],
  },
  create: (context) => {
    const report = (node, what) => context.report({ node, message: `RCT-03: ${what}. Use a theme token ({{tokens}}); add one there if it is missing.`, data: { tokens } });
    const colorValue = (node, key) => {
      if (!isString(node) || COLOR_KEYWORDS.has(node.value)) return;
      if (COLOR_LITERAL.test(node.value)) return; // reported once by the Literal visitor
      report(node, `raw color "${node.value}" for \`${key}\``);
    };
    return {
      Literal: (node) => {
        if (typeof node.value === 'string' && COLOR_LITERAL.test(node.value)) report(node, `raw color "${node.value.trim()}"`);
      },
      Property: (node) => {
        const key = keyName(node.key);
        if (!key) return;
        if (COLOR_KEY.test(key)) colorValue(node.value, key);
        else if (TYPE_KEYS.has(key) && (isRawNumber(node.value) || isString(node.value))) report(node.value, `raw \`${key}\``);
        else if (RADIUS_KEY.test(key) && isRawNumber(node.value) && node.value.value !== 0) report(node.value, `raw \`${key}\``);
      },
      JSXAttribute: (node) => {
        const key = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (key && COLOR_KEY.test(key) && node.value) colorValue(node.value, key);
      },
    };
  },
});

// ── Config ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The flat-config entries for one project. `pack` is the `packs.react` entry of standards.json: its `settings`
 * and the rules it switched off (`disabled`, by rule id). Exported for the plugin's tests.
 */
export const createStandards = (pack, root) => {
  if (!pack?.settings) return [];
  const { platform, srcDir, sharedDir, featuresDir, tokensFiles = [], aliases = {}, skipLint = [] } = pack.settings;
  const off = new Set(Object.keys(pack.disabled ?? {}));
  const tokens = tokensFiles.join(', ') || 'the tokens file';
  const on = (ruleId, lintRule) => !off.has(ruleId) && !skipLint.includes(lintRule);

  const plugin = {
    meta: { name: 'dev-assistant-standards' },
    rules: {
      'no-cross-feature-imports': noCrossFeatureImports({ root, featuresDir, aliases }),
      'no-logic-in-component-file': noLogicInComponentFile(),
      'no-raw-visual-values': noRawVisualValues({ tokens }),
      'no-raw-style-values': noRawStyleValues({ tokens }),
    },
  };
  const source = under(srcDir, '**/*.{ts,tsx,js,jsx,mts,mjs}');
  const entries = [];
  const add = (files, rule, ignores = []) => entries.push({
    name: `dev-assistant/${PACK}/${rule}`,
    files,
    ignores: [...TESTS, ...ignores],
    plugins: { standards: plugin },
    rules: { [`standards/${rule}`]: 'error' },
  });

  if (on('RCT-01', 'no-cross-feature-imports')) add([under(featuresDir, '**/*.{ts,tsx,js,jsx}')], 'no-cross-feature-imports');
  if (on('RCT-02', 'no-logic-in-component-file')) {
    add([under(featuresDir, '**/*.{tsx,jsx}'), under(sharedDir, '**/*.{tsx,jsx}')], 'no-logic-in-component-file');
  }
  const tokenFiles = tokensFiles.flatMap(pathGlobs);
  if (platform === 'native') {
    if (on('RCT-03', 'no-raw-style-values')) add([source], 'no-raw-style-values', tokenFiles);
  } else if (on('RCT-03', 'no-raw-visual-values')) add([source], 'no-raw-visual-values', tokenFiles);
  return entries;
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const installed = () => {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, 'docs', 'standards', 'standards.json'), 'utf8')).packs?.[PACK] ?? null;
  } catch {
    return null;
  }
};

export const reactStandards = createStandards(installed(), ROOT);
