# Adequacy review

Would the product these documents describe work for the people in the brief? Findings from phase 7,
each with its outcome. A finding is never deleted: a rejected one keeps its reason, so the next
reader does not raise it again. Reviewed on {{YYYY-MM-DD}}.

## Summary

| Kind | Found | Accepted | Resolved differently | Rejected | Deferred |
|------|-------|----------|----------------------|----------|----------|
| Dead end | | | | | |
| Surface gap | | | | | |
| Unsupported goal | | | | | |
| Orphan | | | | | |
| Unhandled path | | | | | |
| Lifecycle gap | | | | | |
| Stated, not applied | | | | | |
| Missing | | | | | |
| Improvement | | | | | |

Documents changed as a result: {{list}}. Modules re-run with `module <name>`: {{list or none}}.
Phase 6 repeated afterwards: {{yes / no — why}}.

## Findings

### Dead ends

An actor cannot reach something the brief says they want.

| Id | Actor | Wants | Stops at | Suggested resolution | Outcome |
|----|-------|-------|----------|----------------------|---------|
| R-01 | {{actor}} | {{from brief}} | {{module › capability, or "no capability for …"}} | {{add / change …}} | {{accepted → D-nnn / resolved differently → D-nnn / rejected: reason / deferred → Q-nnn}} |

### Surface gaps

A job possible on one surface but not where the actor actually is; a flow that changes surface
without saying how the user continues; a parity rule not honoured.

| Id | Actor or flow | Surface | Gap | Suggested resolution | Outcome |
|----|---------------|---------|-----|----------------------|---------|
| R-02 | {{actor / flow n, step k}} | {{mobile}} | {{"approve a reading" exists on web only; the inspector has no browser in the field}} | {{add the capability on mobile / add a hand-over step / mark intentional in Surface parity}} | |

### Unsupported goals and orphans

| Id | Kind | What | Where | Suggested resolution | Outcome |
|----|------|------|-------|----------------------|---------|
| R-02 | {{unsupported goal / orphan}} | {{goal or capability}} | {{file › heading}} | | |

### Unhandled paths

A flow interrupted, repeated or run concurrently, with no edge case saying what happens.

| Id | Flow | Step | Situation | Suggested resolution | Outcome |
|----|------|------|-----------|----------------------|---------|
| R-03 | {{flow}} | {{n}} | {{interrupted after … / run twice / two actors at once}} | | |

### Lifecycle gaps

| Id | Entity | Gap | Dependents affected | Suggested resolution | Outcome |
|----|--------|-----|---------------------|----------------------|---------|
| R-04 | {{entity}} | {{cannot leave state X / no deletion / …}} | {{what refers to it}} | | |

### Stated, not applied

| Id | Requirement (brief) | Expected to appear in | Suggested resolution | Outcome |
|----|---------------------|-----------------------|----------------------|---------|
| R-05 | {{non-functional requirement}} | {{module / cross-cutting concern}} | | |

### Missing

Standard behaviour for this kind of product that no document mentions.

| Id | What | Seen in | Gap or deliberate? | Suggested resolution | Outcome |
|----|------|---------|--------------------|----------------------|---------|
| R-06 | {{e.g. account removal}} | {{competitor profile / common practice}} | {{gap / should be in out-of-scope}} | | |

### Improvements

Not gaps — ways the design could serve the goals better.

| Id | Proposal | Changes | Serves | Outcome |
|----|----------|---------|--------|---------|
| R-07 | {{what}} | {{documents and headings}} | {{goal or actor}} | |
