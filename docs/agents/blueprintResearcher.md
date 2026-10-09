# blueprint-researcher

| Agent | Used by | Tools | Since |
|-------|---------|-------|-------|
| `dev-assistant:blueprint-researcher` | [/blueprint](../skills/blueprint.md) — only after the operator's consent: the research offer of phase 1, or a fork that wants a "like <product>" option no profile covers; one per product | Read, Write, WebSearch, WebFetch | 0.9.0 |

Files: [agents/blueprintResearcher.md](../../agents/blueprintResearcher.md) (the definition). Its brief
is in [intake.md › Phase 1](../../skills/blueprint/references/intake.md#phase-1--reading-the-input),
step 6, and in [SKILL.md › Competitor and market research](../../skills/blueprint/SKILL.md), under the
rules of [mechanics.md › Subagents](../../skills/blueprint/references/mechanics.md#subagents); the
profile's layout is
[templates/references/competitors/COMPETITOR.md](../../skills/blueprint/templates/references/competitors/COMPETITOR.md).

## Why

`/blueprint` may look at how comparable products solve a problem, but never on its own initiative: the
operator consents first, to named products and named gaps, and the consent is recorded in
`STATE.json`. The research itself is noisy — searches, many pages, most of them useless — so each
product goes to its own researcher, which writes what it found as a profile in
`references/competitors/` and returns the pages it used. The skill registers each page as a source with
reliability `web`, puts the source ids into the profile, and from then on can offer "like <product>"
options in its questions.

Of the four blueprint agents this is the only one that can search the web: the reader may only fetch
an address it was given, and the writer and the reviewer have no web tools at all. Which tool goes to
which role is what keeps research inside the consent.

## What it does

1. Gets a brief naming the product, the gaps it may research, the template, the profile's path, today's
   date and the context files.
2. Reads the template, the context and the profile, if one exists — an earlier run or the operator may
   have written it; it extends the profile rather than starting over.
3. Searches and fetches for those gaps, about that product, preferring the product's own pages.
4. Writes the whole profile in the template's layout: every fact from a page read in this run, marked
   `[web]`, its source written as `(S-?? <address>)` for the skill to replace; "—" for not found, never
   "does not have".
5. Returns the profile's path, the pages used — address, title, date read, the gaps each answered — and
   the gaps answered and not answered.

## What its tools guarantee, and what stays a rule

| Rule | Held by |
|------|---------|
| No command run | **The tools.** There is no `Bash`. |
| No file edited in place | **The tools.** There is no `Edit`; every `Write` replaces a whole file. |
| Only the profile at the brief's path | **Its instructions.** `Write` reaches any path the session may write — and, replacing whole files, could overwrite one. |
| Only the consented product and gaps | **Its instructions.** `WebSearch` and `WebFetch` take any query and any address. The consent itself is the skill's step, taken before the agent starts. |
| Every web fact marked `[web]`, public pages only, no sources registered, no ids assigned | **Its instructions.** |

## Limitations

- **`Write` is not limited to one path**, and a whole-file write can erase what an earlier run or the
  operator put into the profile; the instructions say to read it first and write it back whole. A
  `PreToolUse` hook that recognises the researcher's calls could hold it to `references/competitors/`;
  none exists yet.
- **The scope is not enforced.** Nothing but the instructions stops a search about another product or
  another question; the pages it returns are the record of what it used.
- **A web page is not a fact about the product.** Marketing pages overstate, help pages go stale, and
  `WebFetch` returns a model's reading of a page rather than the page. The `[web]` mark and the date
  tell a reader how far to trust it.
- **Without `WebSearch`** in a session, the agent still starts, can fetch only the addresses it knows —
  the product's own site from the brief — and says so.
- **The date comes from the brief.** The agent cannot run `date`; when the brief gives none, the pages
  are listed as `date not given` and the skill fills it in.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) requires this page, its row in the
  [agents index](README.md) and its row in the root README.
- The behaviour is exercised through the skill — a research round of a `/blueprint` run. There is no
  automated test of a profile.
