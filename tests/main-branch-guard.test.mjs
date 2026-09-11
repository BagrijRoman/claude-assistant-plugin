import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { GIT_ENV, makeRepo, makeTempDir, removeTempDirs, runBashHook } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/main-branch-guard.mjs', import.meta.url));
const BLOCKED = 2;
const ALLOWED = 0;

const run = (command, cwd) => runBashHook(HOOK, command, cwd);

const assertBlocked = (result) => {
  assert.equal(result.status, BLOCKED, `expected a block, got exit ${result.status}`);
  assert.match(result.stderr, /main-branch-guard/);
  assert.match(result.stderr, /Do this instead:/);
};

const assertAllowed = (result) => assert.equal(result.status, ALLOWED, `unexpected block: ${result.stderr}`);

describe('main-branch-guard', () => {
  after(removeTempDirs);

  describe('commits', () => {
    it('blocks a commit on main', () => {
      assertBlocked(run('git commit -m "feat: x"', makeRepo({ branch: 'main' })));
    });

    it('blocks a commit on master', () => {
      const repo = makeRepo({ branch: 'main' });
      spawnSync('git', ['branch', '-m', 'master'], { cwd: repo, env: GIT_ENV });
      assertBlocked(run('git commit -m x', repo));
    });

    it('allows a commit on any other branch', () => {
      assertAllowed(run('git commit -m "feat: x"', makeRepo({ branch: 'dev' })));
    });

    it('allows the root commit of a new repository on an unborn main', () => {
      assertAllowed(run('git commit -m "chore: init"', makeRepo({ branch: 'main', withCommit: false })));
    });

    it('follows `cd` and `git -C` to the repository the commit really runs in', () => {
      const repo = makeRepo({ branch: 'main' });
      const elsewhere = makeTempDir();
      assertBlocked(run(`cd ${repo} && git add . && git commit -m x`, elsewhere));
      assertBlocked(run(`git -C ${repo} commit -m x`, elsewhere));
    });

    it('blocks a commit hidden inside `bash -c`', () => {
      assertBlocked(run('bash -c "git commit -m x"', makeRepo({ branch: 'main' })));
    });
  });

  describe('pushes', () => {
    it('blocks pushing a branch into main', () => {
      const repo = makeRepo({ branch: 'dev' });
      assertBlocked(run('git push origin dev:main', repo));
      assertBlocked(run('git push origin +HEAD:refs/heads/main', repo));
      assertBlocked(run('git push origin main', repo));
    });

    it('blocks a bare push while on main', () => {
      const repo = makeRepo({ branch: 'main' });
      assertBlocked(run('git push', repo));
      assertBlocked(run('git push origin HEAD', repo));
    });

    it('blocks pushes that update every branch', () => {
      assertBlocked(run('git push --all origin', makeRepo({ branch: 'dev' })));
    });

    it('allows pushing another branch and pushing tags', () => {
      const repo = makeRepo({ branch: 'dev' });
      assertAllowed(run('git push -u origin dev', repo));
      assertAllowed(run('git push', repo));
      assertAllowed(run('git push origin --tags', makeRepo({ branch: 'main' })));
    });
  });

  describe('text that only mentions git', () => {
    it('allows a heredoc commit message that talks about pushing to main', () => {
      const command = "git commit -F - <<'EOF'\ndocs: never git push origin main\nEOF";
      assertAllowed(run(command, makeRepo({ branch: 'dev' })));
    });

    it('allows quoted text on main', () => {
      const repo = makeRepo({ branch: 'main' });
      assertAllowed(run('echo "git commit -m x" && grep -r "git push origin main" .', repo));
      assertAllowed(run('git status && git log --oneline', repo));
    });
  });

  describe('failing open', () => {
    it('stays silent outside a git repository', () => {
      assertAllowed(run('git commit -m x', makeTempDir()));
    });

    it('stays silent on a payload without a command', () => {
      const result = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
      assert.equal(result.status, ALLOWED);
    });
  });
});
