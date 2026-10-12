import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EXAMPLE_FILE_GLOBS, SECRET_FILE_GLOBS, isSecretFile } from '../bin/lib/secretPaths.mjs';

describe('isSecretFile', () => {
  it('matches by file name wherever the file lives, and however the path is spelled', () => {
    assert.ok(isSecretFile('.env'));
    assert.ok(isSecretFile('./.env'));
    assert.ok(isSecretFile('apps/api/.env'));
    assert.ok(isSecretFile('/abs/path/.env.local'));
    assert.ok(isSecretFile('~/.ssh/id_rsa'));
    assert.ok(isSecretFile('$HOME/.aws/credentials'));
    assert.ok(isSecretFile('certs\\server.pem'));
  });

  it('keeps `*` inside one path segment', () => {
    assert.ok(isSecretFile('my-credentials.json'));
    assert.ok(!isSecretFile('credentials/readme.json'));
    assert.ok(!isSecretFile('src/keys.ts'));
  });

  it('treats example files as documentation', () => {
    assert.ok(!isSecretFile('.env.example'));
    assert.ok(!isSecretFile('.env.local.example'));
    assert.ok(!isSecretFile('.env.sample'));
    assert.ok(!isSecretFile('~/.ssh/id_rsa.pub'));
  });

  it('rejects non-strings and empty values', () => {
    assert.ok(!isSecretFile(''));
    assert.ok(!isSecretFile(undefined));
    assert.ok(!isSecretFile(42));
  });

  it('exports gitignore-style globs usable in a permission deny list', () => {
    for (const glob of [...SECRET_FILE_GLOBS, ...EXAMPLE_FILE_GLOBS]) {
      assert.match(glob, /^\*\*\//, `${glob} should start with **/ so it applies at any depth`);
      assert.doesNotMatch(glob, /\s/);
    }
  });
});
