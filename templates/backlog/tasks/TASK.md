---
id: T-{{nnn}}
title: {{Verb phrase in the user's terms}}
module: {{Module}}
submodule: {{Sub-module}}
platforms: [web]         # from the platform map in PLANNING.md; one platform unless surfaces share it
type: feature            # feature | foundation | integration | cross-cutting | spike | polish
priority: P1             # P0 the batch does not work without it · P1 MVP · P2 next · P3 later
size: M                  # S 2–3 subtasks · M 4–6 · L 7–8 (split candidate)
batch: "{{NN}}"
status: todo             # todo | ready | in-progress | done | blocked | dropped
depends: []              # task ids that must be done first
blocked_by: []           # blueprint Q- ids; non-empty means status: blocked
refs: []                 # blueprint D- / A- ids the capability cites
capabilities:
  - {{blueprint path}}/modules/{{module}}.md#capability-{{slug}}
source: blueprint        # blueprint | planning | manual
---

## What the user gets

{{One to three sentences, as behaviour, in the voice of the blueprint capability. Who can do what
when this is done.}}

## In scope

- {{the core path}}
- {{the rules from the capability this task delivers}}
- {{the edge cases this task delivers}}

## Out of scope → goes to

- {{rule or edge case}} → T-{{nnn}}
- {{the other module's side of this capability}} → T-{{nnn}}

## Subtasks

- [ ] T-{{nnn}}.1 — {{thinnest working path, step one}}
      done when: {{one checkable line about the running product}}
- [ ] T-{{nnn}}.2 — {{thinnest working path, step two}}
      done when: {{…}}
- [ ] T-{{nnn}}.3 — Rules: {{the rules, named}}
      done when: {{each rule is enforced and visible as a message}}
- [ ] T-{{nnn}}.4 — Edge cases: {{the cases, named}}
      done when: {{each case shows the behaviour the capability describes}}

## Acceptance criteria

- [ ] {{the done-when of every subtask, restated or referenced}}
- [ ] {{cross-cutting criterion that applies, e.g. a user of another organisation cannot see this}}
- [ ] {{non-functional requirement this task could violate, from the brief}}

## How to verify

{{Three to five lines. Which main flow (or part) this makes possible. The actor, the starting
state, the actions, what should be visible at the end. Written for someone who did not do the
task.}}

## Notes

- {{risks, unknowns, provisional parts (which Q- they hang on)}}
- {{filled during the work: what was learned, what moved elsewhere, date done}}
