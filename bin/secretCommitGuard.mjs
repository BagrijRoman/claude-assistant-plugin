#!/usr/bin/env node
// secret-commit-guard — PreToolUse(Bash), only when the command is `git commit`.
// No token reaches a commit: the added lines of the diff the commit would record are scanned for the
// shapes of known secrets, and a staged secret file (.env, a key) is refused as well. The block names the
// file, the line and the kind of secret — never the value, which would put it into the model's context.
// Removing a secret always passes: only added lines are read.
// Fails open: a crashing guard must never lock a session.

import { commitDiff } from './lib/git.mjs';
import { gitCommands } from './lib/gitCommands.mjs';
import { block, pass, readPayload } from './lib/hookIo.mjs';
import { isExampleFile, isSecretFile } from './lib/secretPaths.mjs';
import { findSecret } from './lib/secretPatterns.mjs';

const HOOK = 'secret-commit-guard';

const COMMIT_OPTIONS_WITH_VALUE = new Set(['-m', '--message', '-F', '--file', '-C', '--reuse-message', '-c', '--reedit-message',
  '-t', '--template', '--author', '--date', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file']);

/** `-a`/`--all` widens the diff to every tracked file; pathspecs narrow it. */
const parseCommit = (args) => {
  let all = false;
  const paths = [];
  let afterDashes = false;
  for (let k = 0; k < args.length; k += 1) {
    const arg = args[k];
    if (afterDashes) paths.push(arg);
    else if (arg === '--') afterDashes = true;
    else if (arg === '--all') all = true;
    else if (/^-[a-zA-Z]+$/.test(arg)) {
      // combined short flags: `-am x` is `-a` plus `-m x`, so a trailing value-taking letter eats the next word
      if (arg.includes('a')) all = true;
      if (COMMIT_OPTIONS_WITH_VALUE.has(`-${arg.at(-1)}`)) k += 1;
    } else if (COMMIT_OPTIONS_WITH_VALUE.has(arg)) k += 1;
    else if (!arg.startsWith('-')) paths.push(arg);
  }
  return { all, paths };
};

/** Walks a unified diff with no context and yields every added line with its file and line number. */
const addedLines = function* (diff) {
  let file = null;
  let line = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.startsWith('+++ b/') ? raw.slice(6) : null; // `+++ /dev/null` is a deletion
    } else if (raw.startsWith('@@ ')) {
      line = Number(/\+(\d+)/.exec(raw)?.[1] ?? 0);
    } else if (raw.startsWith('+') && file !== null) {
      yield { file, line, text: raw.slice(1) };
      line += 1;
    }
  }
};

const check = ({ dir, subcommand, rest }) => {
  if (subcommand !== 'commit') return;
  const diff = commitDiff(dir, parseCommit(rest));
  if (!diff) return;

  const seen = new Set();
  for (const { file, line, text } of addedLines(diff)) {
    if (isSecretFile(file)) {
      if (seen.has(file)) continue;
      seen.add(file);
      block(HOOK, `the secret file "${file}" is part of this commit.`,
        `unstage it (git rm --cached "${file}") and add it to .gitignore; secrets stay out of the repository.`);
    }
    if (isExampleFile(file)) continue;
    const kind = findSecret(text);
    if (kind) {
      block(HOOK, `${kind} in "${file}" (line ${line}) would enter the commit.`,
        'move the value to an environment variable and read it from there. For a fake value in a test fixture, '
        + 'mark that line with "allow-secret: <reason>" in a comment.');
    }
  }
};

const main = async () => {
  const payload = await readPayload();
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') pass();
  for (const gitCommand of gitCommands(command, payload.cwd || process.cwd())) check(gitCommand);
  pass();
};

main().catch(() => pass());
