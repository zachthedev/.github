# zachthedev/.github

What every `zachthedev` repository shares, in one place. GitHub reads some of it on its own, and each
repository calls or extends the rest.

## What it holds

| Part                                                                 | Read by                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [.github/workflows/](.github/workflows/)                             | Every repository's `ci.yml`, `cd.yml`, `codeql.yml`, `deps.yml` and `audit.yml`, which call these with `uses:`.      |
| [renovate/](renovate/)                                               | Every repository's `.github/renovate.json`, which extends one kind preset from this directory on its default branch. |
| The documents in the table below                                     | GitHub, as the default for a repository that carries none of its own, and a person aligning a repository.            |
| [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/)                   | GitHub, as the default issue forms for a repository that defines none.                                               |
| [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) | GitHub, as the default pull request template.                                                                        |
| [.github/FUNDING.yml](.github/FUNDING.yml)                           | GitHub, for the sponsor button on every repository.                                                                  |

The reusable workflows:

- [commits.yml](.github/workflows/commits.yml): commitlint over a pull request's commits and the subject its
  squash writes.
- [workflows.yml](.github/workflows/workflows.yml): actionlint and zizmor over a repository's `.github`, with
  zizmor's online audits, and each `mise.lock` asset checked against GitHub's record.
- [dependency-review.yml](.github/workflows/dependency-review.yml): the advisory check on what a change adds.
- [codeql.yml](.github/workflows/codeql.yml): code scanning over the caller's languages and `actions`.
- [deps.yml](.github/workflows/deps.yml): the daily Renovate run, under the updater app.
- [release-pr.yml](.github/workflows/release-pr.yml): the release pull request, under the releaser app.
- [publish.yml](.github/workflows/publish.yml): the publish of a draft release.

This repository is a caller too. Its `ci.yml`, `cd.yml` and `audit.yml` are its own, and `codeql.yml` and
`deps.yml` run for it on their own clocks beside serving every other caller.

## Documentation

| Document                                 | Holds                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [HANDBOOK.md](HANDBOOK.md)               | The standard every `zachthedev` repository is aligned to. Each kickstart holds the files for it. |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | Setup, the gate, commit messages, where code goes, dependencies, releases, what never happens.   |
| [docs/dev.md](docs/dev.md)               | Prerequisites, the first run, generated files.                                                   |
| [AGENTS.md](AGENTS.md)                   | What an agent reads first, runs to verify, and never does in a session. `CLAUDE.md` imports it.  |
| [SECURITY.md](SECURITY.md)               | What counts as a vulnerability here, and how to report one privately.                            |
| [SUPPORT.md](SUPPORT.md)                 | Where a question goes, and how long a reply takes.                                               |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | The Contributor Covenant, with the reporting address.                                            |

## Working on it

```sh
bun install
bun run check
```

`bun run check` is the gate. [CONTRIBUTING.md](CONTRIBUTING.md) says how a change is proposed. A change to a
preset reaches every repository on its next run. A change to a reusable workflow reaches a caller after the
next release here and that caller's merged bump. The gate validates every preset and lints every workflow
before a merge for that reason.

This repository is itself aligned to the handbook as a `bun-tooling` repository. A caller pins a reusable
workflow by commit and moves on its own schedule.

## License

[MIT](LICENSE). The Contributor Covenant text in `CODE_OF_CONDUCT.md` is CC BY-SA 4.0, as its attribution
section says.
