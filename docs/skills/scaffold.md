# scaffold

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/scaffold component <Name> (--feature <f> \| --shared [<group>] \| --in <parent>) [--hook] [--styles] [--single]` | a human, or the model when it needs a new component | [bin/scaffold.mjs](../../bin/scaffold.mjs) | 0.12.0 |

## Why

RCT-02 of the [react standards pack](standards.md) lays every component out the same way. Written by hand, file
by file, a folder ends up without its `index.ts`, or with its logic in the component file. A script that makes
the folder makes it right every time, and the pack's rules file tells Claude to use it. It is model-invocable on
purpose: its effect is a few new files in a new folder, never a change to existing code.

## What it does

1. Takes the place by RCT-01: `--feature <f>` (the feature's `components/`), `--shared [<group>]` (the shared
   folder, or a group in it such as `ui`), `--in <parent>` (the parent component's `components/`).
2. Reads the folders and the platform from the project's installed `react` pack, or detects them.
3. Writes `index.ts`, `Name.tsx`, and with `--hook` `useName.ts`, with `--styles` `Name.styles.ts` — TypeScript
   when the project has a `tsconfig.json`; React DOM or React Native markup and styles by the platform. `--single`
   (with `--in` only) makes a one-file subcomponent.
4. Prints what it created, and names a barrel `index.ts` next to the new folder, if there is one.

The output passes `componentLayout`, the pack's lint rules and the project's Prettier (checked on
`template-next-admin`).

## What it will not do

- Overwrite anything: an existing folder or file is an error, and nothing is written.
- Edit a barrel, a route or any other existing file.
- Make a `--single` subcomponent with a hook or styles: that is a folder.

## Limitations

- Stubs only: the markup, the hook's return value and the styles are placeholders to fill in.
- `--feature` creates the feature's `components/` folder when it does not exist, without asking whether the
  feature should exist.

## Tests

- [tests/standardsCheck.test.mjs](../../tests/standardsCheck.test.mjs) › `scaffold` — a feature component with
  hook and styles, a single-file and a folder subcomponent, all passing `componentLayout`; a shared group and its
  barrel; React Native output; the refusals.
