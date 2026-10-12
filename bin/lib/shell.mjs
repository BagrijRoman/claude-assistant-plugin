// A small POSIX-shell reader for hooks: it lists the simple commands a Bash tool call will run, so a guard
// matches real commands instead of raw text. Quoted strings, heredoc bodies and comments never become
// commands — a commit message that mentions `git push origin main` must not trip a guard.
// It approximates a shell, it does not emulate one: whatever it cannot resolve statically (a variable,
// the output of `$( … )`) stays an opaque word.

import { basename } from 'node:path';

const OPERATORS = ['&&', '||', '|&', ';;', ';', '|', '&'];
const SUBSTITUTION = '$(…)';
const WORD_BREAK = /[\s;&|<>()]/;

/** Splits a script into argv arrays. Commands inside `$( … )` and backticks are listed too: they run. */
const splitCommands = (source) => {
  const commands = [];
  let i = 0;

  const readSingleQuoted = () => {
    const end = source.indexOf("'", i);
    const stop = end === -1 ? source.length : end;
    const text = source.slice(i, stop);
    i = stop + 1;
    return text;
  };

  const readBackticks = () => {
    let inner = '';
    while (i < source.length && source[i] !== '`') {
      if (source[i] === '\\' && i + 1 < source.length) {
        inner += source[i + 1];
        i += 2;
        continue;
      }
      inner += source[i];
      i += 1;
    }
    i += 1;
    commands.push(...splitCommands(inner));
  };

  const readArithmetic = () => {
    const end = source.indexOf('))', i);
    const stop = end === -1 ? source.length : end + 2;
    const text = source.slice(i, stop);
    i = stop;
    return text;
  };

  const readDoubleQuoted = () => {
    let text = '';
    while (i < source.length && source[i] !== '"') {
      const char = source[i];
      if (char === '\\' && i + 1 < source.length) {
        const next = source[i + 1];
        if ('"\\$`\n'.includes(next)) {
          if (next !== '\n') text += next;
          i += 2;
        } else {
          text += char;
          i += 1;
        }
        continue;
      }
      if (source.startsWith('$((', i)) {
        text += readArithmetic();
        continue;
      }
      if (source.startsWith('$(', i)) {
        i += 2;
        readScript(true);
        text += SUBSTITUTION;
        continue;
      }
      if (char === '`') {
        i += 1;
        readBackticks();
        text += SUBSTITUTION;
        continue;
      }
      text += char;
      i += 1;
    }
    i += 1;
    return text;
  };

  /** The heredoc delimiter word, with any quoting removed (`'EOF'`, `"EOF"` and `EOF` are the same). */
  const readDelimiter = () => {
    while (source[i] === ' ' || source[i] === '\t') i += 1;
    let delimiter = '';
    while (i < source.length && !WORD_BREAK.test(source[i])) {
      if (source[i] === "'") {
        i += 1;
        delimiter += readSingleQuoted();
      } else if (source[i] === '"') {
        i += 1;
        delimiter += readDoubleQuoted();
      } else {
        delimiter += source[i];
        i += 1;
      }
    }
    return delimiter;
  };

  // Reads until the end of input or, inside `$( … )`, until its closing parenthesis.
  const readScript = (insideSubstitution) => {
    let argv = [];
    let word = '';
    let inWord = false;
    let dropNextWord = false;
    let depth = 0;
    const heredocs = [];

    const endWord = () => {
      if (inWord) {
        if (!dropNextWord) argv.push(word);
        dropNextWord = false;
      }
      word = '';
      inWord = false;
    };

    const endCommand = () => {
      endWord();
      if (argv.length) commands.push(argv);
      argv = [];
    };

    // A heredoc body starts on the line after its `<<`: skip it whole, it is data, not commands.
    const skipHeredocBodies = () => {
      for (const { delimiter, stripTabs } of heredocs.splice(0)) {
        while (i < source.length) {
          const end = source.indexOf('\n', i);
          const line = source.slice(i, end === -1 ? source.length : end);
          i = end === -1 ? source.length : end + 1;
          if ((stripTabs ? line.replace(/^\t+/, '') : line).trim() === delimiter) break;
        }
      }
    };

    while (i < source.length) {
      const char = source[i];

      if (char === '\\') {
        if (source[i + 1] !== '\n') {
          word += source[i + 1] ?? '';
          inWord = true;
        }
        i += 2;
        continue;
      }
      if (char === "'") {
        i += 1;
        word += readSingleQuoted();
        inWord = true;
        continue;
      }
      if (source.startsWith("$'", i)) {
        i += 2;
        word += readSingleQuoted();
        inWord = true;
        continue;
      }
      if (char === '"') {
        i += 1;
        word += readDoubleQuoted();
        inWord = true;
        continue;
      }
      if (source.startsWith('$((', i)) {
        word += readArithmetic();
        inWord = true;
        continue;
      }
      if (source.startsWith('$(', i)) {
        i += 2;
        readScript(true);
        word += SUBSTITUTION;
        inWord = true;
        continue;
      }
      if (char === '`') {
        i += 1;
        readBackticks();
        word += SUBSTITUTION;
        inWord = true;
        continue;
      }
      if (char === '#' && !inWord) {
        while (i < source.length && source[i] !== '\n') i += 1;
        continue;
      }
      if (char === '\n') {
        endCommand();
        i += 1;
        skipHeredocBodies();
        continue;
      }
      if (source.startsWith('<<<', i)) {
        endWord();
        i += 3;
        dropNextWord = true;
        continue;
      }
      if (source.startsWith('<<', i)) {
        endWord();
        i += 2;
        const stripTabs = source[i] === '-';
        if (stripTabs) i += 1;
        heredocs.push({ delimiter: readDelimiter(), stripTabs });
        continue;
      }
      if (source.startsWith('&>', i) || char === '>' || char === '<') {
        // A file-descriptor number glued to the operator (`2>&1`) belongs to the redirection, not argv.
        if (inWord && /^\d+$/.test(word)) {
          word = '';
          inWord = false;
        } else {
          endWord();
        }
        if (char === '&') i += 1;
        while (source[i] === '>' || source[i] === '<') i += 1;
        if (source[i] === '|') i += 1;
        if (source[i] === '&' && /[\d-]/.test(source[i + 1] ?? '')) {
          i += 1;
          while (/[\d-]/.test(source[i] ?? '')) i += 1;
        } else {
          dropNextWord = true;
        }
        continue;
      }
      if (char === '(') {
        endCommand();
        depth += 1;
        i += 1;
        continue;
      }
      if (char === ')') {
        endCommand();
        i += 1;
        if (insideSubstitution && depth === 0) return;
        depth = Math.max(0, depth - 1);
        continue;
      }
      const operator = OPERATORS.find((op) => source.startsWith(op, i));
      if (operator) {
        endCommand();
        i += operator.length;
        continue;
      }
      if (char === ' ' || char === '\t' || char === '\r') {
        endWord();
        i += 1;
        continue;
      }
      word += char;
      inWord = true;
      i += 1;
    }
    endCommand();
  };

  readScript(false);
  return commands;
};

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const RESERVED_WORDS = new Set(['!', '{', '}', 'if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until', 'time']);
const WRAPPERS = new Set(['command', 'builtin', 'exec', 'nohup', 'sudo', 'env']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);
const SHELL_SCRIPT_FLAG = /^-[a-z]*c[a-z]*$/;

/** Drops what runs *before* the program: `VAR=1`, `if`, `env -i`, `sudo` — so argv[0] is the real program. */
const stripPrefixes = (argv) => {
  let start = 0;
  let afterWrapper = false;
  while (start < argv.length) {
    const word = argv[start];
    if (ASSIGNMENT.test(word) || RESERVED_WORDS.has(word) || WRAPPERS.has(word) || (afterWrapper && word.startsWith('-'))) {
      afterWrapper = afterWrapper || WRAPPERS.has(word);
      start += 1;
      continue;
    }
    break;
  }
  return argv.slice(start);
};

/**
 * Every simple command the script runs, in order, as argv with its prefixes stripped. `bash -c "<script>"`
 * is opened up recursively, otherwise wrapping a command in a shell would walk past every guard.
 */
export const listCommands = (source) => {
  const result = [];
  for (const raw of splitCommands(String(source ?? ''))) {
    const argv = stripPrefixes(raw);
    if (!argv.length) continue;
    result.push(argv);
    if (SHELLS.has(basename(argv[0]))) {
      const flag = argv.findIndex((word, index) => index > 0 && SHELL_SCRIPT_FLAG.test(word));
      if (flag !== -1 && argv[flag + 1] !== undefined) result.push(...listCommands(argv[flag + 1]));
    }
  }
  return result;
};
