# zachthedev repository handbook

How a `zachthedev` repository is set up, whatever stack it is in. A repository is aligned when every row in the
checklist holds, or the repository records where it differs and why.

**zachthedev is designed as an organization.** Nothing here depends on one person's machine or account
configuration. A repository that moves to an organization keeps working.

**A row is hard or overridable.** A hard row holds in every repository. An overridable row can differ where the
difference is deliberate and recorded at the drift site. The drift site is a comment in the file where the
deviation is made, beside the deviating line. Where that file has no comment syntax, the row names the file that
carries the record. A hard row can carry a setting the repository chooses, and its section names it.

**The kickstart templates are the source of truth for files.** This handbook states the rules. Each kickstart
holds the files that satisfy them for its stack.

**A well-known guardrail over a hand-rolled mechanism.** A hand-rolled check survives only where it closes a big
gap no tool closes, at low maintenance. The repository names the gap.

**A stack leans on its native abilities over generalized tooling.** A tool the stack owns is pinned and run the
stack's way. Only a tool no stack owns goes through a cross-stack pin.

**No version is written in this handbook.** The principle is the latest version of everything that is compatible
together and past the publish cooldown. Stable by default. Where an API is mostly stable, take the newer
version: migrating later costs more than changing now.

## The checklist

| Row          | Override | The rule                                                                                            |
| ------------ | -------- | --------------------------------------------------------------------------------------------------- |
| Identity     | allowed  | MIT by default, one copyright line, the legal name, the first publication year, never updated       |
| Authorship   | none     | the legal name only where a field is legally operative, `ZachTheDev` everywhere a user reads        |
| Branch rules | none     | one ruleset on the default branch, pull requests only, checks required by check-run name            |
| Actions      | none     | read-only default token, Actions cannot approve pull requests, SHA pinning required                 |
| Environments | none     | a scope per credential, a tier per deployment, an approval per reviewed publish, each with a policy |
| Secrets      | none     | an identifier is a variable, only a value that grants access is a secret, held where it is used     |
| Apps         | none     | releases and dependency updates run as GitHub Apps, never as a user or `GITHUB_TOKEN`               |
| Tags         | none     | one ruleset over every tag restricting creation, update and deletion, the releaser app its bypass   |
| Dependabot   | none     | alerts on everywhere, security updates on in `rust-crates`, `rust-app` and `csharp-installer` alone |
| Gate         | none     | one command per stack, run locally and called by CI, named in the Adapters table                    |
| Workflows    | none     | every action pinned by SHA with a version comment, linted and audited in CI                         |
| CodeQL       | none     | a committed workflow over the shipped language plus `actions`, never default setup                  |
| Commits      | none     | conventional commits, scopes declared in a file, enforced by a hook and in CI                       |
| Hooks        | none     | lefthook, `commit-msg` lints the message, `pre-push` runs the gate or its quick form                |
| Formatting   | none     | Prettier, one deviations-only config, one exact version across every repository                     |
| Updates      | none     | self-hosted Renovate from the shared presets, a three-day cooldown, one bot opening pull requests   |
| Advisories   | none     | block on what a change introduces, never on what the world discovers about it                       |
| Tools        | none     | stack tools pinned natively, cross-stack tools through mise, each tool's tier stated                |
| Releases     | none     | release-please, release-plz for Rust, a draft, a publish job in an environment                      |
| Versioning   | none     | semantic versioning, `0.x` until the interface settles, the release tool owning the number          |
| Labels       | allowed  | the kickstart's label set, every label defined before a tool applies it                             |
| Authoring    | none     | template output first, library over hand-rolled code, no fact restated in prose                     |

## Definitions

A stack is the language a repository is written in: Bun, Go, Rust or C#. A kind is the stack plus what the
repository ships. A repository takes the one kind whose row describes it. A template repository adds `template`
to its kind.

| Kind               | Ships                                           |
| ------------------ | ----------------------------------------------- |
| `bun-service`      | a deployed service, such as a Cloudflare Worker |
| `bun-tooling`      | nothing: tooling, scripts, a template           |
| `rust-crates`      | crates on crates.io and a built artifact        |
| `rust-app`         | a built artifact and no crate                   |
| `csharp-installer` | an installer, under central package management  |
| `go-cli`           | a binary                                        |
| `template`         | a layer added to a template repository's kind   |

The gate is the one local command per stack that CI calls (Gate). Nothing else is called a gate. A check is
one thing the gate or CI verifies. A required check is named in the branch ruleset by its check-run name.

A workflow is a file under `.github/workflows/`. A job is one entry under a workflow's `jobs:`. A reusable
workflow in `zachthedev/.github` is called by a job with `uses:`, and the job carries the workflow's name.

## Files

Every boilerplate file a repository carries. The kickstart ships each one. The form says how much is shared.
"Identical" is byte-identical in every repository, so any diff is a deviation. "Shape" is one structure with
slots the marker names. "Own" is the repository's, and only its existence is shared. "Generated" is written by a
command. A row that a section owns names that section.

| File                                       | Form      | Rule or section                                                                                                          |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `LICENSE`                                  | shape     | Identity                                                                                                                 |
| `README.md`                                | own       | what it is, how to get it in one line, the documentation table, the gate command, no copy of a printed list              |
| `CONTRIBUTING.md`                          | shape     | Setup, The gate, Commit messages, Where code goes, Tests, Code, Dependencies, Releases, What never happens               |
| `SECURITY.md`                              | shape     | Security, Reporting, What is supported, In scope, Out of scope, After a report, `hey@`                                   |
| `CHANGELOG.md`                             | own       | written by the release tool alone, one per crate under release-plz                                                       |
| `docs/dev.md`                              | shape     | Prerequisites, First run, Running it, Generated files, Tests that need a real thing                                      |
| `docs/install.md`                          | shape     | `rust-crates`, `rust-app`, `csharp-installer`, `go-cli`; Requirements, Install, Check the download, Upgrade, Uninstall   |
| `docs/deploy.md`                           | shape     | `bun-service`; Your own deployment, Releasing deploys, Operating it                                                      |
| `docs/usage.md`                            | own       | every kind but `bun-tooling`; what `--help` and the README do not carry                                                  |
| `AGENTS.md`                                | shape     | Read first, Verify, Never, Deviations, Where the rest is; substance for the session, a link for the tree                 |
| `CLAUDE.md`                                | identical | one line, `@AGENTS.md`, below                                                                                            |
| `.claude/settings.json`                    | shape     | the read-only git allowlist plus what the repository adds, recorded in `CONTRIBUTING.md`                                 |
| `.gitattributes`                           | identical | `* text=auto eol=lf`, so a hook or script runs on every host, binaries marked per stack                                  |
| `.gitignore`                               | shape     | Authoring                                                                                                                |
| `.editorconfig`                            | shape     | Formatting                                                                                                               |
| `.prettierrc`                              | identical | Formatting                                                                                                               |
| `.prettierignore`                          | own       | Formatting                                                                                                               |
| `package.json`, `bun.lock`, `bunfig.toml`  | shape     | commitlint, Prettier and lefthook pinned, `packageManager` set, the cooldown under Updates. Go pins lefthook in `go.mod` |
| `commitlint.config.js`                     | identical | Commits                                                                                                                  |
| `.github/commit-scopes.json`               | own       | Commits                                                                                                                  |
| `lefthook.yml`                             | shape     | Hooks                                                                                                                    |
| `mise.toml`, `mise.lock`                   | shape     | Tools                                                                                                                    |
| `.cargo/config.toml`                       | shape     | `rust-crates` and `rust-app` alone, the cooldown under Updates                                                           |
| `.github/CODEOWNERS`                       | identical | one comment line plus `* @zachthedev`                                                                                    |
| `.github/PULL_REQUEST_TEMPLATE.md`         | shape     |                                                                                                                          |
| `.github/ISSUE_TEMPLATE/config.yml`        | shape     | `blank_issues_enabled: false` plus the contact links                                                                     |
| `.github/ISSUE_TEMPLATE/*.yml`             | own       | the forms, each naming its labels                                                                                        |
| `.github/renovate.json`                    | shape     | Updates                                                                                                                  |
| `.github/dependabot.yml`                   | shape     | `rust-crates`, `rust-app` and `csharp-installer` alone, Dependabot                                                       |
| `.github/zizmor.yml`                       | shape     | `unpinned-uses` at hash-pin, `dependabot-cooldown` at three days in the kinds with `dependabot.yml`                      |
| `.github/workflows/ci.yml`                 | shape     | Workflows                                                                                                                |
| `.github/workflows/cd.yml`                 | shape     | Workflows                                                                                                                |
| `.github/workflows/codeql.yml`             | shape     | CodeQL                                                                                                                   |
| `.github/workflows/deps.yml`               | identical | Updates                                                                                                                  |
| `.github/workflows/audit.yml`              | shape     | Advisories                                                                                                               |
| `release-please-config.json`, its manifest | shape     | every stack but Rust, Releases                                                                                           |
| `release-plz.toml`                         | shape     | Rust, Releases                                                                                                           |
| `.worktreeinclude`                         | shape     | the gitignored files a new worktree is seeded with                                                                       |
| `MARKERS.md`                               | generated | Kickstarts                                                                                                               |

- `CODE_OF_CONDUCT.md`, `SUPPORT.md` and `FUNDING.yml` live once in `zachthedev/.github`, which GitHub serves as
  every repository's default. A repository carries its own only to differ.
- Every document is written for a human contributor first: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and
  anything under `docs/`. Links between them are relative markdown links, clickable on github.com.
- `AGENTS.md` lives at the repository root under the vendor-neutral name, so every vendor's agent reads one
  editable file. It writes out what an agent alone needs: the gate commands and the rules about what an agent
  runs, reads or changes in a session. It reaches everything about the tree by a relative link. A session rule
  is written with its reason. A tree rule is one imperative line with a link to
  `CONTRIBUTING.md#what-never-happens` and no reason.
- `CLAUDE.md` is one line, `@AGENTS.md`. Claude Code expands the import, so the same file is read once in every
  session, on every platform.
- `docs/` is flat. `docs/dev.md` is in every repository. A kind adds the files its Files rows name. Any other file
  under `docs/` is the repository's own. `README.md` indexes every document. A workspace member's own
  documentation sits beside it and the index reaches it.
- `.claude/` holds the settings file alone until a shared dotfiles repository assembles the owner's rules, hooks
  and skills into every repository.

## Adapters

The gate command per stack, the pins the stack owns, and the kickstart that holds the stack's files.

| Stack | Kinds                        | Gate                | Stack-owned pins                                                        | Kickstart          |
| ----- | ---------------------------- | ------------------- | ----------------------------------------------------------------------- | ------------------ |
| Bun   | `bun-service`, `bun-tooling` | `bun run check`     | `package.json` `packageManager`, `bunfig.toml`                          | `kickstart`        |
| Go    | `go-cli`                     | `task check`        | `go.mod` toolchain and tool directives                                  | `kickstart-go`     |
| Rust  | `rust-crates`, `rust-app`    | `cargo xtask check` | `rust-toolchain.toml`, `[workspace.dependencies]`, `.cargo/config.toml` | `kickstart-rust`   |
| C#    | `csharp-installer`           | `dotnet cake.cs`    | `Directory.Packages.props`, `global.json`, `dotnet-tools.json`          | `kickstart-csharp` |

A repository with two stacks takes both. One gate command runs both halves, Renovate takes both ecosystems, and
the release artifact decides which release flow leads.

## Kickstarts

Each stack has a template repository, flagged as a GitHub template, with a clean single-commit history.
`kickstart` is the Bun base, and every other kickstart duplicates it and adds its stack. A new repository starts
from its kickstart. An existing repository is aligned by matching its kickstart.

- Every place a clone must act carries a `TODO(kickstart):` marker. A generated `MARKERS.md` lists them. One
  command proves the template is absorbed: `git grep` for the marker exits non-zero.
- The README points at the Files table for what is copied verbatim and what has slots. It tells a clone to trim
  what it does not need and record the deviation at the drift site.
- Each kickstart README links to this handbook.
- Each shape document ships with its fixed headings and a `TODO(kickstart):` line under every slot. A heading with
  nothing to say in the clone holds "None."

## Identity

- `LICENSE` is MIT. The copyright line reads `Copyright (c) <year> Zach Landquist`.
- Another license is allowed. `LICENSE` has no comment syntax, so its drift site is the license section of
  `README.md`.
- Every repository carries a `LICENSE`, published or not.
- The year is the year GitHub created the repository, read from `created_at`, and it is never updated.
- A derivative keeps the original notice and adds its own beneath it.

## Authorship

- The legal name, `Zach Landquist`, appears only in a legally operative field, because it is who enforces or
  relicenses the work. The copyright line under Identity is the only one.
- Every field a user reads takes `ZachTheDev`: a manifest's author, a package's author, an installer's
  manufacturer, an assembly's company. Check where a manifest field surfaces before deciding which it is.
- The public email is `hey@zachthe.dev`, in every field a user reads that carries one:
  `ZachTheDev <hey@zachthe.dev>`.
- Commits carry `Zach Landquist <me@zachthe.dev>` from the global git identity. No repository sets its own.

## GitHub settings

These live in GitHub's settings, so they are written here and read back through the API.

### Branch rules

One active ruleset on the default branch, classic branch protection off. Rules: `deletion`, `non_fast_forward`,
`pull_request`, `required_status_checks`.

| Parameter                                         | Value                                                           |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `required_approving_review_count`                 | 1                                                               |
| `require_code_owner_review`                       | true                                                            |
| Bypass actor                                      | the repository-admin role, mode `pull_request`                  |
| `require_last_push_approval`                      | false                                                           |
| `required_review_thread_resolution`               | true                                                            |
| `dismiss_stale_reviews_on_push`                   | true                                                            |
| `require_extra_approval_for_unattributed_changes` | true                                                            |
| `required_status_checks`                          | each check run named directly with its source app, `strict` off |

- The role's bypass mode is never `always`. Every change is a pull request, and the bypass waives the approval
  alone.
- GitHub refuses self-approval, so a sole maintainer merges with `gh pr merge --admin`. The friction is
  deliberate: every repository is shaped for more than one contributor.
- Stacked pull requests are fine. Each is merged on its own with `--admin`.
- A deploy key is the only other bypass actor, only where an unattended job must push. Its bypass mode is
  `always`, because a push is not a pull request. A `DeployKey` actor stores no actor id and covers every deploy
  key on the repository. Such a repository therefore keeps exactly one key, named in a comment beside the step
  that pushes.
- A check becomes required only after it reports on a pull request the releaser app opened. A check nothing
  reports blocks every pull request.
- Every required check records its source app, GitHub Actions, which the API takes as `integration_id` 15368.
  A token with `checks: write` therefore cannot satisfy it under the same name.
- A repository not yet on GitHub is created in this order: the repository, its environments with their values,
  its labels from the kickstart, the Actions settings, private vulnerability reporting on, the wiki and projects
  off, the first push, the first green run, then the rulesets.
  A workflow that names an environment holding no values fails on its first run, and a ruleset that requires a
  check nothing has reported blocks the first pull request.

### Actions

- `default_workflow_permissions`: `read`
- `can_approve_pull_request_reviews`: `false`
- `sha_pinning_required`: `true`

### Environments

An environment has one of three purposes, and its name says which.

- A deployment target is a place the software runs, named for the tier alone: `production`, `staging`,
  `testing`, `development`. Lowercase, singular, never abbreviated.
- A credential scope serves a job that deploys nothing. It is named for the workflow that consumes it, in
  kebab-case (`deps` for `deps.yml`), or for a capability several workflows share (`release-pr`,
  `archive-write`). It sets `deployment: false`. It takes a reviewer only where a human approves. A scheduled
  run takes none.
- A publish approval holds a human approval and nothing else, and is named for the act: `release`.

Every environment carries a custom deployment branch policy naming the refs its workflow accepts. Every
environment sets `prevent_self_review: false`, because a sole reviewer otherwise deadlocks.

### Secrets

- An identifier is a variable: an account id, a database or namespace id, a domain, a fingerprint, an app client
  id. Only a value that grants access is a secret. Variables print unmasked in run logs.
- A credential belongs to the environment that uses it. A repository-level secret is the exception, and the
  workflow that consumes it says why in a comment beside the read.
- A `uses:` job takes the called workflow's job-level environment. The caller passes nothing through.

### Apps

Two private GitHub Apps, one per role, named for the role so a change of tool renames nothing.
`zachthedev-releaser` opens release pull requests and publishes. `zachthedev-updater` opens dependency-update
pull requests.

- One app per role, because a ruleset bypass and a leaked key are each granted per app. The releaser alone
  bypasses the tag ruleset. The updater's key, held by an unattended job running a third-party image, opens
  nothing a release needs.
- A token is minted per run with `actions/create-github-app-token`. It takes `client-id`, `private-key` and
  every `permission-*` the job needs. Narrowing is the workflow's choice, so a leaked key mints the whole grant.
- The client id lives in a variable and the key in a secret, on the environment of the workflow that mints from
  it. That holds in an organization too: an organization secret is readable from any branch, which drops the
  branch policy.
- An app can hold several keys. A key is deleted only after every repository holding it moves. The owner loads
  each secret. A key never enters an agent's transcript.
- Before changing an app, its key or its installation, list what uses it.

### Tags

- One tag ruleset over every tag restricts `creation`, `update` and `deletion`. The releaser app is its bypass
  actor. release-please's forced tag and release-plz's tag both run under the releaser token, so no release is
  refused. The updater can never mint a tag.
- A failed release is recovered by cutting the next version, never by moving a tag.
- Immutable releases stay off (Known defects).

### Dependabot

- Alerts are on in every repository. They are the feed Renovate's security fixes read, never a check.
- Security updates are on in `rust-crates`, `rust-app` and `csharp-installer` and off in every other kind. The
  kind's `.github/dependabot.yml` scopes them. Every entry carries `open-pull-requests-limit: 0`, so Dependabot
  opens no version update anywhere.
- In Rust the `cargo` entry admits transitive crates alone (`allow: dependency-type: indirect`), so Dependabot
  fixes what Renovate cannot and nothing else. A direct advisory shows Dependabot's "all versions were ignored"
  note on the alert beside Renovate's pull request. That split is intended.
- In C# Dependabot fixes every NuGet advisory, because its NuGet updater never reads the dependency type. A
  direct advisory gets a pull request from each bot, and the second closes itself after the first merges.
- The `github-actions` entry ignores every dependency, because the security-updates switch is repository-wide
  and Renovate owns action advisories.
- A Dependabot pull request carries `fix(deps)`, `dependencies` and `security`. It runs CI on `pull_request`
  with a read-only token and no Actions secret, and needs no bypass actor.

### Vulnerability reporting

- `private_vulnerability_reporting`: `enabled`. The advisory URL every `SECURITY.md` names depends on it.

## Gate

- One command per stack runs every check a contributor can run locally. CI calls that command, never a list of
  steps. The command per stack is in the Adapters table.
- CI can add a check that cannot run locally. Its reason is recorded at the drift site, a comment beside the
  job in `ci.yml`. The `commits` and `workflows` jobs are standard, not exceptions.
- The gate exists so that as much work as possible happens locally and no contributor iterates on Actions
  minutes.
- Wherever the code can be cross-platform, CI runs the gate on windows, darwin and linux. A narrower matrix is
  recorded at the drift site, a comment beside the matrix in `ci.yml`.
- The stack's own runner drives the gate: Bun scripts in `package.json`, `xtask` for Rust, Cake for C#, go-task
  for Go. A `Makefile` is a violation.
- `check` is the whole gate. A `check:quick` without the slow rows, such as the tests, is allowed for the
  `pre-push` hook, per stack: `task check:quick`, `cargo xtask check --quick`, a Cake target.
- One gate task lists the gate's rows, and `bun run` with no arguments counts. Documentation names that task
  and restates no list.

## Workflows

- The reusable workflows live in `zachthedev/.github` as `workflow_call` workflows: `commits`, `workflows`,
  `dependency-review`, `codeql`, `deps`, `release-pr`, `publish`. A repository calls them from five files and
  adds its own gate job. A fix lands once.
- `ci.yml` holds everything that judges a pull request: the gate matrix, `commits`, `workflows`,
  `dependency-review`. `cd.yml` holds everything after a merge. That is the release pull request on push to the
  default branch, the publish chained with `needs:` on the release job's outputs in the same run, and the deploy
  for a service. GitHub raises no `release` event for a draft, so nothing listens for one. `codeql.yml`,
  `deps.yml` and `audit.yml` stand alone, because each runs on its own clock.
- A workflow cannot call itself, so a file that is both reusable and self-run carries both trigger sets in one
  file. That holds for `codeql.yml` and `deps.yml` in `zachthedev/.github` alone. In every other repository
  `deps.yml` is the caller.
- Every action is pinned by full commit SHA with a trailing `# vX.Y.Z` comment.
- Job permissions are the minimum the job needs. `persist-credentials: false` on any checkout that pushes
  nothing. A caller grants the called workflow's declared permissions on its `uses:` job, because GitHub
  refuses the call otherwise.
- A tool published by GitHub, a platform service or a runtime setup runs through its maintainer's official
  action, pinned by commit. Platform services: code scanning, dependency review, a release bot, a dependency
  bot, an app token, an attestation, a secret scanner. Runtime setups: Go, .NET, Bun. A runtime setup action
  verifies no download. The pin file the runtime reads plus the cooldown is the control.
- A linter, formatter or cargo plugin runs from the stack's own pin file where the stack has one. Otherwise it
  runs from mise, installed by mise's official action. A per-tool action is not used. Each one runs on Linux
  alone, records a lower integrity tier, or resolves its own version at run time. None gives a contributor the
  same tool locally.
- Each hand-rolled step is under a screen and names its gap in a comment. The steps: the mise lockfile
  assertions under Tools and the ShellCheck canary below.
- No repository test reads a workflow file. actionlint and zizmor are the readers of workflow YAML. A property
  neither checks (a step order, a trigger set, a matrix, a permission) is held by construction. The reusable
  workflow or the one gate task that sequences it holds it. A test that parses `ci.yml` for its shape is glue,
  and it goes.
- The `commits` workflow runs commitlint over the pull request range and its title.
- The `workflows` workflow runs actionlint and zizmor. zizmor runs with `--strict-collection` always and online
  in CI. In the gate it runs online when `gh auth token` succeeds and offline otherwise. The gate proves
  ShellCheck ran by writing a canary workflow with an unquoted variable and requiring the finding back.
  actionlint exits 0 with ShellCheck absent, and no flag changes that.
- A scheduled workflow's requirement reads "at least once a day", and its header claims nothing tighter (Known
  defects).
- After any edit to a scheduled workflow's cron line, the `if:` that names the cron changes with it, and the
  owner confirms the failure notification still reaches a person (Known defects). A job gated on a cron string
  its schedule no longer raises skips forever, green.

## CodeQL

- A committed `codeql.yml`, never default setup. Default setup pins nothing and names checks the repository does
  not control.
- The job carries an explicit `name: Analyze (<language>)`, so the check name is stable.
- The languages are the shipped language plus `actions`. The `actions` analysis runs beside zizmor. Neither
  replaces the other.

## Commits

- Conventional commits, enforced by the `commit-msg` hook (Hooks) and again by the `commits` job. Types come
  from the specification. Scopes live in `.github/commit-scopes.json`, an array of `{scope, covers}` objects,
  which `commitlint.config.js` reads and `CONTRIBUTING.md` points at.
- The header is at most 72 characters. Renovate's headers are shortened by the presets' `commitMessageAction`
  and `commitMessageTopic`, never by exempting the bot.
- A tooling change is `chore` or `ci`, never `fix`.

## Hooks

- lefthook in every stack. `commit-msg` lints the message. `pre-push` runs `check:quick` where it exists, else
  the gate.
- A Go repository pins lefthook as a `go.mod` tool directive, because lefthook is a Go program and the stack
  leans on its native abilities. Its `package.json` carries commitlint and Prettier alone.
- A hook resolves its tool with `bunx --no-install`, so the lockfile's pin runs (Updates).
- The hooks fail closed on a clone with no dependencies installed, so `CONTRIBUTING.md` says to install first.
- No `.githooks/`.

## Formatting

- Prettier formats everything it owns. The configuration is identical in every repository, so a shared file is
  byte-identical across repositories. A diff means a real difference.
- `.prettierrc` carries only the keys whose values differ from Prettier's defaults, and the kickstart's file is
  the source. `proseWrap` is not written. Prose stays as the author wrapped it.
- One exact Prettier version across every repository, never a range. A bump is one pull request per repository.
- `.editorconfig` agrees with the config for every file Prettier owns.
- `prettier --check .` runs with no glob and no ignore flags. A generated file the owning tool formats goes in
  `.prettierignore`.
- C# is formatted by CSharpier at the same width.
- A repository joining the standard pays one formatting-only commit touching every file Prettier owns.

## Updates

- Self-hosted Renovate runs at least once a day in every repository through the shared `deps` workflow in
  `zachthedev/.github`, under the updater app. It is the only bot that opens pull requests.
- `.github/renovate.json` extends one kind preset from `zachthedev/.github//renovate/` on its default branch,
  and adds only what is true of that repository alone. The `.github` repository validates every preset change
  before it merges. That is the check on a change that reaches every repository on the next run.
- The base preset holds the standard, and no preset or repository file restates a Renovate default:
  - `config:recommended` with digest pinning and abandonment flags
  - new pull requests in the Monday window, every other run rebasing open branches
  - a three-day `minimumReleaseAge` under `timestamp-required`
  - one pull request per ecosystem for minor and patch bumps, and for digests where a manager pins one
  - a major on its own branch
  - security fixes ignoring the window and the cooldown
  - lock file maintenance in the same window
  - the dependency dashboard on
  - no automerge
  - a branch rebased only on conflict
  - commit types derived: `fix` for a runtime dependency, `chore` for tooling, `ci` for a workflow, scope `deps`
  - labels: `dependencies` on every pull request, `ci` on a workflow bump, `security` on a fix
- A `zachthedev/**` bump's SHA is on `.github`'s `main`. The reviewer checks it with
  `gh api repos/zachthedev/.github/compare/main...<sha>`, reading `behind` or `identical`.
- The Monday window's own pull requests keep a quiet repository active, so its scheduled workflows stay
  enabled (Known defects).
- Security fixes come from Dependabot alerts (Dependabot). Renovate fixes a direct dependency in every ecosystem
  and an indirect Go module, because `go.mod` names it. A transitive Cargo or NuGet advisory is Dependabot's. A
  transitive Bun advisory is fixed by hand from the alert with `bun audit fix`, because no bot fixes one.
  Renovate's `security:gomodIndirectSecurityUpdates` preset is never used. It disables the modules behind
  `tool` directives.
- The cooldown:
  - Every version waits three days after its release. A release with no timestamp waits forever, so every pin
    resolves on a datasource that carries one. A git submodule pointer carries none.
  - The cooldown is never lowered, excluded around or bypassed without auditing the version. A hand pin ahead of
    the cooldown records its audit in the commit body. Another repository inherits by reading that record, never
    by copying the pin.
  - A bare `bunx <package>` honors only the user-level cooldown, so nothing the repository controls gates it.
  - Lock file maintenance runs the package manager directly and takes no Renovate cooldown. The ecosystem's own
    file carries one where it exists, with the reason in the file. The updater and CI containers carry no other
    configuration. Bun: `bunfig.toml`. Cargo: `.cargo/config.toml` with `[registry] global-min-publish-age`,
    once the pinned toolchain ships the key (Known defects). NuGet and Go have no such file, and a repository in
    those ecosystems says so in `CONTRIBUTING.md`.
  - A git submodule pointer move is a dependency change no cooldown observes. That is one reason a dependency
    comes from a registry, not a submodule.
  - No hand-rolled test guards the cooldown settings. The ruleset's required review is the control.
- The updater's image is pinned by tag and digest in the `deps` workflow alone. The tag is looked up on Docker
  Hub, which records a push time (Known defects). The image is pulled from `ghcr.io` by digest. The digest is
  content-addressed, so no step compares the two registries. The workflow caps the Docker Hub lookup at ten
  pages. The registry refuses anonymous pagination past a thousand tags, and Renovate then drops every
  timestamp.

## Advisories

- An advisory check blocks on what a change adds to something already published, never on what the world
  discovers about it.
- Every pull request runs `dependency-review-action` against its base at `fail-on-severity: high`, scopes
  runtime and development.
- The release pull request runs the same action against the last release tag through `base-ref`, scope
  runtime. A first release uses the root commit. Users and production hold the last release, not main.
- Nothing blocks after the merge: not the tagged build, not the publish, not the deploy. A failed release is
  recovered under Tags. A service deploys through an advisory and rolls back natively. A library or installer
  publishes through an advisory. Users hold the old version until the next one.
- The waiver is `allow-ghsas` with a comment naming the advisory, what it blocks, why shipping is safer and the
  removal condition. A red advisory check is never merged past with `--admin`.
- Go adds `govulncheck` beside both advisory checks, because it blocks only on a reachable call.
- Live whole-tree readers run as reports, never as checks: `bun audit` daily, `cargo deny check advisories`
  weekly, `dotnet package list --vulnerable` weekly. They run from `audit.yml`, on its own clock. GitHub's
  database lacks RustSec entries that OSV carries, and the weekly report covers those. `audit.yml` also carries a
  weekly job that calls the reusable `workflows` workflow, so zizmor's online audits of the pinned actions run
  without a pull request. A red run is the report.
- The advisory check sees direct npm packages only under Bun, no NuGet package under central package
  management, and full lockfiles under Cargo. `CONTRIBUTING.md` states which legs the check covers. A C# repository
  submits a dependency snapshot from the restored graph on every pull request head (Known defects). The
  snapshot counts as coverage only once a compare shows real versions.
- A template repository's alerts are fixed first, because its pins are copied into every new repository.

## Tools

- A tool the stack owns is pinned the stack's way: `go.mod` tool directives, `dotnet-tools.json`, cargo for
  xtask dependencies. Tools no stack owns, actionlint, zizmor, ShellCheck and taplo, are pinned in `mise.toml`
  with `mise.lock`. `mise.lock` is excluded from the formatter.
- A backend is chosen for integrity: `aqua:` where a registry entry exists, `github:` otherwise. `cargo:` and
  `ubi:` record no lockfile integrity, so neither is used (Known defects).
- Each tool's integrity tier is stated in the repository. The tiers: provenance, a checksum in a pinned tree, a
  checksum recorded by a third party, or a version alone. "Verified" is never written for a hash check.
- The settings `locked`, `lockfile`, `locked_verify_provenance`, `provenance_api_failures_fatal`,
  `github_attestations` and `aqua.github_attestations` are set. `lockfile_platforms` names the platforms the
  lockfile pins. `[tool_config] locked` is set, because no environment variable reaches it.
- mise refuses a version disagreement and a missing platform entry. `mise install --locked --dry-run` proves it.
- The gate asserts the checksum, the backend, the url host and path, the url_api host and the provenance line
  (Known defects). It asserts them for every tool, per pinned platform, against constants in source, with the
  stack's TOML library. This is a named hand-rolled check, because nothing else reads the lockfile against
  expectations outside it.
- A release whose GitHub assets carry no digest and whose aqua entry names no checksum file gets no checksum
  from `mise lock`. Its checksum is the sha256 of the artifact at the recorded url, computed once and written
  into `mise.lock`, and mise verifies it on install. The comment in `mise.toml` records how it was produced.
- `locked_verify_provenance` verifies against the coordinate the lockfile itself supplies. It arms the downgrade
  refusal for an entry that claims provenance and replaces none of the assertions.
- The assertions run before the install, held by construction: one task asserts, then installs.
- The gate resolves a binary through `mise which` and invokes that path. A human activates mise in the shell.
- `MISE_BACKENDS_<TOOL>` overrides a backend from the environment and no setting reports it. The gap is named.

## Releases

- release-please in every stack except Rust, which takes release-plz (Known defects). The two never share a
  repository: release-plz skips any crate whose tag already exists.
- The job for the release pull request runs in `release-pr` with `deployment: false`, opened by the releaser
  app. The publish job runs in `release`.
- The release pull request says `Managed by` the app, not the tool.
- A release is created as a draft, every time. Assets upload and attest against the draft. Whether a human or
  the publish job flips the draft public is the repository's choice. The draft is not.
- release-please pairs the draft with forced tag creation, because GitHub creates no tag for a draft, and sets
  `bump-minor-pre-major`, so a breaking change below `1.0.0` bumps the minor (Versioning). release-plz creates
  the tag itself.
- Under release-please the changelog shows `feat`, `fix`, `perf`, `revert` and `build`, and hides `chore`,
  `ci`, `docs`, `style`, `refactor` and `test`. A visible type cuts a release on its own. The set is the
  repository's choice. `release-please-config.json` has no comment syntax, so the drift site is
  `CONTRIBUTING.md`, naming the config key.
- Under release-plz the release decision is content-based: any commit that changes a crate's packaged files
  releases it. The commit type sets the changelog section and the bump size alone. A `feat` on `0.x` bumps
  patch.
- The releaser app holds Contents and Pull requests write and no Issues. Nobody removes `autorelease: pending`
  by hand.
- A package published to a registry is published once by hand, then through trusted publishing with no
  long-lived token. An installer is attached to the release, attested, then the draft flips.
- A Rust workspace:
  - `release-plz.toml` carries `git_release_draft = true` and `git_release_latest = false`.
  - A workspace publishing nothing adds `git_only = true` and marks `xtask` with `release = false`.
  - The release job runs under `release` with `id-token: write` and no registry token. release-plz exchanges
    the OIDC token itself.
  - The crates.io trusted-publishing configuration names the repository's own workflow file, so the reusable
    publish workflow works.

## Versioning

- Semantic versioning. The release tool owns the number. Nobody hand-edits a version or a changelog.
- `0.x` while a repository is unreleased to users, starting at `0.1.0`. A repository whose interface is already
  settled starts at `1.0.0`, and `CONTRIBUTING.md` says why.
- Below `1.0.0` a breaking change is a minor bump, so the changelog carries the break. The README says `0.x`
  promises no compatibility.
- A prerelease is `-rc.N`. Everything that reads the tag admits it before the first one is cut.
- Tags are `v`-prefixed: `v<version>`. A crate that versions on its own inside a workspace tags
  `<crate>-v<version>`.
- An installer or an assembly carries the numeric core alone, so a prerelease is not an upgrade path. The
  README says so.

## Labels

- The kickstart ships one label set with colors and descriptions. Labels are created at repository creation with
  `gh label clone` from the kickstart, so no repository defines them by hand.
- The base set is thirteen labels: GitHub's ten defaults without `good first issue` and `question`, plus
  `dependencies`, `ci`, `security`, `autorelease: pending` and `autorelease: tagged`. GitHub creates its
  defaults at repository creation, so a new repository deletes those two after the clone.
- A repository whose label set differs records why at the drift site, the file that names the label.
- Every label a tool applies exists before the tool runs. An undefined label is created on demand with no color
  and no description. That is how a set drifts.
- Label names are written only where a tool reads them: the issue forms' `labels:` lines, the Renovate presets,
  and `dependabot.yml` under Dependabot. The release tool owns `autorelease: pending` and `autorelease: tagged`.

## Authoring

A reviewer holds this row, except where a bullet names a check.

- A file with a canonical template or generator output starts from that output, and the repository's content
  goes on top.
- Library over hand-rolled code, and the prior question first: does the parse need to exist at all? Where the
  owning tool prints or refuses the thing, the parse goes. Where a parse survives, a format another tool owns is
  read with the stack's library for that format, never by line or regex.
- No count in prose of something that grows or shrinks. Name the thing and where its list lives.
- A version appears only in the file that pins it. Prose names the pin file.
- A duplication is removed, not bound. Where a command prints the list, the document names the command and holds
  no copy. Where no command prints it and a reader needs the restated form, a test binds the document to its
  source. The repository says so.
- Every reason, mechanism, list, table and procedure has one home in a human document. Any other file reaches it
  by a relative link that carries at most the bare name of the thing: a command, a path, a label, a one-line
  imperative.
- A committed generated file is checked by regenerating it in the tree and `git diff --exit-code`. A stale index
  fails on purpose.
- A prose rule that survives takes Vale as its mechanism, run as one gate step.
- A comment states what the code guarantees now. What changed goes in the commit message.
- `.gitignore` starts from the `github/gitignore` template for the stack, below one marker naming the template
  path and the commit it came from. Repository entries sit above the marker. The template block can be edited in
  place. A terse note above it says what changed, so a refresh knows what to carry.

## Known defects

Tool and platform defects that stop something being used as designed. Each entry names the section it
bears on, the defect, and the condition that removes it.

- zizmor (Dependabot): the `dependabot-cooldown` audit returns at the first update whose cooldown meets the
  threshold, so every later entry is unexamined. No workaround. Removed once the early return becomes a
  `continue` upstream.
- wrangler (Gate): `wrangler types --check` compares a hash of the config inputs against the file's header and
  passes a hand-edited body. The gate regenerates the file and diffs it. Removed once the check reads the body.
- gofmt (Gate): `gofmt -l` exits 0 with an unformatted file present. golangci-lint's formatter is the check.
  gofmt documents that exit code, so the entry stays.
- codeql-action (CodeQL): falls back from `build-mode: none` to autobuild on a server-side flag and logs it. A
  first run's log is read, and its conclusion alone is not trusted. Removed once the fallback fails the run.
- GitHub dependency graph (Advisories): reads `.csproj` alone and never `Directory.Packages.props`, so under
  central package management a NuGet bump produces an empty diff for `dependency-review-action`. The submitted
  snapshot under Advisories is what makes that leg real. Removed once the graph reads
  `Directory.Packages.props`.
- Renovate docker datasource (Updates): carries a release timestamp on Docker Hub alone, so a `ghcr.io` image
  under a timestamp-required cooldown is held forever. Removed once the datasource times `ghcr.io`, upstream
  issue 39064, when the lookup moves there.
- mise `cargo:` backend (Tools): writes no checksum, no platform table and no URL to the lockfile, and
  `mise lock` reports success over it. Removed once the backend writes them.
- mise lockfile (Tools): mise accepts a lockfile entry with its checksum removed, its backend rewritten, or its
  url host swapped. A deleted provenance line disarms the downgrade refusal. The gate's assertions under Tools
  exist for this. Removed once mise refuses each.
- Immutable releases (Tags): an immutable release locks the tag with its assets. The cleanup in
  `gh release delete --cleanup-tag` is a ref deletion, so it is refused. A bad release leaves the tag on the
  wrong commit with the version spent. Removed once a fork of release-please tracks burned version tags and
  handles hitting one.
- release-please (Releases): cannot write a version a Cargo workspace inherits through
  `version.workspace = true`. Its cargo-workspace plugin refuses the manifest. Upstream
  googleapis/release-please#2111. Removed once the fix merges and a Rust repository chooses to move.
- release-plz (Releases): in `git_only` mode it fails from the second release on when a workspace member
  depends by path on a crate inside a submodule. It rebuilds the released workspace in a worktree that holds no
  submodule contents. Upstream release-plz/release-plz#2983, whose merged fix covers the verify build and not
  manifest resolution. A consumer depends on the crate by registry version, not the submodule. Removed once
  manifest resolution reads the submodule.
- GitHub `schedule` trigger (Workflows): skips ticks and delays others by hours. A cron interval is a lower
  bound on the gap, never a latency. No workaround. GitHub documents the delay, so the entry stays.
- GitHub `schedule` disable (Workflows): GitHub disables `schedule` triggers in a public repository after 60
  days without a commit, and the notice goes to the last committer as one email. `gh workflow enable`
  re-enables a workflow. GitHub documents the disable, so the entry stays.
- Scheduled workflow notifications (Workflows): a failure notification goes to the last actor who edited the
  cron line, and no API reports who that is. A bot's bump can move it silently. Removed once an API reports the
  actor.
- actionlint (Workflows): refuses GitHub's recommended `$/` syntax for a same-repository reusable workflow
  call. A same-repository caller writes `./`, and `.github/zizmor.yml` disables the `self-repository` audit
  with that reason. Upstream rhysd/actionlint#711. Removed once actionlint accepts `$/`.
- cargo (Updates): a toolchain older than the one that ships `[registry] global-min-publish-age` warns on every
  command while the key is present. The key is added once the pinned toolchain ships it. The per-registry form
  is `registries.<name>.min-publish-age`. A `registry.min-publish-age` key does not exist. Removed once every
  Rust repository pins a toolchain that ships the cooldown.

## Where things live

- This handbook, the reusable workflows, the Renovate presets and the community files under Files:
  `zachthedev/.github`.
- The profile README: `zachthedev/zachthedev` while `zachthedev` is a personal account. `.github/profile/README.md`
  is the organization mechanism, and it takes over when the account becomes one.
- The files a repository copies: its kickstart.
- The per-repository alignment table: `REPOS.md`, local and gitignored, because it lists repositories that are
  private or not yet on GitHub.
