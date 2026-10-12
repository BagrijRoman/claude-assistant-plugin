#!/usr/bin/env node
// secret-files-guard — PreToolUse(Read|Edit|Write|MultiEdit|NotebookEdit|Grep) and PreToolUse(Bash).
// A secret file (.env, key material, credentials) is never read, edited, printed or copied by the agent.
// Example files (.env.example and friends) hold placeholders, not values, and pass.
// The Bash side blocks only programs whose job is to print or copy a file; anything else that merely names
// a secret file (`ls -la .env`, `rm .env`, `cp .env.example .env`) passes — a false block costs a whole turn.
// Fails open: a crashing guard must never lock a session.

import { basename } from 'node:path';
import { block, pass, readPayload } from './lib/hookIo.mjs';
import { isSecretFile } from './lib/secretPaths.mjs';
import { listCommands } from './lib/shell.mjs';

const HOOK = 'secret-files-guard';

const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Grep']);

/** Programs that print, search or transform the files they are given. */
const READERS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'tac', 'nl',
  'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack',
  'sed', 'awk', 'cut', 'sort', 'uniq', 'wc', 'tr', 'column', 'paste', 'join',
  'od', 'xxd', 'hexdump', 'strings', 'base64',
  'diff', 'cmp', 'comm', 'md5', 'md5sum', 'shasum', 'sha256sum',
]);

/** Programs that copy a file somewhere else; every argument but the last is a source. */
const COPIERS = new Set(['cp', 'mv', 'scp', 'rsync', 'install', 'ln']);

const ALTERNATIVE = 'read the example file (.env.example) for the variable names, or ask the human for the '
  + 'value; the agent never reads, edits or prints secret files.';

const checkFileTool = (toolName, input) => {
  const path = input?.file_path ?? input?.notebook_path ?? input?.path;
  if (isSecretFile(path)) {
    block(HOOK, `"${path}" is a secret file (environment file, key material or credentials), so ${toolName} may not open it.`,
      ALTERNATIVE);
  }
};

const checkBash = (command) => {
  for (const argv of listCommands(command)) {
    const program = basename(argv[0]);
    const args = argv.slice(1).filter((arg) => !arg.startsWith('-'));

    if (READERS.has(program)) {
      const file = args.find(isSecretFile);
      if (file) block(HOOK, `"${program} ${file}" would print the secret file "${file}".`, ALTERNATIVE);
    }

    if (COPIERS.has(program)) {
      const file = args.slice(0, -1).find(isSecretFile);
      if (file) block(HOOK, `"${program} ${file} …" would copy the secret file "${file}".`, ALTERNATIVE);
    }
  }
};

const main = async () => {
  const payload = await readPayload();
  const toolName = payload?.tool_name;
  const input = payload?.tool_input;

  if (FILE_TOOLS.has(toolName)) checkFileTool(toolName, input);
  else if (toolName === 'Bash' && typeof input?.command === 'string') checkBash(input.command);

  pass();
};

main().catch(() => pass());
