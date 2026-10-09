# Roadmap

Which modules are needed first. With the depth chosen at the start (`depth` in
[STATE.json](STATE.json)), this sets how deep each module is described: MVP or in-scope modules first
and fullest.

Stages are MVP / next / later — or, while the build order is still open, in scope / later / out of
scope. A capability may carry a stage of its own when a source sets one per feature (keep / later /
skip); otherwise it inherits its module's.

One row per module and surface, so "web first, mobile next" is two rows of one module.

| Module | Surface | Stage | Why here | Ref |
|--------|---------|-------|----------|-----|
| {{Accounts}} | {{web}} | MVP | {{nothing works without it}} | (D-nnn) |
| {{Accounts}} | {{mobile}} | next | {{field actors sign in once the collection flow exists}} | |
| {{Reporting}} | {{web}} | next | {{needs data from two MVP cycles first}} | |
| {{Marketplace}} | {{web}} | later | {{depends on an audience that does not exist yet}} | |

## MVP — or what is in scope — in one paragraph

{{What a user can do end to end when only the MVP (or in-scope) modules exist. If this paragraph
does not describe something useful, the line is in the wrong place.}}

## Stage boundaries

- **MVP → next:** {{what has to be true to move on}}
- **next → later:** {{…}}
