# Illustrations — steps 0 to 5, the foundations of the set

Read the step you are on. Each step: what you start from, what you do, how the operator reviews it. These six settle what every picture is drawn with — the folder and the reading, the scheme, the direction, the mark, its loaders, the icons. Templates live in the skill's own folder,
`${CLAUDE_PLUGIN_ROOT}/skills/illustrations/templates/`; a path like `templates/STATE.json` below is
relative to the skill's folder. What every step shares — the state, the manifest, the tab intake, the review loop, the fresh context — is in [mechanics.md](mechanics.md); the picture steps in [pictures.md](pictures.md); what to draw in [catalog.md](catalog.md), how in [drawing.md](drawing.md), the page in [page.md](page.md).

## Contents

- [Step 0 — Intake](#step-0-intake)
- [Step 1 — Color scheme](#step-1-color-scheme)
- [Step 2 — Direction](#step-2-direction)
- [Step 3 — Logo](#step-3-logo)
- [Step 4 — Loaders](#step-4-loaders)
- [Step 5 — Icons](#step-5-icons)

---

## Step 0 — Intake

1. **Find or start.** Glob `**/STATE.json` with `"kind": "illustrations"` — in the project and in
   a documentation repository beside it, when there is one. Found → `continue`. None → choose the
   folder in a dialog, the documentation repository or the documentation folder first
   (`SKILL.md › The output folder`); the showcase of step 2, when it exists, is the strongest hint
   of where the documentation lives.
2. **A showcase?** Glob `**/STATE.json` with `"kind": "showcase"`. Found: tell the operator, and
   take from it — `SOURCES.md` as the reading, `tokens.css` as the scheme (copied into this set's
   `tokens.css`: the `--color-*` values as they are, the `--ill-*` and `--lg-*` from its own when it
   has them, else derived from its brand), `sample.mjs` as the cast, `site.mjs › mark` as the mark
   when one is picked, `plans/illustrations.md`, `plans/emails.md` and its states as the first draft
   of this set's lists, `STATE.json › languages` as the language. Record `showcase` in `STATE.json`
   (the folder) and the reuse as IL-006.
3. **Read the documentation** otherwise (`SKILL.md › What goes in`): the folder (`docs/` by default;
   ask if it is not obvious), this set's folder left out; one subagent per group, returning under
   fixed headings — **Product** (what, for whom, in one paragraph), **Actors**, **The world** (the
   objects, places, moments and instruments of the domain: what a picture can show — a plant and
   its smoke, a ledger, a scale, a parcel on its legs, a report ready), **States named** by the
   screens, **Letters sent** and when, **Brand** (name, colors, fonts, a logo, the tone),
   **Constraints** (languages, dark theme, accessibility, what must never be drawn), **Design
   decisions already taken**, **Open questions**. A blueprint is read directly (`01-brief.md`,
   `02-architecture.md`, `GLOSSARY.md`, `DECISIONS.md`, module files). Write the summary as
   `SOURCES.md` in the set's folder.
4. **Ask, in one round** (`AskUserQuestion`): the **name and wordmark** as the pictures should carry
   them; the **language** of the words (the documentation's, or English — one, the pictures carry
   none); the **cast** the letters go to (a showcase's, or propose one sender and two people); and
   the **references** — pictures, sites, brands or a mood board the operator likes, as file paths
   or addresses, or *none*. Say in one line that every tab will be asked for before it is made
   (tab intake).
5. **Read the references** when there are any: one reader (a subagent with `Read` and `WebFetch`)
   per group looks at each — an image file is read as a picture, a page fetched — and returns, per
   reference, its traits under fixed headings: **Line** (outline or flat, the weight), **Angle**
   (front, three-quarter, isometric), **Detail** (how much, where), **Palette** (how many colors,
   how the accent is used), **Mood** (calm, playful, technical), **Motion** (when a reference
   moves), and **What to take** / **What not to take** in one line each. The traits go into
   `SOURCES.md › References` with the reference's name or address; the paths go into
   `STATE.json › references`. A reference is never copied: its traits inform the Direction step.
6. Write `STATE.json`, `DECISIONS.md`, `CHANGELOG.md`, `README.md` and `tokens.css` from the
   templates, `review/manifest.json` from `templates/manifest.json` with the name, tagline, wordmark
   and language filled. Fill the manifest's `about` from `SOURCES.md` (`page.md › The manifest`): two
   short paragraphs on the product and 4–6 points — the customer opens the page knowing nothing. Build and publish the empty page once — the operator sees the tabs, the
   theme switch and the address (`page.md › Publishing`), and keeps that address for the whole run.
   Gate — light: "this is what I know; anything missing?"

## Step 1 — Color scheme

Before anything is drawn. The scheme is: the brand (`--color-primary` and its companions), the
neutrals of the page, the picture tokens (`--ill-*`: line, fill, soft, muted, accent, accent-soft,
highlight, ground, positive, caution, negative) and the mark tokens (`--lg-*`: ground, accent,
accent-2, soft), light and dark.

1. **Fixed already** (a showcase, a design baseline, values in the documentation): write the
   values into `tokens.css` (the dark set twice, the same under the media query and under
   `[data-theme='dark']`; the dark brand lighter and its foreground darker), derive the `--ill-*`
   and `--lg-*` from them (`drawing.md › Deriving the picture tokens from a brand`), put one item
   into the *Color scheme* tab with `selected: true` and the sample picture `templates/examples/states/empty.svg`
   copied as `review/scheme/sample.svg`, publish, and ask to confirm or change (one question). IL-001.
2. **Otherwise propose three schemes**, each in one line of reasoning from the domain and the brand
   hints (a finance product and a children's product do not share a hue), each a full `light` and
   `dark` set of the tokens above, as three items of the *Color scheme* tab, each with the sample
   picture (`page.md › The manifest`). Offer *like competitor* when a profile exists.
   `build`, publish, screenshots in both themes; the operator looks at the strips — a button, a
   chip, a link, a selected row and the picture on each — before choosing.
3. Ask (`AskUserQuestion`, header `Scheme`): A (Recommended) / B / C — the operator may type a hue
   or a hex. Mark the chosen item `selected: true`, write its values into `tokens.css`, keep the
   others as alternatives; `check` (the dark sets must agree), `build`, publish. Record IL-001 and
   `selected.scheme`; `steps.scheme` is `approved` on the operator's word.

## Step 2 — Direction

The manner of the whole set, settled on four pictures before the marks and thirty states are
drawn in it. Needs the scheme; takes the references of Intake and the reading's *The world*.

1. **Plan three directions** (`plans/direction.md`), each one line of reasoning from the references,
   the brand's tone and the domain, and each defined on the axes of `drawing.md › Direction`:
   **line** (outlines in `--ill-line` or flat faces without outline; the weight), **angle** (front,
   three-quarter, isometric), **detail** (how much a picture holds; the texture), **accent** (where
   the one accent goes; one or two colors in the mark), **motion** (the kind of gesture: settle,
   drift, draw). Make them differ on at least two axes each; one may be the references' manner as
   it is, one its calmer cousin, one a counter-proposal. With a design baseline that fixes the
   manner, one direction, confirmed. Approve the plan.
2. **Draw the sheets** on the session's model, one builder per direction, each **four samples**
   in that manner and nothing else: a mark (the product's object, 64-grid, `--lg-*`), an icon of
   one domain subject (16-grid), a state picture (`empty`, 320 × 240, `--ill-*`, its gesture), a
   letter band (560 × 240, the invitation's door or the domain's place). Files
   `review/direction/<direction>-<kind>.svg`, the sample ids `<direction>-mark`, `<direction>-icon`,
   `<direction>-state`, `<direction>-letter`, every class and keyframe starting with the sample's
   id. Entries (`page.md › The manifest`): the direction's `id`, `title`, `idea`, `axes`, `samples`.
3. `check`, `build`, publish, screenshots in both themes; the three sheets stand one under the
   other, so the operator compares the same four pictures in three hands.
4. **Review**: revisions by sample (`direction/linework-state — thinner line`) or by direction;
   then ask (`AskUserQuestion`, header `Direction`): A (Recommended) / B / C — the operator may mix
   ("the line of B, the angle of A"): then draw the mixed sheet as a fourth direction and show it
   before the choice is final. Mark the chosen one `selected: true`, `STATE.json › selected.direction`,
   IL-006 (or the next id), the chosen axes written into `plans/direction.md` as the **hand of the
   set** — one paragraph every builder's brief carries word for word, with the sheet's four files
   as reference. The tab stays in the set with the alternatives beside the chosen one. Approve.

## Step 3 — Logo

1. **Plan the first round: three ideas, 6–9 marks** — the ideas chosen from where a mark comes
   from (the product's **object**, its **action**, the **initial** with the domain in it, an
   **abstract** form of the domain's geometry, the **domain's own symbol**), two or three marks per
   idea, one line each: the idea, what is in the mark, how many colors it needs (one, two, more),
   and **what it is not** — the well-known marks its shape is near, named so the builder moves
   away from them (`drawing.md › Marks`). Approve (`plans/logo.md`).
2. **Draw** on the session's model, a builder per idea
   (`drawing.md › Marks`), in the hand of the chosen direction, its mark sample as the reference: 64-unit grid, `currentColor` as the body, the knockouts in
   `var(--lg-ground)`, the accents in `var(--lg-accent)` and `var(--lg-accent-2)`, the soft fill
   in `var(--lg-soft)`; detailed enough to be a logo, simple enough to read at 16 px; the parts a
   loader can set in motion in groups of their own. Each builder returns the manifest entries
   (`id`, `title`, `idea`, `file`, `from` — where in the product it comes from).
3. `check`, `build`, publish, screenshots: the lineup on three grounds, at 16 px, in one color and
   inverted is where a weak mark shows — look at it yourself and say which marks you would drop and
   why, and which known logo any of them is too near, before the operator looks.
4. **The idea** (Common mechanics: revisions by id first): ask (`AskUserQuestion`, header `Idea`)
   which idea to go on with, your recommendation first — or that one of the marks is already it.
   **The second round**: 4–6 more marks around that idea — its other readings, its other parts in
   motion, one or two colors — by one builder, published beside the first; the first round stays
   on the tab. Then the **pick**: ask (header `Mark`, the ids in the question text) for the
   primary mark, your recommendation first;
   then (header `Shortlist`, multiSelect) two or three marks the loaders will also be made from.
   `pick logo <primary> <shortlist…>`: `selected: true` on the primary, `shortlist: true` on the
   others, `STATE.json › selected.logo` and `selected.shortlist`, IL-002 and IL-003, `build`,
   publish. Approve.

## Step 4 — Loaders

1. **Plan**: for the primary mark and each shortlisted one (an imported mark: the motions its
   build allows, `import.md › import logo`), 3–5 loaders, each a motion of the
   mark's own parts — they turn, light up in turn, draw themselves, beat, travel an arc — with
   what it is for (a button or a row at 16 px, a panel at 32, a long wait or the start of the
   application at 64), and one **determinate** loader per mark (a part fills as the share grows,
   on `--progress`). One line each. Approve (`plans/loaders.md`).
2. **Draw** (`drawing.md › Loaders`): the loader is the mark's SVG with its moving parts in groups
   of their own; the animation on `--ill-duration-long`; the last keyframe the mark at rest; the
   determinate one reads `var(--progress, 1)`. One builder per mark. Entries: `id`, `title`,
   `mark`, `idea`, `file`, `use`, `determinate`.
3. `check`, `build`, publish; the page shows each at 64 / 32 / 16, the determinate one at four
   shares, and the three in-place samples (a button at work, a panel loading, the application
   starting) — the words of the tab's `words` from the documentation. Review; approve.

## Step 5 — Icons

1. **Plan** the icons of the product's own subjects — after the customer's own icons, when they
   gave some (`import.md › import icons`) — what the icon library chosen by the project
   (or the standard set) has no fit for: for a carbon product a scope, an emission source by kind, a
   factor, a meter, a site by type — each with where it is used; nothing is added because a set
   "should have it". The manner follows the mark: the same stroke, the same corners. Approve
   (`plans/icons.md`).
2. **Draw** (`drawing.md › Icons`): the 16-unit grid, a 1.5-unit stroke in `currentColor`, round
   caps and joins, at most one accent; it must read at 16 px. One builder per 6–8 icons. Entries:
   `id`, `title`, `group`, `file`, `usedIn`.
3. `check`, `build`, publish: the page shows them in a row on the page and on the inverted
   surface, then each at 16 / 20 / 24. Review; approve.
