# Install a pack

`/standards install <pack> [dir]`. The pack goes into one project, with settings the operator confirmed.

## 1. Detect

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" install <pack> --dry-run --dir <project>
```

The report lists the settings the script detected from the project, the files it would write, whether the
ESLint config imports the lint file, and the pack's rules. Nothing is written yet.

## 2. Confirm the settings

Show the operator the settings and what each means:

| Setting | Meaning |
|---------|---------|
| `platform` | `web` (React DOM, Next.js) or `native` (React Native, Expo): which RCT-03 lint rule runs and which examples the rules file shows |
| `srcDir` | where the source lives |
| `sharedDir` | the shared components folder (RCT-01) |
| `featuresDir` | the folder of features, each with its own `components/` |
| `tokensFiles` | the design tokens: the one place raw values may be written (RCT-03) |
| `aliases` | import aliases from `tsconfig.json`, so RCT-01 can tell where an import points |
| `skipLint` | pack lint rules not run because the project has its own of the same name |
| `referenceComponent`, `referenceScreen` | the folders the rules file tells Claude to copy |

Ask only about what is uncertain or looks wrong — a missing folder, a token file that is not the real one, a
reference that is a poor example — with `AskUserQuestion`: the detected value first, marked *(Recommended)*
when it looks right, and the operator's own value through *Other*. Settle every setting before writing.

## 3. Install

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" install <pack> --dir <project> --set key=value …
```

One `--set` per corrected setting: lists comma-separated (`--set tokensFiles=src/theme,src/fonts.ts`),
aliases as `prefix=target` pairs (`--set aliases=@/=src/`), `none` to clear a reference. Show the report as it is.

## 4. Wire the lint

When the report says the ESLint config does not import the lint file yet, add the two lines it prints — the
import at the top, the spread as the last entries of the exported config array — and show the operator the
change. When the project has no ESLint config, say so: the lint layer of the pack does not run there until it
has one.

## 5. Show what the existing code breaks

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" check --dir <project>
```

Then the project's lint command (its `lint` script in `package.json`, as `npm run lint`). Report the findings
of both, grouped by rule, with counts. Fix nothing here. Ask the operator, per rule with findings: fix them now
(as separate work), leave them for later, or switch the rule off for this project with a reason (`disable`).

## 6. Hand over

Tell the operator to commit `docs/standards/` (its `.gitignore` keeps a review diff out), the rules file, the lint
file and the ESLint config change, and to restart Claude Code so a new session loads the rules file.
