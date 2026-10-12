# Brief

Every statement carries its reference: `(S-nn)` a source, `(D-nnn)` a decision, `[A-nnn]` an
assumption. A statement without one does not belong here. Goals (`G-nn`), non-functional
requirements (`N-nn`) and risks (`RK-nn`) have ids of their own, so capabilities and reviews can
point at them.

## Idea

{{What the product is and the problem it solves — two paragraphs at most. Who has the problem today,
what they do about it now, what changes with this product.}} (S-nn)

## Audience and actors

| Actor | Who they are | What they want from the product | Surfaces | Ref |
|-------|--------------|----------------------------------|----------|-----|
| {{Actor}} | {{one line}} | {{one line}} | {{web / mobile / both}} | (S-nn) |

Actors are the roles the product distinguishes, not job titles. Include who operates and who pays
if they differ from who uses.

## Surfaces

Where actors meet the product. Decided, never assumed — with the operator (D-nnn), or by a source
(S-nn §Dn); every later document uses these names. Constraints, not platforms: whether "mobile" is a native app or an installable web page is
decided when the work is cut, from what is written here.

| Surface | Actors on it | Main jobs there | Constraints | Ref |
|---------|--------------|-----------------|-------------|-----|
| {{web}} | {{actors}} | {{what they mostly do here}} | {{large screen, bulk work, …}} | (D-nnn) |
| {{mobile}} | {{actors}} | {{…}} | {{offline in the field, camera, store distribution, …}} | (D-nnn) |

**Default rule for modules on several surfaces:** {{every capability is on all of them unless it
says otherwise}} (D-nnn, or [A-nnn] when a source decided the surfaces but not the rule)

## Goals

| Id | Goal | How we would know | Ref |
|----|------|-------------------|-----|
| {{G-01}} | {{outcome}} | {{measure, or "no measure in sources" + [A-nnn]}} | (S-nn) |

## Out of scope

Things the product deliberately does not do. As valuable as the goals: every line here is a
discussion that will not have to happen later.

- {{Not doing X}} — {{why}} (D-nnn)
- {{A feature a source marks as skipped}} — {{the source's reason}} (S-nn §{{ID}})

## Non-functional requirements

Only what sources or decisions support; otherwise it is a question. The areas to go through: scale,
devices and browsers (per surface — the surfaces themselves are decided above), availability and
offline, security and privacy, compliance, accessibility, languages and regions, performance.

| Id | Area | Requirement | Ref |
|----|------|-------------|-----|
| {{N-01}} | {{Scale}} | {{users, data volume, peak}} | (S-nn) |
| {{N-02}} | {{Security & privacy}} | {{who may see personal data; how long it is kept; how it is removed}} | (S-nn) |

## Risks

What could make the product fail even if it is built exactly as described: a regulation that may
change, data that may not exist, a dependency, adoption. Named by the sources or the operator; one
the blueprint suspects is an assumption until the operator confirms it.

| Id | Risk | Likelihood | Impact | What reduces it | Ref |
|----|------|------------|--------|-----------------|-----|
| {{RK-01}} | {{what could happen}} | {{low / medium / high}} | {{low / medium / high}} | {{a capability, a decision, a check before building}} | (S-nn) |

## Decided outside this blueprint

Implementation decisions the sources already took — stack, data store, hosting, an app or no app.
Not discussed here, and the blueprint still describes behaviour only; listed so that nobody who
builds from it contradicts them.

| Decision | What it fixes | Ref |
|----------|---------------|-----|
| {{e.g. a React frontend, a Node backend, PostgreSQL}} | {{the stack}} | (S-nn §{{ID}}) |
| {{e.g. one web app with layouts for desktop, tablet and phone}} | {{no native app: the mobile surface is the same web app}} | (S-nn §{{ID}}) |

## Comparable products

| Product | Relevance | Profile |
|---------|-----------|---------|
| {{Name}} | {{what it does similarly or differently}} | [references/competitors/{{name}}.md](references/competitors/{{name}}.md) or — |

## Key constraints

- {{budget, deadline, team, existing systems that must stay, contractual}} (S-nn)
