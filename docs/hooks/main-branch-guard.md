# main-branch-guard

| Event | Matcher | Script | Since |
|-------|---------|--------|-------|
| `PreToolUse` | `Bash` | [bin/main-branch-guard.mjs](../../bin/main-branch-guard.mjs) | 0.2.0 |

## Why

`main` changes only through a pull request. The agent works on its own branches and never writes to `main`
directly — neither by committing on it locally nor by pushing to it. `master` is treated the same way.

## Blocks

| Command | Why it is blocked |
|---------|-------------------|
| `git commit …` while on `main` | a direct commit to main |
| `git push origin dev:main` | updates main from another branch |
| `git push origin +HEAD:refs/heads/main` | the same, in full refspec form |
| `git push origin main` | updates main |
| `git push` or `git push origin HEAD` while on `main` | pushes the current branch, which is main |
| `git push --all` / `--branches` / `--mirror` | updates every branch, main included |
| `cd repo && git commit …`, `git -C repo commit …` | the same rules, applied to the repository the command runs in |
| `bash -c "git commit …"` | a shell wrapper does not hide the command |

## Allows

| Command | Why it passes |
|---------|---------------|
| `git commit …` on any other branch | not main |
| the first commit of a new repository, on an unborn `main` | nothing to protect yet, and a repository needs its root commit somewhere |
| `git push -u origin dev`, a bare `git push` on `dev` | updates another branch |
| `git push origin --tags` | tags only |
| `git commit -F - <<'EOF' … git push origin main … EOF` | the heredoc is the commit message, not a command |
| `echo "git commit"`, `grep -r "git push origin main" .` | text that mentions git is not git |
| any git command outside a repository | nothing to protect |

## How it decides

1. Reads the Bash command from the payload and splits it into the commands it really runs (`listCommands`).
2. Walks them in order, starting from the payload's `cwd`. `cd` and `pushd` move the working directory for the
   commands after them.
3. For each `git` command, skips the global options and resolves every `-C <path>` to find the repository and
   the subcommand.
4. `commit`: blocks when the current branch is protected **and** already has commits.
5. `push`: works out which remote branches the command updates:
   - a refspec's destination (`src:dst`, a leading `+` and `refs/heads/` stripped, `HEAD` → the current branch);
   - with no refspec, the current branch, unless only `--tags` is pushed;
   - `--all`, `--branches` and `--mirror` count as updating every branch.

   Blocks when any of them is protected.
6. Otherwise exits `0`. Any internal error also exits `0` (fail open).

## What the model sees

```
[dev-assistant] main-branch-guard blocked this command: a direct commit to "main". It changes only through a pull request.
Do this instead: create a branch and commit there: git switch -c <type>/<short-name> (or switch to dev).
```

```
[dev-assistant] main-branch-guard blocked this command: a direct push to "main". It changes only through a pull request.
Do this instead: push your own branch (git push -u origin <branch>) and open a pull request.
```

```
[dev-assistant] main-branch-guard blocked this command: push --all/--branches/--mirror would update main as well.
Do this instead: push only your branch: git push -u origin <branch>.
```

## Limitations

The guard sees the command line, not what git will eventually do. It does **not** catch:

- **Other commands that create commits on main locally**: `git merge`, `git cherry-pick`, `git revert`,
  `git rebase`, `git am`, `git pull`. The result still cannot leave the machine, because the push is blocked.
- **Git aliases** (`git ci` for `git commit`) — aliases are not resolved.
- **Values known only at run time**: `git push origin "$BRANCH"`, `git push origin $(git branch --show-current)`.
- **Git run inside scripts**: `npm run release`, `make publish` or `./deploy.sh` that commit or push internally.
- **Push configuration**: with `push.default=upstream` and a branch tracking `origin/main`, a bare `git push`
  from that branch updates main while the guard sees only the branch name.
- **Anything outside the Bash tool**: git through an MCP server, an IDE, or a human's terminal. This protects
  against the agent, not against people — keep branch protection on the remote as well.
- The protected branches are fixed to `main` and `master`; they are not configurable yet.

## Turning it off

The plugin is enabled per scope. To switch it off in one repository where committing to main is normal, add to
that repository's `.claude/settings.local.json` (not committed):

```json
{ "enabledPlugins": { "dev-assistant@bagrijroman": false } }
```

That disables the whole plugin in that repository, not just this hook.

## Tests

- [tests/main-branch-guard.test.mjs](../../tests/main-branch-guard.test.mjs) — the hook against throwaway
  repositories, one case per row of the tables above.
- [tests/shell.test.mjs](../../tests/shell.test.mjs) — the command reader it relies on.
