# Hooks

A hook is a program Claude Code runs on a lifecycle event, outside the model. The model cannot skip it or
talk its way past it, which is why this plugin puts every *mandatory* rule into a hook and leaves guidance
to skills and CLAUDE.md.

## Hooks in this plugin

| Hook | Event · matcher | What it does | Since |
|------|-----------------|--------------|-------|
| [main-branch-guard](mainBranchGuard.md) | `PreToolUse` · `Bash` | Blocks commits on main and pushes that update main | 0.2.0 |
| [secret-files-guard](secretFilesGuard.md) | `PreToolUse` · file tools and `Bash` | Blocks reading, editing, printing or copying `.env`, key material and credential files | 0.3.0 |
| [secret-commit-guard](secretCommitGuard.md) | `PreToolUse` · `Bash` (`git commit`) | Blocks a commit whose diff adds a token, a key, a password in a connection string, or a secret file | 0.4.0 |

Every registered hook has its own page here; `npm test` fails if one is missing (`tests/structure.test.mjs`).

## How a hook runs

```
the model asks for a tool call, e.g. Bash "git commit -m x"
  │
  ▼
Claude Code: event PreToolUse, tool Bash
  │  hooks/hooks.json has an entry whose matcher fits → start it
  ▼
node bin/<hook>.mjs            ← the event as JSON on stdin
  │
  ├─ exit 0 → the tool call goes ahead
  └─ exit 2 → the tool call is cancelled; stderr goes back to the model as feedback
```

Hooks are loaded when a session starts. A change to `hooks/hooks.json` or to a hook script reaches a session
only after a Claude Code restart.

### Registration

`hooks/hooks.json` binds a script to an event. The matcher is a tool-name pattern (`Bash`, `Edit|Write`).
`${CLAUDE_PLUGIN_ROOT}` expands to the folder the plugin is loaded from; `timeout` is in seconds.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/bin/mainBranchGuard.mjs\"", "timeout": 10 }]
      }
    ]
  }
}
```

### Input

The event arrives as one JSON object on stdin. For `PreToolUse` on `Bash` the fields the hooks use are:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "cd template-next-web && git commit -m x" },
  "cwd": "/Users/me/projects/pet"
}
```

`cwd` is the shell's current directory, which is not always the project root — a hook resolves paths against it.

For the file tools the target is in `tool_input`: `file_path` for `Read`, `Edit`, `Write` and `MultiEdit`,
`notebook_path` for `NotebookEdit`, `path` for `Grep`. A path may be relative to `cwd`, absolute, or start with `~`.

### Output

| The hook… | Claude Code… |
|-----------|--------------|
| exits `0` | lets the tool call through |
| exits `2`, message on stderr | cancels the tool call and shows the message to the model |
| exits with any other code (a crash) | reports a hook error and lets the tool call through |
| prints `{"hookSpecificOutput": {"permissionDecision": "ask", …}}` and exits `0` | asks the user to decide (not used yet) |

## Shared building blocks (`bin/lib/`)

| Module | Gives a hook |
|--------|--------------|
| `hookIo.mjs` | `readPayload()`, `pass()`, and `block(hook, reason, alternative)` — the single block format |
| `shell.mjs` | `listCommands(script)` — the commands a Bash call really runs, as argv arrays |
| `git.mjs` | `currentBranch(dir)`, `hasCommits(dir)`, `commitDiff(dir, { all, paths })` |
| `gitCommands.mjs` | `gitCommands(script, cwd)` — every git command in a Bash call with the repository it runs in, following `cd` and `git -C` |
| `secretPaths.mjs` | `isSecretFile(path)`, `isExampleFile(path)` and the glob lists behind them — the one definition of a secret file, shared with the setup-permissions template |
| `secretPatterns.mjs` | `findSecret(line)` — the kind of secret a line of text carries, or null; honours the `allow-secret:` marker |

`listCommands` is the part to reuse for any Bash guard. Matching raw command text is how guards produce false
blocks: a commit message or an `echo` that merely *mentions* a command is not that command. The reader skips
quoted text, heredoc bodies and comments; it lists commands inside `$( … )`, backticks and `bash -c "…"`,
because those do run; and it strips `VAR=1`, `env`, `sudo` and shell keywords, so `argv[0]` is the real program.

## Rules every hook follows

1. **One job per hook.** A new rule that does not belong to an existing hook's job gets its own script.
2. **A block names the hook and the way out.** `[dev-assistant] <hook> blocked this command: <reason>` and
   `Do this instead: <alternative>` — the model recovers on its own only when it is told what is allowed.
3. **No false blocks.** A false block costs the model a whole turn and teaches people to switch the hook
   off. When in doubt, let the call through.
4. **Fail open.** A crash, an unexpected payload or a missing directory means exit `0`. A broken guard must
   never lock a session; the tests are what catch a guard that silently stopped working.
5. **Fast and dependency-free.** A `PreToolUse` hook starts on every matching tool call. Plain Node, no
   packages; expensive work (spawning git) only when the command is actually relevant.
6. **Tested both ways.** Every rule has a case that must be blocked and a case that must pass.

## Adding a hook

1. `bin/<hookName>.mjs`, built on `bin/lib/`. Files are named in camelCase; the hook keeps its kebab-case name in messages and docs (`main-branch-guard` lives in `mainBranchGuard.mjs`).
2. Register it in `hooks/hooks.json` under the right event and matcher.
3. Tests in `tests/<hookName>.test.mjs`: run the hook with a real payload through `runBashHook` from
   `tests/helpers.mjs`; build git state with `makeRepo`.
4. A page `docs/hooks/<hookName>.md` in the layout below, plus a row in the table at the top of this file.
5. A task entry in [../TASKS.md](../TASKS.md); bump the plugin version in both manifests.

### Page layout

Each hook page has the same sections, in this order:

- **Summary table** — event, matcher, script, version it shipped in.
- **Why** — the rule and the reason behind it.
- **Blocks** / **Allows** — concrete commands, each with the outcome.
- **How it decides** — the logic, in the order it runs.
- **What the model sees** — the exact messages.
- **Limitations** — what it cannot see, stated plainly.
- **Turning it off** — how to disable it where it does not fit.
- **Tests** — where the cases live.

## Testing and debugging

- `npm test` runs every case (`node --test`). Hook tests use throwaway repositories with git isolated from the
  machine's config, so a developer's global git settings never change an outcome.
- Run a hook by hand with a saved payload; the exit code is the verdict:

  ```bash
  node bin/mainBranchGuard.mjs < payload.json; echo "exit=$?"
  ```

- In Claude Code, `/hooks` lists the hooks the current session loaded.
