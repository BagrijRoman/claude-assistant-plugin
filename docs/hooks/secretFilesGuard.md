# secret-files-guard

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `PreToolUse` | `Read\|Edit\|Write\|MultiEdit\|NotebookEdit\|Grep` and `Bash` | [bin/secretFilesGuard.mjs](../../bin/secretFilesGuard.mjs) | 0.3.0 |

## Why

A secret file is never read, edited, printed or copied by the agent. Whatever the model reads ends up in
the conversation, and whatever is in the conversation can end up in a commit message, a doc, a log or a PR.
The agent needs the *names* of the variables, and those live in the example file; the *values* are the
human's business.

The list of what counts as a secret file lives in one place, [bin/lib/secretPaths.mjs](../../bin/lib/secretPaths.mjs),
so this hook and the permission `deny` list that `/setup-permissions` writes into a project never disagree.

## What counts as a secret file

| Group | Files |
|-------|-------|
| environment files | `.env`, `.env.*` (`.env.local`, `.env.production`, …) |
| key material and signing files | `*.pem`, `*.key`, `*.p8`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `*.mobileprovision`, `*.ppk` |
| ssh private keys | `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`, and any other file inside a `.ssh/` directory |
| credential files | `*credentials*.json`, `*service-account*.json`, `.aws/credentials`, `.netrc`, `.pgpass` |

Matching is by name, at any depth, however the path is spelled: `.env`, `./apps/api/.env`, `~/.ssh/id_rsa`
and `$HOME/.env` all match. The path is not resolved against the disk.

**Example files pass**: `.env.example`, `.env.sample`, `.env.template`, `.env.dist` (also with a middle part,
`.env.local.example`), plus `.ssh/*.pub`, `.ssh/config`, `.ssh/known_hosts*` and `.ssh/authorized_keys`.
They hold placeholders and are the documentation of which variables exist.

## Blocks

| Tool call | Why it is blocked |
|-----------|-------------------|
| `Read`, `Edit`, `Write`, `MultiEdit` on `.env`, `.env.local`, `server.pem`, `release.keystore`, … | opens a secret file |
| `Grep` with `path: .env` | searches inside a secret file |
| `NotebookEdit` with a secret `notebook_path` | the same |
| `cat .env`, `head -n 5 .env.local`, `grep DB_ .env`, `sed -n p .env`, `base64 ios/dist.p12` | prints a secret file |
| `sed -i 's/x/y/' .env` | edits a secret file through a shell tool |
| `cp .env /tmp/backup`, `scp server.pem host:/tmp/` | copies a secret file somewhere else |
| `cat .env \| grep TOKEN`, `bash -c "cat .env"`, `echo "$(cat .env)"` | the read is still there, inside a pipe, a wrapper or a substitution |

## Allows

| Tool call | Why it passes |
|-----------|---------------|
| `Read .env.example`, `cat .env.example`, `cp .env.example .env` | the example file is documentation; creating `.env` from it is the normal setup step |
| `Read src/config/env.validation.ts`, `Read src/keys.ts` | ordinary source files, whatever their name says |
| `ls -la .env`, `rm .env`, `touch .env`, `test -f .env`, `git status .env` | names the file without printing it |
| `dotenv -e .env.local -- npm start` | a tool that loads the file into a process; nothing is printed to the model |
| `echo ".env"`, `git commit -m "chore: document .env handling"`, `grep -rn "cat .env" docs/` | text that mentions a secret file is not a read of it |
| a heredoc whose body says `cat .env` | the body is data, not a command |

## How it decides

1. Reads the payload. For `Read`, `Edit`, `Write`, `MultiEdit`, `NotebookEdit` and `Grep` it takes the target
   path (`file_path`, `notebook_path` or `path`); for `Bash` it splits the command into the commands it really
   runs (`listCommands`). Any other tool passes.
2. A path is a secret file when it matches one of the secret globs and none of the example globs.
3. File tools: blocks when the target path is a secret file.
4. Bash, per command:
   - a **reader** (`cat`, `head`, `tail`, `less`, `grep`, `rg`, `sed`, `awk`, `cut`, `sort`, `wc`, `od`, `xxd`,
     `base64`, `diff`, `shasum`, …) is blocked when any non-flag argument is a secret file;
   - a **copier** (`cp`, `mv`, `scp`, `rsync`, `install`, `ln`) is blocked when any argument but the last is a
     secret file — the last one is the destination, which is why `cp .env.example .env` passes;
   - any other program passes, whatever its arguments.
5. Otherwise exits `0`. Any internal error also exits `0` (fail open).

## What the model sees

```
[dev-assistant] secret-files-guard blocked this command: ".env" is a secret file (environment file, key material or credentials), so Read may not open it.
Do this instead: read the example file (.env.example) for the variable names, or ask the human for the value; the agent never reads, edits or prints secret files.
```

```
[dev-assistant] secret-files-guard blocked this command: "cat .env" would print the secret file ".env".
Do this instead: read the example file (.env.example) for the variable names, or ask the human for the value; the agent never reads, edits or prints secret files.
```

## Limitations

- **Redirections are invisible.** `cat < .env` and `echo "TOKEN=x" >> .env` pass: the command reader drops
  redirection targets from argv. `cat < .env` is not a shape the model normally produces; writing into
  `.env` is a gap to close in the command reader.
- **Programs outside the reader and copier lists pass.** `source .env`, `node -e "…"`, `python -c "…"`, an
  editor, or a script of the project's own can read a secret file without the guard noticing. Sourcing `.env`
  before a dev command is a common and harmless pattern, which is why it is not blocked.
- **Only the file name is checked.** A secret stored under an unusual name (`config.json`, `token.txt`) is not
  recognised; a `.env` file at an unusual path is.
- **`Grep` with a `glob`** (`glob: ".env"` over a directory) searches secret files without naming one in `path`.
- **`.npmrc`, `.yarnrc.yml`, `.docker/config.json`** can carry tokens but are also ordinary configuration, so
  they are not on the list.
- **The `deny` permission list is the hard boundary; this hook is the second line.** Until `/setup-permissions`
  has written the list into a project, only the hook protects it, and a hook can be disabled with the plugin.
- **Anything outside the tools** — an MCP server, an IDE, a human's terminal — is not covered.

## Turning it off

The plugin is enabled per scope. To switch it off in one repository, add to that repository's
`.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/secretFilesGuard.test.mjs](../../tests/secretFilesGuard.test.mjs) — the hook, one case per row of
  the tables above, for file tools and for Bash.
- [tests/secretPaths.test.mjs](../../tests/secretPaths.test.mjs) — the matcher and the shape of the globs.
- [tests/shell.test.mjs](../../tests/shell.test.mjs) — the command reader it relies on.
