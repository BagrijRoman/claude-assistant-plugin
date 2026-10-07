# Planning

Decisions about the **work** — how the blueprint was cut — kept apart from the blueprint's
decisions about the **product**. Plus everything slicing revealed about the blueprint that the
blueprint should fix.

Cut from blueprint `{{path}}` on {{YYYY-MM-DD}}; adequacy review approved at that time: {{yes / no}}.

## Decisions

| Id | Date | Topic | Choice | Why |
|----|------|-------|--------|-----|
| P-001 | {{YYYY-MM-DD}} | Batch size | {{small (3–5)}} | {{one developer plus an agent; frequent "what works" moments}} |
| P-002 | | Cross-cutting concerns | | |
| P-003 | | Foundation depth | | |
| P-004 | | Batch 1 flow | | |
| P-005 | | Platform map (per surface) | {{web → web · mobile → ios + android}} | {{the brief requires store distribution and offline for the field}} |
| P-006 | | Platform order | {{web first, mobile from batch 04}} | |

### P-00n — {{topic}}

**Options offered:** {{1 … · 2 … · 3 …}}
**Choice:** {{as the operator said}}
**Why:** {{their reason}}
**Consequences:** {{which batches or tasks this shaped}}

## Feedback to the blueprint

Found while slicing; not fixed here. Each row waits for `/blueprint decide` or
`/blueprint module <name>`, then `/backlog resync`.

| Date | Blueprint file › heading | Problem | What the backlog did meanwhile | Status |
|------|--------------------------|---------|--------------------------------|--------|
| {{YYYY-MM-DD}} | {{modules/x.md › Capability: …}} | {{too vague to cut / flow step without capability / contradiction}} | {{COVERAGE gap / cut from most likely reading, see T-nnn Notes}} | {{open / fixed in blueprint → resynced}} |

## Resync {{YYYY-MM-DD}}

| Change in the blueprint | Touches | Proposed | Outcome |
|-------------------------|---------|----------|---------|
| {{new capability … / Q-nnn closed / D-nnn added}} | {{T-nnn or "none yet"}} | {{add to batch NN / unblock / re-detail / drop}} | {{accepted / done differently: … / left as is}} |
