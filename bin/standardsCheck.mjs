#!/usr/bin/env node
// standards-check — Stop, and PreToolUse(Bash) for `git commit`. Runs the script checks of the standards packs
// installed in a project (the rules `Enforced by: check …`; first RCT-02's `componentLayout`) over what changed:
// at Stop, the files the model wrote since the operator's last message, so the operator gets the turn's work
// with its layout already right; at commit, the files the commit records. Not on every edit: a component is
// created file by file, and is incomplete in between.
// Stop is held at most once per turn (`stop_hook_active`). A commit is blocked while a finding remains, unless
// its message carries `Standards-skipped: <rule id> <reason>` — the operator's decision, never the model's.
// A project without docs/standards/standards.json, or any internal error: exit 0, silently.

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { commitFiles } from './lib/git.mjs';
import { gitCommands, parseCommit } from './lib/gitCommands.mjs';
import { block, pass, readPayload, warn } from './lib/hookIo.mjs';
import { findProjectRoot, formatCheckFindings, readState, runChecks } from './lib/standards.mjs';

const HOOK = 'standards-check';
const MAX_REPORTED = 20;
const WRITING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SKIPPED = /Standards-skipped:\s*([A-Z]{2,5}-\d{2,3})/g;

/** A message the operator typed — not a tool result, and not one the harness added. */
const isOperatorMessage = (entry) => {
  if (entry?.type !== 'user' || entry.isMeta) return false;
  const content = entry.message?.content;
  return typeof content === 'string' || (Array.isArray(content) && content.some((part) => part.type === 'text'));
};

/** The files the model wrote with the file tools since the operator's last message, from the transcript. */
const filesWrittenThisTurn = (transcriptPath) => {
  const entries = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  });
  const start = entries.findLastIndex(isOperatorMessage) + 1;
  const files = new Set();
  for (const entry of entries.slice(start)) {
    if (entry?.type !== 'assistant' || !Array.isArray(entry.message?.content)) continue;
    for (const part of entry.message.content) {
      const path = part.type === 'tool_use' && WRITING_TOOLS.has(part.name) ? part.input?.file_path ?? part.input?.notebook_path : null;
      if (typeof path === 'string') files.add(path);
    }
  }
  return [...files];
};

/** The check findings for these absolute paths, each project with its own packs; folders shown from `cwd`. */
const findingsFor = (paths, cwd, skip) => {
  const byProject = new Map();
  for (const path of paths) {
    const root = findProjectRoot(dirname(path));
    if (root) byProject.set(root, [...(byProject.get(root) ?? []), relative(root, path).split(sep).join('/')]);
  }
  const findings = [];
  for (const [root, files] of byProject) {
    const state = readState(root);
    if (!state) continue;
    const shown = (folder) => relative(cwd, join(root, folder)).split(sep).join('/') || '.';
    findings.push(...runChecks(root, state, { files, skip }).map((finding) => ({ ...finding, folder: shown(finding.folder) })));
  }
  return findings;
};

const report = (findings) => {
  const lines = formatCheckFindings(findings.slice(0, MAX_REPORTED));
  if (findings.length > MAX_REPORTED) lines.push(`  … and ${findings.length - MAX_REPORTED} more`);
  return `${findings.length} standards finding${findings.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
};

const onStop = (payload, cwd) => {
  if (payload.stop_hook_active || typeof payload.transcript_path !== 'string') pass();
  const paths = filesWrittenThisTurn(payload.transcript_path).map((path) => resolve(cwd, path));
  const findings = findingsFor(paths, cwd, []);
  if (!findings.length) pass();
  warn(HOOK, `the components written this turn break the project's standards. ${report(findings)}`,
    'fix them before handing the work over, so the operator reviews code that already keeps the standards. If one '
    + 'should stay as it is, tell the operator which rule and why; letting a rule go is their decision.');
};

const onCommit = (payload, cwd) => {
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') pass();
  const skip = [...command.matchAll(SKIPPED)].map(([, id]) => id);
  for (const { dir, subcommand, rest } of gitCommands(command, cwd)) {
    if (subcommand !== 'commit') continue;
    const recorded = commitFiles(dir, parseCommit(rest));
    if (!recorded) continue;
    const findings = findingsFor(recorded.files.map((file) => join(recorded.top, file)), cwd, skip);
    if (findings.length) {
      block(HOOK, `the components this commit records break the project's standards. ${report(findings)}`,
        'fix them and stage the fix. Only the operator may let a rule go; then the commit message carries '
        + '"Standards-skipped: <rule id> <reason>" with their reason.');
    }
  }
  pass();
};

const main = async () => {
  const payload = await readPayload();
  const cwd = payload.cwd || process.cwd();
  if (payload.hook_event_name === 'Stop') onStop(payload, cwd);
  else onCommit(payload, cwd);
};

main().catch(() => pass());
