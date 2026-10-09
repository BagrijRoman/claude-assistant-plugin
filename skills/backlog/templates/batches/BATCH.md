# Batch {{NN}} — {{What it delivers}}

{{MVP / in scope / next / later}} · {{Flow 1 — name / widening of batch NN}} · detailed: {{yes / no}} · {{outline / todo / in progress / complete / closed YYYY-MM-DD}}

## Goal

{{One line: the step forward this batch makes.}}

## What works after this batch

{{A short paragraph a user could act on: who can now do what, end to end, that they could not
before, and on which platform(s). If this cannot be written as something a user does, the batch is
cut wrong. This is also what to demo when the batch is done.}}

## Flow → capabilities

Only in a batch that cuts a flow: every step of the flow, the capability that delivers it, the task.

| Step | Capability | Task |
|------|------------|------|
| {{1. Actor does X — Module · surface}} | {{ORG-C03}} | T-{{nnn}} |

## Tasks

Rows in the execution order agreed at the outline gate; `next` breaks ties by it. A row whose task has
a file is refreshed from that file; a row without one is an outline task, kept as written until
`detail` writes its file. Type: feature · foundation · cross-cutting · bug · chore · spike · polish.

| # | Task | Title | Capabilities | Module | Platforms | Type | Priority | Size | Depends | Status |
|---|------|-------|--------------|--------|-----------|------|----------|------|---------|--------|
| 1 | [T-{{nnn}}](../tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | — | {{ORG}} | {{web}} | foundation | P0 | S | — | todo |
| 2 | [T-{{nnn}}](../tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | {{ORG-C03}} | {{ORG}} | {{web}} | feature | P0 | M | T-{{nnn}} | in progress |
| 3 | T-{{nnn}} | {{title — outline, no file yet}} | {{ORG-C04}} | {{ORG}} | {{web}} | feature | P1 | M? | T-{{nnn}} | outline |

## Not in this batch

Things a reader might expect here and where they are instead.

- {{rules and edge cases of X}} → batch {{NN+1}}, T-{{nnn}}
- {{flow 2}} → batch {{NN+2}}

## Notes

- {{why a task was moved in or out; a forward dependency that was resolved and how}}
- {{detailed from blueprint YYYY-MM-DDTHH:MM · closed YYYY-MM-DD — what works confirmed}}
