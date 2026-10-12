# {{Module name}}

Code: {{ORG}} · Stage: {{MVP / next / later / in scope}} · Surfaces: {{web, mobile — from the module map}}
Sources: {{S-03 §ORG, S-05}} — read in full by whoever writes this file

<!-- L2 — the module -->

## Purpose

{{Why this module exists and for whom — two or three sentences. What would be missing from the
product without it.}} (S-nn, D-nnn)

## Users

| Actor | Surface | What they want here | Ref |
|-------|---------|---------------------|-----|
| {{Actor}} | {{web / mobile}} | {{one line}} | |

{{If the module behaves differently per surface, say how in one or two sentences here; otherwise
omit.}}

## Sub-modules

| Sub-module | What it covers | Ref |
|------------|----------------|-----|
| {{Name}} | {{one line}} | |

## Key entities

The entities of the domain model (`02-architecture.md › Domain model`) this module owns — as
concepts, with the attributes and states that matter to behaviour. Not tables, not fields. A new
entity is proposed under Open points, not added here on its own.

### {{Entity}}
{{What it represents. Important attributes in prose. States, if it has a lifecycle:
`draft → submitted → approved`, and what moves it.}} (S-nn)

## Receives from / provides to

| Direction | Module | What | Ref |
|-----------|--------|------|-----|
| receives from | {{Module}} | {{what, as behaviour: "the list of facilities the user may see"}} | |
| provides to | {{Module}} | {{what}} | |

## External integrations

| System | What the product needs from it / gives to it | Ref |
|--------|----------------------------------------------|-----|
| {{e.g. an email provider}} | {{behaviour, not protocol}} | |

## Open points

Forks the author could not resolve, and proposed terms or entities. The orchestrator turns each into
a question, a decision, a glossary entry or a domain-model entity — an accepted entity is written
under Key entities here — and removes it from Open points.

- {{[?pending] a fork the author could not resolve}}

<!-- L3 — capabilities -->

## Capabilities

A capability is something an actor or the system *does*, named with a verb. Group them by sub-module.
Every capability has an id — `{{ORG}}-C<NN>`, never changed or reused, even when the capability
moves to another module — and uses exactly this block. Behaviour the system starts on its own says `System:` in its heading. A
capability the depth only lists keeps its heading, **Who**, **Source**, **Stage** when it differs,
and **What** — no rules or edge cases yet.

### {{Sub-module}}

#### {{ORG-C01}} · {{Verb phrase}}
**Who:** {{actor(s)}}
**Surfaces:** {{inherited from the module unless stated — web, mobile · mobile only · web; mobile read-only}}
**Source:** {{the source items it delivers, by their own ids — ORG-06, S-03 §4.2, or S-03 §ORG-06 when two sources share ids — or "none, D-nnn"}}
**Stage:** {{only when it differs from the module's — e.g. later (S-03 §ORG-07: later)}}
**What:** {{the behaviour in 1–3 sentences, as the user experiences it}}
**Rules:**
- {{constraint, limit, permission, validation}} (S-nn)
**Edge cases:**
- {{empty state / conflict / failure}} → {{what happens}}
**States:** {{if the thing has a lifecycle: states and transitions; otherwise omit}}
**Depends on:** {{other capability ids, or Module › Sub-module}}
**Refs:** (S-nn) (D-nnn) {{G-nn / N-nn when it serves a goal or must meet a requirement of the brief}} [A-nnn — one assumption covers the edge cases no source states]

#### {{ORG-C02}} · System: {{Verb phrase — what the system does on its own}}
**Trigger:** {{schedule or event}}
**Source:** {{…}}
**What:** {{…}}
**Rules:** …
**Edge cases:** …
**Refs:** …

## Access

Each capability against the roles of `02-architecture.md › Roles and access`: ✓ / own only / —, or
the values of the source's permission matrix when there is one, defined here under the table.

| Capability | {{Administrator}} | {{Member}} | {{Viewer}} |
|------------|-------------------|------------|------------|
| {{ORG-C01 short name}} | ✓ | own only | — |
