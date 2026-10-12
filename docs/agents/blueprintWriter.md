# blueprint-writer

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:blueprint-writer` | [/blueprint](../skills/blueprint.md) — phases 4 and 5, one per module in waves of four or five; `module`, also when `restructure`, `feedback` or phase 7 runs it | Read, Glob, Grep, Write, Edit | 0.9.0 |

Files: [agents/blueprintWriter.md](../../agents/blueprintWriter.md) (the definition). Its brief is in
[modules.md](../../skills/blueprint/references/modules.md), under the rules of
[mechanics.md › Subagents](../../skills/blueprint/references/mechanics.md#subagents); the layout it
fills is [templates/modules/MODULE.md](../../skills/blueprint/templates/modules/MODULE.md).

## Why

Phases 4 and 5 describe every module of the product: first the module itself (L2 — purpose, users,
sub-modules, key entities, what it receives and provides, integrations), then its capabilities (L3 —
what actors and the system do, with rules, edge cases, states and an access table). Each module rests
on its sources read in full, and a product has five to a dozen modules; no single context holds that.
So each module goes to its own writer, and the skill merges each wave: it numbers the capabilities,
adds the proposed terms and entities, and puts the open points to the operator.

Three of the skill's rules decide what a writer may do. It describes the product from the sources, the
decisions and the brief — never from the web or from memory. It writes only its one file, so writers in
parallel never collide and only the skill touches the logs, the glossary and the state. And it assigns
no ids, because two agents counting at once would hand out the same number. The tool list holds the
first rule; the other two are instructions.

## What it does

1. Gets a brief naming the goal (L2, the capabilities, or both again for a re-run), the one file, the
   context files, the module's sources to read in full, for capabilities the module's row of the depth
   table, and whether it is one of several writers on the module.
2. Reads the context files, the module file as it is now (the operator may have edited it) and every
   source in full — the sources, not their extracts.
3. Writes the part asked for into the module file, in place, in the template's layout: behaviour only,
   in English, in the glossary's terms, every statement referenced to a source, a decision or an
   assumption.
4. Leaves placeholders where the skill must act: `<code>-C??` on a new capability, `[A-??: …]` for an
   assumption it needs — one `[A-??: edge cases]` per capability for the edge cases no source states —
   and every fork it may not decide under **Open points** in the file, as `[?pending]`: on disk, where a
   summarised context cannot lose it.
5. Returns a summary of at most 15 lines, the open points, and the terms and entities it proposes. As
   one of several writers on a module, it writes nothing and returns its section as text for the skill
   to assemble.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| No web — no search, no fetch | **The tools.** There is no `WebSearch` or `WebFetch`. |
| No command run | **The tools.** There is no `Bash`. |
| Only the one module file | **Its instructions.** `Write` and `Edit` reach any path the session may write: another module, `DECISIONS.md`, `GLOSSARY.md`, `STATE.json`. |
| Nothing written when it is one of several writers | **Its instructions.** |
| Behaviour not implementation, English, the glossary's terms, a reference for every statement, no ids | **Its instructions** — checked afterwards by the skill's merge, its `validate` and the consistency review of phase 6. |

## Limitations

- **`Write` is not limited to one path.** A `PreToolUse` hook that recognises the writer's calls could
  hold it to `modules/` inside a blueprint folder — it could not know the one file the brief named;
  none exists yet.
- **A Word file is read through a copy.** The writer has no `Bash`, so it cannot convert a `.docx`
  itself; the skill converts each Word source once, at intake, into `.sources/S-NN.txt` in the
  blueprint folder, and the brief names that copy. Without a copy — `textutil` is macOS only — the
  writer falls back to the source's extract and says so in its summary; a PDF or Markdown export of the
  source closes the gap.
- **Writers do not see each other.** Two modules written in the same wave can describe one relationship
  or one entity differently; the merge and phase 6 exist to catch it.
- **One module per context.** A module with many long sources may not fit; the skill then gives each
  sub-module its own writer, and those return text for the skill to assemble.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README.
- The behaviour is exercised through the skill — phases 4 and 5 of a `/blueprint` run, with phase 6 as
  the check on what the writers wrote. There is no automated test of a writer's output.
