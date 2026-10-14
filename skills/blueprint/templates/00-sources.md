# Sources

Everything the blueprint is built from. `primary` — written for this project; `secondary` —
related but not about this project (a similar product, a standard, a generic requirement list);
`web` — found during consented research, see [STATE.json](STATE.json) `research`. A folder the
operator named is listed here file by file, a `/research` run as its summary, its register and its
profiles; a source another one carries is registered and not read; a product's name is registered,
and read only with consent. Feedback on the blueprint (`/blueprint feedback`) is a source too, kept verbatim. A
document's location is its path from the project root, in backticks. A source's own id written in a
blueprint id's shape (`D-023`, `ORG-C05`) stays in backticks wherever it is written.

| Id | Type | Location | Read as | Note from the operator | Reliability |
|----|------|----------|---------|------------------------|-------------|
| S-01 | {{document / url / idea / product / person / feedback}} | {{path, URL, or "conversation, YYYY-MM-DD"}} | {{direct / converted / fetched / part — which / export requested / unreadable / not read / register — not read / carried by S-nn / failed — retried on continue}} | {{what the operator said this is}} | {{primary / secondary / web}} |

---

## S-01 — {{short title}}

**Type:** {{type}} · **Location:** {{location}} · **Read as:** {{how}} · **Reliability:** {{reliability}}
{{For type `idea` or `feedback`: the words, verbatim, in the original language, followed by an English rendering; for feedback, also who gave it and when, and an **Items** table — # · item · where it lands · kind · outcome (D-nnn / Q-nnn / answered: … / declined: why / approved / outside).}}

### Extract

A map of the source, not a replacement for it: later phases read the source itself. About 800
words at most besides *Decided* and *Index*, one fact per bullet; the labels stay bold labels.

**Facts**
- {{fact}} — {{where in the source: page / section / file}}

**Requirements**
- {{explicit ask}} — {{where}}

**Constraints**
- {{legal / technical / business / timeline}} — {{where}}

**Actors mentioned**
- {{actor}} — {{how the source describes them}}

**Surfaces mentioned**
- {{where the source puts the actors: a browser at a desk, a phone in the field, email, an API — in its own words}} — {{where}}

**Decided** — for this product only; an earlier version's choices go under Facts, as reference
- {{the source's own id, if it has one}} — {{the decision in one line}} — {{date, where}}

**Index** — only for a catalogue (features, requirements, roles, modules); not capped; one table per catalogue

| Item | Title | Where | Status |
|------|-------|-------|--------|
| {{ORG-06, or the title when the item has no id}} | {{the title as the source writes it}} | {{file › heading}} | {{keep / later / skip, when the source gives one}} |

**Terms**
- *{{term}}* — {{the source's definition or usage}}

**Unclear or contradictory**
- {{point}} — {{where; what is unclear}}

**Not covered**
- {{what a product like this needs that this source is silent on}}

---

## Cross-source notes

- {{Where S-01 and S-02 disagree, and on what}}
- {{A term used differently across sources}}

## Decided in the sources

Decisions the sources record as taken. They are cited (`S-01 §D23`), not asked again; one is
challenged only through a *Revisit?* question, and a change is a `D-` record that supersedes it.
Implementation decisions among them go to the brief's *Decided outside this blueprint*.

| Source | Id | Decision | Kind |
|--------|----|----------|------|
| {{S-01}} | {{D23}} | {{one line}} | {{product / implementation}} |

## Gaps after reading

| Gap | Why it matters | How to close |
|-----|----------------|--------------|
| {{what is missing}} | {{what cannot be written without it}} | {{ask the operator / research could close it / assume for now}} |

## Coverage

Filled in phase 6: every item of every index above, and where the blueprint deals with it. An item
with nothing under *Covered by* is a feature that got lost on the way; the helper script's
`validate` lists every item still without a row.

| Source | Item | Covered by | Note |
|--------|------|------------|------|
| {{S-03}} | {{ORG-06}} | {{ORG-C04 / ORG (L2 only, depth) / module map › ORG / Roles and access › Auditor / N-nn / brief › Out of scope / Q-nnn}} | {{split into two capabilities, merged with…}} |
