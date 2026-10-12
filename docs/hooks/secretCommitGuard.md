# secret-commit-guard

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `PreToolUse` | `Bash`, acts only on `git commit` | [bin/secretCommitGuard.mjs](../../bin/secretCommitGuard.mjs) | 0.4.0 |

## Why

No token reaches a commit. A secret that lands in the history stays there for everyone who ever clones the
repository, and rotating it is the only real fix. [secret-files-guard](secretFilesGuard.md) protects
files by *name*; this hook protects *content*: a token pasted into `config.ts`, a `README`, a compose file
or a test fixture has nothing in its file name to give it away.

It scans the diff the commit would record and blocks on the first hit. The block names the file, the line
and the kind of secret — never the value, which would put the secret into the model's context, the very
thing the guard exists to prevent.

## What it looks for

| Kind | Shape |
|------|-------|
| a private key block | `-----BEGIN … PRIVATE KEY-----` |
| an AWS access key id | `AKIA` followed by 16 upper-case letters or digits |
| a JWT | three base64url segments joined by dots, starting with `eyJ` |
| a GitHub token | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` + 36 characters; `github_pat_…` |
| a Slack token | `xoxb-`, `xoxa-`, `xoxp-`, `xoxr-`, `xoxs-` + the token body |
| a Stripe live key | `sk_live_…`, `rk_live_…` |
| an OpenAI key | `sk-…`, `sk-proj-…` |
| a Google API key | `AIza` + 35 characters |
| a connection string with a password | `mongodb://user:PASS@`, also `postgres`, `mysql`, `redis`, `amqp`, `mssql`, `clickhouse` — unless the password is a placeholder |
| a secret assigned in clear text | `SECRET`, `PASSWORD`, `TOKEN`, `API_KEY`, `PRIVATE_KEY`, `ACCESS_KEY`, `CLIENT_SECRET`, `AUTH_TOKEN`, `JWT_SECRET` (any case, any suffix) `=` or `:` a value of 16+ characters that has both letters and digits |
| a secret file | a staged `.env`, key file or credential file — the list from [secret-files-guard](secretFilesGuard.md) |

The patterns live in [bin/lib/secretPatterns.mjs](../../bin/lib/secretPatterns.mjs).

## Blocks

| Commit contains | Why it is blocked |
|-----------------|-------------------|
| `githubToken: 'ghp_…'` in `src/config.ts` | a GitHub token in source |
| `const token = 'eyJ…'` in a test without a marker | a JWT in a fixture |
| a pasted `-----BEGIN RSA PRIVATE KEY-----` anywhere, a `.md` included | a private key |
| `MONGODB_URI: mongodb://app:S3cretPassw0rd@mongo/app` | a connection string with a real password |
| `const JWT_SECRET = '9f8e7d6c5b4a39281706f5e4d3c2b1a0'` | a secret in clear text |
| a staged `.env` or `certs/server.pem`, whatever is inside | a secret file in the commit |
| the same, through `git commit -a`, `cd repo && git commit`, `git -C repo commit` | the same rules, applied to the diff the commit would record |

## Allows

| Commit contains | Why it passes |
|-----------------|---------------|
| ordinary code | nothing matches |
| the **removal** of a secret | only added lines are read; taking a secret out must never be blocked |
| `DATABASE_URL=postgres://user:password@localhost/app`, `JWT_SECRET=<your-secret>`, `API_KEY=xxxx…` | placeholders |
| `process.env.JWT_SECRET`, `config.get('…')`, `${DB_PASSWORD}`, `generateToken(…)`, `SOME_CONSTANT` | references to where the secret lives, not values |
| `apiKeyHeader = 'x-api-key-header-name'`, `password: string`, `TOKEN_TTL_SECONDS = 3600` | words that only sound like secrets: no digits-and-letters value of 16+ characters |
| `const token = 'eyJ…'; // allow-secret: expired sample for the parser test` | a marked fixture line; the reason is visible in the PR diff |
| anything inside `.env.example`, `.env.sample`, `.env.template`, `.env.dist` | example files hold placeholders by definition |
| a secret in the working tree that is **not staged** (and no `-a`) | it is not part of this commit |
| a commit message that quotes a token | the message is not the diff |
| `git status`, `git diff`, `git add` | not a commit |

## How it decides

1. Reads the Bash command, lists the git commands it runs and the repository each runs in (`gitCommands`:
   follows `cd`, `pushd` and `git -C`). Anything that is not `git commit` is ignored.
2. Reads the commit's options: `-a`/`--all` (also inside combined flags such as `-am`) widens the diff to
   unstaged changes of tracked files; pathspecs narrow it; value-taking options (`-m`, `-F`, `--author`, …)
   are skipped with their values.
3. Runs `git diff --cached --unified=0` (or `git diff HEAD --unified=0` with `-a`) and walks the added lines,
   tracking the file from `+++ b/…` and the line number from each `@@` hunk header.
4. A file on the secret-file list blocks at once, with the unstage command as the way out.
5. Lines in an example file are skipped. Every other added line goes through the patterns in order; a line
   carrying `allow-secret:` is skipped. The first hit blocks, naming the file, the line and the kind.
6. Otherwise exits `0`. Outside a repository, or on any internal error, also exits `0` (fail open).

## What the model sees

```
[dev-assistant] secret-commit-guard blocked this command: a GitHub token in "src/config.ts" (line 3) would enter the commit.
Do this instead: move the value to an environment variable and read it from there. For a fake value in a test fixture, mark that line with "allow-secret: <reason>" in a comment.
```

```
[dev-assistant] secret-commit-guard blocked this command: the secret file ".env" is part of this commit.
Do this instead: unstage it (git rm --cached ".env") and add it to .gitignore; secrets stay out of the repository.
```

## Limitations

- **Only known shapes are recognised.** A random password in a plain string, a token from a provider that
  is not in the table, or a secret split across two lines passes. Clear-text assignment is a heuristic:
  the value must be 16+ characters with letters and digits, so short or letters-only passwords pass.
- **Only added lines are read.** A secret already in the history is not found; that needs a history scanner
  and a rotation, not a hook.
- **Only `git commit` is checked.** `git add` passes, so a secret can sit staged — it just cannot be committed.
  Commits made by other programs (`npm version`, a release script, an IDE) are not seen.
- **Stripe test keys (`sk_test_…`) pass**; they are meant for development. Mark or rotate as needed.
- **The marker is trusted.** `allow-secret:` on a line lets anything through; it is meant to be noticed in
  review, which is why the reason goes on the same line.
- **Anything outside the Bash tool** — an MCP server, an IDE, a human's terminal — is not covered.
  Keep secret scanning on the remote as well.

## Turning it off

The plugin is enabled per scope. To switch it off in one repository, add to that repository's
`.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/secretCommitGuard.test.mjs](../../tests/secretCommitGuard.test.mjs) — the hook against throwaway
  repositories with staged content, one case per row of the tables above.
- [tests/secretPatterns.test.mjs](../../tests/secretPatterns.test.mjs) — every pattern, the placeholders,
  the references and the marker.
- [tests/shell.test.mjs](../../tests/shell.test.mjs) — the command reader it relies on.
