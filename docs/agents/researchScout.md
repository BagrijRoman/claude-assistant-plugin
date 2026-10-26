# research-scout

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:research-scout` | [/research](../skills/research.md) — phase 1, only when deep-research is not available, failed twice on a round, or the operator asks; one per question group, at most five | Read, Write, WebSearch, WebFetch | 0.10.0 |

Files: [agents/researchScout.md](../../agents/researchScout.md) (the definition). Its brief is in
[engines.md › Fallback — the scouts](../../skills/research/references/engines.md#fallback--the-scouts).

## Why

`/research` delegates the search to the `deep-research` skill, which is Anthropic's and may be absent
from a session — another account, another plan, a setup without it. The skill must still work there,
so it has a fallback engine of its own: the questions split into groups, one scout per group, each
searching the web for its questions and writing what it found as notes in the run's raw folder. The
curator then reads those notes exactly as it reads deep-research's.

Unlike deep-research's agents, which are `general-purpose`, the scout's tools are narrow: it can
search, fetch, read and write, but cannot run a command or edit a file in place. And its rules —
public pages only, every finding with its page and date, "not found" never "does not have", the
approved questions and nothing else — are its standing instructions, not only text in a prompt.

## What it does

1. Gets a brief naming the run folder and its notes path, its questions with their ids (and the
   product, with the *competitors* focus), the brief's why, context, constraints and out of scope — or
   the path of `brief.md` — and today's date.
2. Searches and fetches for its questions: a product's own pages first for what it does, primary
   sources first for a market or a domain; reviews, analysts, news and forums for the rest, named as
   such.
3. Writes its notes file whole: a section per question, one finding per bullet with address, title and
   date read, what was not found; then the pages used with their kind and how each was read (full,
   snippet, archived, official mirror). A blocked page is not worked around: the scout falls back to an
   archived copy, an official mirror or the search snippet, and says so.
4. Returns the path, the pages used, the questions answered and not answered with the reason, and up to
   three leads outside its scope.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| No command run | **The tools.** There is no `Bash`. |
| No file edited in place | **The tools.** There is no `Edit`; every `Write` replaces a whole file. |
| Only its notes file | **Its instructions.** `Write` reaches any path the session may write. |
| Only the approved questions and product | **Its instructions.** `WebSearch` and `WebFetch` take any query and any address. The approval itself is the skill's step, taken before the agent starts. |
| Public pages only; every finding with its page and date; "not found" never "does not have" | **Its instructions.** |
| No getting around a site's blocking; how each page was read is recorded | **Its instructions**, and partly **the tools**: without `Bash` there is no `curl` or scripted fetch to try. |

## Limitations

- **Less breadth than deep-research.** A scout does not plan subtopics or compare its findings with
  other scouts'; the synthesis is the curator's alone.
- **`Write` is not limited to one path**, and the scope is not enforced; the notes file and the pages
  it returns are the record of what it did.
- **A web page is not a fact.** Marketing pages overstate, help pages go stale, and `WebFetch` returns a
  model's reading of a page. The date and kind of each page tell a reader how far to trust it.
- **Without `WebSearch`** in a session, the scout can fetch only the addresses in its brief, and says so.
- **The date comes from the brief.** The scout cannot run `date`.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README, and checks the frontmatter.
- The behaviour is exercised through the skill — a `/research` run without deep-research. There is no
  automated test of a scout's notes.
