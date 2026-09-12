# format-changed

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `PostToolUse` | `Edit\|Write\|MultiEdit` | [bin/formatChanged.mjs](../../bin/formatChanged.mjs) | 0.6.0 |

## Why

Formatting is mechanical and should cost the model nothing. Without this hook the model writes a file,
later runs the linter, reads a page of complaints about quotes and spaces, and spends a turn fixing them —
or the pre-commit hook rewrites the file at commit time and the diff the model reviewed is not the diff
that lands. With it, the project's own formatter and lint fixer run on the one file the model just wrote,
so the next read of that file is already clean.

It is a convenience, not a guard: it never blocks, never reports, and runs only tools the project has
both configured and installed. Nothing is downloaded.

## What it runs

| Tool | Runs when the project has | Command | On |
|------|---------------------------|---------|----|
| Prettier | a `.prettierrc*` or `prettier.config.*` file, or a `prettier` key in `package.json` | `prettier --write --log-level error <file>` | every formattable file |
| ESLint | an `eslint.config.*` or `.eslintrc*` file, or an `eslintConfig` key | `eslint --fix --quiet <file>` | source files only |
| oxlint | `.oxlintrc.json` or `oxlint.json`, or `oxlint` in the dependencies | `oxlint --fix --quiet <file>` | source files only |

Formattable: `.ts .tsx .mts .cts .js .jsx .mjs .cjs .json .jsonc .md .mdx .css .scss .less .html .vue .graphql .gql .yml .yaml`.
Source (linted): `.ts .tsx .mts .cts .js .jsx .mjs .cjs .vue`.

The order is Prettier, then ESLint, then oxlint, so the lint fixer has the last word on anything both touch.

## Skips

| File | Why |
|------|-----|
| anything under `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.expo`, `.turbo`, `.cache`, `generated`, `__generated__`, `vendor` | generated or vendored: not the model's to format |
| `.png`, `.csv`, `.lock`, `.env`, and every other extension not in the list | not text the formatter owns |
| a file that no longer exists | nothing to format |
| a file with no `package.json` anywhere above it | no project, so no tools |
| a project without the tool's config | the project did not ask for it; running it would impose a style |
| a project with the config but no local install | nothing is downloaded on the model's behalf |

## How it decides

1. Reads `tool_input.file_path` from the payload and resolves it against `cwd`.
2. Checks the extension and the path against the lists above.
3. Finds the project root: the nearest directory above the file that holds a `package.json`. In a
   monorepo that is the package, not the repository, so the package's own config applies.
4. For each tool: is it configured in that root? Is its executable installed — `node_modules/.bin/<tool>`
   in the root or, for a hoisted install, in a directory above it? Both yes: run it from the root on the
   file's relative path, with a 20-second limit.
5. Exits `0` in every case: no output, no block, no message to the model. A tool that fails or times out
   leaves the file as it was.

## What the model sees

Nothing. The file it reads next is formatted; that is the whole effect.

## Limitations

- **Only files written through the file tools.** A file changed by a Bash command (`sed -i`, a generator,
  `git checkout`) is not formatted.
- **Only the changed file.** A file that was unformatted before the model touched it gets formatted whole,
  so the diff carries formatting changes the model did not make — the same thing lint-staged would do at
  commit time, only earlier.
- **Only what the fixers can fix.** Rules without an autofix still surface when the model runs the lint
  command; this hook does not replace that run.
- **Latency.** Each edit pays the tools' start-up time, roughly half a second to a second per tool.
- **Tool detection is by well-known files and keys.** A formatter configured in an unusual way (a config
  file with a custom name passed on the command line, Biome, dprint) is not run. Once `CLAUDE.md` carries a
  command map (task T7), the `format` command from there can take precedence.
- **The hook trusts `node_modules/.bin`.** It runs whatever the project installed under a tool's name.

## Turning it off

The plugin is enabled per scope. To switch it off in one repository, add to that repository's
`.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/formatChanged.test.mjs](../../tests/formatChanged.test.mjs) — throwaway projects with fake tools
  under `node_modules/.bin` that record how they were called and rewrite the file; one case per row of the
  tables above.
