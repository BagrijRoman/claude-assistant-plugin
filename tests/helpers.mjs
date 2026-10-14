// Shared fixtures for hook tests: throwaway git repositories and a runner that feeds a hook the same
// JSON payload Claude Code sends. Git runs isolated from the machine's config, so a developer's global
// hooks, signing or default branch can never change a test's outcome.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const git = (args, cwd) => {
  const result = spawnSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
};

const tempDirs = [];

export const makeTempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'dev-assistant-'));
  tempDirs.push(dir);
  return dir;
};

export const removeTempDirs = () => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
};

/** A repository on `branch`; `withCommit: false` leaves main unborn, as right after `git init`. */
export const makeRepo = ({ branch = 'main', withCommit = true } = {}) => {
  const dir = makeTempDir();
  git(['init', '--quiet', '--initial-branch=main'], dir);
  if (withCommit) git(['commit', '--quiet', '--allow-empty', '--message=init'], dir);
  if (branch !== 'main') git(['switch', '--quiet', '--create', branch], dir);
  return dir;
};

/** Writes `files` ({ path: content }) into the repository and stages them (or only writes, with `stage: false`). */
export const writeFiles = (dir, files, { stage = true } = {}) => {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  if (stage) git(['add', '--', ...Object.keys(files)], dir);
};

/** Commits whatever is staged, quietly. */
export const commit = (dir, message = 'wip') => git(['commit', '--quiet', '--message', message], dir);

/** A bare repository on disk, wired as `origin` of `repo`; with `branches`, those local branches are pushed to it first. */
export const addBareRemote = (repo, { branches = [] } = {}) => {
  const remote = makeTempDir();
  git(['init', '--quiet', '--bare', '--initial-branch=main'], remote);
  git(['remote', 'add', 'origin', remote], repo);
  for (const branch of branches) git(['push', '--quiet', 'origin', branch], repo);
  return remote;
};

/** Runs a hook with the JSON payload Claude Code would send and returns its exit code, stdout and stderr. */
export const runHook = (script, payload) => {
  const result = spawnSync('node', [script], { input: JSON.stringify(payload), env: GIT_ENV, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/** Runs a Bash-matcher hook the way Claude Code does. */
export const runBashHook = (script, command, cwd) =>
  runHook(script, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd });

/** Runs a hook for a file tool (`Read`, `Edit`, `Write`, …) on `file_path`. */
export const runFileHook = (script, toolName, file_path, cwd) =>
  runHook(script, { hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: { file_path }, cwd });
