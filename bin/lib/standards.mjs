// Standards packs and a project's installation of them. A pack lives in the plugin under
// skills/standards/templates/packs/<pack>/: `pack.json` (version, the files it installs), `rules.md` (the rules,
// one `## <ID> <title>` heading and one `Enforced by:` line each — the one source the lint, the checks and the
// review all read) and its lint rules. The project keeps its side in .claude/standards/: `standards.json`
// (installed packs, their settings, the rules switched off, the hash of every file last installed) and
// `findings.json` (review findings and the promotions decided from them).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFiles, checkTree } from './componentLayout.mjs';
import { ESLINT_CONFIGS } from './projectTools.mjs';

export const PLUGIN_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const PACKS_DIR = join(PLUGIN_ROOT, 'skills', 'standards', 'templates', 'packs');
export const STATE_FILE = '.claude/standards/standards.json';
export const FINDINGS_FILE = '.claude/standards/findings.json';
export const INCOMING_DIR = '.claude/standards/incoming';
export const DEFAULT_PROMOTE_AFTER = 2;

/** The script checks a rule can name in `Enforced by: check <name>`. */
export const CHECKS = {
  componentLayout: { all: checkTree, files: checkFiles },
};

export const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

export const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
export const pluginVersion = () => readJson(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'))?.version ?? '0.0.0';
export const today = () => new Date().toISOString().slice(0, 10);

const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

// ── Packs ──────────────────────────────────────────────────────────────────────────────────────────────────

export const availablePacks = () => (isDir(PACKS_DIR)
  ? readdirSync(PACKS_DIR).filter((name) => existsSync(join(PACKS_DIR, name, 'pack.json'))).sort()
  : []);

/** `lint \`standards/x\` (web)` → `{ layer: 'lint', name: 'standards/x', note: 'web' }`. */
const parseEnforcement = (text) => {
  const [, layer, rest] = /^(lint|check|review)\b\s*(.*)$/.exec(text.trim()) ?? [null, 'review', text.trim()];
  return { layer, name: /^`([^`]+)`/.exec(rest)?.[1] ?? null, note: /\(([^)]*)\)\s*$/.exec(rest)?.[1] ?? null };
};

/** The rules a rules file declares, in order: id, title and how each is enforced. */
export const parseRules = (text) => {
  const rules = [];
  for (const line of text.split('\n')) {
    const heading = /^## ([A-Z]{2,5}-\d{2,3}) (.+)$/.exec(line);
    if (heading) rules.push({ id: heading[1], title: heading[2].trim(), enforcedBy: [] });
    const enforced = /^Enforced by: (.+)$/.exec(line);
    if (enforced && rules.length) rules.at(-1).enforcedBy = enforced[1].split(' · ').map(parseEnforcement);
  }
  return rules;
};

export const loadPack = (name) => {
  const dir = join(PACKS_DIR, name);
  const manifest = readJson(join(dir, 'pack.json'));
  if (!manifest) return null;
  const rulesFile = manifest.files.find((file) => file.render);
  return { ...manifest, dir, rules: rulesFile ? parseRules(readFileSync(join(dir, rulesFile.from), 'utf8')) : [] };
};

// ── Settings ───────────────────────────────────────────────────────────────────────────────────────────────

export const SETTING_KEYS = ['platform', 'srcDir', 'sharedDir', 'featuresDir', 'tokensFiles', 'aliases', 'skipLint',
  'referenceComponent', 'referenceScreen'];
const LIST_KEYS = new Set(['tokensFiles', 'skipLint']);
const OPTIONAL_KEYS = new Set(['referenceComponent', 'referenceScreen']);

/** `--set key=value`: lists are comma-separated, aliases are `prefix=target` pairs, `none` clears a reference. */
export const parseSetting = (key, value) => {
  if (!SETTING_KEYS.includes(key)) throw new Error(`unknown setting "${key}"; known: ${SETTING_KEYS.join(', ')}`);
  if (LIST_KEYS.has(key)) return value.split(',').map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean);
  if (key === 'aliases') {
    return Object.fromEntries(value.split(',').filter((pair) => pair.includes('='))
      .map((pair) => pair.split('=').map((part) => part.trim())));
  }
  if (key === 'platform' && !['web', 'native'].includes(value)) throw new Error('platform is "web" or "native"');
  if (OPTIONAL_KEYS.has(key) && (value === '' || value === 'none')) return null;
  return value.replace(/\/+$/, '') || '.';
};

/** JSON with comments and trailing commas, as tsconfig.json allows; strings are left alone. */
const parseJsonc = (text) => {
  let out = '';
  for (let k = 0; k < text.length; k += 1) {
    const char = text[k];
    if (char === '"') {
      const end = /"(?:[^"\\]|\\.)*"/y;
      end.lastIndex = k;
      const match = end.exec(text);
      out += match ? match[0] : char;
      k += match ? match[0].length - 1 : 0;
    } else if (char === '/' && text[k + 1] === '/') {
      while (k < text.length && text[k] !== '\n') k += 1;
      out += '\n';
    } else if (char === '/' && text[k + 1] === '*') {
      k = text.indexOf('*/', k + 2);
      if (k === -1) break;
      k += 1;
    } else out += char;
  }
  try {
    return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
  } catch {
    return null;
  }
};

/** `"@/*": ["./src/*"]` in tsconfig.json → `{ "@/": "src/" }`. */
const tsconfigAliases = (root) => {
  const file = join(root, 'tsconfig.json');
  const options = existsSync(file) ? parseJsonc(readFileSync(file, 'utf8'))?.compilerOptions : null;
  const aliases = {};
  for (const [key, targets] of Object.entries(options?.paths ?? {})) {
    if (!key.endsWith('/*') || !Array.isArray(targets) || !String(targets[0]).endsWith('/*')) continue;
    const target = posix.normalize(posix.join(options.baseUrl ?? '.', targets[0].slice(0, -1)));
    aliases[key.slice(0, -1)] = target.endsWith('/') ? target : `${target}/`;
  }
  return aliases;
};

const eslintConfigFile = (root) => ESLINT_CONFIGS.map((name) => join(root, name)).find((file) => existsSync(file)) ?? null;

/** The project's own lint config already has a rule of this name (not the pack's), so the pack's copy is skipped. */
const hasOwnRule = (root, rule) => {
  const config = eslintConfigFile(root);
  if (!config) return false;
  return readFileSync(config, 'utf8').split('\n').some((line) => line.includes(rule) && !line.includes('eslint/standards/'));
};

/** The component folder that shows the layout best: index, component, hook and styles; a screen when asked. */
const findReference = (root, tree, screen) => {
  let best = null;
  const walk = (rel, depth) => {
    if (depth > 4) return;
    for (const name of readdirSync(join(root, rel)).sort()) {
      const path = `${rel}/${name}`;
      if (!isDir(join(root, path)) || name === 'node_modules') continue;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        if (screen && !name.endsWith('Screen')) continue;
        const has = (file) => ['ts', 'tsx'].some((ext) => existsSync(join(root, path, `${file}.${ext}`)));
        if (!has('index') || !has(name)) continue;
        const score = 2 + Number(has(`use${name}`)) + Number(has(`${name}.styles`)) + Number(has(`${name}.test`));
        if (!best || score > best.score) best = { path, score };
      } else walk(path, depth + 1);
    }
  };
  if (isDir(join(root, tree))) walk(tree, 0);
  return best?.path ?? null;
};

/** What a project looks like, as far as the files tell: the starting point the operator confirms or corrects. */
export const detectSettings = (root) => {
  const pkg = readJson(join(root, 'package.json')) ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const platform = deps['react-native'] || deps.expo ? 'native' : 'web';
  const srcDir = isDir(join(root, 'src')) ? 'src' : '.';
  const inSrc = (path) => (srcDir === '.' ? path : `${srcDir}/${path}`);
  const sharedDir = inSrc('components');
  const featuresDir = ['features', 'modules'].map(inSrc).find((dir) => isDir(join(root, dir))) ?? inSrc('features');
  const tokenCandidates = platform === 'native'
    ? ['theme', 'styles/theme.ts', 'constants/theme.ts', 'tokens']
    : ['app/globals.css', 'styles/globals.css', 'styles/tokens.css', 'index.css', 'theme'];
  const tokensFile = tokenCandidates.map(inSrc).find((path) => existsSync(join(root, path)))
    ?? inSrc(platform === 'native' ? 'theme' : 'styles/tokens.css');
  return {
    platform,
    srcDir,
    sharedDir,
    featuresDir,
    tokensFiles: [tokensFile],
    aliases: tsconfigAliases(root),
    skipLint: platform === 'web' && hasOwnRule(root, 'no-raw-visual-values') ? ['no-raw-visual-values'] : [],
    referenceComponent: findReference(root, sharedDir, false),
    referenceScreen: findReference(root, featuresDir, true),
  };
};

// ── Rendering ──────────────────────────────────────────────────────────────────────────────────────────────

/** How a folder is imported: through an alias when one covers it, else by its path. */
const importPath = (dir, aliases) => {
  for (const [prefix, target] of Object.entries(aliases ?? {})) {
    if (`${dir}/`.startsWith(target)) return `${prefix}${dir.slice(target.length)}`.replace(/\/$/, '');
  }
  return dir;
};

/**
 * A rules file from its template: `<!-- web -->…<!-- end -->` and `<!-- native -->…<!-- end -->` kept for their
 * platform only, `<!-- if:setting -->…<!-- end -->` kept when the setting has a value, `{{key}}` filled in, and
 * a switched-off rule marked under its heading with the reason.
 */
export const renderRules = (template, { settings, version, disabled = {} }) => {
  const values = {
    ...settings,
    version,
    sourceGlob: settings.srcDir === '.' ? '**/*.{ts,tsx,js,jsx}' : `${settings.srcDir}/**/*.{ts,tsx,js,jsx}`,
    tokensFiles: settings.tokensFiles.map((file) => `\`${file}\``).join(', '),
    sharedImport: importPath(settings.sharedDir, settings.aliases),
    featuresImport: importPath(settings.featuresDir, settings.aliases),
  };
  return template
    .replace(/<!-- (web|native|if:(\w+)) -->([\s\S]*?)<!-- end -->/g, (_, kind, key, body) => {
      const keep = key ? Boolean(settings[key]) : settings.platform === kind;
      return keep ? body : '';
    })
    .replace(/\{\{(\w+)\}\}/g, (match, key) => (values[key] === undefined || values[key] === null ? match : String(values[key])))
    .replace(/^## ([A-Z]{2,5}-\d{2,3}) .+$/gm, (line, id) => (disabled[id]
      ? `${line}\n\n> **Switched off in this project** (${disabled[id].date}): ${disabled[id].reason}. Its lint rules and checks do not run, and the review skips it.`
      : line));
};

/** The content of every file a pack installs, for the given settings. */
export const renderPack = (pack, installed) => pack.files.map((file) => {
  const template = readFileSync(join(pack.dir, file.from), 'utf8');
  return {
    to: file.to,
    content: file.render ? renderRules(template, { settings: installed.settings, version: pack.version, disabled: installed.disabled }) : template,
  };
});

// ── Project state ──────────────────────────────────────────────────────────────────────────────────────────

/** The nearest directory at or above `path` with .claude/standards/standards.json, or null. */
export const findProjectRoot = (path) => {
  let dir = resolve(path);
  for (;;) {
    if (existsSync(join(dir, STATE_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

export const readState = (root) => readJson(join(root, STATE_FILE));
export const readFindings = (root) => readJson(join(root, FINDINGS_FILE)) ?? { lastFinding: 0, findings: [], promotions: [] };

/**
 * What installing `content` at `to` would do, given the hash of the version installed last (`base`):
 * - `create`: the file is missing;
 * - `same`: the file already holds exactly this;
 * - `keep`: the pack's version did not change and the project edited the file — the edit stays;
 * - `update`: the project did not touch the file, so the new version replaces it;
 * - `conflict`: both changed (or the file was there before the pack) — the new version goes to incoming/.
 */
export const fileAction = (root, to, content, base) => {
  const file = join(root, to);
  if (!existsSync(file)) return 'create';
  const current = readFileSync(file, 'utf8');
  if (current === content) return 'same';
  if (base && sha256(content) === base) return 'keep';
  if (base && sha256(current) === base) return 'update';
  return 'conflict';
};

export const incomingPath = (to) => `${INCOMING_DIR}/${to}`;

/** Whether the project's ESLint config imports the pack's lint file: `wired`, `not wired`, or `no config`. */
export const lintWiring = (root, pack) => {
  if (!pack.lint) return null;
  const config = eslintConfigFile(root);
  if (!config) return { state: 'no config' };
  const wired = readFileSync(config, 'utf8').includes(pack.lint.file);
  return { state: wired ? 'wired' : 'not wired', config: config.slice(root.length + 1) };
};

// ── Checks and findings ────────────────────────────────────────────────────────────────────────────────────

/**
 * The script checks of every installed pack, over the whole project or over `files` (paths from the project
 * root). A rule switched off, or named in `skip`, is not checked.
 */
export const runChecks = (root, state, { files = null, skip = [] } = {}) => {
  const findings = [];
  for (const [name, installed] of Object.entries(state?.packs ?? {})) {
    const pack = loadPack(name);
    if (!pack) continue;
    for (const rule of pack.rules) {
      if (installed.disabled?.[rule.id] || skip.includes(rule.id)) continue;
      for (const { layer, name: check } of rule.enforcedBy) {
        if (layer !== 'check' || !CHECKS[check]) continue;
        const found = files ? CHECKS[check].files(root, installed.settings, files) : CHECKS[check].all(root, installed.settings);
        findings.push(...found.map((finding) => ({ rule: rule.id, check, ...finding })));
      }
    }
  }
  return findings;
};

export const formatCheckFindings = (findings) => findings
  .map(({ rule, folder, message, fix }) => `  ${rule} · ${folder} · ${message} → ${fix}`);

/**
 * Findings not yet covered by a promotion: a rule with `threshold` of them, and every finding that fits no rule.
 */
export const promotionCandidates = (record, threshold) => {
  const covered = new Set(record.promotions.flatMap((promotion) => promotion.findings));
  const open = record.findings.filter((finding) => !covered.has(finding.id));
  const byRule = new Map();
  for (const finding of open.filter((item) => item.rule)) byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
  return [
    ...[...byRule].filter(([, list]) => list.length >= threshold)
      .map(([rule, list]) => ({ rule, findings: list.map((item) => item.id), summaries: list.map((item) => item.summary) })),
    ...open.filter((item) => !item.rule).map((item) => ({ rule: null, findings: [item.id], summaries: [item.summary] })),
  ];
};

/**
 * The rule with this id: in an installed pack (with the pack's name), else in one of the project's own
 * `.claude/rules/*.md` files written in the same form (`## PRJ-01 Title`, `Enforced by: …`), with that file.
 */
export const findRule = (state, id, root) => {
  for (const name of Object.keys(state?.packs ?? {})) {
    const rule = loadPack(name)?.rules.find((item) => item.id === id);
    if (rule) return { ...rule, pack: name };
  }
  const dir = root ? join(root, '.claude', 'rules') : null;
  if (!dir || !isDir(dir)) return null;
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.md')).sort()) {
    const rule = parseRules(readFileSync(join(dir, file), 'utf8')).find((item) => item.id === id);
    if (rule) return { ...rule, file: `.claude/rules/${file}` };
  }
  return null;
};
