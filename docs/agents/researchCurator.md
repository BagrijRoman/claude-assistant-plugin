# research-curator

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:research-curator` | [/research](../skills/research.md) — phase 2, one per round, whichever engine ran | Read, Glob, Grep, Write | 0.10.0 |

Files: [agents/researchCurator.md](../../agents/researchCurator.md) (the definition). Its brief is in
[engines.md › The curator's brief](../../skills/research/references/engines.md#the-curators-brief); the
files it writes follow
[templates/summary.md](../../skills/research/templates/summary.md),
[templates/sources.md](../../skills/research/templates/sources.md) and
[templates/competitors/competitor.md](../../skills/research/templates/competitors/competitor.md).

## Why

A research round leaves raw material: deep-research's report and its agents' notes, or the scouts'
notes — long, overlapping, and in deep-research's case a narrative with its own structure. `/research`
needs it as an answer per approved question, one register of the pages used and a profile per
product, in a layout `/blueprint` can read. That is long, noisy work, so it goes to an agent.

The agent has a second purpose. `/research` promises that every fact in a run comes from a page the
research read, and the curator is where that promise is kept: it has no `WebSearch` and no `WebFetch`,
so whatever it writes, it can only have taken from the raw material in front of it — not from a quick
look-up, and not from a page the engine never saw. What it knows from before is excluded by its
instructions; what it could fetch is excluded by its tools.

## What it does

1. Gets a brief naming the run folder, `brief.md`, the round and its questions, the raw material, the
   templates, the files to write (and whether they exist from an earlier round), the next free `R-NN`,
   the run's date and the focus.
2. Reads the brief, the templates, the existing files of the run, and all of the round's raw material.
3. Registers in `sources.md` every page that supports what it will write — one id per page, kept
   across rounds — with title, address, date read (`~` and the run's date when the notes give none),
   kind and use.
4. Writes `summary.md`: a section per question with status, confidence, answer, evidence with ids and
   conflicts; *Answers at a glance*; the landscape table when the focus asks for it; *What this means
   for the project*, marked as its reading; *Open questions*, with the claims that had no page as leads;
   the round's row.
5. Writes a profile per product in scope.
6. Returns the files, each question's status and one-line answer, the source count by kind, the
   conflicts, what it left out, and up to five questions for another round.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| No fact from the web beyond the raw material | **The tools.** There is no `WebSearch` and no `WebFetch`. |
| No command run | **The tools.** There is no `Bash`. |
| No file edited in place | **The tools.** There is no `Edit`; every `Write` replaces a whole file, so a later round reads and writes back what was there. |
| No fact from its own prior knowledge; a claim without a page is a lead, not evidence | **Its instructions.** Nothing mechanical separates what the model knew from what it read. |
| Only `summary.md`, `sources.md` and the profiles, inside the run folder; never `raw/` | **Its instructions.** `Write` reaches any path the session may write. |
| Its reading marked as reading; no decision recommended | **Its instructions.** |

## Limitations

- **The guarantee is about where facts come from, not whether they are right.** It can misread a note,
  and a note can misreport a page; the skill's review checks structure and ids, not meaning.
- **`Write` is not limited to the run folder.** A `PreToolUse` hook that recognises the curator's calls
  could hold it there; none exists yet.
- **It trusts the notes for dates and addresses.** When deep-research's notes do not record when a page
  was read, the run's date stands in, marked `~`.
- **Large rounds are long reads.** A deep-research round with many notes files fills much of the
  curator's context; a round with more than seven questions is split by the skill before it starts.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README, and checks the frontmatter.
- The behaviour is exercised through the skill — a `/research` run. There is no automated test of a
  summary.
