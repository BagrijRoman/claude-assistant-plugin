# {{project name}} — Blueprint

Product-design documentation: what the product does and why, from idea to capabilities.
Produced with the `blueprint` skill; maintained by hand from here on. Phase: **{{phase}}** ·
depth: {{depth}}; the time of the last change is `updated` in [STATE.json](STATE.json). The whole
blueprint as one document, for reading outside this folder: `/blueprint export`. Every count below
is `STATE.json.counts`, written by the skill's script.

## Documents

| File | What it holds | Status |
|------|---------------|--------|
| [00-sources.md](00-sources.md) | Every input ({{n}} sources) with its extract; the decisions the sources took; gaps; coverage of their items | {{status}} |
| [01-brief.md](01-brief.md) | Idea, audience and actors, surfaces, goals ({{n}}), out of scope, non-functional requirements ({{n}}), risks ({{n}}), decided outside this blueprint | {{status}} |
| [02-architecture.md](02-architecture.md) | Module map, relationships, main flows, domain model, roles and access, cross-cutting concerns | {{status}} |
| [03-roadmap.md](03-roadmap.md) | Stage per module and surface | {{status}} |
| [04-review.md](04-review.md) | Adequacy review: gaps found, improvements offered, outcome of each | {{status}} |
| [GLOSSARY.md](GLOSSARY.md) | The vocabulary every document uses | — |
| [CHANGELOG.md](CHANGELOG.md) | Every change after the blueprint was done | — |

## Modules

{{n}} capabilities in all.

| Module | Code | Stage | L2 | L3 | File |
|--------|------|-------|----|----|------|
| {{Module}} | {{ORG}} | {{stage}} | {{done / failed / pending}} | {{done / list-only / none / failed / pending}} | [modules/{{slug}}.md](modules/{{slug}}.md) |

## Logs

| File | Count |
|------|-------|
| [DECISIONS.md](DECISIONS.md) | {{n}} decisions |
| [ASSUMPTIONS.md](ASSUMPTIONS.md) | {{n}} assumptions |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | {{n}} open |

## References

| Profile | Used for |
|---------|----------|
| [references/competitors/{{name}}.md](references/competitors/{{name}}.md) | {{one line}} |

## How to read the references

`(S-nn)` a fact from a source · `(S-nn §D14)` a decision or an item the source itself records, by
the source's own id · `(D-nnn)` the outcome of a decision · `[A-nnn]` an assumption made without
asking, reviewable · `[?Q-nnn]` an open question — the text around it is provisional · `G-nn`,
`N-nn`, `RK-nn` a goal, a non-functional requirement, a risk of the brief · `ORG-Cnn` a capability,
by its id · `[web]` found on the web during consented research, not in the operator's input.
