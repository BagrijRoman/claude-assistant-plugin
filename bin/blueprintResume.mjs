#!/usr/bin/env node
// blueprint-resume — SessionStart (startup, clear, compact). A blueprint is written over many sessions, and
// /blueprint advises a fresh context before every phase that runs agents: the operator types /clear, then
// /blueprint. A plugin cannot clear the context itself, so this hook makes the fresh start cheap instead: it
// finds every unfinished blueprint under the session's folder and says where each one stands — one line to
// the operator, a short note to the model — so that the new session resumes from STATE.json rather than from
// a re-read of what is already done. It writes nothing. Fails open: any error means silence.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { pass, readPayload } from './lib/hookIo.mjs';

const HOOK = 'blueprint-resume';
const MAX_DEPTH = 4;
const MAX_FOLDERS = 2000;
const SKIPPED = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor']);
// The phases of STATE.json in order, named as the stages of the `init`, `continue` row in SKILL.md › Progress
const PHASES = [
  ['intake', 'Intake'],
  ['reading', 'Reading the input'],
  ['brief', 'Brief'],
  ['architecture', 'Architecture'],
  ['modules', 'Modules (L2)'],
  ['capabilities', 'Capabilities (L3)'],
  ['consistency', 'Consistency review'],
  ['adequacy', 'Adequacy review'],
];
const STATUS = {
  pending: 'not started',
  'in-progress': 'in progress',
  'awaiting-approval': 'waits for the operator at its gate',
  approved: 'approved',
};

/** Every STATE.json within MAX_DEPTH folders of `root`, leaving out dot-folders and build or dependency folders. */
const findStates = (root) => {
  const found = [];
  const queue = [[root, 0]];
  for (let visited = 0; queue.length && visited < MAX_FOLDERS; visited += 1) {
    const [folder, depth] = queue.shift();
    let entries;
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name === 'STATE.json') found.push(join(folder, entry.name));
      if (entry.isDirectory() && depth < MAX_DEPTH && !entry.name.startsWith('.') && !SKIPPED.has(entry.name)) {
        queue.push([join(folder, entry.name), depth + 1]);
      }
    }
  }
  return found;
};

/**
 * Where an unfinished blueprint stands, or null for anything else: another skill's state, a finished blueprint, the
 * skill's own template (its placeholders, `{{project name}}`, are never left in a real one).
 */
const standing = (file, root) => {
  let raw;
  let state;
  try {
    raw = readFileSync(file, 'utf8');
    state = JSON.parse(raw);
  } catch {
    return null;
  }
  if (state?.kind !== 'blueprint' || raw.includes('{{')) return null;
  const index = PHASES.findIndex(([key]) => key === state.phase);
  if (index < 0) return null;
  const [key, name] = PHASES[index];
  const modules = Array.isArray(state.modules) ? state.modules.filter((entry) => entry && !entry.removed) : [];
  const failed = modules.flatMap((entry) => ['l2', 'l3'].filter((level) => entry[level] === 'failed').map((level) => `${entry.code} ${level}`));
  return {
    folder: relative(root, dirname(file)).split(sep).join('/') || '.',
    phase: key,
    stage: `${index + 1}/${PHASES.length} ${name}`,
    status: STATUS[state.phases?.[key]] ?? 'not started',
    failed,
  };
};

const main = async () => {
  const payload = await readPayload();
  const root = payload.cwd || process.cwd();
  const blueprints = findStates(root).map((file) => standing(file, root)).filter(Boolean);
  if (!blueprints.length) pass();

  const failedNote = ({ failed }) => (failed.length ? ` · failed: ${failed.join(', ')}` : '');
  const systemMessage = blueprints
    .map((blueprint) => `▸ /blueprint · ${blueprint.stage} · ${blueprint.status}${failedNote(blueprint)} · ${blueprint.folder} — /blueprint resumes it`)
    .join('\n');
  const additionalContext = [
    `[dev-assistant] ${HOOK}: unfinished blueprints in this project —`,
    ...blueprints.map((blueprint) => `- ${blueprint.folder}: phase "${blueprint.phase}" (${blueprint.stage}), ${blueprint.status}${failedNote(blueprint)}`),
    'When the operator runs /blueprint, resume from that STATE.json as the skill says (mechanics.md › A fresh context): '
      + 'read only what the current phase needs, not the documents of the phases already approved.',
  ].join('\n');
  // No process.exit after the write: on macOS a pipe is written asynchronously, and exiting could cut the JSON short
  process.stdout.write(`${JSON.stringify({ systemMessage, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } })}\n`);
};

main().catch(() => pass());
