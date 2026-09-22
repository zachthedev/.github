# Contributing

## Setup

Install before committing. [docs/dev.md#prerequisites](docs/dev.md#prerequisites) names what the machine needs,
and `bun install` installs the dependencies and the git hooks. The commit hook checks every commit message
before it is recorded, and the push hook runs the gate and refuses the push when it fails. Both hooks resolve
their tools from the installed dependencies, so a clone with nothing installed refuses every commit and push
until the install runs.

## The gate

```sh
bun run check
```

One command, and it is the whole gate. It has no quick form, because no row is slow, so the push hook runs it
whole. CI's gate job runs the same script on Linux, macOS and Windows, so a green run on your machine is a green
run there.

`bun run check:rows` lists the rows. `bun run check <row>` runs one row, resolving the pinned binaries without
installing them.

A few checks run only in CI, each because it needs something a working machine does not have. The `commits`
job lints a pull request's commit range and title, which do not exist before the pull request does. The
`dependency-review` job compares the pull request's dependencies against its base through GitHub's dependency
graph. That review sees the direct npm packages `package.json` names and nothing under `bun.lock`, which is the
one leg it covers here.

## Commit messages

Every commit follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). commitlint
checks the message in the commit hook and again in CI, over the pull request's commits and its title.

```text
type(scope): subject

body
```

The type is one of those `@commitlint/config-conventional` accepts. A reusable workflow or a preset is what
this repository ships, so a change in what one does to a caller is `feat` or `fix`, and a change to this
repository's own tooling is `chore` or `ci`.

The scope is optional. `.github/commit-scopes.json` lists each scope and what it covers, and commitlint
accepts no other. Omit the scope rather than invent one. A new part of the repository earns a scope in that
file, in the change that adds the part.

The header and every body line stay within 72 characters. A squash merge lands the pull request title as
the commit subject with ` (#NNN)` appended, and CI lints that composed subject, so keep the title itself
within 65.

A body carries what the diff cannot show: what was wrong, what the change does now, and what was left undone.
A breaking change carries `!` after the type or scope and explains the break in the body. For a reusable
workflow, a break is a caller's `uses:` line, `with:` input or required secret that stops working.

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
- A row throws with the tool's own output, so a red row reads the same as running the tool by hand.
- Every binary resolves through `mise which`, `bunx --no-install` or `bun node_modules/<package>/…`. Nothing
  reads the machine's own installs.

## Dependencies

Every dependency is pinned to an exact version and moved by Renovate under a three-day cooldown. The
cooldown is also in `bunfig.toml`, so a lock file refresh in a container observes it. The `renovate` package
is a development dependency because its `renovate-config-validator` is what checks the presets, at the same
version the `deps` workflow runs.

`trustedDependencies` in `package.json` names the one dependency whose install script runs. Naming it
replaces Bun's built-in allow list, which would otherwise build a native addon Renovate lists as optional and
never needs here.

The advisory check sees the direct npm packages `package.json` names. A transitive advisory under `bun.lock`
is fixed by hand from the alert with `bun audit fix`.

## Releases

release-please opens one release pull request from the commits on `main` and keeps it current. Merging it
tags the merge commit and creates a draft release. The types that appear in the changelog are the keys under
`changelog-sections` in `release-please-config.json`, which is the one place that list lives. release-please
owns `CHANGELOG.md`, the version in `package.json` and `.release-please-manifest.json`.

The version starts at `0.1.0`. Every caller pins a reusable workflow by commit, so nothing here is a
compatibility promise until a caller asks for one. Nothing is published to a registry. The owner flips each
draft public by hand.

## What never happens

- Nobody hand-edits `CHANGELOG.md`, the version in `package.json` or `.release-please-manifest.json`.
  release-please writes all three from the commits, and a hand edit is overwritten or, worse, shifts the next
  version it computes.
- No version number goes into `HANDBOOK.md`. A version lives in the file that pins it, so a bump is one edit
  and the handbook never goes stale.
- No `mise.lock` line is written outside `mise lock`, except a checksum computed as `mise.toml` says. The
  lockfile is what an install fetches and compares, and the gate holds it to the expectations in
  `scripts/tools.ts`. A hand-written line is a line nothing verified.
- No preset or workflow change merges past a red gate. A preset reaches every repository on its next Renovate
  run, and a workflow reaches every caller that bumps to it, so the gate is the one check between a change and
  every repository.
