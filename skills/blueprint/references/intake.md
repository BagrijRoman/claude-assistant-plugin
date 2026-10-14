# Blueprint — intake and reading (phases 0–1)

Read `mechanics.md` first. Each phase says what it starts from, its steps, and its gate.

## Phase 0 — Intake

**Start from:** nothing, or `init [dir]`.

1. **Choose the folder.** The default is `docs/blueprint/`; the operator always gets to change it.
   Look first: does `docs/` exist, what is in it, does `docs/blueprint/` already exist and what is
   inside. Check version control as well — a blueprint outside a git repository has no history and
   is easily lost: look for `.git` from the candidate folder up to the project root
   (`ls -d <path>/.git`). When there is none, and the project root holds repositories of its own
   (`ls -d */.git`), the recommendation becomes a folder inside the repository that keeps the
   documentation (`<that repo>/blueprint/`), with the reason in its description. Then ask
   (`AskUserQuestion`, header `Folder`): the recommended folder first — `docs/blueprint/` when
   nothing above argues against it — plus one or two alternatives that fit the project; the operator
   can type any path as Other. A directory passed in the argument becomes the recommended option,
   checked the same way. Never scaffold into a non-empty folder without the operator confirming that
   specific folder; a folder outside git is the operator's call, noted in the gate summary. Whatever
   folder is chosen, everything the blueprint makes is created inside it, `.sources/` included, and
   nothing outside it (`mechanics.md › The working folder`).
2. **Scaffold.** Create the folder, `modules/`, `references/competitors/`; copy the logs and the
   index from `templates/` — `00-sources.md`, `DECISIONS.md`, `ASSUMPTIONS.md`, `OPEN-QUESTIONS.md`,
   `GLOSSARY.md`, `CHANGELOG.md`, `README.md` — filling the placeholders you can (project name, date)
   and leaving out the example rows, bullets and sections, so that every log starts empty and the
   first ids are `S-01`, `D-001`, `A-001` and `Q-001`. The brief, the architecture, the roadmap and
   the review are created from their templates when their phase starts, the module and competitor
   files when they are written. Write `STATE.json` with `phase: "intake"`, then run `stamp` and
   `validate`: a fresh scaffold has no errors, and a warning about `{{…}}` in a log is an example
   left behind.
3. **Ask for depth** (`AskUserQuestion`, header `Depth`) — the columns of `mechanics.md › Depth` —
   and write the answer to `STATE.json.depth`:
   - **standard** (Recommended) — full capabilities for the first stage (MVP, or what is in scope),
     a list for the later stages
   - **quick** — modules for everything, a capability list for the first stage only; for a pitch or
     an estimate
   - **deep** — full capabilities for every module

   In the same round ask whether the **surfaces** are already known (header `Surfaces`,
   multiSelect): web application · mobile application · **not decided yet, ask me after the
   reading** (Recommended when the sources may say); anything else goes in Other. An answer is a
   source, not the decision: write it to `00-sources.md` as `type: idea` so phase 2 can cite it.
4. **Collect sources.** Ask the operator to list everything they have: files and folders (paths),
   URLs, the idea in their own words, names of similar or competing products, people to ask.
   Accept it in any form, then turn it into a list of things that can each be read:
   - **A folder is expanded**, never read as one source. List its files, leaving out `.git`,
     `node_modules`, dotfiles, build output, the blueprint folder itself, and code or asset files
     (html, css, js, mjs, images, fonts) unless the operator says they are input; show the list
     grouped by subfolder, with a count of what was left out by kind ("12 images, 3 html"), and let
     the operator prune it or bring any of it back. Every file left becomes its own source.
   - **Check that each one can be read.** Markdown, text, PDF and images are read directly. A Word
     file (`.docx`, `.doc`, `.rtf`, `.odt`) is converted once, by you, into a working copy that every
     agent reads — the readers and writers have no shell: once it has its id,
     `mkdir -p "<dir>/.sources"` and `textutil -convert txt -output "<dir>/.sources/S-NN.txt" "<file>"`
     (macOS), *Read as* `converted → .sources/S-NN.txt`. Never write next to the source; the
     dot-folder is invisible to the script, and the copy is made again whenever the original changes.
     A spreadsheet, a deck, or a Google Docs, Notion or Figma link needs a connector or an export. A
     source that cannot be read is registered as `unreadable` and the operator is asked for an
     export — never skipped in silence.
   - **A product** (a competitor's name) is registered, not read: reading about it is research,
     which needs consent (phase 1, step 6). A **person** is registered as someone to ask.

   For each item write a row in `00-sources.md`: its id (`next source`), type (document / url /
   idea / product / person / feedback), location — a document's path from the project root, in
   backticks, so that `changed` finds it (`` `docs/requirements.md` ``) — how it is read, the
   operator's note, reliability (`primary` = written for this project, `secondary` = related but not
   about this project, `web`).
   The idea told in conversation is a source too (`type: idea`, location `conversation, <date>`) —
   write its text down verbatim in the source entry, it is the only place it will be kept.
5. **Confirm the list** back to the operator; add or drop as they say.
6. Gate — every step of `mechanics.md › The gate`, with a short summary: "this is what I will read;
   anything missing?".

## Phase 1 — Reading the input

**Start from:** `00-sources.md` with registered sources.

1. **One reader per document or URL** (`mechanics.md › Subagents`) — never for a `product` or
   `person` source; tell the operator the wave first. Brief: read the source (a URL with `WebFetch` —
   the operator's input, not research; no web search; a Word file from its copy in `.sources/`);
   return, under the fixed labels of `templates/00-sources.md` — bold labels such as `**Facts**`,
   never headings, because `validate` finds the index by its label:
   - **Facts** (with the location in the source: page, section, file), **Requirements** (explicit
     asks), **Constraints** (legal, technical, business, timeline), **Actors** mentioned,
     **Surfaces mentioned** (where the source puts the actors — a browser at a desk, a phone in the
     field, email, an API — in its own words), **Terms** that look domain-specific with the source's
     definition if any, **Unclear / contradictory** points, **Not covered** (things a product like
     this needs that the source is silent on);
   - **Decided** — every decision the source records as taken *for this product*, implementation
     decisions included, one line each: its own id when it has one, the decision in one sentence, its
     date ("D23 — two access layers; 2026-10-06") — the detail stays in the source. What a source
     reports from an earlier version or another product, or what it declares non-binding itself, is
     not a decision here: it goes under Facts, as reference;
   - **Index** — when the source is a catalogue (features, requirements, roles, modules): one row per
     item — its own id, or its title when it has none (a role often has none) — then its title,
     location (file › heading) and status when the source gives one (keep / later / skip). Several
     catalogues in one source, such as modules and then roles, are several tables under the one
     label. The index is not capped and is not a summary: later phases read the items themselves.

   Everything in English; quote the original where a term matters. The labels other than *Decided*
   and *Index* take about 800 words together at most, one fact per bullet, however long the source —
   the extract is a map of the source, not a replacement for it, and a short source needs far fewer.
   A catalogue's per-item status is an index column, not a *Decided* row.
2. **Merge** each extract into the source's entry in `00-sources.md` (under `### Extract`).
3. **Cross-source pass** (you, not an agent): where sources disagree, list the disagreement;
   where a term is used differently, note it. Seed `GLOSSARY.md` with the terms (definition
   `[?pending]` where sources conflict). Collect every **Decided** item under `## Decided in the
   sources` in `00-sources.md` — the source, its id, one line, product or implementation: from here
   on these are cited, not asked again (`SKILL.md › What the sources already decided`). Only
   decisions for this product go there: an earlier version's choices stay reference material.
4. **Gap report.** Write the section `00-sources.md › Gaps after reading`: what a brief needs that no
   source gives (audience, goals, scale, surfaces, monetisation, comparable products…) — a question a
   source has already decided is not a gap. Mark each gap: *ask the operator* / *research could
   close it* / *assume for now*.
5. **Thin input — the discovery interview.** When the operator's idea is the only real source, or the
   extracts leave the brief without a problem, actors or goals, interview the operator before
   anything else. One message, in their language, the questions numbered, answered in their own
   words — not `AskUserQuestion`, these are not choices:
   1. What problem does the product solve, and for whom?
   2. How do those people deal with it today?
   3. Why now?
   4. What would success look like — something you could measure?
   5. Who pays, and how does the product earn?
   6. What is fixed already: budget, deadline, regulation, systems that must stay?
   7. Which products come closest, and what do they get wrong?
   8. What must the product never do?

   Register the answers as one `idea` source (verbatim, `next source`), extract it yourself under the
   same labels — an idea has no file for a reader to open — and redo the gap report.
6. **Research offer** — only if some gaps are marked *research could close it*. List in the question
   text the products you would look at (the operator's `product` sources first) and the gaps each
   would answer; then ask (`AskUserQuestion`, header `Research`): **The <two or three> that matter
   most** (Recommended when the list is long — name them in the label) / **All of them** / **None —
   I will provide the information**; a different pick goes in Other. On consent:
   `STATE.json` → `research.allowed: true`, `research.scope: [...]`, `research.grantedOn: <date>`;
   one researcher per product (`mechanics.md › Subagents`), briefed with
   `templates/references/competitors/COMPETITOR.md`, the profile's path, today's date, the gaps it
   should answer and the files that give it context — `00-sources.md › Gaps after reading` and
   `GLOSSARY.md` (the brief does not exist yet); it writes the profile with every fact marked `[web]`
   and its page as `(S-?? <address>)`, and returns the pages it used. Register each page as a source
   (`next source`, type `url`, *Read as* `researched — see the profile`, `reliability: web`) — not a
   unit for a reader — and put its id in place of every `S-??` that names it; `validate` reports any
   left.
7. **Question round** for gaps marked *ask the operator* (2–4 per round).
8. Gate.
