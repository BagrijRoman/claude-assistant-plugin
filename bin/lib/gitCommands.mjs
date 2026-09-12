// Finds the git commands a Bash call runs, and the repository each one runs in. Shared by every git guard.
// `cd` and `pushd` move the working directory for the commands after them; `git -C <path>` moves it for
// that command only. Values known only at run time (`cd "$DIR"`) stay opaque and resolve as written.

import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { listCommands } from './shell.mjs';

const GIT_GLOBAL_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);

export const expandHome = (path) => (path === '~' || path.startsWith('~/') ? homedir() + path.slice(1) : path);

/** Splits `git [global options] <subcommand> [args]`; every `-C` is resolved against the directory so far. */
export const parseGit = (args, cwd) => {
  let dir = cwd;
  for (let k = 0; k < args.length; k += 1) {
    const arg = args[k];
    if (arg === '-C') {
      k += 1;
      dir = resolve(dir, expandHome(args[k] ?? ''));
    } else if (GIT_GLOBAL_OPTIONS_WITH_VALUE.has(arg)) {
      k += 1;
    } else if (!arg.startsWith('-')) {
      return { dir, subcommand: arg, rest: args.slice(k + 1) };
    }
  }
  return { dir, subcommand: undefined, rest: [] };
};

/** Every git command in the script, in order, as `{ dir, subcommand, rest }`. */
export const gitCommands = (command, cwd) => {
  const found = [];
  let dir = cwd;
  for (const argv of listCommands(command)) {
    const program = basename(argv[0]);
    if (program === 'cd' || program === 'pushd') {
      if (argv[1] === undefined) dir = homedir();
      else if (argv[1] !== '-') dir = resolve(dir, expandHome(argv[1]));
    } else if (program === 'git') {
      found.push(parseGit(argv.slice(1), dir));
    }
  }
  return found;
};
