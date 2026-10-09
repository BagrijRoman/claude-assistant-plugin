# Blueprint — modes outside the phases

Read `mechanics.md` first. Every mode that writes ends with `stamp`; after `done`, it also adds its
`CHANGELOG.md` lines first (`mechanics.md › After done`). `status` and `export` change nothing in the
blueprint and do not stamp.

## status

List what changed by hand since the last write (`mechanics.md › Hand edits`), read `STATE.json`, give
the counts it holds (run `validate` too and report its errors as a list), list the open questions by
title and the modules with their L2/L3 state, and name any unit marked failed. Report and stop; write
nothing — not even `updated`.

## continue after done

`/blueprint` on a blueprint whose `phase` is `"done"` has no phase to resume. Run `changed`; read what
it lists and add a `CHANGELOG.md` line, mode `hand edit`, for each change; offer `module` for the
modules whose sources changed (`mechanics.md › Hand edits`); run `stamp`. Then report as `status`
does, and offer what can follow: `decide` for the open questions, `feedback` for comments, `module` or
`restructure` for a change, `export` for one document to send.

## module

`/blueprint module <name>` — find the module in `STATE.json` by its name, slug or code; re-run phase
4 and then 5 for that module only (`modules.md`), with the extra instruction to the writer to keep
what is in the file unless a decision or the operator's edit contradicts it, and to keep every
capability id. Before phase 4 is approved, only phase 4 is re-run. Gate once at the end, unless it
runs inside `restructure`, `feedback` or phase 7, which gate once for everything they ran. Use it after
a `D-` record changed the module, or when the operator edited the file and wants it re-checked. A
module that does not exist yet is `restructure`'s job.

## decide

Read `OPEN-QUESTIONS.md`; for each open `Q-`, present it as a question round (its original options,
plus what has been learned since). A closed question gets a `D-` record; the `[?Q-NNN]` markers in the
text are replaced with the outcome and `(D-NNN)`; every row of `00-sources.md › Coverage` that names
the question is repointed to what the decision produced; the question's index row gets the status
`closed → D-NNN` in its Status cell — the cell the script reads — and its section the same Status
line. A decision that changes a module's shape is applied through `modes.md › module`, one that needs
a new, split or merged module through `modes.md › restructure`. Then regenerate `README.md`. Questions
the operator still defers stay open. No gate; report what closed, then `stamp`.

## restructure

The only way to add, split, merge, rename or remove a module once the map is frozen; a phase-7 finding
or a piece of feedback may lead here too.

1. Ask what and why, or take it from the finding; record a `D-` that names what it changes.
2. Update `02-architecture.md` (the map and its diagram, the relationships, the flows that pass
   through, the domain model when entities move, the module's column in *Roles and access*),
   `03-roadmap.md`, and `STATE.json.modules`: a new module gets an entry with its code, slug, stage,
   surfaces, `lastCapability: 0` and its sources mapped as in phase 3 step 5 (written to its file's
   header too); a removed module keeps its entry with `"removed": "<D- id>"`.
3. Create, rename or merge the module files. A renamed module's file is moved
   (`mv modules/<old>.md modules/<new>.md`) and its entry's `slug` and `file` follow. A removed or
   merged module's file is moved to `modules/removed/<slug>.md` — kept as history, outside the files
   the script counts — after its capabilities that live on have been moved into their new module.
   Capabilities that move keep their ids — an id never changes, even when its code no longer matches
   the module it sits in — and the references to them stay valid.
4. Run `modes.md › module` for every module touched, as far as the blueprint has got — phase 4 only
   before phase 4 is approved — and, once phase 5 is approved, phase 6 steps 1–3 for them
   (`reviews.md`).
5. Gate once — or not at all inside `feedback` or phase 7, which gate for everything they ran; then
   `stamp`.

## feedback

`/blueprint feedback [file]` — the customer or a colleague has read the blueprint and come back with
comments: a message pasted in, a file, notes from a call.

1. Run `changed` (`mechanics.md › Hand edits`). Register the feedback as a source (`type: feedback`,
   `next source`), its text verbatim in its entry, with who gave it and when.
2. Split it into items and write them into the source's entry as a table — **Items**: `#`, the
   item in one line, where it lands (file › heading), kind, outcome — so that every outcome is on
   disk. For each item:
   - a **question** about what the blueprint says — answered from the documents (the answer in one
     line, with its reference, is the outcome), or a `Q-` when they do not answer it;
   - a **change** — a fork for the operator, never applied on the feedback's word alone. Ask
     (`AskUserQuestion`, 2–4 per round, the *how to take them* question first when there are more
     than four): **Accept as asked** (Recommended when it contradicts nothing decided) / **Accept
     with a change** (name it in the label) / **Decline** / **Defer**. An accepted change is a `D-`
     record whose *Decided by* names who asked for it and who approved; a declined one keeps its
     reason as the outcome; a deferred one is a `Q-`;
   - an **approval** of a part — `approved` is the outcome, and after `done` a line in `CHANGELOG.md`;
   - outside the blueprint (implementation, budget, schedule) — `outside` is the outcome, and the
     operator hears of it in the summary.
3. Apply the accepted changes: local edits directly; a module whose shape changes through
   `modes.md › module`; a new, split or merged module through `modes.md › restructure`.
4. Gate once (`mechanics.md › The gate`, the form for a mode): what was accepted, declined, deferred
   and answered; then the `CHANGELOG.md` lines after `done`, and `stamp` last.

## export

Writes the whole blueprint as one Markdown document for someone who will not open fifteen files — a
customer, a reviewer, a new team member. Run `validate` first: when it reports errors, or the
blueprint is not done, say so and ask whether to export a draft. Then run the script's `export`; add
`--with-sources` when the reader should be able to trace facts to their sources (an auditor, a new
team member), not for a customer who only reads the design. The document goes to `export/blueprint.md`
inside the blueprint folder, with the competitor profiles at the end and links to local files turned
into plain text, so it reads the same wherever it is sent; tell the operator the path. It is a
generated copy — regenerate it rather than edit it. Nothing in the blueprint changes, so there is no
`stamp`; sending the document anywhere is the operator's step.
