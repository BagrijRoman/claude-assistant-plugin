# Brief

Every statement carries its reference: `(S-nn)` a source, `(D-nnn)` a decision, `[A-nnn]` an
assumption. A statement without one does not belong here.

## Idea

{{What the product is and the problem it solves — two paragraphs at most. Who has the problem today,
what they do about it now, what changes with this product.}} (S-01)

## Audience and actors

| Actor | Who they are | What they want from the product | Surfaces | Ref |
|-------|--------------|----------------------------------|----------|-----|
| {{Actor}} | {{one line}} | {{one line}} | {{web / mobile / both}} | (S-01) |

Actors are the roles the product distinguishes, not job titles. Include who operates and who pays
if they differ from who uses.

## Surfaces

Where actors meet the product. Decided, never assumed (D-nnn); every later document uses these
names. Constraints, not platforms: whether "mobile" is a native app or an installable web page is
decided when the work is cut, from what is written here.

| Surface | Actors on it | Main jobs there | Constraints | Ref |
|---------|--------------|-----------------|-------------|-----|
| {{web}} | {{actors}} | {{what they mostly do here}} | {{large screen, bulk work, …}} | (D-nnn) |
| {{mobile}} | {{actors}} | {{…}} | {{offline in the field, camera, store distribution, …}} | (D-nnn) |

**Default rule for modules on several surfaces:** {{every capability is on all of them unless it
says otherwise}} (D-nnn)

## Goals

| Goal | How we would know | Ref |
|------|-------------------|-----|
| {{outcome}} | {{measure, or "no measure in sources" + [A-nnn]}} | (S-02) |

## Out of scope

Things the product deliberately does not do. As valuable as the goals: every line here is a
discussion that will not have to happen later.

- {{Not doing X}} — {{why}} (D-001)

## Non-functional requirements

Only what sources or decisions support; otherwise it is a question.

| Area | Requirement | Ref |
|------|-------------|-----|
| Scale | {{users, data volume, peak}} | |
| Devices & browsers | {{per surface: screen sizes, browsers, OS versions the sources name — the surfaces themselves are decided above}} | |
| Availability & offline | | |
| Security & privacy | | |
| Compliance | {{regulations, standards}} | |
| Accessibility | | |
| Languages & regions | | |
| Performance | {{what must feel instant}} | |

## Comparable products

| Product | Relevance | Profile |
|---------|-----------|---------|
| {{Name}} | {{what it does similarly or differently}} | [references/competitors/{{name}}.md](references/competitors/{{name}}.md) or — |

## Key constraints

- {{budget, deadline, team, existing systems that must stay, contractual}} (S-nn)
