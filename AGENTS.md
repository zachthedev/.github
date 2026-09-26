# zachthedev/.github, a `bun-tooling` repository

[README.md](README.md) says what it is.

## Read first

Read these before changing anything, in order. They bind an agent as they bind a person.

1. [README.md](README.md)
2. [CONTRIBUTING.md](CONTRIBUTING.md), whole
3. [SECURITY.md](SECURITY.md)

## Verify

- `bun run check` is the gate. It has no quick form, because no row is slow.
- `bun run check:rows` lists the rows.
- `bun run check <row>` runs one row.

[CONTRIBUTING.md#the-gate](CONTRIBUTING.md#the-gate) says what the rows cover.

## Never

- Never run `bun add` or `bun install` with `--minimum-release-age` below the value in `bunfig.toml`, and never
  pass `--ignore-scripts` to work around a blocked install script in your own install. Installing an unread pull
  request branch or a new worktree passes `--ignore-scripts` on purpose ([Safety](CONTRIBUTING.md#safety),
  [Setup](CONTRIBUTING.md#setup)). The cooldown is the window in which a malicious release is pulled, and a
  version installed under a lowered one lands in `bun.lock` for every later install, where no cooldown reads it
  again.
- Never hand-edit `CHANGELOG.md`, the version in `package.json` or `.release-please-manifest.json`
  ([why](CONTRIBUTING.md#what-never-happens)).
- Never run `gh auth token` where its output is visible. gh answers from the system credential store, so the
  output is the owner's live token, and a transcript holding it forces a rotation.
- Never write a `mise.lock` line outside `mise lock`, except a checksum computed as `mise.toml` says
  ([why](CONTRIBUTING.md#what-never-happens)).
- Never commit a mise config or lock file beside `mise.toml` and `mise.lock`
  ([why](CONTRIBUTING.md#what-never-happens)).
- Never merge past a red gate ([why](CONTRIBUTING.md#what-never-happens)).

## Deviations

A comment beside a deviating line records a deliberate deviation. It is a decision, not a defect.

## Where the rest is

[README.md#documentation](README.md#documentation)
