# Developing

## Prerequisites

- [Bun](https://bun.sh), at the version `packageManager` in `package.json` names.
- [mise](https://mise.jdx.dev). It installs the tools `mise.toml` pins at the versions `mise.lock` records.
- [git](https://git-scm.com). The gate starts it to list the tracked files it refuses.
- [gh](https://cli.github.com), optional. When `gh auth token` succeeds, the gate runs zizmor online; otherwise
  zizmor runs offline and no token is needed.

When a process is still running at its deadline, the gate also starts the system's own `taskkill` on Windows, or
`ps` elsewhere, to end it and every process it started. A process that already exited is never killed by its pid.
When one it started still holds its output, the row fails and that process runs on, since only a Windows job
object reaches a process whose parent is gone, and Bun offers none. End it yourself.

## First run

```sh
bun install
bun run check
```

`bun install` installs the dependencies and the git hooks. The first gate run installs the mise tools from the
lockfile.

## Running it

None. The repository ships no program. The reusable workflows run on GitHub, and the gate is the one thing that
runs here.

## Generated files

- `mise.lock`: `mise lock`. The taplo checksum lines are the exception `mise.toml` records.
- `bun.lock`: `bun install`.

## Tests that need a real thing

None.
