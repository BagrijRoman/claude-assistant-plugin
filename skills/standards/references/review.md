# Review a change

`/standards review [--staged | --base <ref>]`. The change is read against the rules only judgement can check;
the lint and the script checks have already had their turn.

## 1. Collect the change

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" review-context --dir <project> [--staged | --base <ref>]
```

It prints JSON: the diff file (the working tree against `HEAD` by default, the staged changes with `--staged`,
or against a ref), the changed and the untracked files, the project's rules files, `CLAUDE.md`, and the rules
to review with what the review looks for in each. No changed and no untracked file: say there is nothing to
review, and stop.

## 2. Delegate the reading

Send one brief to `dev-assistant:pattern-reviewer` with everything the JSON holds: the diff file, the changed
and untracked files, the rules files, `CLAUDE.md`, and each rule to review with its id, title and what to look
for. It returns findings — rule id or `no rule`, file and line, what is wrong, evidence, the fix — or `PASS`.

When that agent is not available, use `general-purpose` with the same brief and the agent's rules spelled out
(change no file; the change only; every finding with its rule, evidence and fix), and say so in the report.

## 3. The operator decides each finding

Show the findings as the reviewer returned them. Then ask, at most four findings per question round, each
with these options:

- **Fix** (Recommended when the finding is sound) — you make the change after the round.
- **Waive** — the code stays as it is; ask the reason.
- **Reject** — the reviewer is wrong; ask why, briefly.

Make the fixes the operator chose. `lint-feedback` reports on every edit; after the last fix, run
`node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" check --dir <project> --files <the fixed files, comma-separated>`
and fix what it reports.

## 4. Record

Every fixed or waived finding is recorded, a rejected one is not (a rejection says the reviewer was wrong, not
the code; when a rule keeps being misread, propose sharper text for it to the operator instead):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" finding --dir <project> --stdin <<'EOF'
[{ "rule": "RCT-01", "file": "src/features/orders/components/OrderRow/OrderRow.tsx", "line": 1,
   "summary": "OrderRow is used by orders and invoices but lives in orders", "status": "fixed" },
 { "rule": "none", "file": "src/features/orders/useOrders.ts", "line": 24,
   "summary": "a server error is swallowed and the list shows as empty; waived: handled in the next task", "status": "waived" }]
EOF
```

`status` is `fixed`, `waived` or `open`; put a waiver's reason into its `summary`. The script prints the ids it
gave and the promotions now waiting.

## Promotion

A promotion waits when one rule has collected two findings since its last promotion (the threshold is
`promoteAfter` in `standards.json`), and for every finding that fits no rule. For each, show the operator the
findings behind it and the rule's current *Enforced by*, then ask with these options, the strongest that fits
first:

| For | Option | What it means |
|-----|--------|---------------|
| a rule | `lint` | the pattern shows in the syntax: a lint rule catches it on every edit. For this project: an entry in its ESLint config (`no-restricted-imports`, `no-restricted-syntax`) or a rule file in its `eslint/`. For every project: a change to the pack in the dev-assistant repository |
| a rule | `check` | the pattern shows in files and folders: a script check — a change to the dev-assistant repository |
| a rule | `text` | it needs judgement: a sharper rule text and a better good/bad example — in the project's rules file, or in the pack for every project |
| a rule | `keep` | the rule stays as it is; the findings are covered, and the count starts again |
| no rule | `new` | a new rule: in the project's own `.claude/rules/<area>.md` as `## PRJ-NN <title>` with an `Enforced by:` line, or in a pack |
| no rule | `keep` | a one-off; nothing changes |

Do what was chosen in this project now. A change meant for the dev-assistant repository is written up for the
operator — the rule, the pattern, the findings behind it, the layer — not made from this project. Then record it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" promote --dir <project> --rule RCT-02 --to lint --note "no-restricted-syntax for useForm in component files"
node "${CLAUDE_PLUGIN_ROOT}/bin/standards.mjs" promote --dir <project> --finding F-007 --to new --note "PRJ-01 in .claude/rules/errors.md"
```
