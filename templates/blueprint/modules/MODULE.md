# {{Module name}}

Stage: {{MVP / next / later}} · Surfaces: {{web, mobile — from the module map}} · L2: {{done / pending}} · L3: {{done / list-only / pending}}

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

The domain things this module is about — as concepts, with the attributes and states that matter
to behaviour. Not tables, not fields.

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

- [?pending] {{a fork the author could not resolve}}

<!-- L3 — capabilities -->

## Capabilities

A capability is something an actor or the system *does*, named with a verb. Group them by sub-module;
system-initiated behaviour (scheduled, triggered by another module) goes under its own heading
inside the sub-module.

### {{Sub-module}}

#### Capability: {{Verb phrase}}
**Who:** {{actor(s)}}
**Surfaces:** {{inherited from the module unless stated — web, mobile · mobile only · web; mobile read-only}}
**What:** {{the behaviour in 1–3 sentences, as the user experiences it}}
**Rules:**
- {{constraint, limit, permission, validation}}
**Edge cases:**
- {{empty state / conflict / failure}} → {{what happens}}
**States:** {{if the thing has a lifecycle: states and transitions; otherwise omit}}
**Depends on:** {{Module › Sub-module, or capability names}}
**Refs:** (S-nn) (D-nnn) [A-nnn]

#### System: {{Verb phrase — what the system does on its own}}
**Trigger:** {{schedule or event}}
**What:** {{…}}
**Rules:** …
**Edge cases:** …
**Refs:** …
