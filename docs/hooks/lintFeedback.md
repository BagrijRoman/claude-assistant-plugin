# lint-feedback

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `PostToolUse` | `Edit\|Write\|MultiEdit` | [bin/lintFeedback.mjs](../../bin/lintFeedback.mjs) | 0.7.0 (formatting stage since 0.6.0 as `format-changed`) |

## Why

The model learns about a lint error in the same turn it wrote the file, not five edits later when it runs
the lint command, and not in review. Anything the project's linter can express — a floating promise, an
`any`, a banned import, a naming rule — is caught at the moment it is written, on the one file that changed,
and comes back as a short list the model can act on at once.

Formatting is the hook's first stage rather than a separate hook: hooks on one event run in parallel with
no ordering, so a formatter writing the file while a linter reads it would race, and the linter would
report problems the formatter was fixing at that very moment. One process, three stages, in order.

It is feedback, not a guard. Nothing is blocked (the edit already happened), nothing is downloaded, and
only tools the project has both configured and installed are run.

## The three stages

| Stage | Tool | Runs when the project has | Command | On |
|-------|------|---------------------------|---------|----|
| 1. format | Prettier | a `.prettierrc*` or `prettier.config.*` file, or a `prettier` key in `package.json` | `prettier --write --log-level error <file>` | every formattable file |
| 2. fix + report | ESLint | an `eslint.config.*` or `.eslintrc*` file, or an `eslintConfig` key | `eslint --fix --format json <file>` | source files only |
| 2. fix + report | oxlint | `.oxlintrc.json` or `oxlint.json`, or `oxlint` in the dependencies | `oxlint --fix --format json <file>` | source files only |
| 3. relay | — | any error left after the fixes | exit `2`, the list on stderr | — |

Formattable: `.ts .tsx .mts .cts .js .jsx .mjs .cjs .json .jsonc .md .mdx .css .scss .less .html .vue .graphql .gql .yml .yaml`.
Source (linted): `.ts .tsx .mts .cts .js .jsx .mjs .cjs .vue`.

`--fix` applies what the linter can fix on its own and reports only what is left, which is exactly what the
model needs to hear about.

## Reports

| The linter says | The model sees |
|-----------------|----------------|
| an error (ESLint `severity: 2`, oxlint `"error"`) | `line N · rule · message` |
| a parse error (ESLint, no rule id) | `line N · parse error · message` |
| the same error from both linters | once |
| more than 20 errors | the first 20 by line, then `… and N more; run the lint command from the command map for the full list` |

## Stays silent

| Case | Why |
|------|-----|
| a clean file, or only warnings | nothing the model must act on; warnings are the lint command's business |
| a file that is not source (`.md`, `.json`, `.css`) | formatted, never linted |
| anything under `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.expo`, `.turbo`, `.cache`, `generated`, `__generated__`, `vendor` | generated or vendored: not the model's to format or fix |
| `.png`, `.csv`, `.lock`, `.env`, every other extension | not text the tools own |
| a file that no longer exists, or with no `package.json` above it | nothing to run against |
| a tool that is configured but not installed, or installed but not configured | nothing is downloaded, and a style is never imposed on a project that did not ask for it |
| a tool that crashes, times out, or prints something that is not JSON | treated as no errors: the hook fails open |

## How it decides

1. Reads `tool_input.file_path` from the payload and resolves it against `cwd`.
2. Checks the extension and the path against the lists above.
3. Finds the project root: the nearest directory above the file with a `package.json`. In a monorepo that is
   the package, not the repository, so the package's own config applies. For each tool: configured in that
   root, and executable present in `node_modules/.bin` there or in a directory above (a hoisted install)?
4. Runs Prettier, then ESLint, then oxlint, from the root on the file's relative path, 20 seconds each.
5. Parses the linters' JSON, keeps errors only, drops duplicates, sorts by line, caps at 20.
6. Nothing left: exit `0`, silently. Otherwise: exit `2` with the report on stderr — after the tool already
   ran, that is feedback, not a block.

## What the model sees

```
[dev-assistant] lint-feedback: 2 lint errors remain in "src/orders.service.ts" after formatting and auto-fix:
  line 12 · @typescript-eslint/no-floating-promises · Promises must be awaited, end with a call to .catch, or be explicitly marked as ignored.
  line 30 · typescript(no-explicit-any) · Unexpected `any`. Specify a different type.
Do this instead: fix the code at those lines in "orders.service.ts". Never disable a rule inline or in the config to make this pass.
```

On a clean file: nothing. The file it reads next is formatted; that is the whole effect.

## Teaching the linter a project convention

A convention the linter can express is the cheapest pattern check there is: deterministic, on every edit,
no reviewer needed. Before writing a custom plugin, two built-in ESLint rules cover most of them:

```js
// eslint.config.mjs — layering: a controller never imports a repository
{
  files: ['src/**/*.controller.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['**/*.repository'], message: 'Controllers call services, not repositories.' }] }],
  },
}
// banned API shapes
{
  rules: {
    'no-restricted-syntax': ['error', { selector: "CallExpression[callee.object.name='console']", message: 'Use the Logger service.' }],
  },
}
```

oxlint supports `no-restricted-imports` as well. The `message` is what the model reads, so write it as the
alternative, not the prohibition.

## Limitations

- **Only files written through the file tools.** A file changed by a Bash command (`sed -i`, a generator,
  `git checkout`) is neither formatted nor linted here.
- **Only the changed file.** A file that was unformatted before the model touched it gets formatted whole,
  so the diff carries formatting the model did not make — what lint-staged would do at commit time, only earlier.
- **Only errors, only what the linters know.** Warnings, type errors (`tsc`) and cross-file problems still
  surface when the model runs the project's lint and typecheck commands; this hook does not replace them.
- **Latency.** Each edit pays the tools' start-up time, roughly half a second to a second per tool.
- **Tool detection is by well-known files and keys.** Biome, dprint, or a config passed on the command line
  are not run. Once `CLAUDE.md` carries a command map, the `lint` and `format` commands there can take precedence.
- **The hook trusts `node_modules/.bin`.** It runs whatever the project installed under a tool's name.

## Turning it off

The plugin is enabled per scope. To switch it off in one repository, add to that repository's
`.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/lintFeedback.test.mjs](../../tests/lintFeedback.test.mjs) — throwaway projects with fake tools under
  `node_modules/.bin` that record how they were called, rewrite the file (the formatter) or print a prepared
  JSON report (the linters); one case per row of the tables above.
