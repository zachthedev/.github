# Contributing

## Setup

Install before committing. [docs/dev.md#prerequisites](docs/dev.md#prerequisites) names what the machine needs,
and `bun install` installs the dependencies and the git hooks. The commit hook checks every commit message
before it is recorded, and the push hook runs the gate and refuses the push when it fails.

The commit hook runs commitlint through `bunx --no-install`, which refuses a missing package and fetches nothing,
and the push hook runs `bun scripts/check.ts`. The hook script `lefthook install` writes fails open. When it finds no lefthook binary, as in a checkout whose
`node_modules/` is gone, it prints `Can't find lefthook in PATH` and exits 0, and the commit or push goes through
unchecked. A fresh clone runs no hook at all until `bun install` runs. CI's `commits` job and gate hold both
cases.

A pull request controls its own install scripts and gate code. Before running anything on a pull request branch
you did not write, read its diff, then install it with `bun install --ignore-scripts`, so no install script runs.
`bun run check` on that branch still goes through Bun's script runner, which puts the branch's own
`node_modules/.bin` first on `PATH`. A tracked `node_modules/.bin/bun` then runs before the gate's refusal can, so
the diff read is what catches one there.

## The gate

```sh
bun run check
```

One command, and it is the whole gate. It has no quick form, because no row is slow, so the push hook runs it
whole. CI's gate job runs the same script on Linux, macOS and Windows, so a green run on your machine is a green
run there.

`bun run check:rows` lists the rows. `bun run check <row>` runs one row, resolving the pinned binaries without
installing them.

The `workflows` row runs zizmor online when `gh auth token` answers within its deadline, and hands that token to
zizmor's process alone. Otherwise it runs zizmor offline, and the row's label says which. `ZIZMOR_OFFLINE`, set to
any value, forces offline. In CI the gate runs zizmor offline and holds no token. gh reads its token from the system credential store, so an empty
`GH_CONFIG_DIR` leaves it reachable.

A few checks run only in CI, each because it needs something a working machine does not have. The `commits`
job lints a pull request's commit range and the subject its squash writes, which do not exist before the pull
request does. The `workflows` job runs zizmor's online audits, which flag a pinned commit outside its action's
repository, an advisory against a pinned action and a version comment naming the wrong tag. It also checks each
asset `mise.lock` names against GitHub's record of it. Both need the job token, and no gate job holds one. The
`dependency-review` job compares the pull request's dependencies against its base through GitHub's dependency
graph. That review sees the direct npm packages `package.json` names and nothing under `bun.lock`, which is the
one leg it covers here. `codeql` is GitHub's analysis, over the TypeScript gate every Bun repository copies and
over the workflows, and it runs on GitHub. Its `Analyze` checks are required, and
a code-scanning rule refuses a merge while an analysis is missing or still running
([What never happens](#what-never-happens)).

## Commit messages

Every commit follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). commitlint
checks the message in the commit hook and again in CI, over the pull request's commits and the subject its
squash writes.

```text
type(scope): subject

body
```

The type is one of those `@commitlint/config-conventional` accepts, and it names the change's effect on the
people who use what this repository ships: the repositories that call its workflows, extend its presets and
receive its community files. A change to a reusable workflow, a preset or a community file is `feat` or `fix`,
scoped `workflows`, `renovate` or `community`, and the changelog shows it. Renovate types a pin inside a reusable
workflow `fix(deps)`, because callers run it at a release. A change only this repository's contributors feel
takes a type the changelog hides: its own workflows are `ci`, its gate is `chore(gate)`, and the handbook is
`docs(handbook)`, because the handbook is read on the default branch. `changelog-sections` in
`release-please-config.json` is the list ([Releases](#releases)).

The scope is optional. `.github/commit-scopes.json` lists each scope and what it covers, and commitlint
accepts no other. Omit the scope rather than invent one. A new part of the repository earns a scope in that
file, in the change that adds the part.

The header and every body line stay within 72 characters. A pull request merges by squash, the one method the
repository allows. A one-commit pull request lands its commit's subject and body, and a longer one lands its
title and each commit as a bullet. Either subject lands with ` (#NNN)` appended, so keep a commit subject and a
title within 65 characters. A body paragraph never opens with a bare type, because release-please reads it as a
second change.

A pull request's title takes the type of its most user-facing commit, and `!` when any commit breaks something
users see. A squash of several commits lands the title as its header, so a `!` in a commit's own header is lost
unless the title carries it. A `BREAKING CHANGE:` footer in a commit's body survives the squash. A squash whose
title hid a user-facing change is corrected before the release pull request merges, with an override in the
merged pull request's description that release-please reads in place of the landed message:

```text
BEGIN_COMMIT_OVERRIDE
feat(workflows): the subject that should have landed (#NNN)
END_COMMIT_OVERRIDE
```

A revert says what it undoes in fresh words and names each reverted commit in a `Refs:` footer. Its scope follows
the scope rule above, and it carries none when none applies. A `revert:` prefix on the reverted header overflows
the header limit, and git's own `Revert "..."` subject is one commitlint skips and release-please cannot parse.

```text
revert(scope): what is undone, in fresh words

Refs: <sha>
```

A body carries what the diff cannot show: what was wrong, what the change does now, and what was left undone. A
break callers see carries `!` after the type or scope and explains the break in the body. For a reusable
workflow, a break is a caller's `uses:` line, `with:` input or required secret that stops working. A break only
contributors see carries neither `!` nor a `BREAKING CHANGE:` footer, because either cuts a release.

Every version heading in `CHANGELOG.md` after the first links GitHub's compare view from the previous tag, which
lists every change in the release, hidden types included. The same list locally:

```sh
git log --oneline v0.1.0..v0.2.0
```

## Where code goes

- `.github/workflows/`: the reusable workflows and this repository's own callers.
- `renovate/`: the base preset and one preset per kind.
- `scripts/`: the gate. `check.ts` is the runner, `tools.ts` holds the mise expectations, `run.ts` starts every
  process with a deadline.
- The root and `.github/`: the community files GitHub serves as defaults, and this repository's own boilerplate.
- `docs/`: the documents [README.md#documentation](README.md#documentation) indexes.

## Tests

None. The gate's rows are the checks, and the break round in the alignment record is what proves they go red.

## Code

- Every process the gate starts goes through `scripts/run.ts`, so every one carries a deadline.
- `scripts/run.ts` resolves every program to an absolute path from `PATH` alone, and Bun itself runs as
  `process.execPath`. On Windows a bare program name resolves from the current directory before `PATH`, so a
  committed `gh.bat` would otherwise run in place of gh. The gate refuses a root file whose name before the first
  dot is a program it or its hooks start, gh, bun, git or mise, whatever its extension. `bun.lock`, `mise.toml`
  and `mise.lock` are the named exceptions.
- The gate starts mise with an environment built from an allow-list, never the one it inherited, and refuses a
  tracked `.env` file, which Bun would load into the gate's environment. A template such as `.env.example`
  passes.
- Bun's script runner puts `node_modules/.bin` first on `PATH`, so under `bun run` a committed
  `node_modules/.bin/bun` would replace the gate. CI installs with `bun install --frozen-lockfile --ignore-scripts`,
  and before its first row the gate refuses any tracked path under `node_modules`. CI and the push hook call
  `bun scripts/check.ts` directly, which skips the script runner, so the refusal runs before every merge.
- A row throws with the tool's own output, so a red row reads the same as running the tool by hand.
- Every package runs from its path under `node_modules`, and every tool `mise.toml` pins from the path
  `mise which` prints. mise, gh and git each start from an absolute `PATH` entry outside the checkout.
- ESLint lints and Prettier formats. An ESLint rule that is wrong for this code is turned off in
  `eslint.config.ts` with its reason beside it.

## Dependencies

Every dependency is pinned to an exact version and moved by Renovate under a three-day cooldown. The
cooldown is also in `bunfig.toml`, so a lock file refresh in a container observes it. The `renovate` package
is a development dependency because its `renovate-config-validator` is what checks the presets, at the same
version the `deps` workflow runs.

`trustedDependencies` in `package.json` names the one dependency whose install script runs. Naming it
replaces Bun's built-in allow list, which would otherwise build a native addon Renovate lists as optional and
never needs here.

Two TypeScript compilers are installed on purpose. The `typecheck` row runs the native TypeScript 7 compiler from
the `@typescript/native` alias, called by its path because `typescript` ships a `tsc` too. `typescript` stays on
6.x for typescript-eslint, which reads types through the 6.x compiler API and declares a peer range below 6.1.0.
A rule in `.github/renovate.json` holds it below 6.1.0. Once typescript-eslint supports TypeScript 7,
`typescript` moves to 7.x, and the alias and the rule go.

The advisory check sees the direct npm packages `package.json` names. A transitive advisory under `bun.lock`
is fixed by hand from the alert with `bun audit fix`.

Each tool the gate runs, and how its bytes are held to their source:

- actionlint and zizmor: provenance. `mise.lock` records `github-attestations`, mise verifies the attestation on
  every install, and the gate refuses a lockfile that drops the line.
- ShellCheck and taplo: a checksum in a pinned tree, `mise.lock`. The `workflows` job also holds ShellCheck's
  checksum to the digest GitHub records for its asset. taplo's checksums were computed once from its release
  artifacts, as `mise.toml` records.
- commitlint, ESLint, typescript-eslint, Prettier, lefthook, TypeScript, zod and renovate: a checksum in a pinned
  tree, `bun.lock`.
- Bun itself: a version alone. `packageManager` plus the cooldown is the control, because the setup action
  verifies no download.

`MISE_BACKENDS_<TOOL>` overrides a tool's backend from the environment, and no setting reports it. The gate does
not close that gap.

## Releases

release-please opens one release pull request from the commits on `main` and keeps it current. Merging it
tags the merge commit and creates a draft release. The types that appear in the changelog are the keys under
`changelog-sections` in `release-please-config.json`, which is the one place that list lives, and `build` is
hidden with the rest. A release needs a user-facing change or a break: release-please cuts no release whose
changelog is empty. release-please owns `CHANGELOG.md`, the version in `package.json` and
`.release-please-manifest.json`.

Nothing is published to a registry. The owner flips each draft public by hand.

## What never happens

- Nobody hand-edits `CHANGELOG.md`, the version in `package.json` or `.release-please-manifest.json`.
  release-please writes all three from the commits, and a hand edit is overwritten or, worse, shifts the next
  version it computes. A mistyped squash is corrected with the override under
  [Commit messages](#commit-messages), never in the changelog.
- No version number goes into `HANDBOOK.md`. A version lives in the file that pins it, so a bump is one edit
  and the handbook never goes stale.
- No `mise.lock` line is written outside `mise lock`, except a checksum computed as `mise.toml` says. The
  lockfile is what an install fetches and compares, and the gate holds it to the expectations in
  `scripts/tools.ts`. A hand-written line is a line nothing verified.
- No mise config or lock file is committed beside `mise.toml` and `mise.lock`. mise merges every config file it
  finds, each with its own lockfile, so another one sends an install to any url with any checksum. The gate
  refuses one.
- Nothing merges past a red gate. The required checks and the code-scanning rule sit in the
  `default-branch checks` ruleset, which has no bypass actor, so an `--admin` merge waives the approval and
  nothing else. A check that cannot report, such as one stuck in a platform outage, is cleared by disabling that
  ruleset, merging, and enabling it again. Each of those is a settings change the audit log records. A preset
  reaches every repository on its next Renovate run, and a workflow reaches every caller that bumps to it, so
  the gate is the one check between a change and every repository.
