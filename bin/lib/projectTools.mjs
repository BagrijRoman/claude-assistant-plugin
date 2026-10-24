// The project's own formatter and linters: which of them a file falls under, whether the project configured
// and installed them, and how to run one. Nothing is downloaded; a tool runs only from node_modules/.bin.

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const FORMATTABLE = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc', '.md', '.mdx',
  '.css', '.scss', '.less', '.html', '.vue', '.graphql', '.gql', '.yml', '.yaml']);
const LINTABLE = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.vue']);
const SKIPPED_DIRS = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.expo|\.turbo|\.cache|__generated__|generated|vendor)(\/|$)/;

const PRETTIER_CONFIGS = ['.prettierrc', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.json5', '.prettierrc.js',
  '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs'];
export const ESLINT_CONFIGS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts',
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
const OXLINT_CONFIGS = ['.oxlintrc.json', 'oxlint.json'];

const TOOL_TIMEOUT_MS = 20000;

const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
};

/** The nearest directory above the file that holds a package.json: where the tools and their configs live. */
const projectRoot = (file) => {
  let dir = dirname(file);
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

/** The tool's executable as installed by the dependency manager, searching upwards for a hoisted install. */
const binary = (root, name) => {
  let dir = root;
  for (;;) {
    const bin = join(dir, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
    if (existsSync(bin)) return bin;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

const configured = (root, configs, packageKey, dependency) => {
  if (configs.some((file) => existsSync(join(root, file)))) return true;
  const pkg = readJson(join(root, 'package.json')) ?? {};
  if (packageKey && pkg[packageKey] !== undefined) return true;
  return Boolean(dependency && (pkg.devDependencies?.[dependency] || pkg.dependencies?.[dependency]));
};

/**
 * What applies to `target` (a path from a tool payload, resolved against `cwd`): the project root, the file's
 * path relative to it, and which tools are both configured and installed. Null when nothing applies.
 */
export const detectTools = (target, cwd) => {
  if (typeof target !== 'string' || !target) return null;
  const file = resolve(cwd || process.cwd(), target);
  const ext = extname(file).toLowerCase();
  if (!FORMATTABLE.has(ext) || SKIPPED_DIRS.test(file.split(sep).join('/')) || !existsSync(file)) return null;
  const root = projectRoot(file);
  if (!root) return null;

  const available = (name, configs, packageKey, dependency) =>
    configured(root, configs, packageKey, dependency) ? binary(root, name) : null;
  const lintable = LINTABLE.has(ext);
  return {
    root,
    rel: relative(root, file),
    prettier: available('prettier', PRETTIER_CONFIGS, 'prettier'),
    eslint: lintable ? available('eslint', ESLINT_CONFIGS, 'eslintConfig') : null,
    oxlint: lintable ? available('oxlint', OXLINT_CONFIGS, null, 'oxlint') : null,
  };
};

/** Runs an installed tool from the project root; returns its stdout, or '' when it failed to start or timed out. */
export const runTool = (root, bin, args) => {
  const result = spawnSync(bin, args, { cwd: root, encoding: 'utf8', timeout: TOOL_TIMEOUT_MS, shell: process.platform === 'win32' });
  return typeof result.stdout === 'string' ? result.stdout : '';
};
