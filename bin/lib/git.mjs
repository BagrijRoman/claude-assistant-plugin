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
