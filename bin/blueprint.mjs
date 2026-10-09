#!/usr/bin/env node
// blueprint — the bookkeeping of the /blueprint skill, done by code the same way every time: ids, counts, the
// `updated` stamp, what changed since the last write, whether every reference resolves, a one-file export.
//
//   node bin/blueprint.mjs stamp <dir>
//   node bin/blueprint.mjs next <dir> <kind> [code] [--count N]
//   node bin/blueprint.mjs changed <dir> [--root <project root>]
//   node bin/blueprint.mjs validate <dir>
//   node bin/blueprint.mjs export <dir> [--out <file>] [--with-sources]
//
// <dir> is the blueprint folder, whose STATE.json has kind "blueprint"; every command but `validate` stops
// (exit 1) when that file is missing, does not parse or belongs to something else, and `validate` reports it.
// - stamp sets `updated` to the local time as YYYY-MM-DDTHH:MM (BLUEPRINT_NOW, when set, verbatim) and
//   recounts `counts` as distinct ids: sources from the registry (the first table of 00-sources.md), open
//   questions only, capabilities as headings in modules/*.md. Every other key keeps its value and its place.
// - next prints the next id of a kind — source S-NN, decision D-NNN, assumption A-NNN, question Q-NNN, goal
//   G-NN, nfr N-NN, risk RK-NN — from the highest one in its file; `capability <CODE>` gives <CODE>-CNN past
//   both the module's lastCapability and every number used under the code anywhere, and reserves it by
//   raising lastCapability. --count N prints (and reserves) N in a row.
// - changed lists the folder's files and the document sources of 00-sources.md (a relative location is read
//   from --root, default the current directory) modified after STATE.json was last written, and the document
//   sources it cannot find — moved, deleted, or read from the wrong --root. Dotfiles, dot-folders (the
//   converted copies in .sources/ among them) and export/ are never the operator's edits and are not listed.
// - validate prints errors (exit 1) and warnings, one per line: `error: <file>:<line> — <what>`.
// - export writes one Markdown file, <dir>/export/blueprint.md by default: headings one level down, HTML
//   comments gone, competitor profiles at the end, links to local files turned into their text (the document
//   travels without the folder; web links and anchors stay). It prints the path.
// Not an id of this blueprint: one narrower than its kind (D-7, G-1 are a source's), anything after § (S-01
// §D-23), inside {{…}}, in code, in a URL or a link target — so a word that only looks like an id (an N-95
// mask) goes in backticks. A placeholder written before ids were given (ORG-C??, [A-??: …], S-??) is an
// error until it is replaced. Usage errors exit 2.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

const USAGE = `Usage: node bin/blueprint.mjs <command> <dir> [args]
  stamp <dir>                                   set "updated" and recount "counts" in STATE.json
  next <dir> <kind> [code] [--count N]          print the next id; kind: source, decision, assumption,
                                                question, goal, nfr, risk, or capability <CODE>
  changed <dir> [--root <project root>]         list what changed since STATE.json was last written
  validate <dir>                                check ids, references, markers, modules, counts, coverage
  export <dir> [--out <file>] [--with-sources]  write the blueprint as one Markdown document
`;

// Per command: how many arguments may follow <dir>, and the options it takes.
const COMMANDS = {
  stamp: { extra: 0, options: [] },
  next: { extra: 2, options: ['count'] },
  changed: { extra: 0, options: ['root'] },
  validate: { extra: 0, options: [] },
  export: { extra: 0, options: ['out', 'with-sources'] },
};
const VALUE_OPTIONS = new Set(['count', 'out', 'root']);

// Each log: the id prefix, the digits an id has at least, and the file whose table defines it.
const LOGS = {
  source: { prefix: 'S', width: 2, file: '00-sources.md' },
  decision: { prefix: 'D', width: 3, file: 'DECISIONS.md' },
  assumption: { prefix: 'A', width: 3, file: 'ASSUMPTIONS.md' },
  question: { prefix: 'Q', width: 3, file: 'OPEN-QUESTIONS.md' },
  goal: { prefix: 'G', width: 2, file: '01-brief.md' },
  nfr: { prefix: 'N', width: 2, file: '01-brief.md' },
  risk: { prefix: 'RK', width: 2, file: '01-brief.md' },
};
const BY_PREFIX = Object.fromEntries(Object.values(LOGS).map((log) => [log.prefix, log]));

const ID = /\b(RK|[SDAQGN])-(\d+)\b/g;
const EXACT_ID = /^(RK|[SDAQGN])-(\d+)$/;
const SECTION_ID = /^ {0,3}#{1,6}[ \t]+(RK|[SDAQGN])-(\d+)\b/;
const CAPABILITY = /\b([A-Z][A-Z0-9]{1,5})-C(\d{2,})\b/g;
const CAPABILITY_HEADING = /^ {0,3}#{1,6}[ \t]+([A-Z][A-Z0-9]{1,5}-C\d{2,})\b/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const INLINE_CODE = /(`+)[^`\n]*?\1/g;
const PLACEHOLDER = /\{\{[\s\S]*?\}\}/g;
const SKIPPED = new Set(['export']); // top-level folders that hold output, not the blueprint

// --- output and files

const print = (text) => process.stdout.write(`${text}\n`);

const fail = (message) => {
  process.stderr.write(`[dev-assistant] blueprint: ${message}\n`);
  process.exit(1);
};

const usage = (message) => {
  process.stderr.write(`[dev-assistant] blueprint: ${message}\n${USAGE}`);
  process.exit(2);
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const pad = (number, width) => String(number).padStart(width, '0');
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const blank = (match) => match.replace(/[^\n]/g, ' ');

const statOf = (path) => {
  try { return statSync(path, { bigint: true }); } catch { return null; }
};

/** A file of the folder as text with \n line ends; '' when it cannot be read. */
const read = (dir, file) => {
  try { return readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n'); } catch { return ''; }
};

/** Files under `root`, relative with forward slashes, sorted; names starting with "." and `skip` paths are left out. */
const walk = (root, skip = new Set()) => {
  const files = [];
  const visit = (rel) => {
    let entries = [];
    try { entries = readdirSync(join(root, rel), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.name.startsWith('.') || skip.has(path)) continue;
      if (entry.isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit('');
  return files.sort();
};

// --- Markdown

/** Lines of a Markdown text, each marked `code` when it belongs to a fenced code block, fences included. */
const fencedLines = (text) => {
  let open = null;
  return text.split('\n').map((line) => {
    const fence = FENCE.exec(line);
    if (open) {
      if (fence && fence[1][0] === open[0] && fence[1].length >= open.length && !fence[2].trim()) open = null;
      return { line, code: true };
    }
    if (fence && !(fence[1][0] === '`' && fence[2].includes('`'))) open = fence[1];
    return { line, code: Boolean(open) };
  });
};

/** Lines with fenced code emptied. */
const unfenced = (text) => fencedLines(text).map(({ line, code }) => (code ? '' : line));

/** Lines with fenced code emptied and inline code blanked. */
const withoutCode = (text) => fencedLines(text).map(({ line, code }) => (code ? '' : line.replace(INLINE_CODE, blank)));

/** The lines ids are read from: no code, {{…}} placeholder, link target, URL or source's own part after §; line breaks kept. */
const prose = (plain) => plain.join('\n')
  .replace(PLACEHOLDER, blank)
  .replace(/\]\([^)\n]*\)/g, blank)
  .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, blank)
  .replace(/§\S+/g, blank)
  .split('\n');

/** The trimmed cells of a table row, or null when the line is not one; an escaped pipe stays in its cell. */
const cells = (line) => {
  const text = line.trim();
  if (!text.startsWith('|')) return null;
  return text.slice(1).replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim());
};

const isSeparator = (row) => row.every((cell) => /^:?-+:?$/.test(cell));
const bare = (cell = '') => cell.replace(/[`*]/g, '').trim();

/**
 * Line indexes of the data rows of the first table in lines[from, to) — no header, no separator. Lines before
 * the table are skipped unless `stop` says the table would belong to something else.
 */
const firstTable = (lines, from = 0, to = lines.length, stop = () => false) => {
  let start = from;
  for (; start < to && !cells(lines[start]); start += 1) if (stop(lines[start])) return [];
  const rows = [];
  for (let i = start; i < to && cells(lines[i]); i += 1) rows.push(i);
  return rows.filter((i, k) => !isSeparator(cells(lines[i])) && !(k + 1 < rows.length && isSeparator(cells(lines[rows[k + 1]]))));
};

/** Level-1 and level-2 sections: { title, start, end }, from the line after the heading to the next one. */
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

// --- ids and logs

const isWide = ([, prefix, digits]) => digits.length >= BY_PREFIX[prefix].width;
const home = (prefix) => (prefix === 'S' ? 'the sources table of 00-sources.md' : BY_PREFIX[prefix].file);
const status = (row) => bare(row[row.length - 1]);
const distinct = (rows) => new Set(rows.map(({ id }) => id)).size;

/** The rows among `indexes` whose first cell is an id of `prefix`: { id, row, line }. */
const idRows = (lines, prefix, indexes = lines.keys()) => [...indexes].flatMap((i) => {
  const row = cells(lines[i]);
  const match = row && EXACT_ID.exec(bare(row[0]));
  return match && match[1] === prefix && isWide(match) ? [{ id: match[0], row, line: i + 1 }] : [];
});

/** The id a section heading of `prefix` opens with (`## D-004 — …`), or null. */
const sectionId = (line, prefix) => {
  const match = SECTION_ID.exec(line);
  return match && match[1] === prefix && isWide(match) ? `${match[1]}-${match[2]}` : null;
};

/** Every log's defining rows, by kind; a source is defined only by the registry, the first table of 00-sources.md. */
const readLogs = (dir) => Object.fromEntries(Object.entries(LOGS).map(([kind, log]) => {
  const lines = unfenced(read(dir, log.file));
  return [kind, idRows(lines, log.prefix, kind === 'source' ? firstTable(lines) : undefined)];
}));

/** The highest number of a `prefix` id in the lines, 0 when there is none. */
const highestId = (lines, prefix) => {
  let highest = 0;
  for (const line of lines) {
    for (const match of line.matchAll(ID)) if (match[1] === prefix && isWide(match)) highest = Math.max(highest, Number(match[2]));
  }
  return highest;
};

/** The folder's Markdown files and STATE.json, each as code-free lines (`plain`) and prose lines (`lines`). */
const readCorpus = (dir) => walk(dir, SKIPPED)
  .filter((file) => file.endsWith('.md') || file === 'STATE.json')
  .map((file) => {
    const plain = withoutCode(read(dir, file));
    return { file, plain, lines: prose(plain) };
  });

/** The highest capability number used under each module code anywhere in the corpus: code → number. */
const capabilityNumbers = (corpus) => {
  const highest = new Map();
  for (const { lines } of corpus) {
    for (const line of lines) {
      for (const [, code, digits] of line.matchAll(CAPABILITY)) highest.set(code, Math.max(highest.get(code) ?? 0, Number(digits)));
    }
  }
  return highest;
};

const moduleFiles = (dir) => walk(join(dir, 'modules'))
  .filter((file) => !file.includes('/') && file.endsWith('.md'))
  .map((file) => `modules/${file}`);

/** Every capability heading in modules/*.md: { id, file, line }. */
const capabilityHeadings = (dir) => moduleFiles(dir).flatMap((file) => unfenced(read(dir, file)).flatMap((line, i) => {
  const id = CAPABILITY_HEADING.exec(line)?.[1];
  return id ? [{ id, file, line: i + 1 }] : [];
}));

/** `counts` as the files have them. */
const recount = (dir, logs = readLogs(dir)) => ({
  sources: distinct(logs.source),
  decisions: distinct(logs.decision),
  assumptions: distinct(logs.assumption),
  openQuestions: distinct(logs.question.filter(({ row }) => status(row).toLowerCase().startsWith('open'))),
  goals: distinct(logs.goal),
  nfrs: distinct(logs.nfr),
  risks: distinct(logs.risk),
  capabilities: distinct(capabilityHeadings(dir)),
});

// --- STATE.json

/** STATE.json as { state, raw }, or { problem } saying why it cannot be used. */
const readState = (dir) => {
  if (!statOf(join(dir, 'STATE.json'))?.isFile()) return { problem: 'not found' };
  const raw = read(dir, 'STATE.json');
  let state;
  try { state = JSON.parse(raw); } catch (error) { return { problem: `does not parse (${error.message})` }; }
  if (!isObject(state) || state.kind !== 'blueprint') return { problem: `is not a blueprint's: kind ${JSON.stringify(state?.kind ?? null)}` };
  return { state, raw };
};

const loadState = (dir) => {
  const { state, raw, problem } = readState(dir);
  if (problem) fail(`${join(dir, 'STATE.json')} ${problem}. Pass the blueprint folder; a broken STATE.json is fixed by hand, never rebuilt silently.`);
  return { state, raw };
};

const writeState = (dir, state) => writeFileSync(join(dir, 'STATE.json'), `${JSON.stringify(state, null, 2)}\n`);

const modulesOf = (state) => (Array.isArray(state.modules) ? state.modules.filter(isObject) : []);

/** The file a module entry points to, relative to the folder: `file` (bare names live in modules/), else the slug. */
const moduleFile = (entry) => {
  const file = typeof entry.file === 'string' && entry.file.trim() ? entry.file.trim() : `${entry.slug ?? entry.code}.md`;
  return normalize(file.includes('/') ? file : `modules/${file}`).split(sep).join('/');
};

const isOutOfScope = (entry) => String(entry.stage ?? '').toLowerCase().replace(/[-_]/g, ' ').trim() === 'out of scope';

/** The 1-based line of `"key": value` (or of the key alone) in a JSON text; undefined when absent. */
const jsonLine = (raw, key, value) => {
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`"${escape(key)}"\\s*:${value === undefined ? '' : `\\s*${escape(JSON.stringify(value))}`}`);
  const index = raw.split('\n').findIndex((line) => pattern.test(line));
  return index < 0 ? undefined : index + 1;
};

const entryLine = (raw, entry) => ['slug', 'name', 'code']
  .map((key) => (typeof entry[key] === 'string' ? jsonLine(raw, key, entry[key]) : undefined))
  .find(Boolean) ?? jsonLine(raw, 'modules');

// --- stamp

const now = () => {
  if (process.env.BLUEPRINT_NOW) return process.env.BLUEPRINT_NOW;
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}T${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
};

const stamp = (dir) => {
  const { state } = loadState(dir);
  const counts = recount(dir);
  const stamped = { ...state, updated: now(), counts: { ...(isObject(state.counts) ? state.counts : {}), ...counts } };
  writeState(dir, stamped);
  print(`updated ${stamped.updated} · ${Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(' · ')}`);
};

// --- next

const sequence = (first, count) => Array.from({ length: count }, (_, i) => first + i);

const nextIds = (dir, kind, code, count) => {
  if (kind !== 'capability' && !Object.hasOwn(LOGS, kind)) fail(`unknown kind "${kind}"; use ${Object.keys(LOGS).join(', ')} or capability <CODE>`);
  if (kind === 'capability' && !code) usage('next capability needs the module code, as in: next <dir> capability ORG');
  if (kind !== 'capability' && code !== undefined) usage(`a ${kind} id takes no module code`);
  const { state } = loadState(dir);
  if (kind === 'capability') return reserveCapabilities(dir, state, code.toUpperCase(), count);
  const { prefix, width, file } = LOGS[kind];
  const first = highestId(prose(withoutCode(read(dir, file))), prefix) + 1;
  print(sequence(first, count).map((number) => `${prefix}-${pad(number, width)}`).join('\n'));
};

/** Prints the next capability ids of a module and raises its lastCapability to the last of them. */
const reserveCapabilities = (dir, state, code, count) => {
  const entries = modulesOf(state).filter((entry) => entry.code === code);
  const entry = entries.find((candidate) => !candidate.removed);
  if (!entries.length) fail(`no module has the code ${code} in STATE.json (codes: ${modulesOf(state).map((m) => m.code).join(', ') || 'none'})`);
  if (!entry) fail(`module ${code} was removed (${entries[0].removed}); number its capabilities under the module they moved to`);
  const used = capabilityNumbers(readCorpus(dir)).get(code) ?? 0;
  const first = Math.max(Number(entry.lastCapability) || 0, used) + 1;
  entry.lastCapability = first + count - 1;
  writeState(dir, state);
  print(sequence(first, count).map((number) => `${code}-C${pad(number, 2)}`).join('\n'));
};

// --- changed

/** The path in a Location cell: its first `code span`, else a link's target, else the cell. */
const locationOf = (cell) => (/`([^`]+)`/.exec(cell)?.[1] ?? /\]\(([^)\s]+)\)/.exec(cell)?.[1] ?? cell).trim();

const resolveLocation = (location, root) => {
  if (location === '~' || location.startsWith('~/')) return join(homedir(), location.slice(1));
  return isAbsolute(location) ? location : resolve(root, location);
};

/** The registry's sources of type document: { id, location, path }. */
const documentSources = (dir, root) => {
  const lines = unfenced(read(dir, '00-sources.md'));
  return idRows(lines, 'S', firstTable(lines))
    .filter(({ row }) => bare(row[1]).toLowerCase() === 'document')
    .map(({ id, row }) => ({ id, location: locationOf(row[2] ?? '') }))
    .filter(({ location }) => location)
    .map((source) => ({ ...source, path: resolveLocation(source.location, root) }));
};

const changed = (dir, root) => {
  loadState(dir);
  const since = statOf(join(dir, 'STATE.json')).mtimeNs;
  const isNewer = (path) => {
    const stats = statOf(path);
    return Boolean(stats?.isFile() && stats.mtimeNs > since);
  };
  const files = walk(dir, SKIPPED).filter((file) => file !== 'STATE.json' && isNewer(join(dir, file)));
  const documents = documentSources(dir, root);
  const sources = [...new Set(documents.flatMap(({ id, location, path }) => {
    if (!statOf(path)?.isDirectory()) return isNewer(path) ? [`${id} · ${location}`] : [];
    return walk(path).filter((file) => isNewer(join(path, file))).map((file) => `${id} · ${location.replace(/\/+$/, '')}/${file}`);
  }))];
  // A source that is not there was moved or deleted — or --root is wrong; either way the operator must hear of it.
  const missing = documents.filter(({ path }) => !statOf(path)).map(({ id, location }) => `${id} · ${location}`);
  if (!files.length && !sources.length && !missing.length) return print('Nothing changed since STATE.json was last written.');
  const list = (items) => (items.length ? items.map((item) => `  ${item}`) : ['  none']);
  print([
    'Changed in the blueprint folder since STATE.json was last written:', ...list(files),
    'Changed document sources:', ...list(sources),
    ...(missing.length ? [`Document sources not found (a relative location is read from ${root}):`, ...list(missing)] : []),
  ].join('\n'));
};

// --- validate

const finding = (level) => (file, line, what) => ({ level, text: `${level}: ${line ? `${file}:${line}` : file} — ${what}` });
const error = finding('error');
const warning = finding('warning');

/** An id twice in a log table; a D- or Q- section with no index row. */
const checkLogs = (dir, logs) => {
  const issues = [];
  for (const [kind, rows] of Object.entries(logs)) {
    const first = new Map();
    for (const { id, line } of rows) {
      if (first.has(id)) issues.push(error(LOGS[kind].file, line, `${id} has a second row (the first is on line ${first.get(id)})`));
      else first.set(id, line);
    }
  }
  for (const kind of ['decision', 'question']) {
    const { prefix, file } = LOGS[kind];
    const defined = new Set(logs[kind].map(({ id }) => id));
    unfenced(read(dir, file)).forEach((line, i) => {
      const id = sectionId(line, prefix);
      if (id && !defined.has(id)) issues.push(warning(file, i + 1, `${id} has a section but no row in the index table`));
    });
  }
  return issues;
};

/** Every reference and marker in the text: ids no table defines, markers of closed questions, placeholders. */
const checkText = (corpus, logs) => {
  const issues = [];
  const defined = new Set(Object.values(logs).flat().map(({ id }) => id));
  const questions = new Map(logs.question.map(({ id, row }) => [id, status(row)]));
  for (const { file, plain, lines } of corpus) {
    const own = { 'DECISIONS.md': 'D', 'OPEN-QUESTIONS.md': 'Q' }[file];
    lines.forEach((line, i) => {
      const heading = own && sectionId(line, own);
      const reported = new Set();
      for (const match of line.matchAll(ID)) {
        const [id, prefix] = match;
        if (!isWide(match) || id === heading || defined.has(id) || reported.has(id)) continue;
        reported.add(id);
        issues.push(error(file, i + 1, `${id} has no row in ${home(prefix)}`));
      }
      for (const [marker, id] of line.matchAll(/\[\?(Q-\d+)\]/g)) {
        if (!/^closed/i.test(questions.get(id) ?? '')) continue;
        issues.push(error(file, i + 1, `${marker} marks a question that is ${questions.get(id)}; write the outcome in its place`));
      }
      const capability = /\S*-C\?\?/.exec(line)?.[0];
      if (capability) issues.push(error(file, i + 1, `capability placeholder ${capability} left; number it with next capability`));
      const assumption = /\[A-\?\?[^\]]*\]?/.exec(line)?.[0];
      if (assumption) issues.push(error(file, i + 1, `assumption placeholder ${assumption} left; give it an id with next assumption`));
      const loose = /(?<!\[)\b(RK|[SDAQGN])-\?\?/.exec(line);
      if (loose) {
        const kind = Object.keys(LOGS).find((name) => LOGS[name].prefix === loose[1]);
        issues.push(error(file, i + 1, `id placeholder ${loose[0]} left; give it an id with next ${kind}`));
      }
      if (line.includes('[?pending]')) issues.push(warning(file, i + 1, '[?pending] open point'));
    });
    const placeholders = plain.reduce((sum, line) => sum + line.split('{{').length - 1, 0);
    if (placeholders) {
      const first = plain.findIndex((line) => line.includes('{{')) + 1;
      issues.push(warning(file, first, `${plural(placeholders, 'template placeholder')} ({{…}}) left, the first on this line`));
    }
  }
  return issues;
};

/** A capability id used as a heading twice, across all module files. */
const checkHeadings = (dir) => {
  const first = new Map();
  return capabilityHeadings(dir).flatMap(({ id, file, line }) => {
    if (!first.has(id)) {
      first.set(id, `${file}:${line}`);
      return [];
    }
    return [error(file, line, `${id} is already a heading at ${first.get(id)}`)];
  });
};

// Files that record history may name a capability that is gone; so may a removed module's file in modules/removed/.
const HISTORY = new Set(['CHANGELOG.md', '04-review.md', 'DECISIONS.md', 'ASSUMPTIONS.md', 'OPEN-QUESTIONS.md', 'STATE.json']);

/** A capability id named in the documents — Depends on, Access, Coverage — that no module file has as a heading. */
const checkCapabilityRefs = (dir, corpus) => {
  const headings = new Set(capabilityHeadings(dir).map(({ id }) => id));
  const issues = [];
  for (const { file, lines } of corpus) {
    if (HISTORY.has(file) || /^modules\/.+\//.test(file) || file.startsWith('references/')) continue;
    lines.forEach((line, i) => {
      const reported = new Set();
      for (const [id] of line.matchAll(CAPABILITY)) {
        if (headings.has(id) || reported.has(id)) continue;
        reported.add(id);
        issues.push(error(file, i + 1, `${id} names a capability that no module file has as a heading`));
      }
    });
  }
  return issues;
};

/** Modules against their files, lastCapability against the ids in use, counts against a recount. */
const checkState = (dir, state, raw, logs, corpus) => {
  const issues = [];
  const modules = modulesOf(state);
  for (const entry of modules) {
    const file = moduleFile(entry);
    if (entry.removed || isOutOfScope(entry) || statOf(join(dir, file))?.isFile()) continue;
    issues.push(error('STATE.json', entryLine(raw, entry), `module ${entry.name ?? entry.code} has no file ${file}`));
  }
  const listed = new Set(modules.map(moduleFile));
  for (const file of moduleFiles(dir)) {
    if (!listed.has(file)) issues.push(error(file, null, 'no module in STATE.json points to this file'));
  }
  const used = capabilityNumbers(corpus);
  for (const entry of modules) {
    const highest = used.get(entry.code) ?? 0;
    const last = Number(entry.lastCapability) || 0;
    if (last >= highest) continue;
    issues.push(error('STATE.json', entryLine(raw, entry),
      `${entry.code} lastCapability is ${last}, but ${entry.code}-C${pad(highest, 2)} is in use; raise it to ${highest}`));
  }
  const counts = isObject(state.counts) ? state.counts : {};
  const stale = Object.entries(recount(dir, logs)).filter(([key, value]) => counts[key] !== value);
  if (stale.length) {
    const diff = stale.map(([key, value]) => `${key} ${counts[key] ?? 'missing'} → ${value}`).join(', ');
    issues.push(error('STATE.json', jsonLine(raw, 'counts'), `counts differ from the files (${diff}); run stamp`));
  }
  return issues;
};

// The Index of an extract, written as the template's bold label or — as a reader may — as a heading; it ends at
// the next label of the extract, a heading of level 3 or above, or a rule. It may hold several tables (modules,
// then roles), and an item without an id of its own is keyed by its title.
const INDEX_LABEL = /^\s*(?:\*\*Index\*\*|#{3,6}[ \t]+Index\b)/i;
const EXTRACT_LABEL = /^\s*(?:\*\*|#{3,6}[ \t]+)(?:Facts|Requirements|Constraints|Actors mentioned|Surfaces mentioned|Decided|Terms|Unclear or contradictory|Not covered|Notes for the skill)\b/i;
const INDEX_END = (line) => EXTRACT_LABEL.test(line) || /^ {0,3}#{1,3}[ \t]/.test(line) || /^ {0,3}(?:-{3,}|\*{3,})\s*$/.test(line);
const NO_ID = /^([-–—]|none|n\/a|no id)$/i;

/** Line indexes of the data rows of every table in lines[from, to), up to the first line `stop` accepts. */
const tablesUntil = (lines, from, to, stop) => {
  const rows = [];
  for (let i = from; i < to && !stop(lines[i]);) {
    if (!cells(lines[i])) {
      i += 1;
      continue;
    }
    rows.push(...firstTable(lines, i, to));
    while (i < to && cells(lines[i])) i += 1;
  }
  return rows;
};

/** The items of every source's Index and the rows of the Coverage table, keyed "S-01 ORG-06". */
const readCoverage = (lines) => {
  const items = [];
  const rows = [];
  for (const { title, start, end } of sections(lines)) {
    const source = /^(S-\d{2,})\b/.exec(title)?.[1];
    if (source) {
      const index = lines.slice(start, end).findIndex((line) => INDEX_LABEL.test(line));
      if (index < 0) continue;
      for (const i of tablesUntil(lines, start + index + 1, end, INDEX_END)) {
        const [first, second = ''] = cells(lines[i]).map((cell) => bare(cell));
        const item = NO_ID.test(first) ? second : first;
        if (item && !item.includes('{{')) items.push({ key: `${source} ${item}`, line: i + 1 });
      }
    } else if (/^coverage\b/i.test(title)) {
      for (const i of firstTable(lines, start, end)) {
        const [cellSource, item = '', by = ''] = cells(lines[i]).map((cell) => bare(cell));
        if (!/^S-\d{2,}$/.test(cellSource)) continue;
        const covered = !/^([-–—]*|none|nothing|not covered|n\/a)$/i.test(by);
        rows.push({ key: `${cellSource} ${item.replace(/^S-\d+\s*§\s*/, '')}`, covered, line: i + 1 });
      }
    }
  }
  return { items, rows };
};

/** Once coverage is being written (a row exists, or phase 6 is approved), every index item needs a filled row. */
const checkCoverage = (dir, state) => {
  const { items, rows } = readCoverage(unfenced(read(dir, '00-sources.md')));
  const indexed = new Set(items.map(({ key }) => key));
  const seen = new Map();
  const twice = items.filter(({ key }) => seen.set(key, (seen.get(key) ?? 0) + 1).get(key) === 2)
    .map(({ key, line }) => warning('00-sources.md', line,
      `the index lists ${key} ${seen.get(key)} times; key each item by its own id, or by its title when it has none`));
  const issues = [...twice, ...rows.filter(({ key }) => !indexed.has(key))
    .map(({ key, line }) => warning('00-sources.md', line, `Coverage names ${key}, which no index lists`))];
  // Coverage is phase 6's work: before it starts, a row written early (a restructure in phase 4) blocks nothing.
  if (!['in-progress', 'awaiting-approval', 'approved'].includes(state?.phases?.consistency)) return issues;
  const covered = new Set(rows.filter((row) => row.covered).map(({ key }) => key));
  return [...issues, ...items.filter(({ key }) => !covered.has(key))
    .map(({ key, line }) => error('00-sources.md', line, `${key} is not covered: no Coverage row says what deals with it`))];
};

const validate = (dir) => {
  const { state, raw, problem } = readState(dir);
  const logs = readLogs(dir);
  const corpus = readCorpus(dir);
  const issues = [
    ...(problem ? [error('STATE.json', null, problem)] : []),
    ...checkLogs(dir, logs),
    ...checkText(corpus, logs),
    ...checkHeadings(dir),
    ...checkCapabilityRefs(dir, corpus),
    ...(state ? checkState(dir, state, raw, logs, corpus) : []),
    ...checkCoverage(dir, state),
  ];
  const errors = issues.filter(({ level }) => level === 'error').map(({ text }) => text);
  const warnings = issues.filter(({ level }) => level === 'warning').map(({ text }) => text);
  print([...errors, ...warnings, `${plural(errors.length, 'error')}, ${plural(warnings.length, 'warning')}`].join('\n'));
  process.exitCode = errors.length ? 1 : 0;
};

// --- export

const ATX = /^( {0,3})(#{1,6})(?=[ \t]|$)/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const NOT_PARAGRAPH = /^( {4}|\t| {0,3}([>|#]|[*+-]([ \t]|$)|\d{1,9}[.)]([ \t]|$)))/;
const LINK = /(!?\[[^\]\n]*\]\()(<[^>\n]*>|[^)\s]+)/g;
const REFERENCE = /^( {0,3}\[[^\]\n]+\]:[ \t]*)(<[^>\n]*>|\S+)/;

/** HTML comments removed — a comment alone on its lines with its line break — and the blank lines left collapsed. */
const stripComments = (text) => text
  .replace(/^[ \t]*<!--(?:(?!-->)[\s\S])*-->[ \t]*(?:\n|$)/gm, '')
  .replace(/<!--(?:(?!-->)[\s\S])*-->/g, '')
  .replace(/\n{3,}/g, '\n\n');

/** Headings one level down, capped at six; a one-line setext heading becomes an ATX one. */
const shiftHeadings = (lines) => {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const atx = ATX.exec(line);
    const underline = SETEXT.exec(lines[i + 1] ?? '');
    if (atx) {
      out.push(`${atx[1]}${'#'.repeat(Math.min(atx[2].length + 1, 6))}${line.slice(atx[0].length)}`);
    } else if (underline && /\S/.test(line) && !SETEXT.test(line) && !NOT_PARAGRAPH.test(line) && !/\S/.test(lines[i - 1] ?? '')) {
      out.push(`${underline[1][0] === '=' ? '##' : '###'} ${line.trim()}`);
      i += 1;
    } else {
      out.push(line);
    }
  }
  return out;
};

/** A link target re-aimed from `fromDir` to `toDir` when it is a relative path; anything else as it was. */
const retarget = (target, fromDir, toDir) => {
  const wrapped = target.startsWith('<') && target.endsWith('>');
  const link = wrapped ? target.slice(1, -1) : target;
  if (!link || /^([a-z][a-z0-9+.-]*:|[#/~])/i.test(link)) return target;
  const cut = link.search(/[?#]/);
  const path = cut < 0 ? link : link.slice(0, cut);
  if (!path) return target;
  const moved = relative(toDir, resolve(fromDir, path)).split(sep).join('/') || '.';
  const aimed = `${moved}${path.endsWith('/') && moved !== '.' ? '/' : ''}${cut < 0 ? '' : link.slice(cut)}`;
  return wrapped ? `<${aimed}>` : aimed;
};

/** A line with its relative link targets re-aimed; inline code is left alone. */
// A text link to a local file — another file of the folder, a source — is dead once the document is sent, so it
// becomes its text; a web address and an in-page anchor stay links; an image keeps its re-aimed path.
const TEXT_LINK = /(?<!!)\[([^\]\n]*)\]\((<[^>\n]*>|[^)\s]+)(?:[ \t]+"[^"\n]*")?\)/g;
const isLocal = (target) => !/^([a-z][a-z0-9+.-]*:|#)/i.test(target.replace(/^<|>$/g, ''));

const relink = (line, fromDir, toDir) => line.split(/(`[^`\n]*`)/).map((part, i) => {
  if (i % 2) return part;
  const linked = part
    .replace(TEXT_LINK, (match, text, target) => (isLocal(target) ? text : match))
    .replace(LINK, (match, open, target) => `${open}${retarget(target, fromDir, toDir)}`);
  return i ? linked : linked.replace(REFERENCE, (match, open, target) => `${open}${retarget(target, fromDir, toDir)}`);
}).join('');

/** One file of the export: HTML comments gone, headings shifted, links re-aimed — fenced code untouched. */
const exportPart = (text, fromDir, toDir) => {
  const out = [];
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    out.push(...shiftHeadings(stripComments(chunk.join('\n')).split('\n')).map((line) => relink(line, fromDir, toDir)));
    chunk = [];
  };
  for (const { line, code } of fencedLines(text)) {
    if (!code) {
      chunk.push(line);
      continue;
    }
    flush();
    out.push(line);
  }
  flush();
  return out.join('\n').replace(/^\s*\n/, '').trimEnd();
};

const exportBlueprint = (dir, out, withSources) => {
  const { state } = loadState(dir);
  let target = out ? resolve(out) : join(dir, 'export', 'blueprint.md');
  if (statOf(target)?.isDirectory()) target = join(target, 'blueprint.md');
  const modules = modulesOf(state).filter((entry) => !entry.removed).map(moduleFile);
  const files = [...new Set([
    'README.md', ...(withSources ? ['00-sources.md'] : []), '01-brief.md', '02-architecture.md', '03-roadmap.md',
    ...modules, '04-review.md', 'DECISIONS.md', 'OPEN-QUESTIONS.md', 'ASSUMPTIONS.md', 'GLOSSARY.md',
    ...walk(join(dir, 'references', 'competitors')).filter((file) => !file.includes('/') && file.endsWith('.md'))
      .map((file) => `references/competitors/${file}`),
  ])].filter((file) => statOf(join(dir, file))?.isFile());
  const facts = [state.phase && `phase ${state.phase}`, state.depth && `depth ${state.depth}`, state.updated && `updated ${state.updated}`]
    .filter(Boolean).concat(plural(files.length, 'file'));
  const title = `# ${state.project || 'Untitled'} — Blueprint\n\nOne document made from the blueprint folder: ${facts.join(' · ')}.`;
  const parts = files.map((file) => exportPart(read(dir, file), dirname(join(dir, file)), dirname(target))).filter(Boolean);
  // The README is the blueprint's index; under the document's own title its title would only repeat it.
  if (files[0] === 'README.md') parts[0] = parts[0].replace(/^## .*/, '## Contents');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${[title, ...parts].join('\n\n---\n\n')}\n`);
  print(target);
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
  if (!dirArg) usage(`${command} needs the blueprint folder`);
  const { extra, options: allowed } = COMMANDS[command];
  const foreign = Object.keys(options).find((name) => !allowed.includes(name));
  if (foreign) usage(`${command} does not take --${foreign}`);
  if (rest.length > extra) usage(`too many arguments for ${command}: ${rest.join(' ')}`);
  if (options.count !== undefined && !/^[1-9]\d*$/.test(options.count)) usage('--count takes a whole number of at least 1');
  const dir = resolve(dirArg);

  if (command === 'stamp') stamp(dir);
  if (command === 'next') {
    if (!rest[0]) usage(`next needs a kind: ${Object.keys(LOGS).join(', ')} or capability <CODE>`);
    nextIds(dir, rest[0], rest[1], Number(options.count ?? 1));
  }
  if (command === 'changed') changed(dir, resolve(options.root ?? process.cwd()));
  if (command === 'validate') validate(dir);
  if (command === 'export') exportBlueprint(dir, options.out, Boolean(options['with-sources']));
};

try {
  main();
} catch (error) {
  fail(error.message);
}
