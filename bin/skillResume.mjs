#!/usr/bin/env node
// skill-resume — SessionStart (startup, clear, compact). /blueprint, /showcase, /backlog and /research work over
// many sessions, and their gates recommend a fresh context before what comes next: the operator types /clear, then
// the command. A plugin cannot clear the context itself, so this hook makes the fresh start cheap instead: it finds
// every unfinished blueprint and showcase, every backlog with a mode left half-way and every research run past its
// brief, under the session's folder, and says where each one stands — one line to the operator, a short note to
// the model — so that the new session resumes from STATE.json rather than from a re-read of what is already done.
// It writes nothing. Fails open: any error means silence.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { pass, readPayload } from './lib/hookIo.mjs';

const HOOK = 'skill-resume';
const MAX_DEPTH = 4;
const MAX_FOLDERS = 2000;
const SKIPPED = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor']);

// The phases of a blueprint's STATE.json in order, named as the stages of the `init`, `continue` row in its
// SKILL.md › Progress
const BLUEPRINT_PHASES = [
  ['intake', 'Intake'],
  ['reading', 'Reading the input'],
  ['brief', 'Brief'],
  ['architecture', 'Architecture'],
  ['modules', 'Modules (L2)'],
  ['capabilities', 'Capabilities (L3)'],
  ['consistency', 'Consistency review'],
  ['adequacy', 'Adequacy review'],
];
const BLUEPRINT_STATUS = {
  pending: 'not started',
  'in-progress': 'in progress',
  'awaiting-approval': 'waits for the operator at its gate',
  approved: 'approved',
};

// The steps of a showcase's STATE.json, each with the stage of the `init [dir]`, `continue` row in its
// SKILL.md › Progress; step 19 is two keys
const SHOWCASE_STAGES = [
  [['intake'], 'Intake'],
  [['scheme'], 'Color scheme'],
  [['stack'], 'Technology'],
  [['frame'], 'Frame'],
  [['foundations'], 'Foundations'],
  [['logo'], 'Logo'],
  [['microcopy'], 'Microcopy and tone'],
  [['components'], 'Components'],
  [['icons'], 'Icons'],
  [['illustrations'], 'Illustrations'],
  [['states'], 'States'],
  [['signIn'], 'Sign-in layouts'],
  [['appLayout'], 'App layout'],
  [['screens'], 'Key screens'],
  [['flows'], 'Flows'],
  [['emails'], 'Emails'],
  [['notFound'], 'Not found page'],
  [['charts'], 'Charts'],
  [['architecture'], 'Architecture'],
  [['principles', 'project'], 'Principles, Decisions, Changelog, Next steps'],
  [['audit'], 'Audit'],
];
const SHOWCASE_STATUS = {
  pending: 'not started',
  'in-progress': 'in progress',
  'awaiting-approval': 'waits for the operator at its gate',
  done: 'approved',
  skipped: 'skipped',
};

// The phases of a research run's STATE.json, named as the stages of the `<topic>`, `continue [run]` row in its
// SKILL.md › Progress, and what its last round's status says
const RESEARCH_PHASES = [
  ['frame', 'Frame'],
  ['research', 'Research'],
  ['curate', 'Curate'],
  ['review', 'Review'],
];
const ROUND_STATUS = {
  pending: 'not started',
  running: 'cut off while running',
  researched: 'researched, not curated',
  failed: 'failed',
  done: 'curated',
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

const blueprint = (state) => {
  const index = BLUEPRINT_PHASES.findIndex(([key]) => key === state.phase);
  if (index < 0) return null;
  const [key, name] = BLUEPRINT_PHASES[index];
  const modules = Array.isArray(state.modules) ? state.modules.filter((entry) => entry && !entry.removed) : [];
  const failed = modules.flatMap((entry) => ['l2', 'l3'].filter((level) => entry[level] === 'failed').map((level) => `${entry.code} ${level}`));
  return {
    where: `${index + 1}/${BLUEPRINT_PHASES.length} ${name}`,
    status: BLUEPRINT_STATUS[state.phases?.[key]] ?? 'not started',
    extra: failed.length ? `failed: ${failed.join(', ')}` : '',
    model: `phase "${key}"`,
    command: '/blueprint',
    reference: 'mechanics.md › A fresh context',
  };
};

const showcase = (state) => {
  if (state.step === 'done') return null;
  const index = SHOWCASE_STAGES.findIndex(([keys]) => keys.includes(state.step));
  if (index < 0) return null;
  const [, name] = SHOWCASE_STAGES[index];
  return {
    where: `${index + 1}/${SHOWCASE_STAGES.length} ${name}`,
    status: SHOWCASE_STATUS[state.steps?.[state.step]] ?? 'not started',
    extra: state.pending ? 'a question waits for the operator' : '',
    model: `step "${state.step}"`,
    command: '/showcase',
    reference: 'phases.md › A fresh context',
  };
};

const backlog = (state) => {
  const { pending } = state;
  if (!pending || typeof pending !== 'object' || !pending.mode) return null;
  return {
    where: `${pending.mode} stopped at ${pending.step ?? 'its start'}`,
    status: '',
    extra: '',
    model: `mode "${pending.mode}", step "${pending.step ?? ''}"`,
    command: '/backlog continue',
    reference: 'mechanics.md › Gates and resuming',
  };
};

const research = (state) => {
  const index = RESEARCH_PHASES.findIndex(([key]) => key === state.phase);
  // Frame is a draft the operator may have cancelled, done is nothing to resume: only a run past its brief
  if (index < 1) return null;
  const [key, name] = RESEARCH_PHASES[index];
  const rounds = Array.isArray(state.rounds) ? state.rounds.filter((round) => round && typeof round === 'object') : [];
  const last = rounds[rounds.length - 1];
  return {
    where: `${index + 1}/${RESEARCH_PHASES.length} ${name}`,
    status: last ? `round ${last.n} ${ROUND_STATUS[last.status] ?? last.status}` : '',
    extra: '',
    model: `phase "${key}"`,
    command: '/research',
    reference: 'phases.md › A fresh context',
  };
};

const KINDS = { blueprint, showcase, backlog, research };

/**
 * Where an unfinished run stands, or null for anything else: a finished one, a kind this hook does not know, a
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
  if (!Object.hasOwn(KINDS, state?.kind) || raw.includes('{{')) return null;
  const found = KINDS[state.kind](state);
  return found && { kind: state.kind, folder: relative(root, dirname(file)).split(sep).join('/') || '.', ...found };
};

const main = async () => {
  const payload = await readPayload();
  const root = payload.cwd || process.cwd();
  const runs = findStates(root).map((file) => standing(file, root)).filter(Boolean)
    .sort((a, b) => Object.keys(KINDS).indexOf(a.kind) - Object.keys(KINDS).indexOf(b.kind));
  if (!runs.length) pass();

  const parts = (run) => [run.where, run.status, run.extra].filter(Boolean).join(' · ');
  const systemMessage = runs
    .map((run) => `▸ /${run.kind} · ${parts(run)} · ${run.folder} — ${run.command} resumes it`)
    .join('\n');
  const additionalContext = [
    `[dev-assistant] ${HOOK}: unfinished work in this project —`,
    ...runs.map((run) => `- /${run.kind} in ${run.folder}: ${run.model} (${parts(run)}); see ${run.reference}`),
    'When the operator runs the command, resume from that STATE.json as the skill says: read only what the current '
      + 'phase, step or mode needs, not the documents of the ones already approved.',
  ].join('\n');
  // No process.exit after the write: on macOS a pipe is written asynchronously, and exiting could cut the JSON short
  process.stdout.write(`${JSON.stringify({ systemMessage, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } })}\n`);
};

main().catch(() => pass());
