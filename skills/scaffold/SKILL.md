---
name: scaffold
description: Creates a new React or React Native component, screen or subcomponent folder laid out by the project's standards (RCT-02) — index.ts, the component file, its hook, its styles — through a script, so the layout is right before any code is written. Use whenever a new component or screen is needed in a project with the dev-assistant react standards.
argument-hint: "component <Name> (--feature <feature> | --shared [<group>] | --in <parent folder>) [--hook] [--styles] [--single]"
allowed-tools: Bash(node:*), Read
---

# Scaffold a component

You create the folder of a new component with the plugin's script and then fill it in. The script lays it out
as RCT-02 says; writing the files one by one by hand is how a folder ends up without its `index.ts` or with its
logic in the component file.

## Steps

1. Decide where it goes, by RCT-01:
   - used by one feature: `--feature <feature>` (into `<featuresDir>/<feature>/components/`);
   - used by more than one feature, or generic UI: `--shared`, or `--shared <group>` (`--shared ui`);
   - a part of a complex component: `--in <the parent component's folder>`; add `--single` for a small part
     with no logic and no parts of its own.
2. Decide what it needs: `--hook` when it has any logic — data, effects, handlers, derived values; `--styles`
   when it has styles. A screen always gets `--hook`.
3. Run it from the project's folder:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/scaffold.mjs" component <Name> <where> [--hook] [--styles] [--single] --dir <project>
   ```

4. Fill the files in: markup in `<Name>.tsx`, logic in `use<Name>.ts`, styles from the tokens. When the report
   names a barrel `index.ts` next to the new folder, add the component there if its neighbours are exported.

## What you must not do

- Overwrite or move an existing component with the script; it refuses, and so do you.
- Put a second component into the new folder's root; it belongs in its `components/`.

## Done when

- The folder exists with the layout the script made, and the component does what was asked.
- The `standards-check` hook and the lint report nothing for it.
