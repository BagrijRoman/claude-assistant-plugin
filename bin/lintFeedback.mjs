#!/usr/bin/env node
// lint-feedback — PostToolUse(Edit|Write|MultiEdit). Brings the file the model just wrote up to the project's
// standard and tells the model what is left: Prettier formats it, ESLint and oxlint apply their auto-fixes,
// and the lint errors that remain go back to the model in the same turn, as file:line, rule and message.
// One hook does all three stages because hooks on the same event run in parallel: two hooks writing the
// same file would race, and a linter reading a file mid-format would report nonsense.
// Only tools the project has configured and installed are run; nothing is downloaded. Warnings are not
// reported. A clean file, a project without tools, or any internal error: exit 0, silently.

import { basename } from 'node:path';
import { pass, readPayload, warn } from './lib/hookIo.mjs';
import { detectTools, runTool } from './lib/projectTools.mjs';

const HOOK = 'lint-feedback';
const MAX_REPORTED = 20;

const parseJson = (text) => {
  try { return JSON.parse(text); } catch { return null; }
};

/** ESLint's JSON reporter: one entry per file, `severity` 2 is an error; a null rule is a parse error. */
const eslintErrors = (stdout) => {
  const files = parseJson(stdout);
  if (!Array.isArray(files)) return [];
  return files.flatMap((file) => file.messages ?? [])
    .filter((m) => m.severity === 2)
    .map((m) => ({ line: m.line ?? 0, rule: m.ruleId ?? 'parse error', message: m.message ?? '' }));
};

/** oxlint's JSON reporter: `diagnostics`, `severity` "error", the rule in `code`, the position in the first label. */
const oxlintErrors = (stdout) => {
  const report = parseJson(stdout);
  if (!Array.isArray(report?.diagnostics)) return [];
  return report.diagnostics
    .filter((d) => d.severity === 'error')
    .map((d) => ({ line: d.labels?.[0]?.span?.line ?? 0, rule: d.code ?? 'error', message: d.message ?? '' }));
};

const main = async () => {
  const payload = await readPayload();
  const tools = detectTools(payload?.tool_input?.file_path, payload?.cwd);
  if (!tools) pass();
  const { root, rel } = tools;

  if (tools.prettier) runTool(root, tools.prettier, ['--write', '--log-level', 'error', rel]);

  const errors = [];
  if (tools.eslint) errors.push(...eslintErrors(runTool(root, tools.eslint, ['--fix', '--format', 'json', rel])));
  if (tools.oxlint) errors.push(...oxlintErrors(runTool(root, tools.oxlint, ['--fix', '--format', 'json', rel])));
  if (!errors.length) pass();

  const seen = new Set();
  const unique = errors.filter((e) => {
    const key = `${e.line}:${e.rule}:${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.line - b.line);

  const lines = unique.slice(0, MAX_REPORTED).map((e) => `  line ${e.line} · ${e.rule} · ${e.message}`);
  if (unique.length > MAX_REPORTED) lines.push(`  … and ${unique.length - MAX_REPORTED} more; run the lint command from the command map for the full list`);

  warn(HOOK,
    `${unique.length} lint error${unique.length === 1 ? '' : 's'} remain${unique.length === 1 ? 's' : ''} in "${rel}" after formatting and auto-fix:\n${lines.join('\n')}`,
    `fix the code at those lines in "${basename(rel)}". Never disable a rule inline or in the config to make this pass.`);
};

main().catch(() => pass());
