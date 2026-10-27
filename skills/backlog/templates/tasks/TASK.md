---
id: {{prefix}}-{{nnn}}
title: {{Verb phrase in the user's terms}}
module: {{ORG}}            # the blueprint's module code; a chore may have —
submodule: {{Sub-module}}
capabilities: [{{ORG-C03}}]  # blueprint capability ids — never paths or anchors; [] for planning and manual tasks
source_items: []           # the capabilities' Source items, e.g. ORG-06
platforms: [web]           # from the platform map in PLANNING.md; exactly one platform
type: feature              # feature | foundation | cross-cutting | bug | chore | spike | polish
priority: P1               # P0 the batch does not work without it · P1 first stage · P2 next · P3 later
size: M                    # S 2–3 subtasks · M 4–6 · L 7–8 (split candidate)
batch: "{{NN}}"
status: todo               # todo | in-progress | done | dropped — ready and blocked are computed, never stored
depends: []                # task ids that must be done first
blocked_by: []             # open blueprint Q- ids the core path depends on; "ext: <one line> (YYYY-MM-DD)" for an outside blocker
review:                    # empty, or needs-review (the blueprint changed under it) / needs-detail (placeholder subtask)
refs: []                   # D-, A-, G-, N- ids and source decisions (S-01 §D23) the capabilities cite
source: blueprint          # blueprint | planning | manual
---

## What the user gets

{{One to three sentences, as behaviour, in the voice of the blueprint capability. Who can do what
when this is done.}}

Delivers [{{ORG-C03}} · {{verb phrase}}](../{{blueprint path}}/modules/{{slug}}.md)

## In scope

- {{the core path}}
- {{the rules from the capability this task delivers}}
- {{the edge cases and state transitions this task delivers}}

## Out of scope → goes to

- {{rule or edge case}} → {{prefix}}-{{nnn}}
- {{the other module's side of this capability}} → {{prefix}}-{{nnn}}
- {{the same capability on another platform}} → {{prefix}}-{{nnn}}

## Subtasks

- [ ] {{prefix}}-{{nnn}}.1 — {{thinnest working path, step one}}
      done when: {{one checkable line about the running product}}
- [ ] {{prefix}}-{{nnn}}.2 — {{thinnest working path, step two}}
      done when: {{…}}
- [ ] {{prefix}}-{{nnn}}.3 — Rules: {{the rules, named}}
      done when: {{each named rule is enforced and visible as a message}}
- [ ] {{prefix}}-{{nnn}}.4 — Edge cases: {{the cases, named}}
      done when: {{each case shows the behaviour the capability describes}}

## Acceptance criteria

- [ ] {{the done-when of every subtask, restated or referenced}}
- [ ] {{access: the roles that may not do it — "Viewer and Auditor cannot approve"; a scoped role — "a Reviewer approves only within their own scope"}}
- [ ] {{a standing criterion from PLANNING.md that applies — "a user of another organisation cannot see this"}}
- [ ] {{N-nn: a non-functional requirement this task could violate}}

## How to verify

{{Three to five lines. Which main flow (or part) this makes possible. The actor, the starting
state, the actions, what should be visible at the end; one allowed and one refused role when access
is restricted. Written for someone who did not do the task.}}

## Notes

- {{risks, unknowns; built on the provisional choice of Q-nnn: …}}
- {{filled during the work: what was learned, what moved elsewhere, done YYYY-MM-DD, pull request links}}
