#!/usr/bin/env node
// standards — installs the plugin's standards packs into a project and keeps their bookkeeping.
//
//   node bin/standards.mjs packs
//   node bin/standards.mjs install <pack> [--set key=value]… [--dry-run] [--dir <project>]
//   node bin/standards.mjs update [--dry-run] [--dir <project>]
//   node bin/standards.mjs status [--dir <project>]
//   node bin/standards.mjs check [--files <a,b>] [--dir <project>]
//   node bin/standards.mjs disable <rule> --reason <text> [--dir <project>]
//   node bin/standards.mjs enable <rule> [--dir <project>]
//   node bin/standards.mjs resolve <file> [--dir <project>]
//   node bin/standards.mjs finding --rule <id|none> --file <path> --summary <text> [--line <n>] [--status fixed|waived|open]
//   node bin/standards.mjs finding --stdin            (a JSON array of { rule, file, line, summary, status })
//   node bin/standards.mjs promote [--rule <id> | --finding <F-nnn>] [--to <layer>] [--note <text>]
//   node bin/standards.mjs review-context [--staged | --base <ref>] [--dir <project>]
//
// Installing is idempotent and never overwrites a project's edit: a file the project changed is kept, and when
// the pack changed it too, the new version goes to .claude/standards/incoming/ for a hand merge (`resolve`).
// Exit 0 on success, 1 on an error or, for `check`, when something is found.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  availablePacks, DEFAULT_PROMOTE_AFTER, detectSettings, fileAction, FINDINGS_FILE, findRule, formatCheckFindings,
  incomingPath, lintWiring, loadPack, parseSetting, pluginVersion, promotionCandidates, readFindings, readState,
  renderPack, runChecks, SETTING_KEYS, sha256, STATE_FILE, today, writeJson,
} from './lib/standards.mjs';

const BOOLEAN_FLAGS = new Set(['dry-run', 'staged', 'stdin']);

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  const sets = [];
  for (let k = 0; k < argv.length; k += 1) {
    const arg = argv[k];
    if (arg === '--set') sets.push(argv[(k += 1)] ?? '');
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (BOOLEAN_FLAGS.has(key)) flags[key] = true;
      else flags[key] = argv[(k += 1)];
    } else positional.push(arg);
  }
  return { positional, flags, sets };
};

const [command, ...rest] = process.argv.slice(2);
const { positional, flags, sets } = parseArgs(rest);
const root = resolve(flags.dir ?? process.cwd());
const dryRun = Boolean(flags['dry-run']);

const print = (lines) => process.stdout.write(`${lines.join('\n')}\n`);
const fail = (message) => {
  process.stderr.write(`[dev-assistant] standards: ${message}\n`);
  process.exit(1);
};

const stateOrFail = () => readState(root) ?? fail(`no standards installed in ${root} (no ${STATE_FILE}); run \`install <pack>\` first.`);
const saveState = (state) => {
  if (!dryRun) writeJson(join(root, STATE_FILE), state);
};

const layers = (rule) => [...new Set(rule.enforcedBy.map((item) => item.layer))].join(', ');

const FILE_LABELS = {
  create: 'created',
  update: 'updated',
  same: 'up to date',
  keep: 'kept: edited in the project, and the pack has no change for it',
};

/**
 * Writes a pack's files for these settings and returns the pack's new entry for standards.json, reporting
 * each file into `lines`.
 */
const applyPack = (pack, previous, settings, disabled, lines) => {
  const installed = {
    version: pack.version,
    installedBy: pluginVersion(),
    settings,
    disabled,
    files: { ...(previous?.files ?? {}) },
  };
  for (const { to, content } of renderPack(pack, installed)) {
    const action = fileAction(root, to, content, previous?.files?.[to]);
    if (['create', 'update', 'same'].includes(action)) installed.files[to] = sha256(content);
    if (action === 'conflict') {
      if (!dryRun) {
        mkdirSync(dirname(join(root, incomingPath(to))), { recursive: true });
        writeFileSync(join(root, incomingPath(to)), content);
      }
      lines.push(`  not replaced ${to}: edited in the project, and the pack changed it too. The new version is in `
        + `${incomingPath(to)}; merge it by hand, then run \`resolve ${to}\`.`);
      continue;
    }
    if ((action === 'create' || action === 'update') && !dryRun) {
      mkdirSync(dirname(join(root, to)), { recursive: true });
      writeFileSync(join(root, to), content);
    }
    lines.push(`  ${FILE_LABELS[action]} ${to}`);
  }
  return installed;
};

const settingLines = (settings) => SETTING_KEYS.map((key) => {
  const value = settings[key];
  const shown = Array.isArray(value) ? value.join(', ') || '—'
    : value && typeof value === 'object' ? Object.entries(value).map(([prefix, target]) => `${prefix}=${target}`).join(', ') || '—'
      : value ?? '—';
  return `  ${key}: ${shown}`;
});

const wiringLines = (pack) => {
  const wiring = lintWiring(root, pack);
  if (!wiring) return [];
  if (wiring.state === 'wired') return [`Lint: ${wiring.config} imports ${pack.lint.file}.`];
  if (wiring.state === 'no config') return [`Lint: the project has no ESLint config, so the pack's lint rules are installed but nothing runs them.`];
  return [
    `Lint: ${wiring.config} does not import ${pack.lint.file} yet. Add, once:`,
    `  import { ${pack.lint.export} } from './${pack.lint.file}';`,
    `  ...${pack.lint.export},   (as the last entries of the exported config array)`,
  ];
};

const install = (name, { fromUpdate = false } = {}) => {
  const pack = loadPack(name) ?? fail(`no pack "${name}"; available: ${availablePacks().join(', ') || 'none'}.`);
  const state = readState(root) ?? { promoteAfter: DEFAULT_PROMOTE_AFTER, packs: {} };
  const previous = state.packs[name];
  const settings = { ...detectSettings(root), ...(previous?.settings ?? {}) };
  for (const pair of sets) {
    const [key, ...value] = pair.split('=');
    try {
      settings[key] = parseSetting(key, value.join('='));
    } catch (error) {
      fail(error.message);
    }
  }
  const lines = [];
  const before = JSON.stringify(state);
  state.packs[name] = applyPack(pack, previous, settings, previous?.disabled ?? {}, lines);
  const changed = JSON.stringify(state) !== before;
  saveState(state);

  const verb = !previous ? 'installed' : changed ? 'updated' : 'already up to date';
  print([
    `[dev-assistant] standards: pack "${name}" ${pack.version} ${dryRun ? `would be ${verb}` : verb} in ${root}`,
    ...(fromUpdate ? [] : ['Settings:', ...settingLines(settings)]),
    'Files:',
    ...lines,
    ...wiringLines(pack),
    ...(fromUpdate ? [] : ['Rules:', ...pack.rules.map((rule) => `  ${rule.id} ${rule.title} · ${layers(rule)}`)]),
    ...(previous || dryRun ? [] : [
      'Next: commit .claude/standards/, the rules file and the lint file; `check` shows what the existing code breaks.',
    ]),
  ]);
};

const update = () => {
  const state = stateOrFail();
  const names = Object.keys(state.packs);
  if (!names.length) fail('no packs installed.');
  for (const name of names) install(name, { fromUpdate: true });
};

const fileStatus = (pack, installed) => renderPack(pack, installed).map(({ to, content }) => {
  const label = {
    create: 'missing',
    same: 'up to date',
    keep: 'edited in the project',
    update: 'the pack has a newer version: run `update`',
    conflict: 'edited in the project, and the pack changed it too: `update` puts the new version in incoming/',
  }[fileAction(root, to, content, installed.files?.[to])];
  const pending = existsSync(join(root, incomingPath(to))) ? `; merge pending: ${incomingPath(to)}` : '';
  return `  ${to}: ${label}${pending}`;
});

const status = () => {
  const state = stateOrFail();
  const lines = [`[dev-assistant] standards in ${root}`];
  for (const [name, installed] of Object.entries(state.packs)) {
    const pack = loadPack(name);
    if (!pack) {
      lines.push(`Pack "${name}" ${installed.version}: no longer in the plugin.`);
      continue;
    }
    const newer = pack.version !== installed.version ? ` (the plugin has ${pack.version}: run \`update\`)` : '';
    lines.push(`Pack "${name}" ${installed.version}${newer}, installed by dev-assistant ${installed.installedBy}`);
    lines.push('Settings:', ...settingLines(installed.settings));
    const off = Object.entries(installed.disabled ?? {});
    lines.push(`Switched off: ${off.length ? '' : 'none'}`, ...off.map(([id, { reason, date }]) => `  ${id} (${date}): ${reason}`));
    lines.push('Files:', ...fileStatus(pack, { ...installed, version: pack.version }));
    lines.push(...wiringLines(pack));
  }
  const record = readFindings(root);
  const byRule = {};
  for (const finding of record.findings) byRule[finding.rule ?? 'no rule'] = (byRule[finding.rule ?? 'no rule'] ?? 0) + 1;
  const candidates = promotionCandidates(record, state.promoteAfter ?? DEFAULT_PROMOTE_AFTER);
  lines.push(`Findings: ${record.findings.length}${record.findings.length ? ` (${Object.entries(byRule).map(([rule, count]) => `${rule} ×${count}`).join(', ')})` : ''}`
    + `; promotions decided: ${record.promotions.length}; waiting for a decision: ${candidates.length}${candidates.length ? ' (run `promote`)' : ''}`);
  print(lines);
};

const check = () => {
  const state = stateOrFail();
  const files = flags.files ? flags.files.split(',').map((file) => file.trim()).filter(Boolean) : null;
  const findings = runChecks(root, state, { files });
  if (!findings.length) {
    print([`[dev-assistant] standards: no check findings${files ? ' in the given files' : ''}.`]);
    return;
  }
  print([`[dev-assistant] standards: ${findings.length} check finding${findings.length === 1 ? '' : 's'}:`, ...formatCheckFindings(findings)]);
  process.exit(1);
};

/** The installed pack that declares this rule, or a failure. */
const packOfRule = (state, id) => findRule(state, id, root)?.pack ?? fail(`no installed pack has the rule "${id}".`);

const reapply = (state, name, disabled, lines) => {
  const installed = state.packs[name];
  state.packs[name] = applyPack(loadPack(name), installed, installed.settings, disabled, lines);
  saveState(state);
};

const disable = () => {
  const [id] = positional;
  if (!id || !flags.reason) fail('usage: disable <rule> --reason <why the project does not want it>');
  const state = stateOrFail();
  const name = packOfRule(state, id);
  const lines = [];
  reapply(state, name, { ...(state.packs[name].disabled ?? {}), [id]: { reason: flags.reason, date: today() } }, lines);
  print([`[dev-assistant] standards: ${id} switched off in ${root}: ${flags.reason}`, ...lines]);
};

const enable = () => {
  const [id] = positional;
  if (!id) fail('usage: enable <rule>');
  const state = stateOrFail();
  const name = packOfRule(state, id);
  const { [id]: removed, ...disabled } = state.packs[name].disabled ?? {};
  if (!removed) fail(`${id} is not switched off.`);
  const lines = [];
  reapply(state, name, disabled, lines);
  print([`[dev-assistant] standards: ${id} switched on again in ${root}`, ...lines]);
};

const resolveConflict = () => {
  const [to] = positional;
  if (!to) fail('usage: resolve <file>, the path the pack installs, as `status` shows it');
  const state = stateOrFail();
  const incoming = join(root, incomingPath(to));
  if (!existsSync(incoming)) fail(`nothing to resolve: ${incomingPath(to)} does not exist.`);
  const name = Object.keys(state.packs).find((pack) => loadPack(pack)?.files.some((file) => file.to === to))
    ?? fail(`no installed pack installs ${to}.`);
  state.packs[name].files[to] = sha256(readFileSync(incoming, 'utf8'));
  if (!dryRun) unlinkSync(incoming);
  saveState(state);
  print([`[dev-assistant] standards: ${to} resolved; the merged file stays as it is, and the next update compares against this version.`]);
};

const SUGGESTIONS = (rule) => [
  ...(rule.enforcedBy.some((item) => item.layer === 'lint') ? [] : ['a lint rule, if the pattern shows in the syntax']),
  ...(rule.enforcedBy.some((item) => item.layer === 'check') ? [] : ['a script check, if it shows in the files and folders']),
  'a sharper rule text or a better example, if it needs judgement',
];

const proposalLines = (state, record) => {
  const candidates = promotionCandidates(record, state.promoteAfter ?? DEFAULT_PROMOTE_AFTER);
  if (!candidates.length) return ['No promotion to decide.'];
  const lines = ['Promotion to decide with the operator:'];
  for (const candidate of candidates) {
    if (!candidate.rule) {
      lines.push(`  No rule — ${candidate.findings[0]}: "${candidate.summaries[0]}"`,
        '    → a new rule in a pack (or in the project\'s .claude/rules/), or keep it a one-off.',
        `    record: promote --finding ${candidate.findings[0]} --to new|keep [--note <text>]`);
      continue;
    }
    const rule = findRule(state, candidate.rule, root);
    lines.push(`  ${candidate.rule} ${rule?.title ?? ''} — ${candidate.findings.length} findings since the last promotion (${candidate.findings.join(', ')}):`,
      ...candidate.summaries.map((summary) => `    - ${summary}`));
    if (rule) {
      lines.push(`    enforced by now: ${rule.enforcedBy.map((item) => [item.layer, item.name].filter(Boolean).join(' ')).join(' · ')}`,
        `    stronger: ${SUGGESTIONS(rule).join('; or ')}`);
    }
    lines.push(`    record: promote --rule ${candidate.rule} --to lint|check|text|keep [--note <text>]`);
  }
  return lines;
};

const STATUSES = new Set(['fixed', 'waived', 'open']);

const finding = () => {
  const state = stateOrFail();
  let items;
  if (flags.stdin) {
    try {
      items = JSON.parse(readFileSync(0, 'utf8'));
    } catch (error) {
      fail(`stdin is not a JSON array of findings (${error.message}).`);
    }
    if (!Array.isArray(items)) fail('stdin is not a JSON array of findings.');
  } else items = [{ rule: flags.rule, file: flags.file, line: flags.line, summary: flags.summary, status: flags.status }];

  const record = readFindings(root);
  const added = [];
  for (const item of items) {
    const rule = !item.rule || item.rule === 'none' ? null : item.rule;
    if (rule && !findRule(state, rule, root)) fail(`neither an installed pack nor .claude/rules/ has the rule "${rule}"; use "none" for a finding that fits no rule.`);
    if (!item.summary || !item.file) fail('every finding needs --file and --summary.');
    const status = item.status ?? 'fixed';
    if (!STATUSES.has(status)) fail(`status is one of ${[...STATUSES].join(', ')}.`);
    record.lastFinding += 1;
    const entry = { id: `F-${String(record.lastFinding).padStart(3, '0')}`, date: today(), rule, file: item.file, summary: item.summary, status };
    if (item.line) entry.line = Number(item.line);
    record.findings.push(entry);
    added.push(entry);
  }
  if (!dryRun) writeJson(join(root, FINDINGS_FILE), record);
  print([
    `[dev-assistant] standards: ${added.length} finding${added.length === 1 ? '' : 's'} recorded in ${FINDINGS_FILE}:`,
    ...added.map((entry) => `  ${entry.id} · ${entry.rule ?? 'no rule'} · ${entry.file} · ${entry.status} · ${entry.summary}`),
    ...proposalLines(state, record),
  ]);
};

const RULE_LAYERS = new Set(['lint', 'check', 'text', 'keep']);
const FINDING_LAYERS = new Set(['new', 'keep']);

const promote = () => {
  const state = stateOrFail();
  const record = readFindings(root);
  if (!flags.rule && !flags.finding) {
    print([`[dev-assistant] standards: promotions in ${root}`, ...proposalLines(state, record)]);
    return;
  }
  const candidates = promotionCandidates(record, state.promoteAfter ?? DEFAULT_PROMOTE_AFTER);
  const candidate = flags.rule
    ? candidates.find((item) => item.rule === flags.rule)
    : candidates.find((item) => !item.rule && item.findings[0] === flags.finding);
  if (!candidate) fail(`nothing waits for a decision on ${flags.rule ?? flags.finding}.`);
  const allowed = flags.rule ? RULE_LAYERS : FINDING_LAYERS;
  if (!allowed.has(flags.to)) fail(`--to is one of ${[...allowed].join(', ')}.`);
  const entry = { date: today(), rule: candidate.rule, findings: candidate.findings, to: flags.to };
  if (flags.note) entry.note = flags.note;
  record.promotions.push(entry);
  if (!dryRun) writeJson(join(root, FINDINGS_FILE), record);
  print([`[dev-assistant] standards: recorded — ${candidate.rule ?? candidate.findings[0]} → ${flags.to}${flags.note ? ` (${flags.note})` : ''}.`]);
};

const git = (args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : null;
};

const reviewContext = () => {
  const state = stateOrFail();
  if (git(['rev-parse', '--git-dir']) === null) fail(`${root} is not inside a git repository.`);
  const hasHead = git(['rev-parse', '--verify', '--quiet', 'HEAD']) !== null;
  const range = flags.staged || !hasHead ? ['--cached'] : [flags.base ?? 'HEAD'];
  const diff = git(['diff', '--relative', '--no-color', '--no-ext-diff', ...range]) ?? fail('git diff failed.');
  const changed = (git(['diff', '--relative', '--name-only', ...range]) ?? '').split('\n').filter(Boolean);
  const untracked = flags.staged ? [] : (git(['ls-files', '--others', '--exclude-standard']) ?? '').split('\n').filter(Boolean);
  const diffFile = join(tmpdir(), `dev-assistant-review-${sha256(root).slice(0, 12)}.diff`);
  writeFileSync(diffFile, diff);

  // Every rules file of the project, the packs' and its own: the reviewer applies those whose paths match.
  const rulesDir = join(root, '.claude', 'rules');
  const rulesFiles = existsSync(rulesDir)
    ? readdirSync(rulesDir).filter((file) => file.endsWith('.md')).sort().map((file) => `.claude/rules/${file}`)
    : [];
  const reviewRules = [];
  for (const [name, installed] of Object.entries(state.packs)) {
    const pack = loadPack(name);
    if (!pack) continue;
    for (const rule of pack.rules) {
      if (installed.disabled?.[rule.id]) continue;
      const review = rule.enforcedBy.find((item) => item.layer === 'review');
      if (review) reviewRules.push({ id: rule.id, title: rule.title, pack: name, review: review.note });
    }
  }
  process.stdout.write(`${JSON.stringify({
    project: root,
    diffFile,
    changed,
    untracked,
    rulesFiles,
    claudeMd: existsSync(join(root, 'CLAUDE.md')) ? 'CLAUDE.md' : null,
    reviewRules,
  }, null, 2)}\n`);
};

const COMMANDS = {
  packs: () => print(availablePacks().map((name) => {
    const pack = loadPack(name);
    return `${name} ${pack.version} — ${pack.title}: ${pack.rules.map((rule) => rule.id).join(', ')}`;
  })),
  install: () => install(positional[0] ?? fail('usage: install <pack>')),
  update,
  status,
  check,
  disable,
  enable,
  resolve: resolveConflict,
  finding,
  promote,
  'review-context': reviewContext,
};

(COMMANDS[command] ?? (() => fail(`unknown command "${command ?? ''}"; one of ${Object.keys(COMMANDS).join(', ')}.`)))();
