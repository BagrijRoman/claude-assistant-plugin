---
id: {{prefix}}-{{nnn}}
title: {{Verb phrase in the user's terms}}
module: {{ORG}}            # the blueprint's module code
submodule: {{Sub-module}}
capabilities: [{{ORG-C03}}]  # the capabilities the feature delivers; each child cites those it builds
source_items: []           # the capabilities' Source items, e.g. ORG-06
platforms: [server, web, mobile]  # every platform its children are built on
type: group                # a parent: it groups the tasks of one feature, one per repository and platform
priority: P1               # the highest of its children's
batch: "{{NN}}"            # the batch of its first child; a later child may sit in a later batch
status: todo               # todo | in-progress (written by render once a child starts) | done (only by done) | dropped
refs: []                   # D-, A-, G-, N- ids and source decisions (S-01 §D23) the capabilities cite
source: blueprint          # blueprint | planning | manual
---

## What the user gets

{{One to three sentences, as behaviour, in the voice of the blueprint capability — the whole feature, on
every platform its children build. Who can do what when every child is done.}}

Delivers [{{ORG-C03}} · {{verb phrase}}](../{{blueprint path}}/modules/{{slug}}.md)

## Children

One task per repository and platform, each naming this group in `parent`; the backend's comes first and
the others depend on it.

- {{prefix}}-{{nnn}} — server · {{backend}} — {{what the backend side delivers: the rules, the data, the API the screens use}}
- {{prefix}}-{{nnn}} — web · {{frontend}} — {{what the web side delivers}}
- {{prefix}}-{{nnn}} — mobile · {{mobile}} — {{what the mobile side delivers}}, batch {{NN}}

## Out of scope → goes to

- {{rule or edge case}} → {{prefix}}-{{nnn}}

## Acceptance criteria

Confirmed with `/backlog done` once every child is done: the feature as a whole, across its children.

- [ ] {{the flow step works end to end on every platform of the children: the actor does X and sees Y}}
- [ ] {{access: the roles that may not do it, enforced by the server whatever the screen shows}}
- [ ] {{N-nn: a non-functional requirement the feature as a whole could violate}}

## How to verify

{{Three to five lines: the main flow (or part) the feature makes possible, run once on each platform of its
children against the same backend — the actor, the starting state, the actions, what should be visible.}}

## Notes

- {{why the feature is split this way; a child moved to a later batch and why}}
