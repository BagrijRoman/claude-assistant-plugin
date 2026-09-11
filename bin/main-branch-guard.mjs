#!/usr/bin/env node
// main-branch-guard — PreToolUse(Bash). main changes only through a pull request, so the agent may neither
// commit on it nor push to it. The one exception is a repository's very first commit: an unborn main has
// nothing to protect yet, and every new repository needs its root commit somewhere.
// Fails open: a crashing guard must never lock a session, which is why every rule has a test case.

import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { currentBranch, hasCommits } from './lib/git.mjs';
import { block, pass, readPayload } from './lib/hook-io.mjs';
import { listCommands } from './lib/shell.mjs';

const HOOK = 'main-branch-guard';
const PROTECTED_BRANCHES = new Set(['main', 'master']);
const GIT_GLOBAL_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);
const PUSH_OPTIONS_WITH_VALUE = new Set(['--repo', '-o', '--push-option', '--receive-pack', '--exec']);
const PUSH_EVERY_BRANCH = new Set(['--all', '--branches', '--mirror']);

const expandHome = (path) => (path === '~' || path.startsWith('~/') ? homedir() + path.slice(1) : path);

/** Splits `git [global options] <subcommand> [args]`; every `-C` is resolved against the directory so far. */
const parseGit = (args, cwd) => {
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

/** The remote branch a refspec updates: `dev:main` → main, `+main` → main, `HEAD` → the current branch. */
const refspecTarget = (refspec, dir) => {
  const spec = refspec.replace(/^\+/, '');
  const colon = spec.indexOf(':');
  const target = colon === -1 ? spec : spec.slice(colon + 1);
  return (target === 'HEAD' ? currentBranch(dir) : target)?.replace(/^refs\/heads\//, '');
};

/** What a `git push` would update, as far as its command line tells. */
const pushTargets = (args, dir) => {
  const positional = [];
  let everyBranch = false;
  let tags = false;
  for (let k = 0; k < args.length; k += 1) {
    const arg = args[k];
    if (PUSH_OPTIONS_WITH_VALUE.has(arg)) k += 1;
    else if (PUSH_EVERY_BRANCH.has(arg)) everyBranch = true;
    else if (arg === '--tags') tags = true;
    else if (!arg.startsWith('-')) positional.push(arg);
  }
  const refspecs = positional.slice(1);
  if (refspecs.length) return { everyBranch, branches: refspecs.map((refspec) => refspecTarget(refspec, dir)) };
  // No refspec: `--tags` pushes tags only; otherwise git pushes the current branch.
  return { everyBranch, branches: tags ? [] : [currentBranch(dir)] };
};

const checkGit = (argv, cwd) => {
  const { dir, subcommand, rest } = parseGit(argv.slice(1), cwd);

  if (subcommand === 'commit') {
    const branch = currentBranch(dir);
    if (PROTECTED_BRANCHES.has(branch) && hasCommits(dir)) {
      block(HOOK, `a direct commit to "${branch}". It changes only through a pull request.`,
        'create a branch and commit there: git switch -c <type>/<short-name> (or switch to dev).');
    }
  }

  if (subcommand === 'push') {
    const { everyBranch, branches } = pushTargets(rest, dir);
    if (everyBranch) {
      block(HOOK, 'push --all/--branches/--mirror would update main as well.',
        'push only your branch: git push -u origin <branch>.');
    }
    const target = branches.find((branch) => PROTECTED_BRANCHES.has(branch));
    if (target) {
      block(HOOK, `a direct push to "${target}". It changes only through a pull request.`,
        'push your own branch (git push -u origin <branch>) and open a pull request.');
    }
  }
};

const main = async () => {
  const payload = await readPayload();
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') pass();

  // `cd` inside the command moves where the following git commands run, so it is tracked.
  let dir = payload.cwd || process.cwd();
  for (const argv of listCommands(command)) {
    const program = basename(argv[0]);
    if (program === 'cd' || program === 'pushd') {
      if (argv[1] === undefined) dir = homedir();
      else if (argv[1] !== '-') dir = resolve(dir, expandHome(argv[1]));
    } else if (program === 'git') {
      checkGit(argv, dir);
    }
  }
  pass();
};

main().catch(() => pass());
