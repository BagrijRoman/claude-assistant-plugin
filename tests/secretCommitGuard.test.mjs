import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { commit, makeRepo, makeTempDir, removeTempDirs, runBashHook, writeFiles } from './helpers.mjs';

const HOOK = fileURLToPath(new URL('../bin/secretCommitGuard.mjs', import.meta.url));
const BLOCKED = 2;
const ALLOWED = 0;

// Fabricated values; none of them works anywhere.
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const GITHUB_TOKEN = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
const PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow…\n-----END RSA PRIVATE KEY-----\n';

const run = (command, cwd) => runBashHook(HOOK, command, cwd);

const assertBlocked = (result, kind) => {
  assert.equal(result.status, BLOCKED, `expected a block, got exit ${result.status}`);
  assert.match(result.stderr, /secret-commit-guard/);
  assert.match(result.stderr, /Do this instead:/);
  if (kind) assert.match(result.stderr, kind);
};

const assertAllowed = (result) => assert.equal(result.status, ALLOWED, `unexpected block: ${result.stderr}`);

/** A repository with `files` staged on top of one commit. */
const repoWithStaged = (files, options) => {
  const repo = makeRepo({ branch: 'dev' });
  writeFiles(repo, files, options);
  return repo;
};

describe('secret-commit-guard', () => {
  after(removeTempDirs);

  describe('secrets in staged content', () => {
    it('blocks a token in source code and names the file, the line and the kind, not the value', () => {
      const repo = repoWithStaged({ 'src/config.ts': `export const config = {\n  port: 3000,\n  githubToken: '${GITHUB_TOKEN}',\n};\n` });
      const result = run('git commit -m "feat: config"', repo);
      assertBlocked(result, /a GitHub token in "src\/config\.ts" \(line 3\)/);
      assert.ok(!result.stderr.includes(GITHUB_TOKEN), 'the block message must not repeat the secret');
    });

    it('blocks a JWT in a test fixture without the marker', () => {
      assertBlocked(run('git commit -m x', repoWithStaged({ 'test/auth.spec.ts': `const token = '${JWT}';\n` })), /a JWT/);
    });

    it('blocks a private key pasted into any file', () => {
      assertBlocked(run('git commit -m x', repoWithStaged({ 'docs/setup.md': `Paste this:\n${PRIVATE_KEY}` })), /private key/);
    });

    it('blocks a connection string with a real password', () => {
      const repo = repoWithStaged({ 'docker-compose.yml': '  MONGODB_URI: mongodb://app:S3cretPassw0rd@mongo:27017/app\n' });
      assertBlocked(run('git commit -m x', repo), /connection string/);
    });

    it('blocks a secret assigned in clear text', () => {
      assertBlocked(run('git commit -m x', repoWithStaged({ 'src/auth.ts': "const JWT_SECRET = '9f8e7d6c5b4a39281706f5e4d3c2b1a0';\n" })));
    });
  });

  describe('secret files in the commit', () => {
    it('blocks a staged .env and says how to unstage it', () => {
      const result = run('git commit -m x', repoWithStaged({ '.env': 'JWT_SECRET=anything\n' }));
      assertBlocked(result, /the secret file "\.env" is part of this commit/);
      assert.match(result.stderr, /git rm --cached/);
    });

    it('blocks a staged key file even when its content looks harmless', () => {
      assertBlocked(run('git commit -m x', repoWithStaged({ 'certs/server.pem': 'not really a key\n' })));
    });
  });

  describe('what passes', () => {
    it('allows a clean diff', () => {
      assertAllowed(run('git commit -m "feat: users"', repoWithStaged({ 'src/users.ts': 'export const users = [];\n' })));
    });

    it('allows removing a secret', () => {
      const repo = repoWithStaged({ 'src/config.ts': `const token = '${GITHUB_TOKEN}';\n` });
      commit(repo, 'oops');
      writeFiles(repo, { 'src/config.ts': 'const token = process.env.GITHUB_TOKEN;\n' });
      assertAllowed(run('git commit -m "fix: read the token from the environment"', repo));
    });

    it('allows placeholders and references', () => {
      const repo = repoWithStaged({
        'README.md': 'Set `DATABASE_URL=postgres://user:password@localhost:5432/app` and `JWT_SECRET=<your-secret>`.\n',
        'src/config.ts': "export const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret-1';\n",
      });
      assertAllowed(run('git commit -m x', repo));
    });

    it('allows a fixture line marked allow-secret, with its reason in the diff', () => {
      const repo = repoWithStaged({ 'test/jwt.spec.ts': `const token = '${JWT}'; // allow-secret: expired sample for the parser test\n` });
      assertAllowed(run('git commit -m x', repo));
    });

    it('allows anything inside an example env file', () => {
      assertAllowed(run('git commit -m x', repoWithStaged({ '.env.example': `GITHUB_TOKEN=${GITHUB_TOKEN}\n` })));
    });

    it('allows a secret that is only in the working tree, not staged', () => {
      const repo = repoWithStaged({ 'src/ok.ts': 'export const ok = true;\n' });
      writeFiles(repo, { 'src/leak.ts': `const token = '${GITHUB_TOKEN}';\n` }, { stage: false });
      assertAllowed(run('git commit -m x', repo));
    });
  });

  describe('commit shapes', () => {
    it('sees unstaged changes to tracked files when the commit uses -a', () => {
      const repo = repoWithStaged({ 'src/config.ts': 'export const token = process.env.TOKEN;\n' });
      commit(repo, 'base');
      writeFiles(repo, { 'src/config.ts': `export const token = '${GITHUB_TOKEN}';\n` }, { stage: false });
      assertAllowed(run('git commit -m x', repo));
      assertBlocked(run('git commit -am x', repo));
      assertBlocked(run('git commit --all -m x', repo));
    });

    it('follows `cd` and `git -C` to the repository the commit runs in', () => {
      const repo = repoWithStaged({ 'src/config.ts': `const token = '${GITHUB_TOKEN}';\n` });
      const elsewhere = makeTempDir();
      assertBlocked(run(`cd ${repo} && git commit -m x`, elsewhere));
      assertBlocked(run(`git -C ${repo} commit -m x`, elsewhere));
    });

    it('reads a heredoc commit message as a message, not as a command', () => {
      const repo = repoWithStaged({ 'src/ok.ts': 'export const ok = true;\n' });
      assertAllowed(run(`git commit -F - <<'EOF'\ndocs: rotate the token ${GITHUB_TOKEN}\nEOF`, repo));
    });

    it('ignores git commands other than commit', () => {
      const repo = repoWithStaged({ 'src/config.ts': `const token = '${GITHUB_TOKEN}';\n` });
      assertAllowed(run('git status && git diff --cached', repo));
      assertAllowed(run('git add -A', repo));
    });
  });

  describe('failing open', () => {
    it('stays silent outside a git repository', () => {
      assertAllowed(run('git commit -m x', makeTempDir()));
    });

    it('stays silent on a broken payload', () => {
      const result = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
      assert.equal(result.status, ALLOWED);
    });
  });
});
