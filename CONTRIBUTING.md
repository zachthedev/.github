# Contributing

## Setup

Install before committing. [docs/dev.md#prerequisites](docs/dev.md#prerequisites) names what the machine needs,
and `bun install` installs the dependencies and the git hooks. The commit hook checks every commit message
before it is recorded, and the push hook runs the gate and refuses the push when it fails.

The commit hook runs commitlint as `bun --no-env-file ./node_modules/@commitlint/cli/cli.js`, under Bun rather
than a `node` on `PATH`, and it fails when the package is missing. The `format` and `prepare` scripts start their
tools the same way, by path under `node_modules/`. None of them uses `bunx`, which falls back to `PATH`, a parent
`node_modules/.bin` or its own cache when a package is missing. The push hook runs
`bun --no-env-file scripts/check.ts`. Every one of these `bun` starts, the `check` and `check:rows` scripts and
CI's gate step pass `--no-env-file`, so Bun loads no `.env` into them.
The hook script `lefthook install` writes fails open. When it finds no lefthook binary, as in a checkout whose
`node_modules/` is gone, it prints `Can't find lefthook in PATH` and exits 0, and the commit or push goes through
unchecked. A fresh clone runs no hook at all until `bun install` runs. CI's `commits` job and gate hold both
cases. The hooks catch an accident, never a hostile branch: lefthook merges a branch's `lefthook-local.*` or
`.config/lefthook-local.*` over `lefthook.yml`, and a job there with a hook job's name replaces it before any job
runs.

A pull request controls its own install scripts and gate code. Before running anything on a pull request branch
you did not write, read its diff, then install it with `bun install --ignore-scripts`, so no install script runs.
`bun run check` on that branch still goes through Bun's script runner, which puts the branch's own
`node_modules/.bin` first on `PATH`. A tracked `node_modules/.bin/bun` then runs before the gate's refusal can.
Bun also runs a `bunfig.toml` preload before the gate's first line, whichever way the gate starts, and before the
commit hook's commitlint and in the `format` and `prepare` scripts, since each runs under Bun.
`eslint.config.ts` and `commitlint.config.js` are code too: the `lint` row and the commit hook run them. The gate
holds both whole, so a change to either changes its copy under `scripts/` in the same commit. The
gate's refusals keep such a branch from merging, and nothing in the gate can stop its first run on your machine,
so the diff read is what catches one there. Read it before you commit on the branch too, since the commit hook
runs the branch's own code.

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
any value, forces offline. In CI the gate runs zizmor offline and holds no token. gh reads its token from the
system credential store, so an empty `GH_CONFIG_DIR` leaves it reachable. When the gate starts, it takes every
variable gh, zizmor or mise reads a GitHub token from out of its own environment, in every spelling, and hands
gh's own two to gh alone.

The gate starts git with no system or global config. In a checkout another account owns, git then refuses the
repository as dubious ownership, and the gate stops. Fix it by making your account the directory's owner. The gate
reads no `safe.directory` entry, by design.

Every tool that searches for its own config runs with that config named: ESLint with `--config eslint.config.ts`,
Prettier with `--config .prettierrc` and `--no-editorconfig`, taplo with `--config .taplo.toml`, zizmor with
`--config .github/zizmor.yml`, tsc with `--project` once per project, and the commit hook's commitlint with
`--config commitlint.config.js`. The gate clears `SHELLCHECK_OPTS` for every process it starts, since it reaches
ShellCheck through actionlint.

Every row that walks the tree says how many files it checked, and fails when that is none. The `format`, `toml`,
`workflows` and `renovate` rows hand their tool the tracked files, so a new file counts once `git add` names it,
and `.gitignore` never hides a tracked one. The `toml` row checks that taplo reports each file it was handed, and
the `workflows` row that actionlint and zizmor each report every tracked workflow. The `workflows` row also fails
unless every job passing `secrets: inherit` calls a reusable workflow of this repository, because a zizmor waiver
binds to a file, never to what a job calls. It reads that from a zizmor pass with no config and no ignores, so no
waiver, inline or in `.github/zizmor.yml`, hides a job from it. The `format` row asks Prettier which files it
formats with no config search, so a `package.json` nested anywhere never loads a Prettier plugin into the gate.

Before any row, the gate refuses to run beside what Bun reads before the gate's first line:

- a tracked env file Bun loads (`.env`, `.env.local`, and the `development`, `production` and `test` pairs), at
  any depth;
- a tracked `.npmrc` at any depth, which names the registry `bun install` fetches from;
- a tracked `node_modules`, or a tracked path under one, at any depth, and a `node_modules` directory on disk
  below the root, since Bun, tsc and typescript-eslint resolve a bare import from the nearest one first;
- a `bunfig.toml` holding anything but `[install] minimumReleaseAge`, since Bun runs a `preload` it names and
  applies a `[define]` table;
- a `scripts/tsconfig.json` that differs from the copy in `scripts/startup.ts`, and any other `tsconfig.json`,
  `jsconfig.json`, `package.json` or `node_modules` under `scripts/`, since Bun resolves the gate's imports through
  them;
- a root `tsconfig.json` that differs from the copy in `scripts/expected.ts`, and any other `tsconfig.json` or
  `jsconfig.json` on disk, at any depth outside `node_modules` and Claude Code's worktrees, with every file an
  `extends` names held too. The root one reads `eslint.config.ts` alone, and the `typecheck` row reads both projects
  and fails on a tracked TypeScript file neither reads. Bun applies a config's `paths` and `baseUrl` to every
  import below it, `node_modules` code included, so either can send a package a commit hook's tool imports to
  repository code;
- a `patchedDependencies` entry in `package.json` for a package the gate's scripts import, and a `package.json`
  that does not parse;
- a key repeated within one object of any JSON file the gate reads, since Bun reads the first where a JSON parser
  reads the last.

It also refuses a config a tool would read in place of the one the gate names, and a change to what a row skips or
waives, so that change is always a change to the gate. A config that changes what a row reports is refused on
disk, tracked or not, so the gate on your machine agrees with CI:

- a `.prettierrc` that differs from the copy in `scripts/startup.ts`, any other Prettier config file anywhere in the
  tree, a `package.yaml`, and a `prettier` key in any tracked `package.json`, since Prettier loads a config written
  as code and any plugin a config names;
- an `eslint.config.ts` that differs from the copy in `scripts/expected.ts`, and any other `eslint.config.*`
  anywhere, since ESLint runs the one nearest each file it lints when no config is named;
- a `commitlint.config.js` that differs from the copy in `scripts/startup.ts`, any other `.commitlintrc*` or
  `commitlint.config.*` anywhere, and a `commitlint` or `cosmiconfig` key in any tracked `package.json`;
- a `.prettierignore` whose patterns differ from the shared ones in `scripts/startup.ts` and this repository's own
  `/REPOS.md` in `scripts/expected.ts`. Every Prettier run passes `--ignore-path .prettierignore`, so `.gitignore`
  never narrows Prettier;
- a `.taplo.toml` that differs from the copy in `scripts/startup.ts`, and any other `.taplo.toml` or `taplo.toml`;
- a `.github/zizmor.yml` that differs from the copy in `scripts/expected.ts`, any other `zizmor.yml` or
  `zizmor.yaml`, and a tracked file under `.github` carrying a `zizmor: ignore[...]` comment. A waiver is an entry
  in `.github/zizmor.yml`, under that audit's ignore list. It names `file:line`, so a move of the finding turns the
  gate red, except a `secrets-inherit` waiver, which names the file because the `workflows` row holds its callee;
- a `shellcheck disable` directive in a tracked workflow. ShellCheck has no waiver file, so rewrite the script
  until ShellCheck passes it. CI's `workflows` job also refuses a directive the file's text hides, such as an
  escaped or folded one, since it reads the script ShellCheck reads;
- a workflow `shell:` other than `bash`, `sh` or `pwsh`, on a step or under a `defaults.run`, since actionlint runs
  ShellCheck for bash and sh alone. CI's `workflows` job checks the same line by line, so a script line that
  spells `shell:` is refused there too;
- a `.github/actionlint.yaml` or `.github/actionlint.yml`, which can silence any actionlint finding;
- a lefthook config beside `lefthook.yml` (`lefthook.*` or `.lefthook.*`), which lefthook reads when
  `lefthook.yml` is missing, and a tracked `lefthook-local.*` or `.lefthook-local.*`, which lefthook merges over
  `lefthook.yml`. `.gitignore` lists the local ones for your own use;
- a `.config` directory at the root, which mise, lefthook and commitlint's cosmiconfig each read;
- a tracked workflow whose path is not `.github/workflows/<name>.yml` exactly, and a tracked path under a `.git`,
  `.sl`, `.svn`, `.hg` or `.jj` directory, since the workflows or format row would count it and never check it;
- a root file whose name before the first dot is a program the gate, its hooks or an install start, `bun`, `bunx`,
  `gh`, `git`, `mise` or `node`, whatever its extension. `bun.lock`, `mise.toml` and `mise.lock` pass.

Each name is compared through Unicode case folding, broader than any filesystem's, so a spelling that a
case-insensitive filesystem opens as a refused name is refused too. A template such as `.env.example` passes, and
so does your own untracked env file, `.npmrc` or `lefthook-local.yml`. The gate loads nothing from `node_modules/`
until these checks pass, so a planted package never runs ahead of its refusal.

A few checks run only in CI, each because it needs something a working machine does not have. The `commits`
job lints a pull request's commit range and the subject its squash writes, which do not exist before the pull
request does. The `workflows` job runs zizmor's online audits, which flag a pinned commit outside its action's
repository, an advisory against a pinned action and a version comment naming the wrong tag. It also checks each
asset `mise.lock` names against GitHub's record of it. Both need the job token, and no gate job holds one. The
`dependency-review` job compares the pull request's dependencies against its base through GitHub's dependency
graph. That review sees the direct npm packages `package.json` names and nothing under `bun.lock`, which is the
one leg it covers here. `codeql` is GitHub's analysis, over the TypeScript gate every Bun repository copies and
over the workflows, and it runs on GitHub. Its `Analyze` checks are required, and a code-scanning rule refuses a
merge while an analysis is missing or still running ([What never happens](#what-never-happens)).

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
The `commits` job lints the landing subject with every ignore off, so a pull request GitHub's revert button opens
fails until its title takes this form.

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
- `scripts/`: the gate. `check.ts` is the runner, `startup.ts` holds the preflight checks, `expected.ts` holds
  what this repository's own configs must say, `tools.ts` holds the mise expectations, `run.ts` starts every
  process with a deadline, `github.ts` reads gh's token, and `tsconfig.json` is the gate's own TypeScript config.
  The `*.test.ts` files are the gate's own tests, and `stand-ins.ts` holds the programs they start in place of the
  real ones. `run.ts`, `tools.ts` and `startup.ts` are the same in every Bun repository of the set.
- The root `tsconfig.json`: the TypeScript config for `eslint.config.ts`, the one TypeScript file outside
  `scripts/`.
- The root and `.github/`: the community files GitHub serves as defaults, and this repository's own boilerplate.
- `docs/`: the documents [README.md#documentation](README.md#documentation) indexes.

## Tests

The gate's own suite runs as the `scripts:test` row, `bun test ./scripts/`, ahead of the other rows. Every program
a test would start is a stand-in from `scripts/stand-ins.ts`, never the real gh, git, mise or the network, and the
row fails when it counts no test. The other rows are the checks on the rest of the tree, and the break round in the
alignment record proves they go red.

## Code

- Every process the gate starts goes through `scripts/run.ts`, so every one carries a deadline. A process still
  running at its deadline is killed with every process it started. A process that exits while one it started
  still holds its output fails its row, which says so. That process runs on, since nothing the gate can reach
  ends a process whose parent is gone, so end it yourself.
- `scripts/run.ts` resolves every program to an absolute path from `PATH` alone, and Bun itself runs as
  `process.execPath`. A program found through a link back into the checkout is passed over. On Windows a bare
  program name resolves from the current directory before `PATH`, so a committed `gh.bat` would otherwise run in
  place of gh, which the preflight refuses ([The gate](#the-gate)).
- Every process the gate starts gets `PATH` narrowed to its absolute entries outside the checkout, so a program
  one starts by name never resolves inside it.
- The gate starts mise with an environment built from an allow-list, never the one it inherited.
- Bun's script runner puts `node_modules/.bin` first on `PATH`, so under `bun run` a committed
  `node_modules/.bin/bun` would replace the gate. CI installs with `bun install --frozen-lockfile --ignore-scripts`,
  and CI and the push hook call `bun --no-env-file scripts/check.ts` directly, which skips the script runner, so
  the preflight's
  `node_modules` refusal runs before every merge.
- A row throws with the tool's own output, so a red row reads the same as running the tool by hand.
- Every package runs from its absolute path under `node_modules`, and every tool `mise.toml` pins from the path
  `mise which` prints. mise, gh and git each start from an absolute `PATH` entry outside the checkout.
- ESLint lints and Prettier formats. An ESLint rule that is wrong for this code is turned off in
  `eslint.config.ts` with its reason beside it, and its copy in `scripts/expected.ts` changes in the same commit.

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
