#!/usr/bin/env node
// backlog — the bookkeeping of the /backlog skill, done by code the same way every time, so that a daily mode reads
// one short report instead of every task file: what is in progress, ready and blocked, the next task ids, a ticked
// subtask, the views regenerated from the task files, and whether the files still agree with each other.
//
//   node bin/backlog.mjs status <dir> [--root <project root>]
//   node bin/backlog.mjs next <dir> [--root <project root>]
//   node bin/backlog.mjs next-id <dir> [--count N]
//   node bin/backlog.mjs tick <dir> <PREFIX-NNN.n>
//   node bin/backlog.mjs prefix <dir> [--set <PREFIX>]
//   node bin/backlog.mjs render <dir>
//   node bin/backlog.mjs validate <dir>
//
// <dir> is the backlog folder, whose STATE.json has kind "backlog"; every command stops (exit 1) when that file is
// missing, does not parse or belongs to something else — rebuilding it from the files is the operator's call.
// - status prints what `/backlog status` reports: an unfinished mode, the files edited since STATE.json was last
//   written, the blueprint checks (moved since the fingerprint, questions opened and closed since it, edits the
//   blueprint has not recorded — through `blueprint.mjs changed`, with --root as the project root, default the
//   current directory), every batch with its state and counts, the current batch's *What works* paragraph, the
//   tasks in progress with their next subtask, the ready ones, the blocked ones, what needs attention and what the
//   files break. It writes nothing.
// - next prints what `/backlog next` answers, step by step as modes.md › next has them; the blueprint checks only
//   when it offers to detail the current batch. It writes nothing.
// - next-id prints the next task id past `lastTask` and every id in tasks/ and the batch tables (--count N: N in a
//   row), and reserves them by raising lastTask.
// - tick ticks one subtask in its task file, turns a todo task in-progress, and prints the task's next open
//   subtask or, when every subtask is closed, the acceptance criteria to confirm. A done or dropped task, and a
//   subtask struck through, are refused.
// - prefix prints the task prefix and, while none is chosen, suggestions from the project's name; --set validates
//   one (2–6 capital letters or digits, a letter first; not RK, NEW or a module code) and writes it to STATE.json's
//   taskPrefix — only while no task has an id, since the id is what everything links to.
// Task ids are <taskPrefix>-NNN; a backlog whose STATE.json has no taskPrefix keeps the legacy T-NNN.
// A task of type group is a parent: it groups the tasks of one feature — one per repository and platform, each
// naming it in `parent` — holds no subtasks, is never offered and never counted in a batch; its status is
// computed from its children, and render writes in-progress into its file once one of them has started.
// - render rewrites the regenerated parts of the views (mechanics.md › Views): BACKLOG.md whole, from the
//   skill's template; each batch file's state line and every row whose task has a file; COVERAGE.md's Task(s)
//   cells, the covered / done status of a row whose tasks all have files, and its count line. Then it recomputes
//   currentBatch, stamps `updated` (BACKLOG_NOW, when set, verbatim) and writes STATE.json last. It prints what it
//   wrote and what the files break.
// - validate prints errors (exit 1) and warnings, one per line: `error: <file> — <what>` — a task whose batch has
//   no row, a ticked subtask on a todo task, a dependency that is unknown, dropped, in a later batch or in a cycle.
// Usage errors exit 2.

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node bin/backlog.mjs <command> <dir> [args]
  status <dir> [--root <project root>]   what /backlog status reports; writes nothing
  next <dir> [--root <project root>]     what /backlog next answers; writes nothing
  next-id <dir> [--count N]              print and reserve the next task id(s)
  tick <dir> <PREFIX-NNN.n>              tick one subtask; a todo task becomes in-progress
  prefix <dir> [--set <PREFIX>]          show the task prefix and suggestions, or choose it
  render <dir>                           regenerate the views, recompute currentBatch, stamp STATE.json last
  validate <dir>                         check that the task files, the batch tables and STATE.json agree
`;

// Per command: how many arguments may follow <dir>, and the options it takes.
const COMMANDS = {
  status: { extra: 0, options: ['root'] },
  next: { extra: 0, options: ['root'] },
  'next-id': { extra: 0, options: ['count'] },
  tick: { extra: 1, options: [] },
  prefix: { extra: 0, options: ['set'] },
  render: { extra: 0, options: [] },
  validate: { extra: 0, options: [] },
};
const VALUE_OPTIONS = new Set(['count', 'root', 'set']);

const PLUGIN_ROOT = fileURLToPath(new URL('../', import.meta.url));
const BACKLOG_TEMPLATE = join(PLUGIN_ROOT, 'skills/backlog/templates/BACKLOG.md');
const BLUEPRINT_SCRIPT = join(PLUGIN_ROOT, 'bin/blueprint.mjs');

const STATUSES = ['todo', 'in-progress', 'done', 'dropped'];
const PRIORITY = { P0: 0, P1: 1, P2: 2, P3: 3 };
// The ticket shape branch-based tools read (feat/ABC-012-slug): two characters at least before the dash
const PREFIX_SHAPE = /^[A-Z][A-Z0-9]{1,5}$/;
const LEGACY_PREFIX = 'T';
// Ids the blueprint and this skill already write with two letters or more, so a task id never reads as one of them
const RESERVED_PREFIXES = ['RK', 'NEW'];
const CHECKBOX = /^(\s*[-*]\s+\[)( |x|X)(\]\s+)(.*)$/;
const CAPABILITY_ID = /^[A-Z][A-Z0-9]{1,5}-C\d{2,}$/;
// Coverage statuses a task file can tell, from the least advanced; any other status is the operator's record
const ADVANCE = ['list-only', 'outline', 'planned', 'covered', 'done'];

// --- output and files

const print = (text) => process.stdout.write(`${text}\n`);

const fail = (message) => {
  process.stderr.write(`[dev-assistant] backlog: ${message}\n`);
  process.exit(1);
};

const usage = (message) => {
  process.stderr.write(`[dev-assistant] backlog: ${message}\n${USAGE}`);
  process.exit(2);
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const pad = (number, width) => String(number).padStart(width, '0');
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const unique = (items) => [...new Set(items)];

/** The task and subtask id patterns of one prefix; a prefix is capitals and digits only, so it needs no escaping. */
const idsFor = (prefix) => ({
  prefix,
  task: new RegExp(`\\b${prefix}-(\\d+)\\b(?!\\.\\d)`),
  subtask: new RegExp(`\\b${prefix}-(\\d+)\\.(\\d+)\\b`),
  file: new RegExp(`^${prefix}-\\d+.*\\.md$`),
  number: (id) => Number(new RegExp(`^${prefix}-(\\d+)`).exec(id ?? '')?.[1] ?? Number.NaN),
  format: (number) => `${prefix}-${pad(number, 3)}`,
});

const statOf = (path) => {
  try { return statSync(path); } catch { return null; }
};

/** A file as text with \n line ends; '' when it cannot be read. */
const read = (path) => {
  try { return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n'); } catch { return ''; }
};

const listDir = (path) => {
  try { return readdirSync(path).sort(); } catch { return []; }
};

/** Files under `root`, relative with forward slashes; names starting with "." are left out. */
const walk = (root, rel = '') => listDir(join(root, rel)).flatMap((name) => {
  if (name.startsWith('.')) return [];
  const path = rel ? `${rel}/${name}` : name;
  return statOf(join(root, path))?.isDirectory() ? walk(root, path) : [path];
});

const now = () => {
  if (process.env.BACKLOG_NOW) return process.env.BACKLOG_NOW;
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}T${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
};

// --- Markdown

/** The trimmed cells of a table row, or null when the line is not one; an escaped pipe stays in its cell. */
const cells = (line) => {
  const text = line.trim();
  if (!text.startsWith('|')) return null;
  return text.slice(1).replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim());
};

const isSeparator = (row) => row.every((cell) => /^:?-+:?$/.test(cell));
const bare = (cell = '') => cell.replace(/[`*~]/g, '').trim();
const row = (values) => `| ${values.join(' | ')} |`;

/** Level-2 sections: { title, start, end }, from the line after the heading to the next one. */
const sections = (lines) => {
  const found = [];
  lines.forEach((line, i) => {
    const title = /^ {0,3}#{1,2}[ \t]+(.*)$/.exec(line)?.[1];
    if (title === undefined) return;
    if (found.length) found[found.length - 1].end = i;
    found.push({ title: title.replace(/[ \t#]*$/, ''), start: i + 1, end: lines.length });
  });
  return found;
};

const sectionOf = (lines, title) => sections(lines).find((section) => section.title.startsWith(title)) ?? null;

/**
 * The first table in lines[from, to): `columns` (header cells, bare and lower-case), the `header` and `separator`
 * line indexes, and the data `rows` as { index, cells }; null when there is none.
 */
const tableIn = (lines, from, to) => {
  let start = from;
  while (start < to && !cells(lines[start])) start += 1;
  if (start >= to || !cells(lines[start + 1] ?? '') || !isSeparator(cells(lines[start + 1]))) return null;
  const rows = [];
  for (let i = start + 2; i < to && cells(lines[i]); i += 1) rows.push({ index: i, cells: cells(lines[i]) });
  return { columns: cells(lines[start]).map((cell) => bare(cell).toLowerCase()), header: start, separator: start + 1, rows };
};

// --- STATE.json

const loadState = (dir) => {
  const path = join(dir, 'STATE.json');
  if (!statOf(path)?.isFile()) fail(`${path} not found. Pass the backlog folder.`);
  let state;
  try {
    state = JSON.parse(read(path));
  } catch (error) {
    fail(`${path} does not parse (${error.message}). Rebuilding it from the files is the operator's call.`);
  }
  if (!isObject(state) || state.kind !== 'backlog') fail(`${path} is not a backlog's: kind ${JSON.stringify(state?.kind ?? null)}`);
  return state;
};

/** The ids of a backlog: its taskPrefix, or the legacy T when it has none; a malformed one stops every command. */
const idsOf = (state) => {
  const prefix = state.taskPrefix ?? LEGACY_PREFIX;
  if (prefix !== LEGACY_PREFIX && !PREFIX_SHAPE.test(String(prefix))) {
    fail(`STATE.json's taskPrefix ${JSON.stringify(prefix)} is not 2–6 capital letters or digits starting with a letter.`);
  }
  return idsFor(prefix);
};

const writeState = (dir, state) => writeFileSync(join(dir, 'STATE.json'), `${JSON.stringify(state, null, 2)}\n`);

const batchId = (value) => {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? pad(Number(text), 2) : text;
};

// --- task files

const unquote = (text) => {
  const value = text.trim();
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
};

/** The value without a trailing `# comment` — a # after whitespace, outside quotes. */
const withoutComment = (value) => {
  let quote = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.slice(0, i);
    }
  }
  return value;
};

/** The items of a flow list's inside, `a, "b, c", d`; a dash alone is no item. */
const listItems = (inside) => {
  const items = [];
  let current = '';
  let quote = null;
  for (const char of inside) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ',') {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  items.push(current);
  return items.map(unquote).filter((item) => item && !/^[-–—]$/.test(item));
};

/** The frontmatter as { key: string | string[] }: flow lists, block lists and scalars; null when there is none. */
const frontmatter = (text) => {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (!match) return null;
  const data = {};
  let open = null;
  for (const line of match[1].split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && open) {
      if (!Array.isArray(data[open])) data[open] = [];
      data[open].push(...listItems(withoutComment(item[1])));
      continue;
    }
    const pair = /^([\w-]+):(.*)$/.exec(line);
    open = null;
    if (!pair) continue;
    const [, key, rest] = pair;
    const value = (key === 'title' ? rest : withoutComment(rest)).trim();
    if (value.startsWith('[')) data[key] = listItems(value.replace(/^\[|\]$/g, ''));
    else data[key] = unquote(value);
    if (value === '') open = key;
  }
  return data;
};

const asList = (value) => (Array.isArray(value) ? value : value ? listItems(value) : []);
/** A scalar field, '' when it is empty, a dash or null. */
const scalar = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^([-–—]|null|~)?$/.test(text) ? '' : text;
};
const isGroup = (task) => task?.type === 'group';

/** The checklist of a section: { line, ticked, struck, text, id, title, doneWhen }. */
const checklist = (lines, title, ids) => {
  const section = sectionOf(lines, title);
  if (!section) return [];
  const items = [];
  for (let i = section.start; i < section.end; i += 1) {
    const box = CHECKBOX.exec(lines[i]);
    if (box) {
      const text = box[4].trim();
      const id = ids.subtask.exec(text)?.[0] ?? null;
      const title = text.replace(/~~/g, '').replace(ids.subtask, '').replace(/^\s*[—–-]\s*/, '').trim();
      items.push({ line: i, ticked: box[2] !== ' ', struck: text.includes('~~'), text, id, title, doneWhen: '' });
      continue;
    }
    const doneWhen = /^\s+done when:\s*(.*)$/.exec(lines[i]);
    if (doneWhen && items.length) items[items.length - 1].doneWhen = doneWhen[1].trim();
  }
  return items;
};

const isClosed = (item) => item.ticked || item.struck;

const readTask = (dir, name, ids) => {
  const file = `tasks/${name}`;
  const text = read(join(dir, file));
  const meta = frontmatter(text);
  const lines = text.split('\n');
  const notes = sectionOf(lines, 'Notes');
  const status = String(meta?.status ?? '').trim().replace(/\s+/g, '-');
  return {
    file,
    name,
    meta,
    id: meta?.id || ids.task.exec(name)?.[0] || null,
    title: meta?.title ?? name,
    module: meta?.module ?? '',
    platforms: asList(meta?.platforms),
    type: meta?.type ?? '',
    repo: scalar(meta?.repo),
    parent: scalar(meta?.parent),
    priority: meta?.priority ?? '',
    size: meta?.size ?? '',
    batch: batchId(meta?.batch),
    status,
    depends: asList(meta?.depends),
    blockedBy: asList(meta?.blocked_by),
    review: typeof meta?.review === 'string' ? meta.review.trim() : asList(meta?.review).join(', '),
    capabilities: asList(meta?.capabilities),
    subtasks: checklist(lines, 'Subtasks', ids),
    criteria: checklist(lines, 'Acceptance criteria', ids),
    notes: notes ? lines.slice(notes.start, notes.end).join('\n') : '',
  };
};

// --- the backlog as one model

const readBatchFile = (dir, name, ids) => {
  const file = `batches/${name}`;
  const lines = read(join(dir, file)).split('\n');
  const section = sectionOf(lines, 'Tasks');
  const table = section ? tableIn(lines, section.start, section.end) : null;
  const column = (key) => table?.columns.indexOf(key) ?? -1;
  const rows = (table?.rows ?? []).map(({ index, cells: values }, order) => {
    const at = (key) => (column(key) >= 0 ? values[column(key)] ?? '' : '');
    return {
      index,
      order,
      cells: values,
      id: ids.task.exec(bare(at('task')))?.[0] ?? null,
      title: bare(at('title')),
      type: bare(at('type')),
      capabilities: bare(at('capabilities')).split(/[,\s]+/).filter((id) => CAPABILITY_ID.test(id)),
      platforms: bare(at('platforms')).split(/[,\s]+/).filter((item) => item && !/^[-–—]$/.test(item)),
      depends: [...at('depends').matchAll(new RegExp(ids.task.source, 'g'))].map(([id]) => id),
    };
  });
  const works = sectionOf(lines, 'What works after this batch');
  return {
    file,
    name,
    lines,
    table,
    rows,
    works: works ? lines.slice(works.start, works.end).join(' ').replace(/\s+/g, ' ').trim() : '',
  };
};

const load = (dir) => {
  const state = loadState(dir);
  const ids = idsOf(state);
  const batches = (Array.isArray(state.batches) ? state.batches : []).filter(isObject)
    .map((entry) => ({ ...entry, id: batchId(entry.id) }))
    .sort((a, b) => Number(a.id) - Number(b.id));
  const files = new Map();
  for (const name of listDir(join(dir, 'batches'))) {
    const id = /^(\d+)-.*\.md$/.exec(name)?.[1];
    if (id) files.set(batchId(id), readBatchFile(dir, name, ids));
  }
  const taskNames = listDir(join(dir, 'tasks')).filter((name) => name.endsWith('.md'));
  const taskList = taskNames.filter((name) => ids.file.test(name)).map((name) => readTask(dir, name, ids));
  // A task file under another prefix is not read as a task; validate names it
  const foreign = taskNames.filter((name) => !ids.file.test(name) && /^[A-Z][A-Z0-9]*-\d+/.test(name));
  const tasks = new Map();
  for (const task of taskList) if (task.id && !tasks.has(task.id)) tasks.set(task.id, task);
  // Where each id has its row: { batch, row }; a second row for the same id is a break, reported by validate
  const rowOf = new Map();
  for (const [id, batchFile] of files) {
    for (const entry of batchFile.rows) if (entry.id && !rowOf.has(entry.id)) rowOf.set(entry.id, { batch: id, row: entry });
  }
  return { dir, state, ids, batches, files, taskList, tasks, rowOf, foreign };
};

// --- what is computed, never stored (mechanics.md › Statuses, › Batches)

const isOpenTask = (task) => !['done', 'dropped'].includes(task.status);
const childrenOf = (model, group) => model.taskList.filter((task) => task.meta && task.parent === group.id && !isGroup(task));
/** A group that is neither done nor dropped, whose children are all closed and at least one of them done. */
const isClosable = (model, group) => {
  const children = childrenOf(model, group);
  return isGroup(group) && isOpenTask(group) && children.some((child) => child.status === 'done') && !children.some(isOpenTask);
};
/** A row that stands for a group: its task file says so, or an outline row's Type cell. */
const isGroupRow = (model, entry) => (entry.id && model.tasks.has(entry.id) ? isGroup(model.tasks.get(entry.id)) : entry.type === 'group');
const isBlocked = (task) => task.blockedBy.length > 0 && isOpenTask(task);
const nextSubtask = (task) => task.subtasks.find((item) => !isClosed(item)) ?? null;

/** A batch whose gate is still pending: no task of it is offered. */
const gatePending = (model, id) => {
  const { pending } = model.state;
  if (!isObject(pending)) return false;
  return pending.mode === 'init' || (pending.mode === 'detail' && asList(pending.batches).map(batchId).includes(id));
};

const isReady = (model, task) => {
  if (isGroup(task)) return false;
  const batch = model.batches.find((entry) => entry.id === task.batch);
  return task.status === 'todo' && !isBlocked(task) && !task.review && Boolean(batch?.detailed) && !batch?.closed
    && !gatePending(model, task.batch) && task.depends.every((id) => model.tasks.get(id)?.status === 'done');
};

/** What a task is right now: dropped, done, blocked, in progress, ready or todo. */
const shownAs = (model, task) => {
  if (task.status === 'dropped' || task.status === 'done') return task.status;
  if (isGroup(task)) return childrenOf(model, task).some((child) => ['in-progress', 'done'].includes(child.status)) ? 'in progress' : 'todo';
  if (isBlocked(task)) return 'blocked';
  if (task.status === 'in-progress') return 'in progress';
  return isReady(model, task) ? 'ready' : 'todo';
};

const tasksOf = (model, id) => model.taskList.filter((task) => task.batch === id && task.id && !isGroup(task));

const isComplete = (model, batch) => {
  const rows = (model.files.get(batch.id)?.rows ?? []).filter((entry) => !isGroupRow(model, entry));
  return Boolean(batch.detailed) && rows.length > 0 && rows.every((entry) => entry.id && model.tasks.has(entry.id))
    && tasksOf(model, batch.id).every((task) => !isOpenTask(task));
};

const batchState = (model, batch) => {
  if (batch.closed) return `closed ${batch.closed}`;
  if (!batch.detailed) return 'outline';
  if (isComplete(model, batch)) return 'complete';
  return tasksOf(model, batch.id).some((task) => ['in-progress', 'done'].includes(task.status)) ? 'in progress' : 'todo';
};

/** The current batch: the pinned one until it closes, else the lowest-numbered batch not closed. */
const currentOf = (model) => {
  const pinned = model.state.currentPinned ? batchId(model.state.currentPinned) : null;
  const entry = model.batches.find((batch) => batch.id === pinned && !batch.closed);
  if (entry) return { id: entry.id, pinned: true };
  return { id: model.batches.find((batch) => !batch.closed)?.id ?? null, pinned: false };
};

const byRow = (model) => (a, b) => (Number(a.batch) - Number(b.batch))
  || ((PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9))
  || ((model.rowOf.get(a.id)?.row.order ?? 999) - (model.rowOf.get(b.id)?.row.order ?? 999));

const counts = (model, batch) => {
  const rows = (model.files.get(batch.id)?.rows ?? []).filter((entry) => !isGroupRow(model, entry));
  const tally = { done: 0, 'in progress': 0, ready: 0, blocked: 0, todo: 0, dropped: 0 };
  let outline = 0;
  for (const entry of rows) {
    const task = entry.id ? model.tasks.get(entry.id) : null;
    if (task) tally[shownAs(model, task)] += 1;
    else outline += 1;
  }
  return { rows: rows.length, outline, ...tally };
};

// --- validate

const finding = (level) => (file, what) => ({ level, file, what, text: `${level}: ${file} — ${what}` });
const error = finding('error');
const warning = finding('warning');

const check = (model) => {
  const found = [];
  const { dir, state, ids, batches, files, taskList, tasks, rowOf, foreign } = model;
  const known = new Set(batches.map((batch) => batch.id));
  const strategy = isObject(state.strategy) ? state.strategy : {};
  const byRepository = strategy.split === 'by-repository';
  const repoMap = isObject(strategy.repoMap) ? strategy.repoMap : {};
  const repositories = new Set([...asList(state.repositories), ...Object.values(repoMap)].filter((name) => typeof name === 'string' && name));

  for (const batch of batches) {
    if (!files.has(batch.id)) found.push(error('STATE.json', `batch ${batch.id} has no file batches/${batch.id}-<slug>.md`));
  }
  for (const [id, batchFile] of files) {
    if (!known.has(id)) found.push(warning(batchFile.file, `batch ${id} is not in STATE.json's batches`));
    if (!batchFile.table) found.push(error(batchFile.file, 'no task table under "## Tasks"'));
    for (const entry of batchFile.rows) {
      const first = rowOf.get(entry.id);
      if (entry.id && first && first.batch !== id) found.push(error(batchFile.file, `${entry.id} has a row here and in batch ${first.batch}`));
    }
  }

  const fileOf = new Map();
  for (const task of taskList) {
    if (!task.meta) {
      found.push(error(task.file, 'no frontmatter'));
      continue;
    }
    const named = ids.task.exec(task.name)?.[0];
    if (task.id !== named) found.push(error(task.file, `its id ${task.id} is not the one its file name gives (${named})`));
    if (fileOf.has(task.id)) found.push(error(task.file, `${task.id} is also ${fileOf.get(task.id)}`));
    else fileOf.set(task.id, task.file);
    if (!STATUSES.includes(task.status)) found.push(error(task.file, `status "${task.meta.status ?? ''}" is none of ${STATUSES.join(', ')}`));
    if (!known.has(task.batch)) found.push(error(task.file, `batch "${task.batch}" is not in STATE.json`));
    const at = rowOf.get(task.id);
    if (!at) found.push(error(task.file, `batch ${task.batch} has no row for ${task.id}`));
    else if (at.batch !== task.batch) found.push(error(task.file, `its batch is ${task.batch}, but its row is in batch ${at.batch}`));
    if (task.status === 'todo' && task.subtasks.some((item) => item.ticked)) found.push(error(task.file, 'a subtask is ticked but the task is todo'));
    if (task.status === 'done' && task.subtasks.some((item) => !isClosed(item))) found.push(warning(task.file, 'done, but a subtask is neither ticked nor struck through'));
    if (isGroup(task)) {
      const children = childrenOf(model, task);
      if (task.parent) found.push(error(task.file, `a group is never a child, but it names the parent ${task.parent}`));
      if (!children.length) found.push(error(task.file, 'a group with no children: no task names it in parent'));
      if (task.subtasks.length) found.push(warning(task.file, 'a group holds no subtasks; its children do'));
      if (task.repo) found.push(warning(task.file, `a group changes no repository; its children do (repo ${task.repo})`));
      if (task.status === 'done' && children.some(isOpenTask)) {
        found.push(error(task.file, `done, but its children ${children.filter(isOpenTask).map((child) => child.id).join(', ')} are not`));
      }
      for (const child of children) {
        if (known.has(child.batch) && Number(child.batch) < Number(task.batch)) {
          found.push(error(task.file, `its row is in batch ${task.batch}, but its child ${child.id} is in batch ${child.batch}: a group's row sits in the batch of its first child`));
        }
      }
    } else {
      const parent = task.parent ? tasks.get(task.parent) : null;
      if (task.parent && !parent) found.push(error(task.file, `its parent ${task.parent} is not in the backlog`));
      if (parent && !isGroup(parent)) found.push(error(task.file, `its parent ${task.parent} is not a group (type: group)`));
      if (byRepository && !task.repo) found.push(error(task.file, 'no repo: the backlog is split by repository, so every task names the one it changes'));
      if (task.repo && repositories.size && !repositories.has(task.repo)) {
        found.push(warning(task.file, `repo ${task.repo} is none of the backlog's repositories (${[...repositories].join(', ')})`));
      }
    }
    for (const blocker of task.blockedBy) {
      if (!/^(Q-\d+|ext:)/.test(blocker)) found.push(warning(task.file, `blocked_by "${blocker}" is neither a Q- id nor "ext: …"`));
    }
  }

  // Dependencies, from the task files and from the rows that have no file yet
  const edges = new Map();
  for (const task of taskList) if (task.id && task.meta) edges.set(task.id, { file: task.file, batch: task.batch, depends: task.depends });
  for (const [id, batchFile] of files) {
    for (const entry of batchFile.rows) {
      if (entry.id && !tasks.has(entry.id)) edges.set(entry.id, { file: batchFile.file, batch: id, depends: entry.depends });
    }
  }
  const batchOfId = (id) => tasks.get(id)?.batch ?? rowOf.get(id)?.batch;
  for (const [id, { file, batch, depends }] of edges) {
    for (const dependency of depends) {
      if (dependency === id) {
        found.push(error(file, `${id} depends on itself`));
        continue;
      }
      const where = batchOfId(dependency);
      if (!where) found.push(error(file, `${id} depends on ${dependency}, which is not in the backlog`));
      else if (Number(where) > Number(batch)) found.push(error(file, `${id} depends on ${dependency}, which is in a later batch (${where})`));
      if (tasks.get(dependency)?.status === 'dropped') found.push(error(file, `${id} depends on ${dependency}, which is dropped`));
      if (isGroup(tasks.get(dependency))) found.push(error(file, `${id} depends on the group ${dependency}: name the child it needs`));
    }
  }
  const seen = new Set();
  const visit = (id, path) => {
    if (path.includes(id)) {
      const cycle = [...path.slice(path.indexOf(id)), id];
      const key = [...cycle].slice(0, -1).sort().join();
      if (!seen.has(key)) {
        seen.add(key);
        found.push(error(edges.get(id).file, `a dependency cycle: ${cycle.join(' → ')}`));
      }
      return;
    }
    for (const dependency of edges.get(id)?.depends ?? []) if (edges.has(dependency) && dependency !== id) visit(dependency, [...path, id]);
  };
  for (const id of edges.keys()) visit(id, []);

  const highest = Math.max(0, ...[...edges.keys()].map(ids.number).filter(Number.isFinite));
  if (Number(state.lastTask ?? 0) < highest) found.push(warning('STATE.json', `lastTask is ${state.lastTask ?? 0}, but ${ids.format(highest)} exists`));
  for (const name of foreign) found.push(warning(`tasks/${name}`, `not read as a task: its id does not carry the prefix ${ids.prefix}`));
  if (!statOf(join(dir, 'tasks'))?.isDirectory()) found.push(warning('tasks/', 'no tasks folder'));
  return found;
};

const validate = (dir) => {
  const found = check(load(dir));
  for (const { text } of found) print(text);
  const errors = found.filter(({ level }) => level === 'error').length;
  print(errors || found.length
    ? `${plural(errors, 'error')}, ${plural(found.length - errors, 'warning')}`
    : 'The task files, the batch tables and STATE.json agree.');
  if (errors) process.exit(1);
};

// --- the blueprint checks (mechanics.md › The blueprint's state)

const openQuestions = (blueprintDir) => {
  const lines = read(join(blueprintDir, 'OPEN-QUESTIONS.md')).split('\n');
  const table = tableIn(lines, 0, lines.length);
  if (!table) return new Map();
  const idAt = table.columns.indexOf('id');
  const questionAt = table.columns.indexOf('question');
  const statusAt = table.columns.indexOf('status');
  return new Map(table.rows
    .filter(({ cells: values }) => /^Q-\d+$/.test(bare(values[idAt])) && /^open\b/i.test(bare(values[statusAt] ?? 'open')))
    .map(({ cells: values }) => [bare(values[idAt]), bare(values[questionAt] ?? '')]));
};

const blueprintDirOf = (model) => (typeof model.state.blueprint?.path === 'string' ? resolve(model.dir, model.state.blueprint.path) : null);

const blueprintChecks = (model, root) => {
  const path = model.state.blueprint?.path;
  const blueprintDir = blueprintDirOf(model);
  if (!blueprintDir) return ['Blueprint: STATE.json names no blueprint path.'];
  let blueprint = null;
  try { blueprint = JSON.parse(read(join(blueprintDir, 'STATE.json'))); } catch { /* reported below */ }
  if (blueprint?.kind !== 'blueprint') return [`Blueprint: no blueprint at ${path} — it moved; find it again (mechanics.md › Paths).`];
  const fingerprint = isObject(model.state.blueprint.fingerprint) ? model.state.blueprint.fingerprint : {};
  const lines = [blueprint.updated === fingerprint.updated
    ? `Blueprint ${path}: as at the last sync (${fingerprint.updated}).`
    : `Blueprint ${path}: moved — updated ${blueprint.updated}, last synced ${fingerprint.updated ?? 'never'}; its CHANGELOG.md rows after the sync say what moved — /backlog resync.`];
  const open = openQuestions(blueprintDir);
  const before = new Set(asList(fingerprint.openQuestions).filter((id) => /^Q-\d+$/.test(id)));
  const opened = [...open.keys()].filter((id) => !before.has(id));
  const closed = [...before].filter((id) => !open.has(id));
  if (opened.length) lines.push(`  questions opened since the sync: ${opened.map((id) => `${id} — ${open.get(id)}`).join('; ')}`);
  if (closed.length) lines.push(`  questions closed since the sync: ${closed.join(', ')}`);
  const changed = spawnSync(process.execPath, [BLUEPRINT_SCRIPT, 'changed', blueprintDir, '--root', root], { encoding: 'utf8' });
  const said = (changed.stdout || changed.stderr || '').trim();
  if (changed.status !== 0) lines.push(`  its changed check failed: ${said}`);
  else if (!/^Nothing changed/.test(said)) {
    lines.push('  unrecorded edits — /blueprint takes them in first, then /backlog resync:', ...said.split('\n').map((line) => `    ${line}`));
  }
  return lines;
};

const handEdits = (model) => {
  const since = statOf(join(model.dir, 'STATE.json')).mtimeMs;
  return walk(model.dir).filter((file) => file !== 'STATE.json' && file !== '.DS_Store' && statOf(join(model.dir, file)).mtimeMs > since);
};

// --- status and next

const taskLine = (task) => `${task.id} ${task.title}`;
const subtaskLine = (item) => (item ? `${item.id ?? '?'} ${item.title}${item.doneWhen ? ` — done when: ${item.doneWhen}` : ''}` : 'no open subtask');
const readyLine = (task) => `${taskLine(task)} · ${[task.priority, task.size, task.module, task.platforms.join(', '), task.repo, task.parent ? `part of ${task.parent}` : ''].filter(Boolean).join(' · ')} · first ${subtaskLine(nextSubtask(task))}`;
const isWorkInProgress = (task) => task.status === 'in-progress' && !isBlocked(task) && !isGroup(task);

const waitsFor = (model, task) => {
  const reasons = [
    ...task.depends.filter((id) => model.tasks.get(id)?.status !== 'done').map((id) => `${id} (${model.tasks.get(id) ? shownAs(model, model.tasks.get(id)) : 'no file'})`),
    ...task.blockedBy,
    ...(task.review ? [task.review] : []),
  ];
  return reasons.length ? reasons.join(', ') : 'nothing — its batch is not ready to offer';
};

const isTaskError = ({ level, file }) => level === 'error' && file.startsWith('tasks/');

const attention = (model, found) => [
  ...model.taskList.filter((task) => isClosable(model, task)).map((task) => ({ task, why: `every child is closed — confirm its acceptance criteria: /backlog done ${task.id}` })),
  ...model.taskList.filter((task) => task.review && isOpenTask(task)).map((task) => ({ task, why: task.review })),
  ...found.filter(isTaskError).map(({ file, what }) => ({ task: model.taskList.find((task) => task.file === file), why: what })),
];

const questionBlocks = (model) => {
  const blueprintDir = blueprintDirOf(model);
  const titles = blueprintDir ? openQuestions(blueprintDir) : new Map();
  const open = model.taskList.filter(isOpenTask);
  const ids = unique(open.flatMap((task) => [
    ...task.blockedBy.filter((id) => /^Q-\d+$/.test(id)),
    ...[...task.notes.matchAll(/provisional choice of (Q-\d+)/g)].map(([, id]) => id),
  ])).sort();
  return ids.map((id) => {
    const holds = open.filter((task) => task.blockedBy.includes(id));
    const built = open.filter((task) => new RegExp(`provisional choice of ${id}\\b`).test(task.notes));
    return { id, title: titles.get(id) ?? '', holds, built, batches: unique([...holds, ...built].map((task) => task.batch)).sort() };
  });
};

const outsideBlocks = (model) => model.taskList.filter(isOpenTask).flatMap((task) => task.blockedBy
  .filter((blocker) => blocker.startsWith('ext:'))
  .map((blocker) => {
    const [, what, since] = /^ext:\s*(.*?)\s*(?:\((\d{4}-\d{2}-\d{2})\))?$/.exec(blocker);
    return { task, what, since: since ?? '' };
  }));

const status = (dir, root) => {
  const model = load(dir);
  const found = check(model);
  const current = currentOf(model);
  const lines = [`Backlog ${model.state.project ?? ''} · updated ${model.state.updated ?? 'never'} · current batch ${current.id ?? 'none'}${current.pinned ? ' (pinned)' : ''}`];
  const { pending } = model.state;
  if (isObject(pending)) lines.push(`Pending: ${pending.mode} stopped at ${pending.step}${pending.since ? ` since ${pending.since}` : ''} — /backlog continue`);
  const edits = handEdits(model);
  lines.push(edits.length ? `Hand edits since STATE.json was last written: ${edits.join(', ')}` : 'Hand edits since STATE.json was last written: none');
  lines.push(...blueprintChecks(model, root));

  lines.push('Batches:');
  if (!model.batches.length) lines.push('  none yet');
  for (const batch of model.batches) {
    const tally = counts(model, batch);
    const head = `  ${batch.id} ${batch.slug ?? ''} · ${batch.stage ?? ''} · ${batchState(model, batch)}`;
    lines.push(batch.detailed
      ? `${head} · ${plural(tally.rows, 'task')}: ${tally.done} done · ${tally['in progress']} in progress · ${tally.ready} ready · ${tally.todo} todo · ${tally.blocked} blocked · ${tally.dropped} dropped${tally.outline ? ` · ${tally.outline} without a file` : ''}`
      : `${head} · ${plural(tally.rows, 'row')}, not detailed`);
  }
  const works = current.id ? model.files.get(current.id)?.works : '';
  if (works) lines.push(`What works after batch ${current.id}: ${works}`);

  const list = (title, items) => lines.push(`${title}:`, ...(items.length ? items.map((item) => `  ${item}`) : ['  none']));
  const open = model.taskList.filter((task) => task.id && task.meta);
  list('In progress', open.filter(isWorkInProgress).sort(byRow(model))
    .map((task) => `${taskLine(task)} · batch ${task.batch} · next ${subtaskLine(nextSubtask(task))}`));
  list('Ready', open.filter((task) => isReady(model, task)).sort(byRow(model)).map((task) => `${readyLine(task)} · batch ${task.batch}`));
  list('Blocked by blueprint questions', questionBlocks(model).map(({ id, title, holds, built, batches }) => [
    `${id}${title ? ` ${title}` : ''}`,
    holds.length ? `holds up ${holds.map((task) => task.id).join(', ')}` : '',
    built.length ? `built on its provisional choice: ${built.map((task) => task.id).join(', ')}` : '',
    `batch ${batches.join(', ')}`,
  ].filter(Boolean).join(' · ')));
  list('Blocked outside the blueprint', outsideBlocks(model).map(({ task, what, since }) => `${task.id} waits for ${what}${since ? ` (since ${since})` : ''}`));
  list('Needs attention', attention(model, found).map(({ task, why }) => `${task?.id ?? '?'} ${why}`));
  const undetailed = model.batches.filter((batch) => !batch.detailed && !batch.closed).map((batch) => batch.id);
  lines.push(`Not detailed: ${undetailed.length ? undetailed.join(', ') : 'none'}`);
  // A task file's errors are listed under Needs attention; everything else the files break, here
  list('What the files break', found.filter((item) => !isTaskError(item)).map(({ text }) => text));
  print(lines.join('\n'));
};

const next = (dir, root) => {
  const model = load(dir);
  const { pending } = model.state;
  if (isObject(pending) && pending.mode === 'init') {
    print(`The backlog is not cut yet: init stopped at ${pending.step} — /backlog continue`);
    return;
  }
  const found = check(model);
  const current = currentOf(model);
  const lines = [];
  const edits = handEdits(model);
  if (edits.length) lines.push(`Hand edits since STATE.json was last written: ${edits.join(', ')}`);
  if (!current.id) {
    lines.push('Every batch is closed: nothing left to offer.');
    print(lines.join('\n'));
    return;
  }
  const batch = model.batches.find((entry) => entry.id === current.id);
  lines.push(`Current batch ${current.id} ${batch.slug ?? ''}${current.pinned ? ' (pinned)' : ''} · ${batchState(model, batch)}`);
  if (!batch.detailed) {
    lines.push(`1. Batch ${current.id} is not detailed — offer /backlog detail ${current.id}.`, ...blueprintChecks(model, root));
  }
  const open = model.taskList.filter((task) => task.id && task.meta);
  const inProgress = open.filter(isWorkInProgress).sort(byRow(model));
  lines.push('In progress:', ...(inProgress.length
    ? inProgress.map((task) => `  ${taskLine(task)} · batch ${task.batch} · next ${subtaskLine(nextSubtask(task))}`)
    : ['  none']));
  const ready = open.filter((task) => task.batch === current.id && isReady(model, task)).sort(byRow(model));
  lines.push(`Ready in batch ${current.id}:`, ...(ready.length ? ready.slice(0, 5).map((task) => `  ${readyLine(task)}`) : ['  none']));
  if (ready.length > 5) lines.push(`  … and ${ready.length - 5} more`);
  const left = tasksOf(model, current.id).filter(isOpenTask);
  if (!ready.length && !inProgress.length && left.length) {
    lines.push('Waiting:', ...left.map((task) => `  ${task.id} waits for ${waitsFor(model, task)}`));
    const ahead = model.batches.find((entry) => Number(entry.id) > Number(current.id) && entry.detailed && !entry.closed && !gatePending(model, entry.id));
    const early = ahead ? open.filter((task) => task.batch === ahead.id && isReady(model, task)).sort(byRow(model)).slice(0, 3) : [];
    if (early.length) lines.push(`Ahead of batch ${ahead.id} — safe, a batch never depends forward:`, ...early.map((task) => `  ${readyLine(task)}`));
  }
  if (batch.detailed && isComplete(model, batch)) {
    lines.push(`Batch ${current.id} is complete but not closed — ask whether what works holds (mechanics.md › Batches).`);
  }
  const needs = attention(model, found);
  if (needs.length) lines.push('Needs attention:', ...needs.map(({ task, why }) => `  ${task?.id ?? '?'} ${why}`));
  const breaks = found.filter((item) => item.level === 'error' && !isTaskError(item));
  if (breaks.length) lines.push('What the files break:', ...breaks.map(({ text }) => `  ${text}`));
  print(lines.join('\n'));
};

// --- next-id and tick

const nextId = (dir, count) => {
  const model = load(dir);
  const { ids } = model;
  const used = [
    ...model.taskList.map((task) => ids.number(ids.task.exec(task.name)?.[0])),
    ...model.taskList.map((task) => ids.number(task.id)),
    ...[...model.files.values()].flatMap((batchFile) => batchFile.rows.map((entry) => ids.number(entry.id))),
  ].filter(Number.isFinite);
  const first = Math.max(Number(model.state.lastTask) || 0, ...used) + 1;
  const given = Array.from({ length: count }, (_, i) => ids.format(first + i));
  writeState(dir, { ...model.state, lastTask: first + count - 1 });
  print(given.join('\n'));
};

const tick = (dir, id) => {
  const model = load(dir);
  const { subtask } = model.ids;
  if (!subtask.test(id) || subtask.exec(id)[0] !== id) usage(`tick takes a subtask id, ${model.ids.prefix}-NNN.n — not "${id}"`);
  const taskId = id.replace(/\.\d+$/, '');
  const task = model.tasks.get(taskId);
  if (!task) fail(`no task file for ${taskId} in tasks/`);
  if (isGroup(task)) fail(`${taskId} is a group: its children hold the subtasks.`);
  if (task.status === 'done') fail(`${taskId} is done, and a done task is never reopened: a later problem is a new bug task that cites it.`);
  if (task.status === 'dropped') fail(`${taskId} is dropped.`);
  const item = task.subtasks.find((entry) => entry.id === id);
  if (!item) fail(`${task.file} has no subtask ${id}`);
  if (item.struck) fail(`${id} is struck through — moved or dropped, not ticked.`);
  const lines = read(join(dir, task.file)).split('\n');
  const said = [];
  if (item.ticked) {
    said.push(`${id} was ticked already.`);
  } else {
    lines[item.line] = lines[item.line].replace(CHECKBOX, '$1x$3$4');
    item.ticked = true;
    said.push(`Ticked ${id} ${item.title}.`);
  }
  if (task.status === 'todo') {
    const end = lines.indexOf('---', 1);
    const at = lines.slice(0, end).findIndex((line) => /^status:\s*todo\b/.test(line));
    if (at >= 0) lines[at] = lines[at].replace(/^(status:\s*)todo\b/, '$1in-progress');
    said.push(`${taskId} is in progress now.`);
  }
  writeFileSync(join(dir, task.file), lines.join('\n'));
  const open = task.subtasks.filter((entry) => !isClosed(entry));
  const closed = task.subtasks.length - open.length;
  if (open.length) {
    said.push(`${taskId}: ${closed} of ${task.subtasks.length} subtasks closed · next ${subtaskLine(open[0])}`);
  } else {
    const criteria = task.criteria.filter((entry) => !isClosed(entry));
    said.push(`${taskId}: every subtask is closed — ask whether its acceptance criteria hold:`, ...criteria.map((entry) => `  - ${entry.text}`));
  }
  print(said.join('\n'));
};

// --- prefix

/**
 * Prefixes the project's name suggests, each with how it was made: the initials of its words (the first three
 * letters of a one-word name), the first three letters of the first word, the first letter with the next two
 * consonants. Only those of the right shape and not taken, without repeats.
 */
const suggestPrefixes = (project, taken) => {
  const name = String(project ?? '').trim();
  const words = name.normalize('NFKD').replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map((word) => word.toUpperCase());
  if (!words.length) return [];
  const [first] = words;
  const consonants = first.slice(1).replace(/[AEIOUY0-9]/g, '');
  const candidates = [
    words.length > 1
      ? { prefix: words.map((word) => word[0]).join('').slice(0, 6), how: `the initials of "${name}"` }
      : { prefix: first.slice(0, 3), how: `the first letters of "${name}"` },
    { prefix: first.slice(0, 3), how: `the first three letters of "${words.length > 1 ? first : name}"` },
    { prefix: `${first[0]}${consonants.slice(0, 2)}`, how: `the first letter and the consonants of "${words.length > 1 ? first : name}"` },
  ];
  const seen = new Set();
  return candidates.filter(({ prefix }) => {
    if (!PREFIX_SHAPE.test(prefix) || taken.has(prefix) || seen.has(prefix)) return false;
    seen.add(prefix);
    return true;
  });
};

const prefix = (dir, wanted) => {
  const model = load(dir);
  const { state, ids } = model;
  const modules = Array.isArray(state.blueprint?.fingerprint?.modules) ? state.blueprint.fingerprint.modules : [];
  const moduleCodes = modules.map((entry) => entry?.code).filter((code) => typeof code === 'string' && code);
  const taken = new Set([...RESERVED_PREFIXES, ...moduleCodes]);
  const numbered = Number(state.lastTask) > 0 || model.taskList.length > 0
    || [...model.files.values()].some((batchFile) => batchFile.rows.some((entry) => entry.id));
  const example = (of) => `${of.format(1)}, ${of.format(2)} …, subtasks ${of.format(1)}.1`;

  if (wanted === undefined) {
    const lines = [state.taskPrefix
      ? `Task prefix: ${ids.prefix} — ${example(ids)}`
      : `Task prefix: not chosen — ids would be ${LEGACY_PREFIX}-NNN, the legacy form`];
    if (!state.taskPrefix && numbered) lines.push(`Ids are given as ${LEGACY_PREFIX}-NNN already, so the prefix can no longer change.`);
    if (!state.taskPrefix && !numbered) {
      const suggested = suggestPrefixes(state.project, taken);
      lines.push('Suggestions:', ...(suggested.length ? suggested.map(({ prefix: value, how }) => `  ${value} — ${how}`) : ['  none — STATE.json names no project']));
      lines.push(`Shape: 2–6 capital letters or digits, a letter first — the form branch-based tools read as a ticket (feat/${suggested[0]?.prefix ?? 'ABC'}-012-slug); not ${[...taken].join(', ')}.`);
    }
    print(lines.join('\n'));
    return;
  }

  const value = wanted.trim();
  if (!PREFIX_SHAPE.test(value)) fail(`"${value}" is not a task prefix: 2–6 capital letters or digits, a letter first (ABC gives ABC-012).`);
  if (value === 'RK') fail('RK is taken: RK- ids are the blueprint\'s risks.');
  if (value === 'NEW') fail('NEW is taken: NEW-n marks a task a subagent proposes before it is numbered.');
  if (moduleCodes.includes(value)) fail(`${value} is a module code: ${value}-C03 is a capability id, and ${value}-012 would read as one.`);
  if (state.taskPrefix === value) {
    print(`Task prefix is ${value} already — ${example(ids)}.`);
    return;
  }
  if (numbered) fail(`ids are given as ${ids.prefix}-NNN already; another prefix would rename every task file and every reference to it, which this script does not do.`);
  writeState(dir, { ...state, taskPrefix: value });
  print(`Task prefix ${value} — ${example(idsFor(value))}.`);
};

// --- render

const link = (task, prefix) => `[${task.id}](${prefix}tasks/${task.name})`;
const cell = (items) => (items.length ? items.join(', ') : '—');

const renderBatch = (model, batch) => {
  const batchFile = model.files.get(batch.id);
  if (!batchFile) return false;
  const lines = [...batchFile.lines];
  const { table } = batchFile;
  if (table) {
    const column = (key) => table.columns.indexOf(key);
    for (const entry of batchFile.rows) {
      const task = entry.id ? model.tasks.get(entry.id) : null;
      if (!task?.meta) continue;
      const values = [...entry.cells];
      const set = (key, value) => {
        if (column(key) >= 0) values[column(key)] = value;
      };
      set('task', link(task, '../'));
      set('title', task.status === 'dropped' ? `~~${task.title}~~` : task.title);
      set('capabilities', cell(task.capabilities));
      set('module', task.module || '—');
      set('platforms', cell(task.platforms));
      set('repo', task.repo || '—');
      set('parent', task.parent || '—');
      set('type', task.type || '—');
      set('priority', task.priority || '—');
      set('size', isGroup(task) ? '—' : task.size || '—');
      set('depends', cell(task.depends));
      set('status', task.status.replace('-', ' '));
      lines[entry.index] = row(values);
    }
  }
  const title = lines.findIndex((line) => /^# /.test(line));
  if (title >= 0) {
    const stateLine = [batch.stage, batch.flow, `detailed: ${batch.detailed ? 'yes' : 'no'}`, batchState(model, batch)].filter(Boolean).join(' · ');
    let at = title + 1;
    while (at < lines.length && !lines[at].trim()) at += 1;
    if (/detailed:/.test(lines[at] ?? '')) lines[at] = stateLine;
    else lines.splice(title + 1, 0, '', stateLine);
  }
  const text = lines.join('\n');
  if (text === batchFile.lines.join('\n')) return false;
  writeFileSync(join(model.dir, batchFile.file), text);
  return true;
};

/** The kind a coverage status counts as: one of ADVANCE or exists, partly, deferred, gaps, dropped; null for none. */
const kindOf = (status, allDone) => {
  const kinds = status.split(' · ').map((part) => {
    const text = part.trim().toLowerCase();
    if (/\bl2 only\b/.test(text)) return 'list-only';
    if (/^(?:[\w-]+ )?partly deferred\b/.test(text)) return allDone ? 'done' : 'covered';
    const word = /(?:^|\s)(planned|covered|done|outline|list-only|exists|partly|deferred|blueprint gap|dropped)\b/.exec(text)?.[1];
    return word === 'blueprint gap' ? 'gaps' : word ?? null;
  }).filter(Boolean);
  if (!kinds.length) return null;
  return kinds.reduce((least, kind) => (ADVANCE.indexOf(kind) < ADVANCE.indexOf(least) ? kind : least));
};

const renderCoverage = (model) => {
  const file = join(model.dir, 'COVERAGE.md');
  const before = read(file);
  if (!before) return null;
  const lines = before.split('\n');
  const section = sectionOf(lines, 'Capabilities');
  const table = section ? tableIn(lines, section.start, section.end) : null;
  if (!table) return null;
  const at = (key) => table.columns.indexOf(key);
  const taskAt = table.columns.findIndex((key) => key.startsWith('task'));
  const statusAt = at('status');
  const outlineRows = [...model.files.entries()].flatMap(([id, batchFile]) => batchFile.rows
    .filter((entry) => entry.id && !model.tasks.has(entry.id) && entry.type !== 'group').map((entry) => ({ ...entry, batch: id })));
  const tally = { planned: 0, covered: 0, done: 0, outline: 0, 'list-only': 0, exists: 0, partly: 0, deferred: 0, gaps: 0, dropped: 0 };

  for (const { index, cells: values } of table.rows) {
    const id = bare(values[at('id')]);
    const withFile = CAPABILITY_ID.test(id)
      ? model.taskList.filter((task) => task.meta && !isGroup(task) && task.status !== 'dropped' && task.capabilities.includes(id)) : [];
    const outline = CAPABILITY_ID.test(id) ? outlineRows.filter((entry) => entry.capabilities.includes(id)) : [];
    const delivering = [
      ...withFile.map((task) => ({ id: task.id, platform: task.platforms[0] ?? '', done: task.status === 'done' })),
      ...outline.map((entry) => ({ id: entry.id, platform: entry.platforms[0] ?? '', done: false })),
    ].sort((a, b) => a.id.localeCompare(b.id));
    const allDone = withFile.length > 0 && !outline.length && withFile.every((task) => task.status === 'done');
    if (CAPABILITY_ID.test(id) && taskAt >= 0) {
      const platforms = unique(delivering.map((entry) => entry.platform));
      values[taskAt] = !delivering.length ? '—' : platforms.length > 1
        ? platforms.map((platform) => `${platform}: ${delivering.filter((entry) => entry.platform === platform).map((entry) => entry.id).join(', ')}`).join(' · ')
        : delivering.map((entry) => entry.id).join(' · ');
      const current = values[statusAt] ?? '';
      const parts = current.split(' · ').map((part) => part.trim()).filter(Boolean);
      const regenerable = parts.every((part) => /^(?:[\w-]+ )?(planned|outline|list-only|covered|done)\b/.test(part));
      if (statusAt >= 0 && withFile.length && !outline.length && regenerable) {
        const word = (tasks) => (tasks.every((entry) => entry.done) ? 'done' : 'covered');
        const words = platforms.map((platform) => ({ platform, word: word(delivering.filter((entry) => entry.platform === platform)) }));
        values[statusAt] = unique(words.map((entry) => entry.word)).length > 1
          ? words.map((entry) => `${entry.platform} ${entry.word}`).join(' · ') : words[0].word;
      }
      lines[index] = row(values);
    }
    const kind = kindOf(values[statusAt] ?? '', allDone);
    if (kind) tally[kind] += 1;
  }

  const countAt = lines.findIndex((line) => /^Blueprint .* capabilities:/.test(line));
  if (countAt >= 0) {
    const updated = model.state.blueprint?.fingerprint?.updated ?? '';
    lines[countAt] = `Blueprint ${updated} · ${table.rows.length} capabilities: ${Object.entries(tally).map(([kind, count]) => `${count} ${kind}`).join(' · ')}`;
  }
  const text = lines.join('\n');
  if (text !== before) writeFileSync(file, text);
  return table.rows.length;
};

/** BACKLOG.md from the skill's template: its prose kept, its placeholders filled, every table's rows generated. */
const renderOverview = (model, found, current, updated) => {
  const template = read(BACKLOG_TEMPLATE);
  if (!template) fail(`the template ${BACKLOG_TEMPLATE} is missing`);
  const path = model.state.blueprint?.path ?? '';
  const lines = template
    .replaceAll('{{project name}}', model.state.project ?? '')
    .replaceAll('{{prefix}}', model.ids.prefix)
    .replaceAll('{{blueprint path}}', path)
    .replace('{{YYYY-MM-DDTHH:MM}}', updated)
    .replace('**{{NN}}**', `**${current.id ?? '—'}**`)
    .split('\n');
  const open = model.taskList.filter((task) => task.id && task.meta);
  const tables = {
    Batches: model.batches.map((batch) => {
      const tally = counts(model, batch);
      const name = model.files.get(batch.id)?.name ?? `${batch.id}-${batch.slug}.md`;
      const numbers = batch.detailed
        ? [tally.rows, tally.done, tally['in progress'], tally.ready, tally.blocked, tally.dropped]
        : [`${tally.rows} (outline)`, '', '', '', '', ''];
      return row([batch.id, `[${batch.slug ?? name}](batches/${name})`, batch.stage ?? '', ...numbers, batch.detailed ? 'yes' : 'no', batchState(model, batch)]);
    }),
    'Ready now': open.filter((task) => isReady(model, task)).sort(byRow(model)).map((task) => {
      const first = nextSubtask(task);
      return row([link(task, ''), task.title, task.module || '—', cell(task.platforms), task.repo || '—', task.size || '—', first ? `${first.id} — ${first.title}` : '—']);
    }),
    'In progress': open.filter((task) => task.status === 'in-progress' && !isGroup(task)).sort(byRow(model)).map((task) => {
      const first = nextSubtask(task);
      return row([link(task, ''), task.title, first ? `${first.id} — ${first.title}` : 'every subtask closed — confirm the criteria']);
    }),
    Groups: open.filter((task) => isGroup(task) && isOpenTask(task)).sort(byRow(model)).map((group) => row([
      link(group, ''), group.title, cell(childrenOf(model, group).map((child) => `${child.id} ${shownAs(model, child)}`)),
    ])),
    'Needs attention': attention(model, found).map(({ task, why }) => row([task ? link(task, '') : '?', why])),
    'Blocked by blueprint questions': questionBlocks(model).map(({ id, title, holds, built, batches }) => row([
      title ? `${id} — ${title}` : id, cell(holds.map((task) => task.id)), cell(built.map((task) => task.id)), batches.join(', '),
    ])),
    'Blocked outside the blueprint': outsideBlocks(model).map(({ task, what, since }) => row([link(task, ''), what, since || '—'])),
  };
  // From the last section up, so the line indexes of the sections above stay true
  for (const section of sections(lines).reverse()) {
    if (!Object.hasOwn(tables, section.title)) continue;
    const table = tableIn(lines, section.start, section.end);
    if (table) lines.splice(table.separator + 1, table.rows.length, ...tables[section.title]);
  }
  writeFileSync(join(model.dir, 'BACKLOG.md'), lines.join('\n'));
};

/** Writes in-progress into a todo group's file once one of its children has started; returns the ids written. */
const renderGroups = (model) => model.taskList.filter((task) => isGroup(task) && task.status === 'todo' && shownAs(model, task) === 'in progress')
  .map((group) => {
    const lines = read(join(model.dir, group.file)).split('\n');
    const end = lines.indexOf('---', 1);
    const at = lines.slice(0, end).findIndex((line) => /^status:\s*todo\b/.test(line));
    if (at >= 0) lines[at] = lines[at].replace(/^(status:\s*)todo\b/, '$1in-progress');
    writeFileSync(join(model.dir, group.file), lines.join('\n'));
    group.status = 'in-progress';
    return group.id;
  });

const render = (dir) => {
  const model = load(dir);
  const groups = renderGroups(model);
  const found = check(model);
  const current = currentOf(model);
  const updated = now();
  const batches = model.batches.filter((batch) => renderBatch(model, batch)).map((batch) => batch.id);
  const coverage = renderCoverage(model);
  renderOverview(model, found, current, updated);
  // STATE.json last, so that the next hand-edit check finds only what the operator changed; a pin ends when its
  // batch closes
  writeState(dir, { ...model.state, updated, currentBatch: current.id, currentPinned: current.pinned ? current.id : null });
  print([
    `Rendered BACKLOG.md · batch files changed: ${batches.length ? batches.join(', ') : 'none'} · COVERAGE.md: ${coverage === null ? 'no capability table' : plural(coverage, 'row')}${groups.length ? ` · groups in progress now: ${groups.join(', ')}` : ''}`,
    `Current batch ${current.id ?? 'none'}${current.pinned ? ' (pinned)' : ''} · STATE.json updated ${updated}`,
    ...found.map(({ text }) => text),
  ].join('\n'));
};

// --- command line

const parseArgs = (argv) => {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split(/=(.*)/s);
    if (!VALUE_OPTIONS.has(name)) {
      options[name] = true;
      continue;
    }
    const value = inline ?? argv[(i += 1)];
    if (!value) usage(`--${name} needs a value`);
    options[name] = value;
  }
  return { positional, options };
};

const main = () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, dirArg, ...rest] = positional;
  if (!command) usage('no command given');
  if (!Object.hasOwn(COMMANDS, command)) usage(`unknown command "${command}"`);
  if (!dirArg) usage(`${command} needs the backlog folder`);
  const { extra, options: allowed } = COMMANDS[command];
  const foreign = Object.keys(options).find((name) => !allowed.includes(name));
  if (foreign) usage(`${command} does not take --${foreign}`);
  if (rest.length > extra) usage(`too many arguments for ${command}: ${rest.join(' ')}`);
  if (options.count !== undefined && !/^[1-9]\d*$/.test(options.count)) usage('--count takes a whole number of at least 1');
  const dir = resolve(dirArg);
  const root = resolve(options.root ?? process.cwd());

  if (command === 'status') status(dir, root);
  if (command === 'next') next(dir, root);
  if (command === 'next-id') nextId(dir, Number(options.count ?? 1));
  if (command === 'tick') {
    if (!rest[0]) usage('tick needs a subtask id, PREFIX-NNN.n');
    tick(dir, rest[0]);
  }
  if (command === 'prefix') prefix(dir, options.set);
  if (command === 'render') render(dir);
  if (command === 'validate') validate(dir);
};

try {
  main();
} catch (error) {
  fail(error.message);
}
