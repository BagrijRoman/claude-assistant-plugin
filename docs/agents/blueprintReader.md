# blueprint-reader

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:blueprint-reader` | [/blueprint](../skills/blueprint.md) — phase 1, one per document or URL; again for a source that changed since it was read | Read, Glob, Grep, WebFetch | 0.9.0 |

Files: [agents/blueprintReader.md](../../agents/blueprintReader.md) (the definition). Its brief is in
[intake.md › Phase 1](../../skills/blueprint/references/intake.md#phase-1--reading-the-input), under the
rules of [mechanics.md › Subagents](../../skills/blueprint/references/mechanics.md#subagents); the
extract lands in the source's entry of
[templates/00-sources.md](../../skills/blueprint/templates/00-sources.md).

## Why

Phase 1 of `/blueprint` reads everything the operator gave — often a dozen documents of different ages,
some long, some not in English. Read in the main conversation, they would fill its context before the
brief is written. So each document or URL goes to its own reader, which returns a map of it — facts,
requirements, constraints, actors, surfaces, the decisions it records, an index of its items, terms,
unclear points and what it leaves out — and the skill merges the maps into `00-sources.md`. Later
phases use the map to find their way back to the source, and read the source itself.

The skill has two rules about what reading is not. Reading the operator's input is not research: the
reader fetches the address it was given and never searches, because a search needs the operator's
consent. And reading leaves no trace: the reader writes nothing and runs nothing. Its tool list holds
both rules completely. A Word file, which needs a converter, is converted once by the skill itself, at
intake, into a copy in the blueprint folder's `.sources/` — so the reader needs no shell.

It runs on Sonnet (`model: sonnet`, since 0.14.0). Readers are many — one per source — and turning a
source into a map under fixed labels is well within Sonnet. It is not put on a smaller model: its
extract feeds the gaps, the brief and the split into modules, so a requirement it drops or attributes to
the wrong actor travels through the whole blueprint, and the saving would be small next to the writers'.

## What it does

1. Gets a brief naming one source — its `S-` id and a file path or URL — and the headings to return.
2. Reads all of it: Markdown, text, PDF and images with `Read`; a Word file (`.docx`, `.doc`, `.rtf`,
   `.odt`) from the converted copy the brief names; a URL with `WebFetch`, exactly as given, without
   following its links.
3. Returns one status line — read directly, from the converted copy, fetched, read in part, or
   unreadable, with the reason — then the extract under the brief's labels, written as the template's
   bold labels so that the skill's script finds the index, then notes for the skill when there are any:
   links not followed, parts not read, what changed since the earlier extract.

Its rules for the extract: everything in English, with the original quoted where a term matters; every
fact with its place in the source; *Decided* holds only the decisions taken for this product, one line
each — an earlier version's choices go under *Facts*, as reference; the *Index* of a catalogue has one
row per item, keyed by the item's id or, when it has none, its title, and no cap; the other labels
take about 800 words together at most; the source's own ids are kept as written, and no new ones are
made. A folder is not read as one source, and a format it cannot read is
reported as unreadable with the export that would help — never guessed from its name.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| No web search | **The tools.** There is no `WebSearch`. |
| No file written or changed | **The tools.** There is no `Write`, `Edit` or `Bash`. |
| No command run | **The tools.** There is no `Bash`. |
| Only the URL the brief gives | **Its instructions.** `WebFetch` takes any address; following a link, or fetching a search page, is possible. |
| English, places in the source, *Decided* for this product only, an uncapped *Index*, bold labels, the word budget | **Its instructions** — the index's form is also checked by the skill's `validate`. |

The plugin's hooks and the project's permission rules still apply to its calls:
[secret-files-guard](../hooks/secretFilesGuard.md) blocks a `.env` read through `Read` as it does in
the main conversation.

## Limitations

- **A Word file needs the skill's copy.** The skill makes it with macOS `textutil`; elsewhere a `.docx`
  has no copy, comes back unreadable, and the operator is asked for a PDF or Markdown export.
- **`WebFetch` does not hand over the raw page.** It passes the page through a model with a prompt and
  returns that model's answer, shortened when the page is long, so a URL's extract is less exact than a
  file's. A page behind a sign-in, or one drawn by scripts, may come back empty: unreadable.
- **One context per source.** A very long document may not fit; the reader then says which part it
  read, and the skill can split the source.
- **A missed item is invisible downstream.** The coverage check of phase 6 works from the indexes, so
  an item the reader left out of an index is checked by nothing; the writers, who read the sources in
  full, and the operator reading `00-sources.md` are what remain.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README.
- The behaviour is exercised through the skill — phase 1 of a `/blueprint` run. There is no automated
  test of what a reader returns.
