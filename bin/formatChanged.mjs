#!/usr/bin/env node
// format-changed — PostToolUse(Edit|Write|MultiEdit). Runs the project's own formatter and lint fixer on the
// one file the model just wrote, so formatting never costs the model a turn and the pre-commit hook has
// nothing left to rewrite. Only tools the project has configured and installed are run; nothing is
// downloaded. Formatting never blocks and never reports to the model: always exit 0.

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { pass, readPayload } from './lib/hookIo.mjs';

const FORMATTABLE = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc', '.md', '.mdx',
  '.css', '.scss', '.less', '.html', '.vue', '.graphql', '.gql', '.yml', '.yaml']);
const LINTABLE = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.vue']);
const SKIPPED_DIRS = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.expo|\.turbo|\.cache|__generated__|generated|vendor)(\/|$)/;

const PRETTIER_CONFIGS = ['.prettierrc', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.json5', '.prettierrc.js',
  '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs'];
const ESLINT_CONFIGS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts',
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

const hasAny = (root, files) => files.some((file) => existsSync(join(root, file)));

const configured = (root, configs, packageKey, dependency) => {
  if (hasAny(root, configs)) return true;
  const pkg = readJson(join(root, 'package.json')) ?? {};
  if (packageKey && pkg[packageKey] !== undefined) return true;
  return Boolean(dependency && (pkg.devDependencies?.[dependency] || pkg.dependencies?.[dependency]));
};

const run = (root, name, args) => {
  const bin = binary(root, name);
  if (!bin) return;
  spawnSync(bin, args, { cwd: root, encoding: 'utf8', timeout: TOOL_TIMEOUT_MS, shell: process.platform === 'win32' });
};

const main = async () => {
  const payload = await readPayload();
  const target = payload?.tool_input?.file_path;
  if (typeof target !== 'string' || !target) pass();

  const file = resolve(payload.cwd || process.cwd(), target);
  const ext = extname(file).toLowerCase();
  if (!FORMATTABLE.has(ext) || SKIPPED_DIRS.test(file.split(sep).join('/')) || !existsSync(file)) pass();

  const root = projectRoot(file);
  if (!root) pass();
  const rel = relative(root, file);

  if (configured(root, PRETTIER_CONFIGS, 'prettier')) {
    run(root, 'prettier', ['--write', '--log-level', 'error', rel]);
  }
  if (LINTABLE.has(ext)) {
    if (configured(root, ESLINT_CONFIGS, 'eslintConfig')) run(root, 'eslint', ['--fix', '--quiet', rel]);
    if (configured(root, OXLINT_CONFIGS, null, 'oxlint')) run(root, 'oxlint', ['--fix', '--quiet', rel]);
  }
  pass();
};

main().catch(() => pass());
