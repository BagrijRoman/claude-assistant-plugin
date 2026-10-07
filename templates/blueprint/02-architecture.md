# Architecture (L1)

How the product is divided into modules and how they relate — as behaviour, not as technology.
A module is an area of behaviour a user or operator would name. After the phase-3 gate this map is
frozen: a change goes through a decision record and a `module <name>` run.

## Module map

| Module | Responsibility | Main actors | Surfaces | MVP | Ref |
|--------|----------------|-------------|----------|-----|-----|
| {{Accounts}} | {{one line: what it is accountable for}} | {{actors}} | {{web / mobile / both / web · mobile read-only}} | {{yes / no}} | (D-nnn) |

## Relationships

What each module needs from others and gives to others, from the user's point of view.

| Module | Needs from | What | Provides to | What |
|--------|------------|------|-------------|------|
| {{Billing}} | {{Accounts}} | {{the current plan and seat count}} | {{Reporting}} | {{invoice history}} |

## Main flows

End-to-end journeys that cross module boundaries; 3–7 of them. Each step names the module and the
surface. A flow that changes surface says how the user continues.

### Flow 1 — {{name, e.g. "First report from an empty account"}}

1. {{Actor}} {{does X}} — *{{Module}}* · {{surface}}
2. {{System}} {{does Y}} — *{{Module}}*
3. {{Actor}} {{continues on another surface: how they get there}} — *{{Module}}* · {{surface}}
3. …

## Cross-cutting concerns

One sub-section each. State how the concern applies to every module, and where its own rules live.

### Access control
{{Who can see and do what, in general; where roles are managed}} (D-nnn)

### Audit and history
{{What is recorded about changes, for whom}}

### Notifications
{{Channels, who decides what is sent, user control}}

### Data import and export
{{Formats, scope, who may}}

### Localisation
{{Languages, units, regional formats}}

### Errors and recovery
{{How failures are shown; what can be undone}}

### Surface parity
{{Only when there are several surfaces. What a user sees when a capability exists on another
surface only — a message saying where to continue, a read-only view, nothing; how a flow that
changes surface hands over}} (D-nnn)

## Boundaries

- **Not part of the system:** {{things nearby that are explicitly outside}} (D-nnn)
- **Relies on:** {{external systems or services, described by what they provide}}
