# standards

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/standards [install <pack> \| update \| status \| check \| disable \| enable \| review \| promote]` | a human only (`disable-model-invocation`) | [bin/standards.mjs](../../bin/standards.mjs) | 0.12.0 |

Files: [skills/standards/SKILL.md](../../skills/standards/SKILL.md), the procedures
[references/install.md](../../skills/standards/references/install.md) and
[references/review.md](../../skills/standards/references/review.md), the packs in
[skills/standards/templates/packs/](../../skills/standards/templates/packs/).

## Why

A practice the operator wants in every project — where shared components live, how a component folder is laid
out, that every visual value is a token — is worth little as a paragraph in one `CLAUDE.md`: the model may skip
it, a reviewer may miss it, and the next project starts without it. A pack writes each practice once, as a rule
with an id, and the rule reaches the code through every layer that can carry it:

| Layer | When | Guarantee | Carried by |
|-------|------|-----------|------------|
| rules file | while Claude writes a matching file | guidance | `.claude/rules/<pack>.md`, loaded by its `paths:` |
| lint | after every edit, in CI | the linter's | the pack's ESLint rules, reported by [lint-feedback](../hooks/lintFeedback.md) |
| check | when the turn ends, at commit | the hook's | script checks, run by [standards-check](../hooks/standardsCheck.md) |
| review | on `/standards review` | judgement | [pattern-reviewer](../agents/patternReviewer.md) |

Each rule's `Enforced by:` line in the pack names its layers, and the lint, the checks and the review all read
that one file, so they cannot drift apart. A rule the review keeps catching is proposed for a stronger layer.

## The `react` pack

For React web and React Native. Platform-specific text and lint switch on the `platform` setting.

| Rule | What it says | Lint | Check | Review |
|------|--------------|------|-------|--------|
| RCT-01 Shared components | a component used by more than one feature, or meant to be, lives in the shared folder | `standards/no-cross-feature-imports`: a feature never imports another feature's `components/`, by path, alias, or through that feature's index | — | meant to be reused; a near-copy of a shared one |
| RCT-02 Component and screen layout | a folder per component: `index.ts` (export only), `Name.tsx` (markup), `useName.ts` (logic), `Name.styles.ts`, `components/`; a small subcomponent may be one file | `standards/no-logic-in-component-file`: no effects, data hooks, `fetch`, HTTP clients or API modules in a component file; view-only `useState` is allowed | `componentLayout` | a subcomponent that outgrew one file; a component that needs splitting |
| RCT-03 Design tokens | colors, font families, sizes, line heights, weights, letter spacing, radii and shadows come from the tokens | web `standards/no-raw-visual-values` (palette classes, hex, arbitrary values, `dark:` pairs); native `standards/no-raw-style-values` (color literals anywhere, named colors in color props, raw typography and radii) | — | a token used against its meaning |

Spacing stays on the platform's scale: Tailwind's on the web, plain numbers on native.

## What it does

- **`install <pack> [dir]`** — detects the settings from the project (platform from the dependencies, folders,
  the token file, `tsconfig.json` aliases, a lint rule the project already has, a reference component and screen),
  shows them, asks the operator about what is uncertain, installs with the confirmed values, adds the lint file to
  the ESLint config, then runs the check and the project's lint to show what the existing code breaks. Fixes nothing.
- **`update`** — reinstalls every pack with its settings; a file the project edited is kept, and when the pack
  changed it too, the new version waits in `.claude/standards/incoming/` for a hand merge and `resolve`.
- **`status`**, **`check`** — what is installed and in what state; what the whole project breaks.
- **`disable <rule> <reason>`**, **`enable <rule>`** — the only way a rule is switched off: with the operator's
  reason, marked under the rule's heading in the rules file; its lint and checks stop, the review skips it.
- **`review`** — `review-context` collects the diff, the changed and untracked files and the rules to review; the
  reviewer returns findings with rule ids; the operator decides each (fix, waive, reject); the fixes are made and
  checked; fixed and waived findings are recorded; promotions are proposed.
- **`promote`** — what waits for a decision, and the decision recorded.

## Promotion

`.claude/standards/findings.json` holds every recorded finding (`F-001`…) with its rule, file, line, summary and
status, and every promotion decided. When a rule collects two findings since its last promotion (`promoteAfter`
in `standards.json`), or a finding fits no rule, the script proposes, and the skill puts it to the operator: a
lint rule if the pattern shows in the syntax, a script check if it shows in files and folders, a sharper text or
example if it needs judgement, a new rule for a finding without one — or keep. A change for this project is made
there; a change for every project is written up for the dev-assistant repository. `promote --rule … --to …`
records the choice, and the rule's count starts again.

The project may keep its own rules in the same form — `## PRJ-01 Title` and an `Enforced by:` line in any
`.claude/rules/*.md` — and findings and promotions work for them too.

## What it will not do

- Edit `standards.json`, `findings.json` or an installed file by hand; the script is the only writer, apart from
  wiring the lint and a merge the operator agreed to.
- Switch a rule off without the operator's reason, through an `eslint-disable` comment, or by deleting it.
- Record a finding before the operator decided it, or write `Standards-skipped:` on its own initiative.
- Change the plugin's pack from inside a project: a pack-wide promotion is written up, not made.

## The script

```
node bin/standards.mjs <command> [--dir <project>]
```

| Command | Effect |
|---------|--------|
| `packs` | the packs the plugin has, with their rules |
| `install <pack> [--set key=value]… [--dry-run]` | detect or keep the settings, apply `--set`, write the files, record the state, report wiring and rules |
| `update [--dry-run]` | `install` for every installed pack, keeping its settings |
| `status` | per pack: version, settings, rules switched off, each file's state, lint wiring; findings and waiting promotions |
| `check [--files a,b]` | the script checks over the project or the given files; exit `1` when something is found |
| `disable <rule> --reason <text>` / `enable <rule>` | switch a rule off or on and regenerate the rules file |
| `resolve <file>` | after a hand merge: take the incoming version as the new base and remove it from `incoming/` |
| `finding --rule <id\|none> --file <path> --summary <text> [--line n] [--status fixed\|waived\|open]` or `finding --stdin` | record findings; print the promotions now waiting |
| `promote [--rule <id> \| --finding <F-nnn>] [--to <layer>] [--note <text>]` | list what waits, or record a decision: `lint`, `check`, `text`, `keep` for a rule; `new`, `keep` for a finding |
| `review-context [--staged \| --base <ref>]` | JSON for the reviewer: the diff file (in the system temp folder), changed and untracked files, rules files, `CLAUDE.md`, the rules to review |

Settings (`--set`): `platform` (`web` · `native`), `srcDir`, `sharedDir`, `featuresDir`, `tokensFiles`
(comma-separated), `aliases` (`prefix=target`, comma-separated), `skipLint` (pack lint rules the project
replaces with its own), `referenceComponent`, `referenceScreen` (`none` clears).

What an install does to each file, by the hash of the version it installed last:

| The file | Outcome |
|----------|---------|
| missing | created |
| exactly the new version | up to date |
| edited by the project, and the pack's version unchanged | kept as edited |
| untouched by the project, and the pack's version changed | replaced |
| edited by the project, and the pack's version changed (or there before the pack) | kept; the new version goes to `.claude/standards/incoming/<file>` |

The installed lint file reads the settings from `standards.json` when ESLint loads it, so a change of settings or
a rule switched off needs no edit of the ESLint config.

## Limitations

- **One project per install.** In a folder of repositories, each one is installed on its own.
- **The lint needs the project's ESLint.** Without an ESLint config, the lint layer does not run there, and the
  report says so; the rules file, the check and the review still work.
- **Detection is a starting point.** Folders and token files are guessed from common layouts; the operator
  confirms them.
- **RCT-01 lint sees the import, not the use.** A component reached through a chain of re-exports beyond the
  other feature's own index is left to the review.
- **Packs change in the plugin.** A project gets a newer pack through `update`; a pack-wide promotion is a change
  in the dev-assistant repository.

## Tests

- [tests/standards.test.mjs](../../tests/standards.test.mjs) — the pack's rules and the lint rules it names,
  rendering, detection, install (dry run, a second run, `--set`, kept edits, incoming and `resolve`, wiring),
  `update`, `status`, `disable` / `enable`, `check`, findings and promotions, `review-context`.
- [tests/standardsLint.test.mjs](../../tests/standardsLint.test.mjs) — every lint rule through ESLint's `Linter`,
  each with cases that must be reported and cases that must pass.
- On a copy of `template-next-admin` (0.12.0): the install detected the right settings, the real ESLint ran the
  pack's rules, and the check and the lint found two real breaks — `ui/Toast/` (its component is `Toaster.tsx`,
  with `toast.store.ts` beside it) and `layout/Header/Header.tsx` (calls `useSignOutMutation` with no hook file).
