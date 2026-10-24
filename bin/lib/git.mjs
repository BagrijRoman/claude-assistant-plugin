import { spawnSync } from 'node:child_process';

const GIT_TIMEOUT_MS = 4000;

/** Runs git in `dir`; null on any failure (not a repository, missing directory, timeout). */
const git = (args, dir) => {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8', timeout: GIT_TIMEOUT_MS });
  return result.status === 0 ? result.stdout.trim() : null;
};

/** The checked-out branch, even before its first commit; null when detached or outside a repository. */
export const currentBranch = (dir) => git(['symbolic-ref', '--quiet', '--short', 'HEAD'], dir);

export const hasCommits = (dir) => git(['rev-parse', '--verify', '--quiet', 'HEAD'], dir) !== null;

/**
 * The diff a commit would record, with no context lines. Staged changes by default; with `all`, also the
 * unstaged changes to tracked files (`git commit -a`). Null outside a repository.
 */
export const commitDiff = (dir, { all = false, paths = [] } = {}) => {
  const base = all && hasCommits(dir) ? ['diff', 'HEAD'] : ['diff', '--cached'];
  return git([...base, '--unified=0', '--no-color', '--no-ext-diff', '--', ...paths], dir);
};

/** The files a commit would record, as paths from the repository's top, and that top; null outside a repository. */
export const commitFiles = (dir, { all = false, paths = [] } = {}) => {
  const top = git(['rev-parse', '--show-toplevel'], dir);
  if (top === null) return null;
  const base = all && hasCommits(dir) ? ['diff', 'HEAD'] : ['diff', '--cached'];
  const names = git([...base, '--name-only', '--no-ext-diff', '--', ...paths], dir);
  return names === null ? null : { top, files: names.split('\n').filter(Boolean) };
};

const REMOTE_TIMEOUT_MS = 8000;

/**
 * Whether `branch` exists on `remote`: true, false, or null when the remote could not be asked
 * (no network, no access, no such remote). A network call, so only for commands that will hit the network anyway.
 */
export const remoteHasBranch = (dir, remote, branch) => {
  const result = spawnSync('git', ['ls-remote', '--heads', '--exit-code', remote, branch],
    { cwd: dir, encoding: 'utf8', timeout: REMOTE_TIMEOUT_MS, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (result.status === 0) return true;
  if (result.status === 2) return false;
  return null;
};
