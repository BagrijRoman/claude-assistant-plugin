// RCT-02's `componentLayout` check: every component is a folder named after it, with an `index.ts` that only
// re-exports, the component file of the same name, its hook and `Name.<role>.*` files, and its subcomponents in
// `components/` — a folder each, or a single file while small. Reads the disk only; knows nothing about
// packs or hooks, and returns findings as `{ folder, message, fix }`.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const COMPONENT_FILE = /^[A-Z][A-Za-z0-9]*\.(tsx|jsx)$/;
const INDEX = /^index\.(ts|tsx|js|jsx)$/;
const SKIPPED = new Set(['node_modules', '__tests__', '__mocks__', '__snapshots__', '__fixtures__']);
const ASSET_DIRS = new Set(['assets', 'images', 'icons']);
const ASSET = /\.(svg|png|jpe?g|gif|webp|avif|ico|lottie|mp4|json)$/i;

const entries = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};
const filesIn = (dir) => entries(dir).filter((entry) => entry.isFile()).map((entry) => entry.name);
const dirsIn = (dir) => entries(dir).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
const isDir = (dir) => {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

/** True when the text is nothing but `export … from '…'` lines, comments and a `'use client'` directive. */
export const onlyReExports = (text) => {
  const rest = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*['"]use (client|server)['"];?\s*$/gm, '')
    .replace(/export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  return rest.trim() === '';
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A file that belongs in the folder of the component `name`. */
const belongs = (name, file) => {
  const own = escape(name);
  return INDEX.test(file)
    || new RegExp(`^${own}\\.[\\w.-]+$`).test(file) // Name.tsx, Name.styles.ts, Name.test.tsx, Name.module.css
    || new RegExp(`^use${own}\\w*\\.[\\w.-]+$`).test(file) // useName.ts, useName.test.ts, useNameForm.ts
    || ASSET.test(file)
    || file.startsWith('.');
};

/** The findings for one component folder, its `components/` and every subcomponent below it. */
export const checkComponent = (root, rel) => {
  const dir = join(root, rel);
  const name = rel.split('/').pop();
  const files = filesIn(dir);
  const findings = [];
  const add = (message, fix) => findings.push({ folder: rel, message, fix });

  const index = files.find((file) => INDEX.test(file));
  if (!index) add('no index.ts', `add ${rel}/index.ts that re-exports ${name} and nothing else`);
  else if (!onlyReExports(readFileSync(join(dir, index), 'utf8'))) {
    add(`${index} holds code besides re-exports`, `move that code into ${name}.tsx, use${name}.ts or ${name}.<role>.ts; leave only \`export … from\` lines`);
  }
  if (!files.some((file) => file === `${name}.tsx` || file === `${name}.jsx`)) {
    add(`no ${name}.tsx`, `the component file is named after its folder: ${rel}/${name}.tsx`);
  }
  for (const file of files.filter((file) => !belongs(name, file))) {
    add(`"${file}" does not fit the layout`, COMPONENT_FILE.test(file)
      ? `a second component is a subcomponent: move it to ${rel}/components/`
      : `name it ${name}.<role>.ts, or move it out of the component`);
  }
  for (const sub of dirsIn(dir)) {
    if (SKIPPED.has(sub) || ASSET_DIRS.has(sub)) continue;
    if (sub === 'components') findings.push(...checkSubcomponents(root, `${rel}/components`));
    else if (PASCAL.test(sub)) add(`the subcomponent "${sub}" sits outside components/`, `move it to ${rel}/components/${sub}/`);
    else add(`the folder "${sub}" does not fit the layout`, `subcomponents go to ${rel}/components/; other code to ${name}.<role>.ts`);
  }
  return findings;
};

/** A component's `components/`: subcomponent folders, single-file subcomponents with their own files, a barrel. */
const checkSubcomponents = (root, rel) => {
  const dir = join(root, rel);
  const findings = [];
  for (const file of filesIn(dir)) {
    if (INDEX.test(file) || COMPONENT_FILE.test(file) || /^[A-Z][A-Za-z0-9]*\.[\w.-]+$/.test(file) || file.startsWith('.')) continue;
    findings.push({ folder: rel, message: `"${file}" is not a subcomponent`, fix: 'components/ holds only subcomponents; put other code next to the component that uses it, as Name.<role>.ts' });
  }
  for (const sub of dirsIn(dir)) {
    if (SKIPPED.has(sub)) continue;
    if (PASCAL.test(sub)) findings.push(...checkComponent(root, `${rel}/${sub}`));
    else findings.push({ folder: rel, message: `the folder "${sub}" is not a subcomponent`, fix: 'components/ holds only subcomponents, each a PascalCase folder or file' });
  }
  return findings;
};

/** A folder of the trees that is not a component (a feature, `components/`, `ui/`): no loose component files. */
const checkGroup = (root, rel) => filesIn(join(root, rel))
  .filter((file) => COMPONENT_FILE.test(file))
  .map((file) => {
    const name = file.replace(/\.(tsx|jsx)$/, '');
    return { folder: rel, message: `the component "${file}" is a loose file`, fix: `give it a folder: ${rel}/${name}/ with index.ts and ${name}.tsx` };
  });

const prefixOf = (tree) => (tree === '.' || tree === '' ? '' : `${tree}/`);
const treesOf = (settings) => [...new Set([settings.sharedDir, settings.featuresDir].filter(Boolean))];

/** Every component and group folder under the shared and feature folders. */
export const checkTree = (root, settings) => {
  const findings = [];
  const walk = (rel) => {
    findings.push(...checkGroup(root, rel));
    for (const sub of dirsIn(join(root, rel))) {
      if (SKIPPED.has(sub) || sub.startsWith('.')) continue;
      const path = `${prefixOf(rel)}${sub}`;
      if (PASCAL.test(sub)) findings.push(...checkComponent(root, path));
      else walk(path);
    }
  };
  for (const tree of treesOf(settings)) if (isDir(join(root, tree))) walk(tree === '' ? '.' : tree);
  return findings;
};

/**
 * Only what the changed files touch: for a file inside a component, its outermost component folder (so a
 * subcomponent's parent is checked too); for a file in a group folder, that folder's loose files.
 */
export const checkFiles = (root, settings, files) => {
  const targets = new Map();
  for (const file of files) {
    const tree = treesOf(settings).find((candidate) => prefixOf(candidate) === '' || file.startsWith(prefixOf(candidate)));
    if (tree === undefined) continue;
    const parts = file.slice(prefixOf(tree).length).split('/').slice(0, -1);
    if (parts.some((part) => SKIPPED.has(part))) continue;
    let rel = tree;
    let component = null;
    for (const part of parts) {
      rel = `${prefixOf(rel)}${part}`;
      if (PASCAL.test(part)) {
        component = rel;
        break;
      }
    }
    targets.set(component ?? rel, component ? 'component' : 'group');
  }
  const findings = [];
  for (const [rel, kind] of targets) {
    if (!isDir(join(root, rel))) continue;
    findings.push(...(kind === 'component' ? checkComponent(root, rel) : checkGroup(root, rel)));
  }
  return findings;
};
