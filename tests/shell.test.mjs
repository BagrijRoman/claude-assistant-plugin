import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listCommands } from '../bin/lib/shell.mjs';

const isGit = (subcommand) => (argv) => argv[0] === 'git' && argv[1] === subcommand;

describe('listCommands', () => {
  it('splits on control operators and keeps quoted operators inside the word', () => {
    assert.deepEqual(listCommands('cd a && git commit -m "x; y | z" | cat; ls || true & wait'), [
      ['cd', 'a'],
      ['git', 'commit', '-m', 'x; y | z'],
      ['cat'],
      ['ls'],
      ['true'],
      ['wait'],
    ]);
  });

  it('keeps single-quoted text literal', () => {
    assert.deepEqual(listCommands("echo 'git push origin main && rm -rf /'"), [
      ['echo', 'git push origin main && rm -rf /'],
    ]);
  });

  it('never lists the body of a heredoc as commands', () => {
    const script = "git commit -F - <<'EOF'\nfeat: x\n\ngit push origin main\nEOF\ngit status";
    assert.deepEqual(listCommands(script), [
      ['git', 'commit', '-F', '-'],
      ['git', 'status'],
    ]);
  });

  it('reads a heredoc inside $( … ) inside double quotes, quotes in the body included', () => {
    const script = [
      'git commit -m "$(cat <<\'EOF\'',
      'fix: handle "quoted" words',
      'git push origin main',
      'EOF',
      ')"',
    ].join('\n');
    const commands = listCommands(script);
    assert.deepEqual(commands, [['cat'], ['git', 'commit', '-m', '$(…)']]);
    assert.equal(commands.some(isGit('push')), false);
  });

  it('strips tab indentation before the delimiter of <<-', () => {
    assert.deepEqual(listCommands('cat <<-END\n\tgit push\n\tEND\nls'), [['cat'], ['ls']]);
  });

  it('lists commands inside substitutions and backticks, since they run', () => {
    assert.deepEqual(listCommands('echo $(git push) `git commit`'), [
      ['git', 'push'],
      ['git', 'commit'],
      ['echo', '$(…)', '$(…)'],
    ]);
  });

  it('drops comments, redirections and their targets', () => {
    assert.deepEqual(listCommands('git push origin dev > out.log 2>&1 # git push origin main'), [
      ['git', 'push', 'origin', 'dev'],
    ]);
    assert.deepEqual(listCommands('git status &> /dev/null'), [['git', 'status']]);
  });

  it('joins a line continuation', () => {
    assert.deepEqual(listCommands('git \\\n  commit -m x'), [['git', 'commit', '-m', 'x']]);
  });

  it('strips assignments, reserved words and wrappers in front of the program', () => {
    assert.deepEqual(listCommands('GIT_TRACE=1 env -i git commit'), [['git', 'commit']]);
    assert.deepEqual(listCommands('if git commit; then echo ok; fi'), [['git', 'commit'], ['echo', 'ok']]);
  });

  it('opens up the script of `bash -c` and `sh -lc`', () => {
    assert.deepEqual(listCommands('bash -c "cd x && git commit"'), [
      ['bash', '-c', 'cd x && git commit'],
      ['cd', 'x'],
      ['git', 'commit'],
    ]);
    assert.equal(listCommands("sh -lc 'git push origin main'").some(isGit('push')), true);
  });

  it('survives input that is not valid shell', () => {
    assert.deepEqual(listCommands('echo "unterminated'), [['echo', 'unterminated']]);
    assert.deepEqual(listCommands(''), []);
    assert.deepEqual(listCommands(undefined), []);
  });
});
