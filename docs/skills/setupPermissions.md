# setup-permissions

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/setup-permissions [dir]` | a human only (`disable-model-invocation`) | [bin/setupPermissions.mjs](../../bin/setupPermissions.mjs) | 0.5.0 |

## Why

Permissions are the hardest boundary Claude Code has: a denied tool call never reaches the model's
judgement. The hooks [secret-files-guard](../hooks/secretFilesGuard.md) and
[secret-commit-guard](../hooks/secretCommitGuard.md) are the second line; the `deny` list is the first.
But a `deny` list lives in the project's `.claude/settings.json`, not in the plugin, so something has to
carry it there. This skill does, through a script, so the result is the same on every machine and every run.

The rules are built from the same secret-file list the hooks use
([bin/lib/permissionRules.mjs](../../bin/lib/permissionRules.mjs) over
[bin/lib/secretPaths.mjs](../../bin/lib/secretPaths.mjs)), so the boundary and the hooks never disagree.
[templates/permissions.json](../../templates/permissions.json) is the generated, readable copy of the list.

## What it does

1. Runs `node "${CLAUDE_PLUGIN_ROOT}/bin/setupPermissions.mjs" [dir]` against the project.
2. Shows the script's report unchanged: created / updated / already up to date, how many rules were added
   and which ones.
3. On a JSON error in the existing settings file, shows the message and stops; the human fixes the file.
4. Reminds the human to commit `.claude/settings.json` and to restart Claude Code, since permissions are read
   at session start.

## What it will not do

- Edit `.claude/settings.json` by hand; the script is the only writer.
- Add `allow` rules or remove `deny` rules. Loosening the boundary is a human decision made outside the skill.
- Touch a directory the human did not name.

## The rules it writes

| Group | Rules |
|-------|-------|
| secret files in the project | `Read(./**/.env)`, `Read(./**/.env.*)`, `Read(./**/*.pem)`, `Read(./**/*.key)`, … and the same as `Edit(…)` — one pair per glob in the secret-file list |
| secret files in the home directory | `Read(~/.ssh/**)`, `Read(~/.aws/credentials)`, `Read(~/.netrc)`, `Read(~/.pgpass)` and their `Edit(…)` pairs |
| irreversible commands | `Bash(git push --force:*)`, `Bash(git push -f:*)`, `Bash(gh pr merge:*)`, `Bash(gh release create:*)`, `Bash(npm publish:*)`, `Bash(pnpm publish:*)`, `Bash(yarn publish:*)`, `Bash(eas submit:*)` |

`Read(…)` also covers `Grep` and `Glob`; `Edit(…)` also covers `Write`. `Bash(prefix:*)` matches every
command that starts with the prefix.

## The script

```
node bin/setupPermissions.mjs [project-dir] [--dry-run] [--template]
```

| Argument | Effect |
|----------|--------|
| `project-dir` | the project to write into; the current directory when omitted |
| `--dry-run` | report what would change, write nothing |
| `--template` | print the rules as JSON and exit — the source of `templates/permissions.json` |

Behaviour:

- Reads `.claude/settings.json` if it exists. A file that does not parse is reported on stderr with exit
  `1` and left untouched.
- Appends every rule from the list that is not already in `permissions.deny`. Existing entries, their
  order, `allow`/`ask` lists and every other key (`model`, `hooks`, …) are kept as they are.
- Records `devAssistant.version` with the plugin version that wrote the file.
- Writes with two-space indentation and a trailing newline, creating `.claude/` when needed.
- Prints the report: the action, the counts (added / already present / other entries kept), each added rule,
  and the reminder to commit and restart. Exit `0`.

A second run adds nothing and reports "already up to date". After a plugin update that adds a rule, a run
adds only that rule.

## Limitations

- **It only adds.** A rule removed from the plugin stays in projects that already have it; removing it is a
  human edit. This is on purpose: the script never takes a boundary away.
- **`Bash` rules match text, not meaning.** `Bash(git push --force:*)` also matches `git push
  --force-with-lease …`; `Bash(cat .env)` would match nothing useful, so shell reads of secret files are
  left to the hook.
- **Example files are denied too.** Permissions have no exceptions, so `Read(./**/.env.*)` also denies
  `.env.example`. The hook allows it, but the permission wins. Keep variable names documented in a
  `README` or an `env.validation.ts` schema as well.
- **Whether a plugin's own `settings.json` is honoured is unverified**, which is why the rules are copied
  into the project instead.
- Permissions apply after a restart; the report says so, the script cannot restart anything.

## Tests

- [tests/setupPermissions.test.mjs](../../tests/setupPermissions.test.mjs) — the rule builder, the template
  in sync, a fresh project, a second run, foreign entries kept, `--dry-run`, an invalid file, the default
  directory.
