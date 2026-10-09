#!/usr/bin/env node
// setup-permissions — writes the plugin's permission `deny` rules into a project's .claude/settings.json.
//
//   node bin/setupPermissions.mjs [project-dir] [--dry-run] [--template]
//
// Idempotent: adds the rules that are missing, keeps every other key and every foreign entry, never removes
// anything, and records the plugin version it wrote. A second run changes nothing. A settings file that does
// not parse is left alone and reported (exit 1) rather than overwritten.
// `--template` prints the rules as JSON (the source of skills/setupPermissions/templates/permissions.json) and exits.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDenyRules } from './lib/permissionRules.mjs';

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginVersion = () => JSON.parse(readFileSync(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const projectDir = resolve(args.find((arg) => !arg.startsWith('--')) ?? process.cwd());

if (flags.has('--template')) {
  process.stdout.write(`${JSON.stringify({ permissions: { deny: buildDenyRules() } }, null, 2)}\n`);
  process.exit(0);
}

const settingsPath = join(projectDir, '.claude', 'settings.json');
const exists = existsSync(settingsPath);

let settings = {};
if (exists) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    process.stderr.write(`[dev-assistant] ${settingsPath} is not valid JSON (${error.message}); nothing written. Fix the file and run again.\n`);
    process.exit(1);
  }
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    process.stderr.write(`[dev-assistant] ${settingsPath} does not hold a JSON object; nothing written.\n`);
    process.exit(1);
  }
}

const permissions = settings.permissions ?? {};
const deny = Array.isArray(permissions.deny) ? [...permissions.deny] : [];
const present = new Set(deny);
const added = buildDenyRules().filter((rule) => !present.has(rule));

const next = {
  ...settings,
  permissions: { ...permissions, deny: [...deny, ...added] },
  devAssistant: { ...(settings.devAssistant ?? {}), version: pluginVersion() },
};

const changed = added.length > 0 || settings.devAssistant?.version !== next.devAssistant.version;
const action = !exists ? 'create' : changed ? 'update' : 'keep';

if (action !== 'keep' && !flags.has('--dry-run')) {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(next, null, 2)}\n`);
}

const verb = { create: 'created', update: 'updated', keep: 'already up to date' }[action];
const lines = [
  `[dev-assistant] ${settingsPath}: ${flags.has('--dry-run') && action !== 'keep' ? `would be ${verb}` : verb}`,
  `  deny rules added: ${added.length}`,
  `  deny rules already present: ${buildDenyRules().length - added.length}`,
  `  other entries kept: ${deny.length - (buildDenyRules().length - added.length)}`,
];
for (const rule of added) lines.push(`  + ${rule}`);
if (action !== 'keep') lines.push('Commit .claude/settings.json so the whole team gets the same boundary; restart Claude Code to apply it here.');
process.stdout.write(`${lines.join('\n')}\n`);
