# Contributing

If another `zachthedev` repository sent you here, read that repository's `README.md` and `docs/` and the
[handbook](https://github.com/zachthedev/.github/blob/main/HANDBOOK.md), since this guide covers
`zachthedev/.github` alone.

## Setup

The machine needs:

- [Bun](https://bun.sh), at the version `packageManager` in `package.json` names. Every package the gate runs
  arrives through `bun install` at the version `bun.lock` records.
- [mise](https://mise.jdx.dev). It installs the tools `mise.toml` pins at the versions `mise.lock` records.
- [git](https://git-scm.com). The gate's first check names the work tree through `git rev-parse` and lists tracked
  files through `git ls-files`.
- [gh](https://cli.github.com), optional. When `gh auth token` answers, the gate runs zizmor online. Otherwise
  zizmor runs offline and no token is needed.

These four are every program the gate starts from `PATH`: Bun runs the gate, and the gate starts git, mise and gh
by name. Every other program it runs is a package under `node_modules/` or a tool `mise which` names.

The first run:

```sh
mise trust
bun install
bun run check
```

`mise trust` lets mise read this checkout's `mise.toml`. `bun install` installs the dependencies, and its
`prepare` script installs the git hooks. The first gate run installs the mise tools from the lockfile. Before you
install a branch you did not write, read [Safety](#safety).

Run `bun install --frozen-lockfile` after every pull and every branch switch, before you run the gate or commit.
The gate and the hooks start each JavaScript tool from this checkout's `node_modules/`, and a stale install runs
another version ([Troubleshooting](#troubleshooting)). A new worktree installs with
`bun install --frozen-lockfile --ignore-scripts`. The hooks are shared by every worktree of a clone, and the
`prepare` script would repoint them at the worktree, which stops working once the worktree is removed. A Claude
Code worktree starts with no `node_modules/`.

The commit hook checks every commit message before it is recorded. The push hook runs the whole gate, as
`bun --no-env-file scripts/check.ts`, and refuses the push when it fails. The commit hook starts commitlint as
`bun x --bun --no-install commitlint`, which runs the copy `node_modules/.bin` holds, under Bun rather than a
`node` on `PATH`, and fetches nothing. The `format` script starts Prettier the same way. The hooks are no control
([Safety](#safety)).

`.claude/settings.json` allows `git status` alone, the allowlist every `zachthedev` repository shares, with deny
entries for `--output` and `--no-index`, and adds nothing to it.

## Safety

A pull request controls its own install, hooks and gate code. Read a branch's diff before you run anything on it,
a commit included, since the commit hook runs the branch's own `commitlint.config.js`. Install a branch you have
not read with `bun install --frozen-lockfile --ignore-scripts`, which runs no package's install script. Bun runs a
top-level `bunfig.toml` preload before the gate's first line and inside every JavaScript tool `bun x` starts, and
`bun run check` puts the branch's own `node_modules/.bin` first on `PATH`. `eslint.config.ts` and
`commitlint.config.js` are code the `lint` row and the commit hook run. The shared jobs refuse such a branch
before it merges, and nothing stops its first run on your machine but the diff read.

What reaches the tools from your own environment:

- `BUN_OPTIONS` reaches every direct Bun start: the gate itself through `bun run check`, `check:rows` and the push
  hook, and the `prepare` script's lefthook install. A `--preload` in it runs a module first in each. The gate
  withholds it from the processes it starts. A tool started through `bun x --bun --no-install` does not read it,
  and none of this repository's JavaScript tools starts a Bun of its own that would. Leave it unset.
- `BUN_INSPECT`, `BUN_INSPECT_CONNECT_TO` and `BUN_INSPECT_PRELOAD`. Leave them unset too. The last runs a module in
  every direct Bun start, the gate's `scripts:test` row and its ShellCheck stand-in among them, and nothing in the
  hooks or the gate clears them. A tool started through `bun x` does not run it.
- A personal env file. `bun x` ignores `--no-env-file`, so an untracked `.env` reaches every JavaScript tool the
  hooks, the `format` script and the gate's rows start, and can change what one reports
  ([Troubleshooting](#troubleshooting)).
- `MISE_BACKENDS_<TOOL>`. Leave it unset. It overrides a tool's backend from the environment, no setting reports
  it, and the gate does not close that gap.

The hooks are no control:

- A hook runs in your own environment and clears nothing from it.
- The hooks fail open. The hook script `lefthook install` writes prints `Can't find lefthook in PATH` and exits 0
  when it finds no lefthook binary, as in a checkout whose `node_modules/` is gone, and the commit or push goes
  through unchecked. A fresh clone runs no hook until `bun install` runs.
- They catch an accident, never a hostile branch. lefthook merges a branch's `lefthook-local.*` or
  `.config/lefthook-local.*` over `lefthook.yml`, and a job there with a hook job's name replaces it.

CI's `commits` job and gate decide the merge.

## Running it

The repository ships no program. The reusable workflows run on GitHub, and the gate is the one thing that runs
here ([The gate](#the-gate)).

Generated files, and the command that writes each:

- `mise.lock`: `mise lock`, after any edit to `mise.toml`. The taplo checksum lines are the exception `mise.toml`
  records.
- `bun.lock`: `bun install`.

## Where code goes

- `.github/workflows/`: the reusable workflows and this repository's own callers.
- `renovate/`: the base preset and one preset per kind.
- `scripts/`: the gate. `check.ts` is the runner, `startup.ts` holds what the gate refuses before its rows,
  `expected.ts` lists where this repository's project configs sit, `tools.ts` holds the mise expectations,
  `run.ts` starts every process, `rows.ts` holds what the rows conclude from their tools' output, `github.ts` reads
  gh's token, `shellcheck.ts` stands in for ShellCheck under actionlint, `eslint-plugin.ts` holds the ESLint rule
  `eslint.config.ts` loads, and `tsconfig.json` is the gate's own TypeScript config. The `*.test.ts` files are the
  gate's own tests, and `stand-ins.ts` holds the programs they start in place of the real ones. `check.test.ts`
  tests what this repository's `check.ts` adds and is this repository's alone. Which of the rest every Bun
  repository shares byte for byte is under [Gate](HANDBOOK.md#gate).
- The root `tsconfig.json`: the TypeScript config for `eslint.config.ts`, the one TypeScript file outside
  `scripts/`.
- The root and `.github/`: the community files GitHub serves as defaults, and this repository's own boilerplate.
  [README.md#documentation](README.md#documentation) indexes the documents.

## Code

- Every function signature carries explicit parameter and return types.
- Validate at the boundary and trust the inside. Input from a user, a file or a network is checked where it
  arrives, with zod where it has a shape.
- A comment explains why the code is shaped as it is. What changed goes in the commit message.
- Every process a gate script starts goes through `scripts/run.ts`, so every one starts from `PATH` alone, with no
  shell.
- A message that quotes input, such as a path or a value read from a file, JSON-quotes it. A newline or a carriage
  return in input then stays inside one line, where it cannot start a workflow command in a CI log.
- ESLint lints and Prettier formats. An ESLint rule that is wrong for this code is turned off in
  `eslint.config.ts` with its reason beside it.
- A waiver in code names exactly what it waives and says why, and a linter checks both. An ESLint directive names
  each rule and gives its reason after `--`, as in `// eslint-disable-next-line no-debugger -- reason`, and a
  disable is closed by its enable. `@ts-expect-error` carries a description of ten characters or more, and
  `@ts-ignore` and `@ts-nocheck` are refused. The gate's own ESLint rule, in `scripts/eslint-plugin.ts`, reads every
  comment ESLint parses: each `eslint`, `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`,
  `eslint-enable`, `eslint-env`, `global`, `globals` and `exported` directive, and each `@ts-expect-error` or
  `@ts-ignore`. It refuses a reason that holds no letter or digit once default-ignorable code points are removed.
  The eslint-comments plugin and ban-ts-comment accept a reason of a soft hyphen, a word joiner or a Braille blank
  alone, and the rule refuses each. A directive that names the rule itself hides the rule's report on that
  directive, so the `lint` row also refuses every report of the rule ESLint lists as suppressed. A configuration
  comment can turn a rule off for a whole file, so the row lints the tree a second time with
  `--no-inline-config` and refuses every report there from `gate/visible-reason`, ban-ts-comment or an
  eslint-comments rule. Nothing checks a reason on Prettier's ignore comment, so the `format` row refuses the
  comment itself.
- An import carries `with { type: 'json' }` or no attribute, and a dynamic import takes no options. ESLint refuses
  any other attribute, since Bun runs a file of any extension as code under one naming a loader, and no row reads
  a `.txt` as code.
- `.prettierrc` holds formatting options alone. Prettier loads a plugin or a shared config module it names as code
  before it checks anything, so a reviewer refuses a `plugins` key or a string value.

## Tests

- `bun test` is the runner. A test file sits beside the module it covers under `scripts/` and ends in `.test.ts`.
- A test states what the code is supposed to do, derived from the requirement, never copied from what the code
  printed.
- Table-driven cases through `test.each` are the default where several inputs share one assertion.
- A test touches no file outside a temporary directory and no network.

No test needs a real service. The gate's own tests under `scripts/` start a stand-in, itself a Bun process, in
place of every program the gate starts, and their `PATH` holds the stand-ins alone. So no case starts your gh, git
or mise or reaches the network. The suite covers `scripts/rows.ts`, which holds what the rows conclude from their
tools' output, and `scripts/check.test.ts` lints each waiver form the `lint` row refuses, the configuration
comment included. The rest
of what `scripts/check.ts` wires together is proven by a break round.

## The gate

```sh
bun run check
```

One command, and it is the whole gate. It has no quick form, because no row is slow, so the push hook runs it
whole. CI's gate job runs the same gate on Linux, macOS and Windows. A new check is a row in `scripts/check.ts`,
never a step in a workflow. When a local run fails or disagrees with CI, [Troubleshooting](#troubleshooting) says
why.

`bun run check:rows` lists the rows. `bun run check <row>` runs one row, resolving the pinned binaries without
installing them.

CI and the push hook run the gate by its file, `bun --no-env-file scripts/check.ts`, so no `node_modules/.bin` sits
ahead of `PATH`. The `check` and `check:rows` scripts pass `--no-env-file` too, and so do the `scripts:test` row's
`bun test` and the ShellCheck stand-in, the two Bun processes a row starts directly. Bun then loads no env file
into them.

No row resolves a tool from the machine's `PATH`. Bun is the process running the gate, and every other tool
resolves through `mise which` or runs as a JavaScript tool. The programs the gate expects on `PATH` are the
prerequisites [Setup](#setup) names. Each one starts from an absolute `PATH` entry outside the checkout alone, and
a program found there through a link back into the checkout is passed over. The gate never reads the working
directory for a program, and on Windows it tries `PATHEXT`'s extensions in their order. Every process the gate
starts gets that same narrowed `PATH`.

A row starts each JavaScript tool through `bun x --bun --no-install <tool>` under the Bun running the gate. First
it checks that `node_modules/.bin` holds the tool as a file, through every link. When it does not, the row fails
with "`<tool>` is not installed in this checkout: run bun install --frozen-lockfile, or bun install
--frozen-lockfile --ignore-scripts in a worktree (CONTRIBUTING.md#setup).", since `bun x` would run a copy from
elsewhere. The check covers the tool's command and never a package the tool loads. The native TypeScript compiler
finds its platform binary through `import.meta.resolve`, so with that package missing from a partial or copied
install, the `typecheck` row runs a parent directory's copy. On Windows the `.bin` entry is a shim file that
outlives its package, and a start then fails with bunx's own error in place of the message above. A clean frozen
install fixes both ([Troubleshooting](#troubleshooting)).

The gate imports its own two packages, zod and Prettier, by their paths under `node_modules/`, so a missing
install fails the row that loads one. The gate does not check `node_modules/` against `bun.lock`: CI installs
frozen before its gate, and a stale install is yours to refresh ([Setup](#setup)).

The gate withholds `BUN_OPTIONS` and `SHELLCHECK_OPTS` from every process it starts, in every spelling. Bun reads
`BUN_OPTIONS` as arguments ahead of its own, where a test name pattern hides tests from a count, and
`SHELLCHECK_OPTS` reaches ShellCheck through actionlint. Every process gets `NO_COLOR=1` and no `FORCE_COLOR` or
`CLICOLOR_FORCE`, since Bun colors its test summary under `FORCE_COLOR` whatever `NO_COLOR` says. Every row that
reads a tool's output strips ANSI color and hyperlink codes before it matches, because a tool can color its output
on a CI runner alone. Every line the gate prints shows a control character or an invisible mark as its `\u`
escape, so a job id or path in a tool's output cannot rewrite the lines above it.

No row has a deadline. CI's gate job sets `timeout-minutes`, which bounds the whole gate there, and Ctrl-C ends a
local run. `gh auth token` alone keeps a five-second bound, because its answer only decides whether zizmor runs
online: Bun kills gh at five seconds, and the row runs zizmor offline. A process that exits while one it started
still holds its output fails its row ten seconds later, which says so ([Troubleshooting](#troubleshooting)).

Every tool that searches for its own config runs with that config named: ESLint with `--config eslint.config.ts`,
Prettier with `--config .prettierrc` and `--no-editorconfig`, taplo with `--config .taplo.toml`, zizmor with
`--config .github/zizmor.yml`, tsc with `--project`, and the commit hook's commitlint with
`--config commitlint.config.js`. Each named form was measured to stop the tool's other config names, so the gate
refuses none of those names. The `format` row also asks Prettier's API, inside the gate's own process, which
tracked files it formats, and that call resolves no config at all, so no `package.json` beside a file loads a
plugin into the gate. The gate holds no config's text: `CODEOWNERS` names the owner for every path, and the
default-branch ruleset requires a code owner's review, so a change to a config is read before it merges.

Every row that walks the tree says how many files it checked, and fails when that is none. The `typecheck` row
first holds `tsc --version` to the major `package.json` pins for `@typescript/native`, since `typescript` ships a
`tsc` too ([Dependencies](#dependencies)). It then fails on a tracked TypeScript file that no project reads. The
`format`, `toml`, `workflows` and `renovate` rows hand their tool the tracked files, so a new file counts once
`git add` names it, and `.gitignore` never hides a tracked one. The `format` row also refuses a Prettier ignore
comment in any file it checks, since Prettier leaves the code after one unformatted and asks no reason. It matches
the shape Prettier honors, a comment opener (`//`, `/*`, `#`, `<!--`, `{{!` or `{{!--`) then spacing then the
keyword, so a document can name the keyword in prose or in backticks. The `toml` row checks that taplo reports
each file it was handed, and the `workflows` row that actionlint and zizmor each report every tracked workflow.
The `renovate` row requires the validator's success line beside its exit code for each preset and
`.github/renovate.json`, since the validator exits 0 over a config it never validated.

The `workflows` row then runs zizmor again with no config and inline ignores off, so it sees every job that passes
`secrets: inherit`, waived or not. Each such job calls a reusable workflow of this repository, by
`./.github/workflows/` or by `zachthedev/.github/.github/workflows/`, and a job calling anything else fails the
row. Each file the `secrets-inherit` waiver in `.github/zizmor.yml` names must hold such a job, so a waiver left
behind fails the row too.

actionlint runs ShellCheck through `scripts/shellcheck.ts`, which it hands each workflow script exactly as
ShellCheck reads it: YAML escapes and folding decoded, and every `${{ }}` expression blanked. The stand-in refuses
any line holding `#`, then `shellcheck` and a space, in any case and spacing, as a finding beside the step, and
otherwise runs the pinned ShellCheck over the same bytes. ShellCheck has no waiver file, so a script it flags is
rewritten. The stand-in prints ShellCheck's findings only once ShellCheck read the whole script and exited 0 or 1.
Any other ending leaves stdout empty, which actionlint reports as a failed run. Two canaries prove the wiring on
every run: one script whose SC2086 must come back from ShellCheck, and one whose `# shellcheck disable=SC2086` must
come back refused. actionlint runs ShellCheck for a `bash` or `sh` step alone, so the gate refuses a `shell:` value
outside `bash`, `sh` and `pwsh`, on a step or under `defaults.run`.

The `lint` row runs `eslint.config.ts`, and the `scripts:test` row runs the gate's own tests, `bun test ./scripts/`.
They are the last two rows, since each runs repository code that can write any file a row reads, and the checks
before the first row run again after each. A finding there prints as `preflight  after <row>, no later row ran`.
The test row says how many ran, and fails when none ran, when every one it counted was skipped, and when a name
pattern left any out. The count comes from bun test's own summary on stderr: the last `Ran` line and the counts
directly above it, which must add up to it. It runs with `CI=true`, so a `test.only` fails the row rather than
running alone and leaving its file's other tests out of the count.

Before any row, the gate refuses a config a tool reads that no flag can name, so a file beside the committed ones
never changes what a row reports. A config that changes what a row reports is refused on disk, tracked or not, so
the gate on your machine agrees with CI:

- a `.github/actionlint.yaml` or `.github/actionlint.yml`, which can silence any actionlint finding;
- a lefthook config beside `lefthook.yml` (`lefthook.*` or `.lefthook.*`), which lefthook reads when
  `lefthook.yml` is missing, and a tracked `lefthook-local`, `lefthook-local.*`, `.lefthook-local` or
  `.lefthook-local.*`, which lefthook merges over `lefthook.yml`. `.gitignore` lists the local ones for your own
  use;
- a `.config` directory at the root, which mise, lefthook and commitlint's cosmiconfig each read, and a root
  `package.yaml` or a `cosmiconfig` key in the root `package.json`. cosmiconfig reads its own settings from all
  three whatever `--config` names, and a `$import` there runs a module inside commitlint;
- a `node_modules` directory anywhere below the root, tracked or not. Bun, tsc and typescript-eslint resolve a bare
  import from the nearest one, so it replaces the installed package for the files beside it;
- a `tsconfig.json` or `jsconfig.json` at a path `scripts/expected.ts` does not list, tracked or not, since
  typescript-eslint reads the nearest one for each file it lints. The root one reads `eslint.config.ts` alone;
- a missing `scripts/tsconfig.json`, and any other `tsconfig.json`, `jsconfig.json`, `package.json` or
  `node_modules` under `scripts/`, since Bun resolves the gate's imports through them;
- a tracked workflow whose path is not `.github/workflows/<name>.yml` exactly, since actionlint and zizmor read that
  spelling alone, a tracked workflow whose `shell:` is not `bash`, `sh` or `pwsh`, and one the gate cannot read as
  YAML.

It also refuses these, tracked alone:

- a tracked env file Bun loads (`.env`, `.env.local`, and the `development`, `production` and `test` pairs), at
  any depth, since Bun loads one into every start beside it. A template such as `.env.example` passes, and so does
  your own untracked env file;
- a key repeated within one object of a tracked `package.json`, `tsconfig.json` or `jsconfig.json`, or of a file
  its `extends` names. Bun reads the first copy where `JSON.parse` reads the last, so a repeated
  `patchedDependencies` or `paths` could pass a check while Bun applies it. A file that does not parse as plain
  JSON is refused too;
- a `patchedDependencies` key in a tracked `package.json`, since `bun install` applies each patch it names over the
  package `bun.lock` pins;
- a `zizmor: ignore[...]` comment in a tracked file under `.github`. A waiver is an entry in `.github/zizmor.yml`.

The shared `commits` and `workflows` jobs refuse each of those four too. The gate keeps its copies because
`scripts/startup.ts` is shared byte for byte with every Bun repository, and the Bun kickstart, the shared text's one
writer, drops them once it pins the release that carries the shared checks.

Each name is compared with its case folded, broader than any filesystem's comparison, so a spelling that a
case-insensitive filesystem opens as a refused name is refused too. The first check names the work tree through
`git rev-parse --show-toplevel` and refuses one other than this checkout: git passes over a `.git` it cannot read,
an empty directory among them, and lists a parent repository's files without a word. Every git the gate starts runs
with no system or global config and nothing inherited from your environment.

The shared `commits` and `workflows` jobs refuse, before a merge, the files that run code or waive a check before
any gate row reads them. This repository's `ci.yml` calls both by `./`, so a pull request runs its own copy of
each, and code-owner review of `.github/workflows/` is the control on a change to them or to the job that runs the
gate. Beyond the gate's own refusals, the shared jobs refuse:

- a tracked `node_modules`, or a tracked path under one, and every tracked symbolic link;
- a `bunfig.toml` holding any key but `[install] minimumReleaseAge`;
- `paths` or `baseUrl` in a tracked `tsconfig.json` or `jsconfig.json` or in a file its `extends` chain reads;
- an `exports` key in a tracked `package.json`, since a bare import of the package's own name resolves to it ahead
  of `node_modules`;
- a `secrets-inherit` waiver in `.github/zizmor.yml` holding a colon, since this audit's waivers name a whole file;
- a root file named like a program the gate, its hooks or an install start (`bun`, `bunx`, `gh`, `git`, `mise` or
  `node`), and a root entry named `'`, which actionlint would read in place of the ShellCheck stand-in.

Review refuses what no row checks, since each such file sits in the diff: anything under `dist/`, `coverage/`,
`.claude/worktrees/` or a `.git`, `.sl`, `.svn`, `.hg` or `.jj` directory, a JavaScript or declaration file beyond
`commitlint.config.js`, a path below a personal file's name, a tracked `.claude/settings.local.json`, and a tracked
`.npmrc`, whose registry would fail every package's integrity check against `bun.lock`.

The `tools` row reads `mise.toml` and `mise.lock` against the expectations in `scripts/tools.ts`, and installs
from the lockfile only after that read passes. `mise.toml` holds `[tools]`, `[tool_config]` and `[settings]`
alone, and the last two equal the values in `scripts/tools.ts` exactly, because mise runs a `[hooks]`, `[env]` or
`[vars]` table on install. Every key of `mise.lock` is one `scripts/tools.ts` names. The row refuses every other
file mise reads as config or a lockfile in the root, such as `mise.local.toml`, `.tool-versions` or `.miserc.toml`,
because mise merges each one, and a lockfile beside it, over `mise.lock`. It refuses a link at the root or under
`.config`, `.mise` or `mise`. Every mise command the gate starts carries an environment built from a short list:
the temporary directory, the Unix home, a proxy, the Windows folders the system reports, and the gate's own mise
settings. No other variable reaches mise, so a personal mise setting never changes the gate. `mise.lock` pins
`linux-x64`, `macos-arm64` and `windows-x64`, and a contributor on another platform relocks in a pull request.

The `workflows` row runs zizmor online when `gh auth token` answers within five seconds, because some of its
audits read the pinned actions' repositories. gh answers from `GH_TOKEN`, `GITHUB_TOKEN` or its own login, and
those two names reach gh alone. The answer reaches zizmor's process alone. With no answer the row passes
`--offline`. The row's line says which mode ran. `ZIZMOR_OFFLINE`, set to any value, forces offline. CI's gate job
names no token, so the row runs offline there, and zizmor's online audits run in the `workflows` job below.

A few checks run only in CI, each because it needs something a working machine does not have. The `commits` job
lints a pull request's commit range and the subject its squash writes, which do not exist before the pull request
does. The `workflows` job runs zizmor's online audits, which flag a pinned commit outside its action's repository,
an advisory against a pinned action and a version comment naming the wrong tag. It also checks each asset
`mise.lock` names against GitHub's record of it. Both need the job token, and no gate job holds one. The
`dependency-review` job compares the pull request's dependencies against its base through GitHub's dependency
graph ([Dependencies](#dependencies)). `codeql` is GitHub's analysis, over the TypeScript gate every Bun repository
copies and over the workflows, and it runs on GitHub. Its `Analyze` checks are required. A code-scanning rule
refuses a merge while an analysis is missing or still running, and when the pull request adds a high or critical
security alert or an error-level alert.

No row asserts the repository's alignment with the handbook. A reviewer holds that.

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
accepts no other. Omit the scope rather than invent one. A scope never repeats the type: `docs(docs)`, `ci(ci)`
and `test(tests)` take the bare type, `docs:`, `ci:` and `test:`. A new part of the repository earns a scope in
that file, in the change that adds the part.

The `commit-msg` hook holds the header and every body line to 72 characters as written. A pull request merges
by squash, the one method the repository allows. A one-commit pull request lands its commit's subject and body,
and a longer one lands its title and each commit as a bullet. Either subject lands with ` (#N)` appended, and the
`commits` job holds that landed subject to 72 ([Commits](HANDBOOK.md#commits)). Keep a commit subject and a title
within 72 characters less that suffix: 64 to 67, fewer as the pull request number grows. A body paragraph never
opens with a bare type, because release-please reads it as a second change.

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

## Dependencies

Every dependency is pinned to an exact version and moved by Renovate under a three-day cooldown. The
cooldown is also in `bunfig.toml`, so a lock file refresh in a container observes it. The `renovate` package
is a development dependency because its `renovate-config-validator` is what checks the presets, at the same
version the `deps` workflow runs. `yaml` is one because `commitlint.config.js`, the set's shared text, reads the
Dependabot prefixes its ignore matches from `.github/dependabot.yml` through it. This repository carries no
`dependabot.yml`, so the ignore skips nothing here.

`trustedDependencies` in `package.json` names the one dependency whose install script runs: lefthook, which
installs the hooks. Naming it replaces Bun's built-in allow list, which would otherwise build a native addon
Renovate lists as optional and never needs here.

Two TypeScript compilers are installed on purpose. The `typecheck` row runs the native TypeScript 7 compiler from
the `@typescript/native` alias. `typescript` stays on 6.x for typescript-eslint, which reads types through the 6.x
compiler API and declares a peer range below 6.1.0. A rule in `.github/renovate.json` holds it below 6.1.0. Both
ship a `tsc`, and `bun install` links the name to the package whose name sorts first, the alias. Once
typescript-eslint supports TypeScript 7, `typescript` moves to 7.x, and the alias and the rule go.

The advisory legs:

- The `dependency-review` check blocks a pull request on what it adds against its base, and a release pull
  request on what the release adds against the last tag, at high severity. It sees the direct packages
  `package.json` names and the actions the workflows pin, and nothing under `bun.lock`.
- The `audit` workflow runs `bun run audit` over the whole of `bun.lock`, transitives included, once a day as a
  report. It never blocks a merge. A red run is work to pick up.
- Dependabot alerts stay on and its security updates stay off. Renovate opens the fix for a direct dependency. A
  transitive advisory is fixed by hand from the alert with `bun audit fix`, because no bot fixes one.

The `audit` script in `package.json` is the one home of the audit's level and its waivers. It runs `bun audit` at
`--audit-level=high`. A waived advisory is an `--ignore <id>` on that script, and this section names each one with
its reason and the condition that removes it. None is waived.

A hand pin ahead of the cooldown records its audit in the commit body: the release notes read, the maintainer
checked, the diff against the previous version. A waived advisory in the pull request check is an `allow-ghsas`
entry on `ci.yml`'s `dependency-review` job, with a comment naming the advisory, what it blocks, why shipping is
safer and the condition that removes it. A red advisory check blocks the merge like every required check
([What never happens](#what-never-happens)).

Each tool the gate runs, and how its bytes are held to their source:

- actionlint and zizmor: provenance. `mise.lock` records `github-attestations`, mise verifies the attestation on
  every install, and the gate refuses a lockfile that drops the line.
- ShellCheck and taplo: a checksum in a pinned tree, `mise.lock`. The `workflows` job also holds ShellCheck's
  checksum to the digest GitHub records for its asset. taplo's checksums were computed once from its release
  artifacts, as `mise.toml` records.
- commitlint, `yaml`, ESLint, typescript-eslint, the eslint-comments plugin, Prettier, lefthook, TypeScript, zod
  and renovate: a checksum in a pinned tree, `bun.lock`.
- Bun itself: a version alone. `packageManager` plus the cooldown is the control, because the setup action
  verifies no download.
- mise itself: a publisher signature, which `jdx/mise-action` checks against the release's signed checksums.

`MISE_BACKENDS_<TOOL>` overrides a tool's backend from the environment, and no setting reports it
([Safety](#safety)).

## Releases

release-please opens one release pull request from the commits on `main` and keeps it current. Merging it
tags the merge commit `v<version>` and creates a draft release. The `publish` job in `cd.yml` then waits for the
`release` environment's reviewer and flips the draft public. A draft nobody approves ships nothing, and a failed
release is recovered by cutting the next version. Nothing is published to a registry.

The types that appear in the changelog are the keys under `changelog-sections` in `release-please-config.json`,
which is the one place that list lives, and `build` is hidden with the rest. A release needs a user-facing change
or a break: release-please cuts no release whose changelog is empty. release-please owns `CHANGELOG.md`, the
version in `package.json` and `.release-please-manifest.json`.

## Troubleshooting

A local run that fails or disagrees with CI:

- A row that says a tool "is not installed in this checkout", or a hook that cannot find its tool, means a missing
  install. Run `bun install --frozen-lockfile`, or add `--ignore-scripts` in a worktree ([Setup](#setup)).
- A stale install runs another version. When `node_modules/.bin` holds a tool at the wrong version, the gate's
  check passes and `bun x` runs that copy. When the checkout holds none, the `bun x` of a hook or of the `format`
  script runs a copy from a parent directory, `PATH` or its own cache, and can report green. The gate's row refuses
  first. Run `bun install --frozen-lockfile` after every pull, every branch switch and in each worktree
  ([Setup](#setup)).
- A partial or copied install, such as one missing a platform package or copied from another OS, can run a
  parent directory's binary: the native TypeScript compiler finds its own through the parent's `node_modules/`.
  Delete `node_modules/` and run a clean `bun install --frozen-lockfile` ([The gate](#the-gate)).
- `bun install --frozen-lockfile` does not remove a package `bun.lock` no longer names, so a stale `node_modules/`
  can pass an import CI refuses. After a pull that drops a dependency, delete `node_modules/` and install again.
- A personal env file reaches every JavaScript tool `bun x` starts, the hooks, the `format` script and the gate's
  rows alike, since `bun x` ignores `--no-env-file`. A value there, such as `PRETTIER_EXPERIMENTAL_CLI`, can turn a
  row red locally alone. Move the file aside and run again ([Safety](#safety)).
- A gate that differs from CI can come from your environment. `BUN_OPTIONS` reaches the gate's own process before
  its first line, and `BUN_INSPECT`, `BUN_INSPECT_CONNECT_TO` and `BUN_INSPECT_PRELOAD` reach its `scripts:test` row
  and its ShellCheck stand-in too. Leave all four unset ([Safety](#safety)).
- A local gate can pass where CI's `commits` or `workflows` job fails, since those jobs refuse files the gate does
  not repeat ([The gate](#the-gate)).
- A `workflows` row that differs from CI can come from zizmor's online audits. They run on your machine when gh
  answers with a token and never in CI's gate job. `ZIZMOR_OFFLINE=1` runs what CI runs.
- In a checkout another account owns, git refuses the repository as dubious ownership, and the gate stops. Make
  your account the directory's owner. The gate starts git with no system or global config, so it reads no
  `safe.directory` entry, by design.
- A row that fails because a process its tool started still holds the tool's output leaves that process running,
  since nothing the gate can reach ends a process whose parent is gone. Find it and end it.

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
- Nothing merges past a red gate. The required checks and the code-scanning rule sit in a ruleset with no bypass
  actor. A preset reaches every repository on its next Renovate run, and a workflow reaches every caller that
  bumps to it, so the gate is the one check between a change and every repository.
