# Planning

Decisions about the **work** — how the blueprint was cut — kept apart from the blueprint's
decisions about the **product**. Plus everything slicing revealed about the blueprint that the
blueprint should fix.

Cut from the blueprint at [{{blueprint path}}]({{blueprint path}}/README.md), as of {{YYYY-MM-DDTHH:MM}},
on {{YYYY-MM-DD}}. Blueprint done at that time: {{yes / no — phases approved: …}}.

## Decisions

The record is the section of each decision below; `STATE.json.strategy` copies the strategy answers.

| Id | Date | Topic | Choice |
|----|------|-------|--------|
| P-001 | {{YYYY-MM-DD}} | {{Batch size}} | {{small (3–5 tasks)}} |

### P-001 — {{topic}}

**Options offered:** {{1 … · 2 … · 3 …}}
**Choice:** {{as the operator said}}
**Why:** {{their reason}}
**Consequences:** {{which batches or tasks this shaped}}

## Standing criteria

Criteria that many tasks carry — one per cross-cutting concern and per widely applicable
non-functional requirement. A detailer copies them verbatim into every task they apply to, so the
wording is the same in every batch.

| Concern or requirement | Criterion | From batch | Ref |
|------------------------|-----------|------------|-----|
| {{Access control}} | {{a user of another organisation cannot see or change it}} | {{01}} | {{P-nnn, 02-architecture.md}} |
| {{N-04}} | {{every screen works with a keyboard alone}} | {{01}} | {{N-04}} |

## Feedback to the blueprint

Found while slicing; not fixed here. Each row stands alone as a feedback item. Take the open ones to
`/blueprint feedback <this file>` (only this section is meant), or to `/blueprint decide` when a row is
about an open question; `/backlog resync` closes a row once the blueprint answers it.

| # | Date | Blueprint file › heading (capability) | Problem | Change asked | What the backlog did meanwhile | Status |
|---|------|---------------------------------------|---------|--------------|--------------------------------|--------|
| 1 | {{YYYY-MM-DD}} | {{modules/accounts.md › ACC-C07}} | {{too vague to cut / flow step without capability / contradiction}} | {{what the blueprint should say}} | {{COVERAGE gap / cut from the most likely reading, see T-nnn Notes}} | {{open / answered by D-nnn → resynced YYYY-MM-DD / declined (S-nn, item k)}} |

## Resync {{YYYY-MM-DDTHH:MM}}

Blueprint {{old updated}} → {{new updated}}; changelog rows read: {{n}}.

| Change in the blueprint | Touches | Proposed | Outcome |
|-------------------------|---------|----------|---------|
| {{ACC-C09 new / ACC-C03 rules changed / Q-004 closed → D-031 / module REP renamed}} | {{T-nnn or "none yet"}} | {{add to batch NN / move / re-prioritise / update module / re-detail / follow-up / unblock / block / drop / re-cut outline batch}} | {{accepted / done differently: … / left as is}} |
