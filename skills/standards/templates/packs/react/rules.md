---
paths:
  - "{{sourceGlob}}"
---

# React standards

Pack `react` {{version}}, installed by the dev-assistant plugin (`/standards`); platform: **{{platform}}**.
Shared components: `{{sharedDir}}/`. Features: `{{featuresDir}}/<feature>/`. Tokens: {{tokensFiles}}.

Every rule has an id. A review finding cites it; a commit the operator lets through without a rule carries
`Standards-skipped: <id> <reason>` in its message. *Enforced by* says what catches a break: `lint` (ESLint,
reported after every edit), `check` (the `standards-check` hook, when the turn ends and at commit), `review`
(the `pattern-reviewer` agent, through `/standards review`). A rule the review keeps catching moves to a
stronger layer. Settings live in `docs/standards/standards.json`; this file is regenerated from them.

## RCT-01 Shared components

A component used in more than one feature, or meant to be, lives in `{{sharedDir}}/`. A feature's own
components live in `{{featuresDir}}/<feature>/components/` and no other feature imports them.

Why: a component that one feature borrows from another ties the two together, and the copy someone makes to
avoid that drifts away from the original.

- Before writing a component, look in `{{sharedDir}}/` for one that does the job, or would with one more prop.
- When a second feature needs a feature's component, move the whole folder to `{{sharedDir}}/` first, then
  import it from there in both places.
- Generic UI — buttons, inputs, cards, list rows, empty and error states, layout pieces — goes to
  `{{sharedDir}}/` from the start, even while one feature uses it.

```tsx
// good — in {{featuresDir}}/orders/…
import { UserAvatar } from '{{sharedImport}}/UserAvatar';
// bad — another feature's component
import { UserAvatar } from '{{featuresImport}}/users/components/UserAvatar';
```

Enforced by: lint `standards/no-cross-feature-imports` · review (a component meant to be reused, a near-copy of a shared one)

## RCT-02 Component and screen layout

Every component and every screen is a folder named after it:

```text
UserCard/
├── index.ts              export only: export { UserCard } from './UserCard';
├── UserCard.tsx          markup: props in, JSX out
├── useUserCard.ts        business logic: data, effects, handlers, derived values
├── UserCard.styles.ts    styles, when it has any
└── components/           subcomponents, when UserCard is complex enough to split
    ├── UserCardHeader/   a subcomponent with logic or parts of its own: the same layout
    └── UserCardBadge.tsx a small subcomponent: one file
```

Why: the same layout everywhere means anyone finds the markup, the logic and the styles of any component
without reading it, and the logic can be tested without rendering.

- `UserCard.tsx` calls `useUserCard()` and renders what it returns. No effects, no data hooks (`useQuery`,
  `useMutation`, a custom `use…Query`), no `fetch` and no API module in it. View-only state — open, hovered,
  the active tab — may stay in it with `useState`.
- `index.ts` re-exports and holds nothing else.
- Any other file of the component is named `UserCard.<role>.ts` (`UserCard.test.tsx`, `UserCard.types.ts`,
  `UserCard.constants.ts`); another hook of its own starts with `useUserCard`.
- A subcomponent may stay one file in `components/` while it has no logic and no parts of its own; once it
  needs a hook or parts, it becomes a folder with this layout.
- A screen is a component like any other: `{{featuresDir}}/<feature>/components/<Name>Screen/`.<!-- web --> A Next.js
  route file (`page.tsx`, `layout.tsx`) keeps the name the framework fixes and only renders the screen.<!-- end -->
- Create a new component with the `scaffold` skill (`/scaffold component <Name> --feature <feature>`, or
  `--shared`, or `--in <parent folder>` for a subcomponent): the folder comes out right.
<!-- if:referenceComponent -->- Reference component to copy: `{{referenceComponent}}/`.
<!-- end --><!-- if:referenceScreen -->- Reference screen to copy: `{{referenceScreen}}/`.
<!-- end -->
Enforced by: check `componentLayout` · lint `standards/no-logic-in-component-file` · review (a subcomponent that outgrew one file, a component that needs splitting)

## RCT-03 Design tokens

Every visual value comes from the tokens in {{tokensFiles}}: colors always, font families, font sizes, line
heights, font weights, letter spacing, radii and shadows. A value the tokens lack is added to the tokens first —
in light and dark — and then used. Tokens are named by meaning (`textMuted`, `surfaceRaised`), not by look
(`gray500`).

Why: one change of a token restyles the whole product, the dark theme stays complete, and no screen drifts
into its own shade of grey.
<!-- web -->
- Use the token utilities and variables (`bg-surface`, `text-muted`, `rounded-control`). Never a palette
  class (`bg-blue-500`), a hex value, an arbitrary value (`p-[13px]`, `text-[#333]`) or a `dark:` color pair:
  light and dark are defined once, in the tokens.

```tsx
<p className="text-muted">…</p>          // good
<p className="text-gray-500">…</p>       // bad: palette class
<p className="text-[#6b7280]">…</p>      // bad: arbitrary value
```
<!-- end --><!-- native -->
- Styles read the theme: `colors.textPrimary`, `typography.body.fontSize`, `radii.control`.
- No color literal anywhere — `'#fff'`, `'rgb(…)'`, `'red'` in a style or a color prop — and no raw
  `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight`, `fontFamily` or `borderRadius` outside the tokens.
  Spacing (`padding`, `margin`, `gap`) may stay numeric.

```tsx
const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.title.fontSize },  // good
  note: { color: '#6b7280', fontSize: 13 },                                   // bad: raw values
});
```
<!-- end -->
Enforced by: lint `standards/no-raw-visual-values` (web) · lint `standards/no-raw-style-values` (native) · review (a token used against its meaning)
