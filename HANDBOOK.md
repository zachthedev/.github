# zachthedev repository handbook

How a `zachthedev` repository is set up, whatever stack it is in. A repository is aligned when every row in the
checklist holds, or the repository records where it differs and why.

**zachthedev is designed as an organization.** Nothing here depends on one person's machine or account
configuration. Converting the account keeps every workflow call, preset and default file, and Apps lists what else a
conversion needs.

**A row is hard or overridable.** A hard row holds in every repository. An overridable row can differ where the
difference is deliberate and recorded at the drift site. The drift site is a comment in the file where the
deviation is made, beside the deviating line. Where that file has no comment syntax, the row names the file that
carries the record. A hard row can carry a setting the repository chooses, and its section names it.

**Every rule targets the finished repository, and a gap a repository cannot close yet is a declaration in its gate
that fails once the gap closes.**

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

| Row          | Override | The rule                                                                                                   |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| Identity     | allowed  | MIT by default, one copyright line, the legal name, the first publication year, never updated              |
| Authorship   | none     | the legal name only where a field is legally operative, `ZachTheDev` everywhere a user reads               |
| Names        | none     | `zach.tools` by ecosystem family, one naming form per ecosystem                                            |
| Branch rules | none     | two default-branch rulesets: squash pull requests, then the checks and code scanning no merge bypasses     |
| Actions      | none     | read-only default token, Actions cannot approve pull requests, SHA pinning required                        |
| Environments | none     | a scope per credential, a tier per deployment, an approval per reviewed publish, each with a policy        |
| Secrets      | none     | an identifier is a variable, only a value that grants access is a secret, held where it is used            |
| Apps         | none     | release pull requests, tags and dependency updates run as GitHub Apps, never as a user                     |
| Tags         | none     | one ruleset over every tag restricting creation, update and deletion, the releaser app its bypass          |
| Dependabot   | none     | alerts on everywhere, security updates on in `rust-crates`, `rust-app` and `csharp-installer` alone        |
| Gate         | none     | one command per stack, run locally and called by CI, named in the Adapters table                           |
| Workflows    | none     | every action pinned by SHA with a version comment, linted and audited in CI                                |
| CodeQL       | none     | a committed workflow, `security-extended`, over the repository's languages plus `actions`                  |
| Commits      | none     | conventional commits typed by their effect on users, scopes declared in a file, linted in a hook and CI    |
| Hooks        | none     | lefthook, `commit-msg` lints the message, `pre-push` runs the gate or its quick form                       |
| Formatting   | none     | Prettier from one deviations-only config at one exact version, taplo for every TOML file                   |
| Waivers      | none     | an inline waiver in code names its exact rule and a reason, and the gate refuses what no tool checks       |
| Updates      | none     | self-hosted Renovate from the shared presets, a three-day cooldown, one bot opening pull requests          |
| Advisories   | none     | block on what a change introduces, never on what the world discovers about it                              |
| Tools        | none     | stack tools pinned natively, cross-stack tools through mise, each tool's tier stated                       |
| Releases     | none     | release-please, release-plz for Rust, user-facing changes alone, a draft, a publish job                    |
| Versioning   | none     | Semantic Versioning, the release tool owning the number, `v` tags, a break below `1.0.0` bumping the minor |
| Labels       | allowed  | the kickstart's label set, every label defined before a tool applies it                                    |
| Authoring    | none     | template output first, library over hand-rolled code, no fact restated in prose                            |

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

| File                                       | Form      | Rule or section                                                                                                                                                          |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LICENSE`                                  | shape     | Identity                                                                                                                                                                 |
| `README.md`                                | own       | what it is, how to get it in one line, the documentation table, the gate command, no copy of a printed list                                                              |
| `CONTRIBUTING.md`                          | shape     | Setup, The gate, Commit messages, Where code goes, Tests, Code, Dependencies, Releases, What never happens                                                               |
| `SECURITY.md`                              | shape     | Security, Reporting, What is supported, In scope, Out of scope, After a report, `hey@`                                                                                   |
| `CHANGELOG.md`                             | own       | written by the release tool alone, one per crate under release-plz                                                                                                       |
| `docs/dev.md`                              | shape     | Prerequisites, First run, Running it, Generated files, Tests that need a real thing                                                                                      |
| `docs/install.md`                          | shape     | `rust-crates`, `rust-app`, `csharp-installer`, `go-cli`; Requirements, Install, Check the download, Upgrade, Uninstall                                                   |
| `docs/deploy.md`                           | shape     | `bun-service`; Your own deployment, Releasing deploys, Operating it                                                                                                      |
| `docs/usage.md`                            | own       | every kind but `bun-tooling`; what `--help` and the README do not carry                                                                                                  |
| `AGENTS.md`                                | shape     | Read first, Verify, Never, Deviations, Where the rest is; substance for the session, a link for the tree                                                                 |
| `CLAUDE.md`                                | identical | one line, `@AGENTS.md`, below                                                                                                                                            |
| `.claude/settings.json`                    | shape     | `git status` alone allowed, the `--output` and `--no-index` denies, plus what the repository adds, recorded in `CONTRIBUTING.md`                                         |
| `.gitattributes`                           | shape     | `* text=auto eol=lf`, so a hook or script runs on every host, plus the stack's binary patterns                                                                           |
| `.gitignore`                               | shape     | Authoring                                                                                                                                                                |
| `.editorconfig`                            | shape     | Formatting                                                                                                                                                               |
| `.prettierrc`                              | identical | Formatting                                                                                                                                                               |
| `.prettierignore`                          | own       | Formatting; the release tool's output: `CHANGELOG.md` under both tools, `.release-please-manifest.json` under release-please                                             |
| `.taplo.toml`                              | shape     | Formatting; excludes `node_modules/**`, `.claude/worktrees/**` and the stack's build output                                                                              |
| `package.json`, `bun.lock`, `bunfig.toml`  | shape     | commitlint, `yaml`, Prettier and lefthook pinned, `packageManager` set, the cooldown under Updates. Go pins lefthook in `go.mod`                                         |
| `eslint.config.ts`                         | shape     | `bun-service` and `bun-tooling` alone, Gate                                                                                                                              |
| `commitlint.config.js`                     | identical | Commits                                                                                                                                                                  |
| `.github/commit-scopes.json`               | own       | Commits                                                                                                                                                                  |
| `lefthook.yml`                             | shape     | Hooks                                                                                                                                                                    |
| `mise.toml`, `mise.lock`                   | shape     | Tools                                                                                                                                                                    |
| `mise.semver.toml`, `mise.semver.lock`     | shape     | `rust-crates` and `rust-app` alone, Releases                                                                                                                             |
| `.cargo/config.toml`                       | shape     | `rust-crates` and `rust-app` alone, the `xtask` alias under Gate, the cooldown under Updates                                                                             |
| `rustfmt.toml`                             | identical | `rust-crates` and `rust-app` alone, Gate                                                                                                                                 |
| `clippy.toml`                              | identical | `rust-crates` and `rust-app` alone, comments only, so clippy stops its search at the root (Gate)                                                                         |
| `deny.toml`                                | identical | `rust-crates` and `rust-app` alone, Gate and Advisories                                                                                                                  |
| `.github/CODEOWNERS`                       | identical | one comment line plus `* @zachthedev`                                                                                                                                    |
| `.github/PULL_REQUEST_TEMPLATE.md`         | shape     |                                                                                                                                                                          |
| `.github/ISSUE_TEMPLATE/config.yml`        | shape     | `blank_issues_enabled: false` plus the contact links                                                                                                                     |
| `.github/ISSUE_TEMPLATE/*.yml`             | own       | the forms, each naming its labels                                                                                                                                        |
| `.github/renovate.json`                    | shape     | Updates                                                                                                                                                                  |
| `.github/dependabot.yml`                   | shape     | `rust-crates`, `rust-app` and `csharp-installer` alone, Dependabot                                                                                                       |
| `.github/zizmor.yml`                       | shape     | `unpinned-uses` at hash-pin, `dependabot-cooldown` at three days in the kinds with `dependabot.yml` (Dependabot), the `known-vulnerable-actions` allow list (Advisories) |
| `.github/workflows/ci.yml`                 | shape     | Workflows                                                                                                                                                                |
| `.github/workflows/cd.yml`                 | shape     | Workflows                                                                                                                                                                |
| `.github/workflows/codeql.yml`             | shape     | CodeQL                                                                                                                                                                   |
| `.github/workflows/deps.yml`               | identical | Updates                                                                                                                                                                  |
| `.github/workflows/audit.yml`              | shape     | Advisories                                                                                                                                                               |
| `release-please-config.json`, its manifest | shape     | every stack but Rust, Releases                                                                                                                                           |
| `release-plz.toml`                         | shape     | Rust, Releases                                                                                                                                                           |
| `.worktreeinclude`                         | shape     | the gitignored files a new worktree is seeded with                                                                                                                       |
| `MARKERS.md`                               | generated | Kickstarts                                                                                                                                                               |

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
- `docs/` is flat, apart from `docs/images/` for the images a document shows. `docs/dev.md` is in every
  repository. A kind adds the files its Files rows name. Any other file under `docs/` is the repository's own.
  `README.md` indexes every document. A workspace member's own documentation sits beside it and the index reaches
  it.
- A YAML file takes `.yml`. GitHub documents that spelling for every file it reads. It reads the issue chooser's
  configuration only as `config.yml`, so a `.yaml` rule cannot hold everywhere. A file whose tool reads only
  `.yaml` keeps the tool's name.
- `.claude/` holds the settings file alone until a shared dotfiles repository assembles the owner's rules, hooks
  and skills into every repository.
- The shared `.claude/settings.json` allows `git status` alone. A permission rule is a text match that quoting
  evades, so a deny on an argument never makes a broader allow safe. An allow goes instead.

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

- `kickstart` ships the Bun tooling base alone: kind `bun-tooling` plus `template`, with no service parts. A
  service repository generates its Worker boilerplate with the Cloudflare CLI, `bun create cloudflare`, and merges
  it into the template, because template output comes first (Authoring). It then adds the deploy job,
  `docs/deploy.md` and `docs/usage.md`.
- Every place a clone must act carries a `TODO(kickstart):` marker. A generated `MARKERS.md` lists them. The
  template's gate regenerates `MARKERS.md` and diffs it.
- `MARKERS.md` prints the one command that proves the template is absorbed. It stays a printed command and never
  becomes a gate row, because a row failing on any marker keeps the template itself red.
- That command's standard is its form. It anchors at the top of the repository with `git -C "$top"`, because
  `git grep` with no path searches the current directory alone. It matches the marker with `-F`. It reads exit 1
  alone as absorbed, so a git error never does. Each generator prints the exclude pathspecs its own scanner skips.
- A kickstart's `cd.yml` carries a marker telling a clone to reset `CHANGELOG.md`, the release tool's manifest and
  any version file before its first release. That reset is the one sanctioned hand edit of those files
  (Versioning), and the clone's `AGENTS.md` and `CONTRIBUTING.md#what-never-happens` say so.
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

## Names

- `zach.tools` is organized by ecosystem family at its first segment and is flat below it.
- A Go module is `zach.tools/go/<name>`, where the name is the repository's minus any `-go` suffix. A program lives
  at `cmd/<what the user types>`.
- An Android or iOS app takes `zach.tools/app/<name>`, reversed as `tools.zach.app.<name>` for its application
  ID, namespace and package root.
- A published crate is `<project>-<component>`.
- A C# application takes its product name for its namespaces and assemblies. A NuGet library takes
  `ZachTheDev.<Product>` as its package ID, assembly name and root namespace.
- A WinGet identifier is `ZachTheDev.<Product>`, matching the installer's publisher fields.
- `package.json`'s `name` is the repository name. npm refuses a leading dot, so `zachthedev/.github` takes
  `@zachthedev/dotgithub`.
- An entry in zach-tools' `modules.json` stays while any version exists at its path.

## GitHub settings

These live in GitHub's settings, so they are written here and read back through the API.

### Branch rules

Two active rulesets on the default branch, classic branch protection off. `default-branch` holds `deletion`,
`non_fast_forward` and `pull_request`. `default-branch checks` holds `required_status_checks` and `code_scanning`.

| Parameter                                         | Ruleset                 | Value                                                                                    |
| ------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `required_approving_review_count`                 | `default-branch`        | 1                                                                                        |
| `require_code_owner_review`                       | `default-branch`        | true                                                                                     |
| `require_last_push_approval`                      | `default-branch`        | false                                                                                    |
| `required_review_thread_resolution`               | `default-branch`        | true                                                                                     |
| `dismiss_stale_reviews_on_push`                   | `default-branch`        | true                                                                                     |
| `require_extra_approval_for_unattributed_changes` | `default-branch`        | true                                                                                     |
| `allowed_merge_methods`                           | `default-branch`        | `squash`                                                                                 |
| Bypass actor                                      | `default-branch`        | the repository-admin role, mode `pull_request`                                           |
| Bypass actor                                      | `default-branch checks` | none                                                                                     |
| `required_status_checks`                          | `default-branch checks` | each check run named directly with its source app, `strict` off                          |
| `code_scanning`                                   | `default-branch checks` | tool `CodeQL`, `security_alerts_threshold` `high_or_higher`, `alerts_threshold` `errors` |

- The role's bypass mode is never `always`. Every change is a pull request. The bypass sits on `default-branch`
  alone, so `gh pr merge --admin` waives the approval and nothing else.
- GitHub refuses self-approval, so a sole maintainer's own pull request merges with `gh pr merge --admin`. The
  friction is deliberate: every repository is shaped for more than one contributor.
- A bot-authored pull request, a release or a dependency update, needs no self-approval. The owner approves it as
  code owner and merges it without `--admin`, so its rule suite records no bypass. That is practice, not the
  check control: `default-branch checks` binds the checks on either path.
- Every merge waits on the checks first: `gh pr checks <n> --required --watch`, then `gh pr merge <n> --squash`,
  chained so a red check ends the chain. `mergeStateStatus` never reports the checks on their own, so the wait
  reads them directly. The `Analyze (<language>)` checks stay required as that wait's handle, and a failed
  analysis shows its log under a named check.
- A deploy key is the only other bypass actor, only where an unattended job must push. It sits on both rulesets
  in mode `always`, because a push is not a pull request and carries no check run. A `DeployKey` actor stores no
  actor id and covers every deploy key on the repository. Such a repository therefore keeps exactly one key,
  named in a comment beside the step that pushes.
- A check becomes required only after it reports on a pull request the releaser app opened. A check nothing
  reports blocks every pull request.
- Every required check records its source app. A workflow job's check run, the `Analyze (<language>)` entries
  included, is posted by GitHub Actions, `integration_id` 15368. A token with `checks: write` therefore cannot
  satisfy a check under the same name.
- No required check names GitHub Advanced Security, `integration_id` 57789. Its `CodeQL` check concludes
  `neutral` when an analysis is missing, and a required check passes on `neutral`. It also concludes on the first
  analysis a commit uploads.
- The `code_scanning` rule takes GitHub's own failure levels. It refuses a merge while an analysis the default
  branch carries is missing or still running on the pull request's commit.
- An `--admin` merge that `default-branch checks` refuses names the rule the admin cannot bypass and leaves out
  the approval it waived:
  - a running check: `Required status check "<name>" is in progress.`
  - a missing analysis: `Waiting for Code Scanning results. Code Scanning may not be configured for the target branch.`
- Every `--admin` merge leaves a rule suite with result `bypass`, naming the rule it waived.
- `default-branch checks` goes active only once the default branch carries a CodeQL analysis for every configured
  language. GitHub accepts a `code_scanning` rule with none, then refuses every merge until the ruleset is
  disabled.
- A check that cannot report, or a platform outage, is cleared by setting `default-branch checks` to `disabled`,
  merging, and setting it back to `active`. Each change is a settings write the audit log records.
- The pair reads back through `current_user_can_bypass`: `pull_requests_only` on `default-branch` and `never` on
  `default-branch checks`.
- A repository not yet on GitHub is created in this order: the repository, its environments with their values,
  its labels from the kickstart, the Actions settings, private vulnerability reporting on, the merge settings with
  the wiki and projects off, the first push, the first green run, then the rulesets. The merge settings and the
  wiki and projects switches share one `PATCH` of the repository. A workflow that names an environment holding no
  values fails on its first run, and a ruleset that requires a check nothing has reported blocks the first pull
  request.
- `default-branch checks` goes on first and reads back active before `default-branch` goes on. The ruleset with
  no admin bypass is then in force before the one carrying it.

### Merge settings

| Setting                       | Value                |
| ----------------------------- | -------------------- |
| `allow_squash_merge`          | true                 |
| `allow_merge_commit`          | false                |
| `allow_rebase_merge`          | false                |
| `squash_merge_commit_title`   | `COMMIT_OR_PR_TITLE` |
| `squash_merge_commit_message` | `COMMIT_MESSAGES`    |
| `delete_branch_on_merge`      | true                 |
| `allow_update_branch`         | false                |
| `allow_auto_merge`            | false                |
| `web_commit_signoff_required` | false                |

- A pull request merges by squash, the one method the repository allows. A merge commit breaks release-plz,
  which then tags the pull request's last commit. A rebase lands every commit as its own change.
- The repository setting binds every actor, an `--admin` merge included. `allowed_merge_methods` in
  `default-branch` holds the method if the setting drifts.
- The squash takes GitHub's default message pair, the two squash keys above, written explicitly. A one-commit
  pull request lands its commit's subject and body. A longer one lands its title and each commit as a bullet.
- `PR_TITLE` is never set. For one commit it writes the commit's subject into the body, and release-please
  counts that subject as a second change.
- `delete_branch_on_merge` is on. GitHub then retargets the next layer of a stack onto the default branch.
  Stacked pull requests are fine: each layer merges on its own, and the next is rebased onto the default branch
  before it merges.
- `allow_update_branch` is off. Its button offers the one action that stops Renovate and Dependabot maintaining a
  branch, a pushed commit. A stale bot pull request is refreshed by its bot.
- A stale release pull request, red for a reason the default branch has since fixed, is refreshed with
  `gh pr update-branch`, which works with `allow_update_branch` off. release-please force-pushes nothing while the
  version is unchanged, so the stale run otherwise stays red. A landing names the refresh as a conditional step,
  never a routine one.
- `allow_auto_merge` is off. Renovate's automerge rides on it, and automerge is off (Updates).
- `web_commit_signoff_required` is off. No repository requires a sign-off.
- No ruleset carries `required_linear_history`. Merge commits are off, and `pull_request` refuses a direct push
  from anyone without a bypass.

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
- A publish approval holds a human approval and nothing else, and is named for the act: `release`. A Rust
  repository's `release` also holds the releaser pair, because its release job creates the tags (Releases).

Every environment carries a custom deployment branch policy naming the refs its workflow accepts. Every
environment with a reviewer sets `prevent_self_review: false`, because a sole reviewer otherwise deadlocks. The
API reports the value only on a `required_reviewers` rule.

### Secrets

- An identifier is a variable: an account id, a database or namespace id, a domain, a fingerprint, an app client
  id. Only a value that grants access is a secret. Variables print unmasked in run logs.
- A credential belongs to the environment that uses it. A repository-level secret is the exception, and the
  workflow that consumes it says why in a comment beside the read.
- A `uses:` job takes the called workflow's job-level environment. The caller runs in no environment, so it
  cannot name an environment secret. A caller whose called workflow reads one passes `secrets: inherit`, and
  `.github/zizmor.yml` waives the `secrets-inherit` audit by file name, as
  `rules.secrets-inherit.ignore: [cd.yml, deps.yml]` for the files that pass it (Gate). Every other caller passes
  nothing through.
- No zizmor waiver binds the callee. A `file:line` entry matches any location the finding reports, which for
  `secrets-inherit` is the `uses:` line or the `secrets:` line, not the lines between. Every gate and the shared
  `workflows` job therefore fail unless each job passing `secrets: inherit` calls
  `zachthedev/.github/.github/workflows/`. They also fail when a file the waiver names holds no such call, so a
  waiver never outlives its job.
- That hold reads a zizmor pass run with `--no-config --no-ignores`. `--no-config` alone still honors an inline
  `# zizmor: ignore[secrets-inherit]`, which hides the job, and `--no-ignores` drops config ignores and inline
  comments alike. The hold then stands on its own, beside the inline refusal (Gate).
- With that hold in place a line entry adds nothing, and an edit above the job would turn the gate red for no
  reason. A `secrets-inherit` waiver therefore names the file, the one audit whose waiver does (Gate).

### Apps

Two private GitHub Apps, one per role, named for the role so a change of tool renames nothing.
`zachthedev-releaser` opens release pull requests and creates the tags and the draft releases.
`zachthedev-updater` opens dependency-update pull requests.

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
- Converting the `zachthedev` account into an organization uninstalls every App, and it locks the crates.io owner
  out, because crates.io signs in through GitHub. Before any conversion, every published crate gains a second
  named crates.io owner. After it, both Apps are reinstalled, Actions is re-enabled, every `.github/CODEOWNERS`
  names the owner's new personal account in place of `@zachthedev`, and the profile README is copied to
  `.github/profile/README.md`. A code owner is an individual or a team, and after a conversion `@zachthedev` is
  neither.
- The publish job uploads and flips the draft with the job token, `GITHUB_TOKEN`, and no app credential. An event
  that token raises starts no workflow run, and the token carries no tag ruleset bypass into a job that handles a
  caller's build output.

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
- zizmor's `dependabot-cooldown` audit expects seven days unless configured. `.github/zizmor.yml` sets `days: 3`
  in every kind with `dependabot.yml`, so the audit holds the three-day cooldown under Updates.
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
- A local run proves one operating system, and CI proves the others. A template therefore runs its first CI
  before it is called done.
- An expectation that branches on the platform, such as a `cfg!` branch in a Rust test or a `cfg_attr` `expect`,
  is unverified until the CI leg for that platform runs. Each branch is derived from the function's contract, never
  from reasoning about the host. Two such faults passed a Windows gate and failed on Linux and macOS.
- No gate row resolves a tool from the machine's `PATH`. The programs the gate expects on `PATH` are the
  prerequisites `docs/dev.md` names.
- No gate, hook or shared job starts a tool on a `node` from `PATH`, and none starts one through `bunx`. Every
  hook, `package.json` script and gate row starts a JS tool as `bun ./node_modules/<pkg>/<bin>`, the `./` kept so
  Bun reads a path, and a missing package then fails the start.
- `bunx` starts a bin whose shebang names `node`, such as Prettier's or commitlint's, under the `node` on `PATH`
  when one exists, and GitHub's runners carry Node. `bunx --bun --no-install` does not fail on a missing package:
  it falls back to `PATH`, a parent `node_modules/.bin` or its own cache under the temporary directory.
- A gate resolves every program it spawns to an absolute path from `PATH` alone, and spawns that path. It drops
  empty and relative `PATH` entries and any entry inside the repository. Inside compares canonical paths or file
  identity, never an entry's spelling. It checks a found program the same way at its final path, through every
  link and junction, because a junction from an outside entry into the checkout otherwise passes. It never runs a
  bare name, and it never uses a directory the repository
  tracks or the process starts in as a lookup location. On Windows a bare name can otherwise resolve from the
  current directory or a tracked tool directory before `PATH`.
- Every gate hands its children a `PATH` with no entry inside the checkout, so a child resolving a bare name
  cannot reach one either.
- Where a stack's spawn searches such a directory, the gate also refuses a file named like a program it,
  its hooks or an install start: `bun`, `bunx`, `gh`, `git`, `mise` or `node`, with an executable extension or
  none. The preflight refuses one before any row, so no spawn reaches it. Per stack:
  - Bun: `Bun.spawnSync` searches the current directory first, in CreateProcess's order. `scripts/run.ts`
    therefore resolves every program itself and runs Bun as `process.execPath`, and the gate refuses tool-named
    files at the root, committed or not.
  - C#: Cake's tool locator globs `./tools/**/<name>` before `PATH`. Each tool therefore resolves through a
    `PATH`-only lookup passed to `WithToolPath`, and the gate refuses tool-named files under `tools/` and at the
    root.
  - Go: `os/exec` refuses a name resolved from the current directory (`exec.ErrDot`), and Task's interpreter
    searches `PATH` alone, so the rule holds by construction. Task's `dotenv` loads `.env`, which can set `PATH`
    or `GODEBUG`, so `.env` stays gitignored. Nothing sets `GODEBUG=execerrdot=0` or a `.` or empty `PATH` entry.
  - Rust: `Command` searches the running binary's own directory, then `PATH`, and never the current directory.
    On Windows `cargo run`, and so `cargo xtask`, puts `target\debug` and `target\debug\deps` first on `PATH`,
    and the `which` crate also accepts `.com`, `.bat`, `.cmd` and extensionless files. xtask therefore searches
    only absolute, existing entries whose canonical path lies outside the running executable's directory and
    outside the checkout, accepts `.exe` alone on Windows, and passes the same narrowed `PATH` to every child.
- Bun's script runner puts the checkout's `node_modules/.bin` first on `PATH`, so under `bun run` a committed
  `node_modules/.bin/bun` would replace the gate itself. In a Bun repository CI therefore installs with
  `bun install --frozen-lockfile --ignore-scripts`, the shared `commits` job's install included, and the gate
  refuses any tracked path with a `node_modules` segment, at any depth, before its first row. `bun run check` stays
  the documented command. CI and the `pre-push` hook call the gate script directly, as `bun scripts/check.ts`,
  because a bare `bun <file>` skips the script runner. The refusal therefore runs before every merge.
- A pull request controls its own gate code: `package.json` scripts, `check.ts`, `cake.cs`, an MSBuild `Exec`, a
  `build.rs`. No gate therefore makes running an untrusted pull request safe, in CI or on a contributor's
  machine. In CI, GitHub's approval for a fork's pull request and the gate job's read-only, tokenless shape
  contain one. On a contributor's machine, reading the diff before running anything contains one.
- The file refusals, the program resolution, and the `mise.toml` and environment allow-lists under Tools do
  something narrower. They keep a code path from hiding in files that read as data, such as `mise.toml`, a
  lockfile, a `.env` file, a stray config, a tracked `node_modules` path or a binary named like a tool, where a
  reviewer skimming a diff does not look for one.
- The refusals keep such a file off the default branch. They cannot stop the first local run of an unread branch:
  a `bunfig.toml` preload, a `paths` redirect in the gate's own `scripts/tsconfig.json` or a Task `dotenv` runs
  before any row does. Under Bun a preload also runs before each commit hook's tool and in any script that starts
  one, and a root `tsconfig.json` with `paths` or `baseUrl` redirects that tool's imports. Committing on
  an unread branch runs that branch's `commitlint.config.js` from the commit hook
  before any check, as a preload runs before the hook's tool.
- `CODEOWNERS`, `* @zachthedev`, with `require_code_owner_review` on `default-branch`, makes the owner's review a
  merge condition for every change to gate code or to a config a row reads. The owner's own pull request merges
  through the admin bypass (Branch rules).
- No gate holds a config file's text against a copy in its own code. Where a row's proof takes its expected set
  from an ignore file, it reads the committed file.
- `eslint.config.ts` and `commitlint.config.js` are code the rows and the commit hook run. The `commits` job runs
  a pull request's `commitlint.config.js` in CI, contained by the same read-only, tokenless shape as the gate job.
- A Bun gate refuses a tracked env file Bun loads on its own, `.env` and its variants, at any depth, because Bun
  loads it into the gate's environment (Known defects). The names match without regard to case. A template such as
  `.env.example` passes.
- Every `bun <file>` start in a gate row, the gate's own entry, a hook or a check script passes `--no-env-file`, so
  Bun loads no `.env` into it. Bun otherwise loads `.env`, `.env.local` and `.env.development` into each tool it
  runs, and an env value can turn a row red, as `PRETTIER_EXPERIMENTAL_CLI` does. A dev or deploy script keeps env
  loading. `bunfig.toml` stays the cooldown alone (Updates), so it never sets `env = false`.
- Before its first row, a Bun gate also refuses what changes which code runs before or inside it:
  - a `bunfig.toml` holding any key but `[install] minimumReleaseAge`, because a top-level `preload`, a
    `[test] preload` and `[define]` each run or rewrite code. `bun --config=<file> <entry>`, with the equals sign,
    drops the checkout's `bunfig.toml`, while `-c <file>`, `--config <file>` and `-c=<file>` still run its preload;
  - a `scripts/` directory without its own `tsconfig.json`, or one holding a `jsconfig.json`, a `package.json` or
    a `node_modules`, because the root `tsconfig.json`'s `paths`, `extends` and `baseUrl`
    otherwise redirect the gate's imports;
  - a tracked `.npmrc` at any depth, because it redirects even the frozen, script-free install. An untracked one
    holds personal credentials and changes no row, so it passes;
  - a package `bun.lock` installs for the platform that the checkout's `node_modules` lacks at its lockfile path,
    or holds through a link out of the checkout, because Bun then loads a parent directory's copy. That covers
    every locked package, not only the manifest's names, since a missing optional one, such as the platform's
    compiler, resolves from a parent directory too.
- Those checks import only built-in modules, so no package loads before they pass.
- A Bun gate's ESLint refuses an import attribute other than `type: 'json'`. Bun runs any file as a module under
  `with { type: 'js' }`, a `.txt` included, and no row reads such a file.
- Every gate refuses a `patchedDependencies` key in any tracked `package.json`. A patch rewrites a pinned
  package's code under a frozen, script-free install and passes the lockfile's integrity check. A scope as narrow
  as the gate's own imports misses lint configs and tools.
- A Bun gate refuses a `tsconfig.json` or `jsconfig.json` on disk, tracked or not, at any depth outside
  `node_modules` and `.claude/worktrees`, except at the paths the gate names. typescript-eslint's project service
  reads the nearest one for each file, so this is a location rule for a tool with no named config form, with no
  hold on the text.
- The gate walks each named one along its `extends` chain. It refuses `paths` or `baseUrl`, and an `extends`
  naming a package, an absolute path, a missing file or a file outside the checkout. A `noCheck: true` lets the
  typecheck row pass over a type error while it prints its full count, so a project config is gate config under
  `CODEOWNERS`. Bun applies the root one to a tool's own imports, so a `paths` entry for a package commitlint
  imports ran repository code in the commit hook. A project aliases through `package.json` `imports`, whose `#`
  names cannot redirect a bare package name.
- A Go gate, and any other over no TypeScript, refuses a `tsconfig.json` or `jsconfig.json` tracked at any depth
  or on disk at the root, since none of its tools reads a nested one.
- Every tracked `tsconfig.json` and `jsconfig.json` is plain JSON with no comments, because every gate and the
  `commits` job read one with a strict parser.
- Every gate refuses a duplicated key, at any depth, in any JSON file it parses to decide a refusal. Bun's own
  reader keeps the first copy, while `JSON.parse` and Go's `encoding/json` keep the last. A duplicate therefore
  lets the gate pass one value while Bun uses the other.
- A config that changes a gate row's result is refused when it is present on disk, committed or not, so a local
  gate agrees with CI. A personal file, a `lefthook-local` or `.lefthook-local` file in any form, an env file or
  `.claude/settings.local.json`, is refused only when committed, and `.gitignore` names it.
- A tracked file under a directory a row skips is refused, since no row checks it while the product can still
  import it. Each stack names its own list, and a Bun gate's is `dist/`, `coverage/` and `.claude/worktrees/`.
- A tracked source file no row checks is refused. A Bun gate names its untyped JavaScript and declaration files in
  a list in its gate, since tsc checks neither, and a Go gate refuses a tracked Go file no build compiles.
- The gate refuses a root `.config` directory outright, in any letter case. mise, the dotnet tool manifest,
  cosmiconfig's meta config and lefthook all read it.
- The root `.config` is refused before any commitlint step, the shared `commits` job included, because
  cosmiconfig builds its meta config there even under `--config`. A `package.json` `cosmiconfig` key changes
  nothing under `--config`, so it passes.
- Every gate tool that searches for its own config runs with the one config named explicitly. The tools are
  Prettier, commitlint, golangci-lint, ESLint, taplo and zizmor, CSharpier in C#, and rustfmt, clippy and
  cargo-deny in Rust.
- A config the tool finds first replaces the shared one: a committed `.golangci.json` beside `.golangci.yml`
  replaced the lint config and hid a `govet` finding while the row named no config.
- The gate refuses the other names a tool reads only where the tool has no named-config form: cargo's config, the
  toolchain file, the actionlint config, lefthook's configs, the env files, `.npmrc`, cosmiconfig's root `.config`,
  mise's configs, and the project configs typescript-eslint reads (above). Refusals match at every depth the tool
  reads, without regard to case.
- A tool whose row names its config drops the refusal of its other names, but only where a measurement shows the
  named form stops every read that tool makes. Each tool below has that measurement, and keeps a refusal only for
  the exception measured beside it:
  - Prettier: `--config .prettierrc` stops every other config search. It still reads a nested `.editorconfig`, so
    every Prettier run passes `--no-editorconfig` (Formatting), or the gate refuses a nested one. What the named
    `.prettierrc` may hold is under Formatting.
  - commitlint: `--config commitlint.config.js` stops `.commitlintrc*`, the other `commitlint.config.*` names,
    `package.yaml` and the `package.json` key. cosmiconfig still builds its meta config from the root `.config`,
    which stays refused.
  - ESLint `--config eslint.config.ts`, taplo `--config .taplo.toml`, zizmor `--config .github/zizmor.yml` and
    golangci-lint `--config .golangci.yml`: each stops the tool's other config names, measured with the row's own
    flags, with no exception.
  - rustfmt reads a `rustfmt.toml` or `.rustfmt.toml` at any depth, in any case and above the checkout. The row
    runs `cargo fmt --check -- --config-path rustfmt.toml`, which stops every one of those reads.
  - clippy reads a `clippy.toml` or `.clippy.toml` and takes no config flag. It searches from each crate's
    directory, or from `CLIPPY_CONF_DIR` where that is set, and walks upward until it finds one, so a config above
    the checkout reached the gate. The row sets `CLIPPY_CONF_DIR=<absolute root>`. Each Rust repository commits a
    root `clippy.toml` holding comments alone, which ends the walk at the root, and the gate refuses `.clippy.toml`,
    the other name clippy reads there.
  - cargo-deny reads the nearest `deny.toml`, `.deny.toml` or `.cargo/deny.toml`. The row passes
    `--config deny.toml`, a global flag that goes ahead of `check`, and it stops the rest.
- A gate that calls Prettier's `getFileInfo` passes `resolveConfig: false`. The API otherwise resolves the nearest
  config in the gate's own process, a nested `package.json` `prettier` key and its plugins included, and
  `--config` never reaches it.
- Every row that walks the tree prints what it checked, the files or their count, and fails on zero. A row that
  checked nothing reads green otherwise: taplo and Prettier each exit 0 on empty input.
  - A test row fails on zero, on every test skipped, and on a filtered run. Where the runner reports a filter as a
    skip, as vitest and Microsoft.Testing.Platform do, the row fails on any skip beyond an allowance the gate
    declares, 0 by default. A platform-only skip is declared the same way.
  - Under Microsoft.Testing.Platform, a runner config that marks every test explicit exits 0 with every test
    skipped. A runner config that can skip or filter tests falls under the tool config search above, in every
    stack.
  - The Rust doctests row is that rule's Rust form. It counts examples from every `test result:` line, and fails on
    zero, on any example filtered out, on every example ignored, and on a `Doc-tests` header with no result block.
    `cargo test --doc` exits 0 on each, and it has no stable machine format.
  - The doctests row's one allowance is a declared zero: a constant beside the step table, which itself fails once
    the row counts an example, so it leaves in the pull request that adds the first one. A `rust-app` with no
    library target declares zero, and the row skips the cargo call, since `cargo test --doc` exits 101 there.
  - The doctests row withholds `RUSTDOCFLAGS`, `CARGO_BUILD_RUSTDOCFLAGS` and `CARGO_ENCODED_RUSTDOCFLAGS`. Each
    can pass `--test-args` that filters or lists every example while the row stays green. The count catches the
    same filter set through `build.rustdocflags`.
  - A Bun test row runs with `CI=true`, so a file holding `test.only` fails the row, where it would otherwise run
    that test alone and leave the rest out of the count. The row reads bun test's summary from stderr alone, the
    last block, since a test's own output goes to stdout and can print a line shaped like a summary.
  - A row that parses tool output strips ANSI CSI sequences before it matches, and the gate hands every child
    `NO_COLOR=1`. A summary colored on the runner alone turned a gate red there.
  - A row's printed sentence escapes control characters in anything it quotes.
- Rows that only read files run first, then rows that run repository code, and the preflight or tree rules run
  again after each code row, because repository code can write any file a later row reads. A code row is any row
  that loads repository code: ESLint's config, a test runner, clippy, which builds build scripts and proc macros,
  and `wrangler types`, which runs `wrangler.jsonc`'s `build.command`. The Rust order is the example: fmt, taplo,
  deny, machete, prettier, actionlint, zizmor, tsc, then tools, clippy, tests, doctests, doc.
  - The actionlint row hands actionlint the workflow files by name. With no file argument actionlint also needs a
    `.git`, so it fails in an archive copy of the tree.
  - The actionlint and zizmor rows fail unless every file they handed over appears in the tool's own per-file
    output: actionlint's `-verbose` line for each file and zizmor's `completed` line.
  - The toml row fails unless taplo's own list of found files matches the files the row handed it (Formatting).
  - A row that reads taplo's or zizmor's per-file output sets `RUST_LOG=info` itself. Both print those lines at
    that level, so a contributor's stricter `RUST_LOG` hides them.
  - Rows hand files as plain paths after `--`, never with a `./` prefix. A `./` path slips past taplo's excludes
    and actionlint's config globs, and `--` keeps a file named like a flag a path.
- An ignore file a row reads, such as `.prettierignore` or the excludes in `.taplo.toml`, a lint config that
  carries exclusions, rules or the linter list, and `.github/zizmor.yml` each narrow what a row checks, so each
  is gate config under `CODEOWNERS` (above).
- Every gate, and the shared `workflows` job, refuses a `zizmor: ignore[` comment in a tracked file under
  `.github`, so every waiver lives in `.github/zizmor.yml`. An inline comment waives any audit on its line,
  `unpinned-uses` included.
- A waiver in `.github/zizmor.yml` names `file:line`, as an `artipacked` waiver does, so an edit that moves the
  finding turns the gate red and the waiver is read again. `secrets-inherit` alone takes the file form,
  because the callee hold is its control (Secrets).
- zizmor's config cannot waive a composite action's finding. A composite action under `.github/actions`
  therefore carries no waiver, and its finding is fixed.
- Both also refuse every ShellCheck directive in a workflow `run:` script. ShellCheck has no waiver file, so a
  finding is fixed in the script.
- That refusal reads what ShellCheck reads. actionlint's `-shellcheck` flag runs a stand-in that takes the decoded
  script, refuses any line holding a `# shellcheck` directive in any case, and otherwise runs the pinned ShellCheck
  over the same bytes. No search of the file text sees the same script: ShellCheck honors several keys per
  directive, a key right after a quoted value, YAML folding and YAML escapes, sixteen spellings in all.
  - A second canary, carrying `# shellcheck disable=SC2086`, proves the refusal on every run, beside the canary
    that proves ShellCheck ran (Workflows).
  - The flag's value is single-quoted with forward slashes. An unquoted Windows backslash path turns the rule off
    with no error.
  - The shared job's stand-in comes from `.github`'s own pinned workflow text, never from the caller's checkout.
  - A stand-in writes nothing to stdout until it has read its input whole and ShellCheck has exited. One that
    writes ShellCheck's stdout and then fails leaves `[]` beside its exit 2, and actionlint reads `[]` as a clean
    script.
  - Every gate and the shared job refuse a root entry named `'`, a single quote, tracked or on disk. actionlint
    looks the whole `-shellcheck` value up as one program path before it splits the words, so on Linux and macOS a
    value starting `'/` reads as a relative path under that directory. A file there runs in place of the stand-in
    and answers both canaries.
- Every gate and the shared `workflows` job refuse a `shell:` value, on a step or under `defaults.run`, other than
  `bash`, `sh` or `pwsh`. actionlint runs ShellCheck for bash and sh alone, so a custom shell such as
  `/bin/bash -e {0}` runs bash unchecked.
  - A gate parses the workflow for that check. The shared job reads lines, since no YAML parser is pinned on the
    runner: a `shell` key is a plain `shell: bash`, `sh` or `pwsh` line, and a value continued onto a deeper line
    is refused, because `shell: pwsh` over `-c bash {0}` runs bash. A script line that spells `shell:` is refused
    there too.
- actionlint lints workflows alone, so a composite action's `run:` steps under `.github/actions` get no
  ShellCheck. That is a named residual.
- Every gate and the shared `workflows` job refuse a `.github/actionlint.yaml` or `.github/actionlint.yml`, in any
  case, the job a tracked one. actionlint reads either, and a `paths` ignore in it drops any finding, the
  stand-in's refusal included. A canonical one is added the day a repository needs it.
- Every gate withholds `BUN_OPTIONS`, `BUN_INSPECT`, `BUN_INSPECT_CONNECT_TO`, `BUN_INSPECT_PRELOAD` and
  `SHELLCHECK_OPTS` from every child it starts, in every spelling. Bun reads `BUN_OPTIONS` as flags ahead of its
  own, a test name filter or a preload among them, and the `BUN_INSPECT` names attach an inspector or preload a
  module. `SHELLCHECK_OPTS` reaches ShellCheck past actionlint's `--norc`.
- The gate refuses a workflow file whose extension is not a lowercase `.yml`. actionlint's file list and zizmor's
  collection each missed a `.github/workflows/UP.YML`.
- The gate refuses a tracked path with a `.git`, `.sl`, `.svn`, `.hg` or `.jj` segment. Prettier's CLI skips a
  named file under one without a word, while `getFileInfo` accepts it.
- The CI job's `timeout-minutes` bounds the gate. A gate sets no deadline of its own on a row and kills no
  process tree, and on a contributor's machine Ctrl-C ends a hung tool.
- A gate can still bound a pipe a leftover process holds after its tool exits, and fail the row: a Go gate through
  `exec.Cmd.WaitDelay`, a Bun gate through a short drain in its run helper.
- Where a runtime loads an env file before the gate starts, such as Task's `dotenv`, CI and the `pre-push` hook
  run the tracked-file refusal as their own step, before that runtime starts.
- In a Go repository the gate job and the `pre-push` hook set `GOWORK=off` and `GOFLAGS=-mod=readonly`, and the
  gate refuses a tracked `go.work`, `go.work.sum` and `vendor/`. Each can put checkout code in place of a module
  the gate's own `go run` builds, as a tracked `go.work` did.
- In a C# repository:
  - The gate refuses a nested `Directory.Build.props`, a `Directory.Build.rsp` anywhere, and a nested
    `.globalconfig`, `.editorconfig` or `nuget.config`. Each turned a red build green or added a package source
    past the root's `<clear />`. A nested `.editorconfig` passes only where the gate names its path.
  - The build, test and installer rows pass `DirectoryBuildPropsPath`, `DirectoryBuildTargetsPath` and
    `DirectoryPackagesPropsPath` as absolute paths at the root, so MSBuild reads the root's files alone.
  - The build and installer rows also pass `-noAutoResponse`, so MSBuild reads no response file. The test row
    does not: `dotnet test` reads no `Directory.Build.rsp`, and in MTP mode it hands the flag to the test app,
    which exits 5 with zero tests.
  - CSharpier runs over named files with `--config-path`, `--ignore-path` and `--include-generated`, and the row
    compares its checked count against the committed `.csharpierignore`. A root `.csharpierignore` of `*` gave
    `Checked 0 files` and exit 0.
  - The gate refuses a root `cake.config`.
  - The gate refuses a `testconfig.json`, `*.testconfig.json`, `xunit.runner.json` or `*.xunit.runner.json` at any
    depth. The tests row reads the total, succeeded and skipped counts from the summary, never the exit code.
- In a Rust repository:
  - cargo started at the root reads the root `.cargo/config` and `.cargo/config.toml`, the extensionless one
    winning, and every one above the checkout, never a crate's. The gate refuses `.cargo/config`, so
    `.cargo/config.toml` is the one checkout config cargo reads. cargo has no named form, so a config above the
    checkout or in `CARGO_HOME` is a named residual, the one such read in a Rust gate.
  - The gate refuses a `rust-toolchain` or `rust-toolchain.toml` anywhere but the root `rust-toolchain.toml`.
  - The doctests row follows the test-row rule above.
- A test or script that spawns git drops every inherited `GIT_*` variable for that process and names the
  repository with `-C <root>`. git exports `GIT_DIR` and `GIT_INDEX_FILE` to a hook, so a gate the hook runs
  otherwise writes into the hook's own repository.
- The gate's own `git` child starts with an empty environment plus `GIT_CONFIG_NOSYSTEM` and
  `GIT_CONFIG_GLOBAL=/dev/null`, and `SystemRoot` on Windows where the stack's start of git needs it, as Go's does.
  Listing tracked files needs no inherited name.
- A gate's tracked listing refuses to run unless `git rev-parse --show-toplevel` names the checkout root. An empty
  `.git` directory at the root makes `git ls-files` list a parent repository's index without a word.
- A checkout another account owns therefore stops the gate. git refuses it as dubious ownership and reads no
  `safe.directory` from the configs the gate turns off. The fix is the directory's owner, never a
  `safe.directory` the gate would read, and `CONTRIBUTING.md` says so.
- Every gate lists tracked paths once and compares names in its own code by one rule: strip default-ignorable
  code points, then fold case. It never uses git's `:(icase)` pathspec magic. git's `icase` folds ASCII alone,
  macOS's APFS folds case beyond ASCII, and an inherited `GIT_LITERAL_PATHSPECS` turns the magic off without a
  word. A broader fold costs a false refusal at worst.
- The stack's own runner drives the gate: Bun scripts in `package.json`, `xtask` for Rust, Cake for C#, go-task
  for Go. A `Makefile` is a violation.
- In a Bun repository every file under `scripts/` but `check.ts`, `expected.ts` and `tsconfig.json` is
  byte-identical across the set, the tests and their stand-ins included. The repository's own two lists, its
  project config paths and its untyped sources, live in `scripts/expected.ts`.
- A Rust repository's gate modules are shared by copy the same way, never through a shared crate.
- `cargo xtask` is `cargo run --package xtask`, and the outer cargo resolves the workspace before any row runs.
  The alias in `.cargo/config.toml` therefore carries `--locked`: `run --locked --package xtask --quiet --`.
- The root `.cargo/config.toml` is data that runs code, as `bunfig.toml` and `.prettierrc` are, so the Rust gate
  holds it to a key allow-list: `[alias]` with `xtask` alone, and each other key the Rust repositories carry. That
  refuses an alias named after a row's subcommand, such as `fmt`, `clippy`, `nextest`, `deny` or `machete`, which
  cargo runs in place of the tool. It also refuses `build.rustdocflags`, `build.rustflags`, `build.rustc-wrapper`
  and `target.*.runner`.
- The Bun linter is ESLint with typescript-eslint, configured in `eslint.config.ts` (Known defects).
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
- release-plz runs from its mise pin, not from `release-plz/action`. The action has no command that runs the
  semver check alone, and it installs cargo-semver-checks in the job that holds the releaser token. `cd.yml`
  records the deviation.
- A hand-rolled step closes a gap no tool closes and names that gap in a comment. Examples: the mise lockfile
  assertions and the unattested-tool cross-check under Tools, and the ShellCheck canary below.
- Every `run:` script stays under 4 KB (Known defects).
- No repository test reads a workflow file. actionlint and zizmor are the readers of workflow YAML. A property
  neither checks (a step order, a trigger set, a matrix, a permission) is held by construction. The reusable
  workflow or the one gate task that sequences it holds it. A test that parses `ci.yml` for its shape is glue,
  and it goes.
- The `commits` workflow runs commitlint over the pull request range and over the subject the squash writes,
  with ` (#N)` appended. For a one-commit pull request that is the commit's own subject (Merge settings).
- The subject lint runs through a generated wrapper that turns every commitlint ignore off, the caller's and
  commitlint's defaults alike, so a header an ignore skips in the range is still checked where it lands. The range
  lint and the commit hook keep the caller's ignores. A `Revert "..."` or merge subject fails the subject lint.
  The revert form (Commits) and squash-only merging make that right, and a pull request GitHub's revert button
  opens passes once it is retitled.
- The wrapper is written to `RUNNER_TEMP`, outside the checkout, so no tracked path takes part. It resolves each
  `extends` of the caller's config from the caller's config file and hands commitlint absolute paths. Outside any
  `node_modules`, Bun answers a bare name from its install cache or the registry, whatever `bun.lock` pins.
- Before its install, the workflow refuses a root `.config` (Gate). Both commitlint steps name
  `commitlint.config.js`, which stops commitlint's other config names and package keys.
- Before its install, the `commits` workflow refuses a tracked `node_modules` and any tracked path below one, at
  any depth and without regard to case, and every tracked symbolic link. `bun install` keeps a tracked package
  directory at the locked version and a tracked `node_modules` link as it finds it, with no check against
  `bun.lock`, and Bun then runs that copy. Through any other link Bun reads a file `bun.lock` never named. The
  job runs beside every caller's gate, whatever the caller's stack, so it holds the refusal itself.
- The same step refuses a tracked `.npmrc` at any depth, also without regard to case, because it redirects the
  install's registry. It refuses a `patchedDependencies` key in any tracked `package.json` (Gate), because a
  frozen install without scripts still applies a patch.
- It refuses a tracked env file at the root, any of the eight names Bun loads, without regard to case.
  `bun install` loads one even frozen and without scripts, and no flag stops that. A tracked `.env` pointing
  `BUN_INSTALL_CACHE_DIR` at a committed folder installed a changed package with `bun.lock` unchanged.
- A step of its own, before the install, refuses a tracked `bunfig.toml`, in any case, holding any key but
  `[install] minimumReleaseAge`, because a preload in it runs inside commitlint and `[install.cache] dir` redirects
  the install's cache. A link or a file that does not parse is refused too. Every `bun` start in the job passes
  `--no-env-file` (Gate).
- A step of its own, also before the install, refuses `paths` and `baseUrl` in any tracked `tsconfig.json` or
  `jsconfig.json` and in every file its `extends` names, because the job runs commitlint under Bun (Gate).
  It also refuses an `extends` naming a package, a file outside the checkout or a file the checkout lacks, since
  the step cannot read any of those.
- The `workflows` workflow runs actionlint and zizmor. The gate proves ShellCheck ran by writing a canary
  workflow with an unquoted variable and requiring the finding back. actionlint exits 0 with ShellCheck absent,
  and no flag changes that.
- zizmor reads `--collect=all .github`, with `--strict-collection`, in every gate row and in the shared job. No
  ignore file hides a workflow from that input. It collects `dependabot.yml` and the composite actions under
  `.github/actions`, and it never walks `node_modules`, a worktree or a submodule. A composite action outside
  `.github` is named as a second file input, with the reason beside it.
- The shared `workflows` job runs beside the caller's gate, not after it, so a red gate stops nothing there.
  Before any mise command reads the checkout, the job refuses what the gate refuses: another mise config, lock or
  rc file, a root file named like a program a gate starts, and a link at the root or under `.config`, `.mise` or
  `mise`. Its `Refused keys` step then reads `mise.toml` and `mise.lock` with Python's `tomllib` and refuses any
  key outside the gate's allow-lists (Tools), `[settings.aqua]` included, which holds `github_attestations`
  alone. A job holding a token loads no `mise.toml` whose keys are unchecked.
- The step also refuses a form the gate does not read: a `[tools]` entry that is neither a version nor a table,
  the `[[tools.<name>]]` array of tables included, a `[tools]`, `[tool_config]` or `[settings]` that is not a
  table, and a `mise.lock` tool that is not a list of tables. mise reads an array-of-tables entry, a postinstall
  included. The step checks the fields of a nested `platforms` table as it checks a quoted `"platforms.<name>"`
  one.
  `jdx/mise-action` exports `MISE_TRUSTED_CONFIG_PATHS` for the workspace to every later step, and mise evaluates
  exec templates on any load of a trusted config.
- zizmor's online audits run in the shared `workflows` job alone, on every pull request and daily from
  `audit.yml`. That job is the one CI job whose steps name the job token: its zizmor step and its lockfile asset
  check under Tools. It installs taplo, ShellCheck, actionlint and zizmor alone, each routed by mise's registry,
  so its install names no token. The one exception elsewhere is a caller job's `mise install --locked` step for a
  tool mise's registry does not route, below.
- In CI the gate runs zizmor with `--offline`, and the gate step holds no token. Locally the gate runs zizmor
  online when `gh auth token` answers, handing the token to zizmor's process alone, and passes `--offline`
  otherwise, never as a silent default. That token comes from gh's credential store, so an empty `GH_CONFIG_DIR`
  leaves it reachable.
- `gh auth token` runs under a short deadline of its own, and a timeout reads as no token, so zizmor runs
  offline. That is no row deadline (Gate): without it a hanging keyring read hangs the local gate. The deadline is
  the runtime's own, Bun's spawn `timeout` or Go's `exec.CommandContext`, with no tree kill.
- Every other process the gate starts runs without any token variable a gate tool reads, `GITHUB_API_TOKEN` and
  `MISE_GITHUB_ENTERPRISE_TOKEN` included.
- Inside a job, a step's environment is not a boundary: any step can read the job token from the runner. The
  job is the boundary, so the token goes to the job that installs no dependencies and runs no build or test.
- Every `jdx/mise-action` step takes an empty `github_token`, so the action exports no token to later steps.
- A locked install reads a registry tool's attestations from mise's versions host. A tool mise's registry does not
  route queries the GitHub API on every install.
- A job installing such a tool runs the gate's checks of `mise.toml` and `mise.lock` first. Then a step that runs
  nothing but `mise install --locked` sets `MISE_GITHUB_TOKEN` to the job token, under the job's
  `contents: read`, and that step alone names it. The token already sits in the job, and the unauthenticated
  limit of 60 requests an hour per runner address fails installs at random. The gate step itself stays tokenless.
- A step order inside one job is no boundary, since the token sits in the runner's memory. Installing before the
  checks would run an unchecked `mise.toml`'s hooks in the token step.
- A scheduled workflow's header states the requirement its section names and claims nothing tighter (Known
  defects). `deps` runs at least once a day, and so does every `audit.yml` job, on that workflow's one cron.
  `codeql` runs weekly.
- No job compares a cron string. A job gated on a string its schedule no longer raises skips forever, green, so a
  workflow runs every job on its one clock.
- After any edit to a scheduled workflow's cron line, the owner confirms the failure notification still reaches a
  person (Known defects).

## CodeQL

- A committed `codeql.yml` calls the shared `codeql` workflow, never default setup. Default setup pins nothing
  and names checks the repository does not control.
- The caller's job is `codeql`, and the shared job is named `Analyze (<language>)`. Each check run is therefore
  `codeql / Analyze (<language>)`, a workflow job's check run under GitHub Actions.
- The languages are every language the repository's own code is written in, plus `actions`. A configuration
  file a tool reads is not the repository's code. The caller passes every language, `actions` included, and the
  shared workflow adds none. The `actions` analysis runs beside zizmor. Neither replaces the other.
- Every analysis runs the `security-extended` suite on the CodeQL bundle the pinned action ships, `tools: linked`.
  Without it, a server-side flag picks the bundle at run time, and no pin or cooldown sees the change.
- The build mode is `none` wherever the extractor supports it and `autobuild` for Go, whose extractor refuses
  `none`. A Go caller passes `build-mode: autobuild` in its language's entry.
- The triggers are a push to the default branch, every pull request and a weekly schedule, with no path filter.
  A filtered run leaves a required check pending and the `code_scanning` rule without a result.
- The category is `/language:<language>` and never changes. Renaming `codeql.yml`, its job id or the category
  leaves a stale configuration on the default branch. The `CodeQL` check then concludes `neutral` on every pull
  request, which passes, until that configuration is deleted on the tool status page.
- Removing a language includes deleting its configuration from the default branch, because the `code_scanning`
  rule waits on every pull request for a result nothing uploads.
- An alert is fixed or dismissed. A dismissal names its reason and carries a comment saying why the alert does
  not apply. The API takes `dismissed_comment` only in the dismissing call, so the rule binds a dismissal as it is
  made, and an existing dismissal keeps whatever comment it carries.
- Code scanning runs in a public repository. Under a personal account a private repository cannot run it.

## Commits

- Conventional commits, enforced by the `commit-msg` hook (Hooks) and again by the `commits` job. Types come
  from the specification. Scopes live in `.github/commit-scopes.json`, an array of `{scope, covers}` objects,
  which `commitlint.config.js` reads and `CONTRIBUTING.md` points at.
- A header lands at most 72 characters, because github.com cuts a subject at 73. The `commits` job lints what
  lands: a pull request's title, or a one-commit pull request's subject, with ` (#N)` appended (Workflows). An
  author therefore writes 64 to 67 characters, fewer as the pull request number grows. The `commit-msg` hook checks
  72 as written.
- Renovate's headers are shortened by the presets' `commitMessageAction` and `commitMessageTopic`, never by
  exempting the bot. A Renovate or Dependabot pull request whose landed header runs past 72 fails, so it is closed
  and its bump is taken by hand.
- The shared `commitlint.config.js` ignores a message signed off by `dependabot[bot]`, because its body carries
  release notes past the line limit. It reads `.github/dependabot.yml` through the `yaml` package and takes each
  `updates[].commit-message.prefix` and `prefix-development`. It skips a commit only when the header starts with one
  of those, then a colon and a space, and a line after the header starts with the
  `Signed-off-by: dependabot[bot] <` trailer. A header or title that merely carries the text is still linted. A
  repository with no `dependabot.yml` skips nothing, and a file that does not parse fails the lint. The pull request
  title and the landed-subject lint still check a Dependabot header.
- A commit's type names its effect on the people who use what the repository ships.
- `feat`, `fix`, `perf` and `revert` are user-facing. Every other type is hidden from the changelog (Releases).
- A gate, hook or tooling change is `chore`, and a change to the repository's own workflows is `ci`, because
  users never run either.
- In `zachthedev/.github` a reusable workflow or preset change is `feat` or `fix`, because callers run it.
- In a template, a change to a file a clone copies is `feat` or `fix`, a copied document included, so an
  aligning repository learns to copy it. A document no clone copies stays `docs`. A pin bump stays `chore`,
  because the clone's own Renovate moves it.
- `build` covers how the artifact is built when users see no difference. A build change users see is `feat` or
  `fix`.
- `docs` is hidden in every kind, because a document reaches its readers from the default branch. A template's
  copied document takes `feat` or `fix` instead, as above.
- A dependency whose code runs where users are is `fix(deps)`. One that only builds, checks or tests is
  `chore(deps)`.
- `!` and `BREAKING CHANGE:` mark a break users see. A contributor-only break carries neither, because either
  cuts a release.
- A revert is `revert(<scope>): <what is undone, in fresh words>`, with a `Refs: <sha>` footer naming each
  reverted commit. The scope follows the scope rules above and is omitted when none applies. A `revert:` prefix
  on the reverted header overflows the header limit, and this form fits by construction. It is the Conventional
  Commits specification's recommendation. git's own `Revert "..."` subject is never used: commitlint skips it,
  and release-please cannot parse it.
- A pull request's title takes the type of its most user-facing commit, and `!` when any commit breaks something
  users see. A squash of several commits lands the title as its header, so a `!` in a commit's own header is lost
  unless the title carries it. A `BREAKING CHANGE:` footer in a commit's body survives the squash.
- A body paragraph never opens with a bare type, because release-please reads it as a second change.

## Hooks

- lefthook in every stack. `commit-msg` lints the message. `pre-push` runs `check:quick` where it exists, else
  the gate.
- A Go repository pins lefthook as a `go.mod` tool directive, because lefthook is a Go program and the stack
  leans on its native abilities. Its `package.json` carries commitlint, `yaml` and Prettier alone.
- A hook job starts a package as `bun --no-env-file ./node_modules/<pkg>/<bin>`, behind one loop that unsets
  `BUN_OPTIONS`, `BUN_INSPECT`, `BUN_INSPECT_CONNECT_TO` and `BUN_INSPECT_PRELOAD` in any spelling. The lockfile's
  pin then runs under Bun with no inherited flags, inspector or env file, and a missing package fails the job
  (Updates, Gate).
- The loop unsets rather than empties, because Bun exits 1 on an empty `BUN_INSPECT_PRELOAD`. A `package.json`
  `prepare` script cannot clear these names, which is a named residual.
- The hook script `lefthook install` writes fails open where lefthook itself resolves from `node_modules`: Bun,
  and any kind installing lefthook through `package.json`. With no lefthook binary found, it prints
  `Can't find lefthook in PATH` and exits 0, and the commit or push goes through unchecked.
- That script hard-codes the installing checkout's `node_modules` path. A linked worktree with no `node_modules`
  of its own therefore runs the installing checkout's lefthook.
- A fresh clone has no hook until its install runs `lefthook install`.
- Every lefthook repository refuses a tracked `lefthook-local`, `.lefthook-local` or `.config/lefthook-local`
  file, any extension, and gitignores all three. lefthook merges one over `lefthook.yml`, so a tracked one can
  turn `piped` off and replace a hook's jobs.
- lefthook merges a branch's `.config/lefthook-local.*` too, and a local job with a guard job's name replaces it
  before any job runs. A hook job that guards against something therefore catches an accident, never a hostile
  branch. Reading the diff before running anything on a pull request branch covers `commit-msg` as well (Gate).
- A Go repository's hook runs lefthook through `go tool`, which refuses when lefthook cannot run.
- lefthook skips `pre-push` on the first push of a new branch to an empty remote. A first push therefore rests on
  the gate run before it.
- CI's `commits` job and gate are the control, and `CONTRIBUTING.md` says so.
- No `.githooks/`.

## Formatting

- Prettier formats everything it owns. The configuration is identical in every repository, so a shared file is
  byte-identical across repositories. A diff means a real difference.
- `.prettierrc` carries only the keys whose values differ from Prettier's defaults, and the kickstart's file is
  the source. `proseWrap` is not written. Prose stays as the author wrapped it.
- One exact Prettier version across every repository, never a range. A bump is one pull request per repository.
- `.editorconfig` agrees with the config for every file Prettier owns, for the editors that read it.
- Every Prettier run, the row's, a hook's and the `format` script's, passes `--config .prettierrc`,
  `--ignore-path .prettierignore` and `--no-editorconfig`, with no glob. `--config` names the one config (Gate).
  Under `--config` alone Prettier still reads a nested `.editorconfig`, which can reindent a subtree.
- `--ignore-path` keeps `.gitignore` from narrowing the check, so `.prettierignore` itself names
  `.claude/worktrees/` and every other local-only path. A generated file the owning tool formats goes in
  `.prettierignore` too.
- Every `.prettierignore` pattern is anchored to the root, with a leading slash where it has no other, so it
  cannot hide a same-named file deeper in the tree.
- A Prettier config can name a plugin or a shared config, and Prettier loads either as code before it checks
  anything. Every gate therefore refuses a `plugins` key in `.prettierrc`, at the top level and in
  `overrides[].options`, and refuses a `.prettierrc` that is not a JSON object, since a string there names a shared
  config. `.prettierrc` is gate config under `CODEOWNERS` (Gate).
- C# is formatted by CSharpier at the same width.
- taplo formats every TOML file in every kind, from `.taplo.toml`. A repository carrying TOML pins taplo in
  `mise.toml` and runs it as a gate row.
- The taplo row lists the tracked TOML files itself, folding case, and hands them to taplo by name, because
  taplo's own walk skips a name such as `docs/BAD.TOML`. An exclude in `.taplo.toml` that drops a named file then
  fails the found-list comparison (Gate), where taplo alone exits 0.
- The row also passes `--config .taplo.toml`, because a bare `taplo fmt --check` checks zero files and exits 0
  when `TAPLO_CONFIG` names a config matching nothing.
- taplo reads no `.gitignore`, so the excludes in `.taplo.toml` are the one control over what a bare `taplo fmt`
  walks.
- A repository joining the standard pays one formatting-only commit touching every file Prettier owns.

## Waivers

- An inline waiver in code names the exact rule it waives and gives a reason. Each stack's own linter enforces
  that, and the gate refuses only the forms no tool checks.
- A waiver in workflow YAML lives in `.github/zizmor.yml` (Gate), and a workflow `run:` block carries no ShellCheck
  directive (Gate).

### Go

- golangci-lint runs nolintlint with `require-specific`, `require-explanation` and `allow-unused: false`. Every
  `//nolint` then names its linter and gives a reason, as `//nolint:<linter> // reason`, and an unused one fails.
- A nolint names a linter, never a rule, and gosec holds many rules. Every gosec waiver is therefore
  `// #nosec G<nnn> -- reason`, under gosec's `nosec-require-rules` and `nosec-require-justification`, which
  suppress the named rule alone. The gate refuses `//nolint:gosec`.
- golangci-lint drops gosec's errors about a malformed `#nosec`, so a bad one shows only the finding it failed to
  waive. A stale `#nosec` goes unreported. The owner accepted both costs for a rule-exact waiver.
- go-test-coverage runs with `force-annotation-comment: true`, so a `coverage-ignore` comment carries a reason.
- The gate refuses the forms golangci-lint honors and nolintlint misses:
  - a nolint comment with extra leading slashes, such as `///nolint`;
  - a nolint list naming `all` in any case or spacing, or naming `nolintlint`;
  - `//lint:ignore` and `//lint:file-ignore`;
  - a generated marker golangci-lint's `lax` mode reads, in any tracked `.go` file the generator does not list:
    `code generated`, `do not edit`, `autogenerated file` or `* generated by: swagger codegen `, case-folded,
    above `package` or in the comment group right after it. The gate regenerates a listed file and diffs it
    (Authoring), so a hand edit under the marker fails.

### TypeScript

- ESLint runs the eslint-comments plugin's recommended config plus its `require-description` rule. Every
  `eslint-disable` then names its rules, gives a reason after `--`, closes its range, and fails when unused. ESLint
  alone has no setting that requires a named, described directive.
- typescript-eslint's `ban-ts-comment`, in `strictTypeChecked`, bans `@ts-ignore` and `@ts-nocheck` and requires a
  description on `@ts-expect-error`. It reports every directive shape tsc honors. `@ts-expect-error` cannot name a
  TypeScript error code that anything checks, so its description is the reason.
- The gate refuses the text of Prettier's ignore comment, in any case and in prose too, in every file the format
  row checks. A path the committed `.prettierignore` names is not checked.

### Rust

- The workspace sets `allow_attributes_without_reason = "deny"` and `allow_attributes = "deny"` under
  `[workspace.lints.clippy]`. A hand-written waiver is therefore `#[expect(..., reason = "...")]`, and a stale
  `expect` fails as an unfulfilled expectation under `-D warnings`. `allow_attributes` leaves alone the `allow`
  that clap's derives emit.
- `forbid` fails the build wherever a derive macro emits a group `allow`, as clap's `#[derive(Parser)]` emits
  `#[allow(clippy::restriction)]`, which rustc refuses (E0453).
- Under `deny` a crate-level, reasoned `allow` of either lint switches its check off. The gate therefore refuses
  any lint attribute naming `allow_attributes_without_reason` or `allow_attributes`.
- With any lint set under `[workspace.lints.clippy]`, the `all` and `pedantic` groups take `priority = -1`, or
  clippy fails with `lint_groups_priority`.
- The gate reads each Rust source as tokens (proc-macro2), never as text, so its refusals catch an attribute inside
  `cfg_attr` too. It refuses every `allow`, bare or gated. clippy's `allow_attributes` sees only the attributes the
  host's cfg keeps, and a `#[cfg_attr(not(windows), allow(...))]` passed both it and a text match on Windows.
- The gate also refuses:
  - a root `Cargo.toml` that does not set both lints to `deny`;
  - an empty or whitespace `reason`;
  - an `expect` naming a lint group, such as `warnings`, `unused` or `clippy::pedantic`, since a group is not a rule
    and clippy accepts one;
  - `rustfmt::skip` in every form;
  - cargo-machete's ignore metadata in any `Cargo.toml`, a waiver no tool asks a reason for;
  - a member manifest whose `[lints]` is anything but `workspace = true` alone, since such a crate escapes the
    workspace setting.
- `@generated` needs no refusal while the root `rustfmt.toml` leaves `format_generated_files` at its default,
  `true`.

### C#

- StyleCop's SA1404 requires a `Justification` on every `[SuppressMessage]`, and rejects a missing, empty or
  whitespace one and `<Pending>`. The root `.editorconfig` turns every other StyleCop rule off through the
  eight StyleCop category keys. StyleCop's newest release is a prerelease from 2023, which the owner accepted,
  pinned exactly.
- The root `.editorconfig` also sets `dotnet_diagnostic.SA0001.severity = none`. SA0001 has no location, so
  the category keys never reach it, and it fails a build that treats warnings as errors.
- `.editorconfig` is lint config under `CODEOWNERS` (Gate), as `.golangci.yml` and `eslint.config.ts` are. A
  reviewer refuses a `generated_code` key and a `dotnet_diagnostic.*.severity` below warning as config-level
  waivers, since `generated_code = true` stops every analyzer and leaves no SARIF record. No gate refuses those
  keys. The gate keeps its location rule for a nested `.editorconfig` and its refusal of `.globalconfig` names
  (Gate), and the SARIF audit below catches a key that silences a rule that fires.
- The gate requires StyleCop at its pin, as a direct dependency, in every C# lock file. Removing the reference and
  relocking turns SA1404 off with the gate green.
- The gate refuses `#pragma warning` in every form, `restore` included, because no analyzer checks a pragma for an
  ID or a reason. A `restore` alone does nothing, so refusing it keeps the rule to one sentence at no cost.
  `#pragma checksum` stays allowed. A compiler warning (`CSxxxx`) then has no inline waiver, only the root
  `.editorconfig`, since `[SuppressMessage]` cannot suppress one.
- The gate also refuses:
  - `#nullable disable` in every form;
  - `#line hidden`, which hides every analyzer finding below it;
  - a `[SuppressMessage]` naming SA1404, since a reasoned self-waiver can reach a whole project;
  - Roslyn's generated markers on any file the repository's own generator does not produce: a file name Roslyn
    reads as generated, an `<auto-generated` or `<autogenerated` comment anywhere in the file and in any case, and
    `GeneratedCode`. A generated file loses its analyzers and its nullable checks. The gate regenerates a produced
    one and diffs it (Authoring), so a hand edit under the marker fails;
  - `[UnconditionalSuppressMessage]`, which SA1404 does not read;
  - every ignore form CSharpier honors, the XML forms included.
- The gate matches those refusals as the compiler reads the file. It decodes `\u` escapes before it matches an
  identifier, since `Generated\u0043ode` defeats a plain text match. It matches a directive over the whole text
  with Roslyn's own line breaks and whitespace, U+2028, U+2029, U+0085, a bare carriage return, U+FEFF and U+001A
  included, never line by line.
- The build row adds two checks. A SARIF error-log audit refuses any in-source suppression with an empty
  justification or of SA1404, however it is spelled. An analyzer canary requires SA1404 to run in every compile.
- Known limits: SA1404 accepts any non-empty reason. The null-forgiving `!` waives a nullable warning with no name
  and no reason, and nothing refuses it. A project-file switch such as `NoWarn` or `RunAnalyzers` is caught by the
  canary or by review.
- `[ExcludeFromCodeCoverage]` becomes a refusal on the day a coverage threshold lands.

### Shell

- ShellCheck has no setting that requires a code or a reason. In a tracked `.sh` script, any line holding a
  `# shellcheck` directive is therefore exactly `# shellcheck disable=SCnnnn[,SCnnnn] # reason` as its whole
  comment, and the gate holds it to that form. A partial match would miss a directive with several keys.
- A repository that tracks shell scripts runs a ShellCheck row over them, with `--norc`, `SHELLCHECK_OPTS`
  cleared, a printed count and a failure on zero.

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
- A Renovate group takes the highest type among its members, lowest first `chore`, `ci`, `build`, `fix`, `feat`.
  A group holding anything that ships therefore lands `fix(deps)`. A group rule sets no `semanticCommitType`.
- Where a derived type misses what ships, the preset or the repository file types it by the Commits rule. A
  toolchain whose runtime ships is `fix(deps)`:
  - the `go-cli` preset types the `go` and `toolchain` lines `fix`, because they pick the standard library linked
    into the binary;
  - the `csharp-installer` preset types the .NET SDK in `global.json` `fix`, because the installer ships that
    SDK's runtime (Tools);
  - the `rust-crates` and `rust-app` presets type a `rust-toolchain` bump `fix`, because std links into the
    shipped artifact. Under lockstep that bump releases every crate (Versioning).
- `zachthedev/.github` types a pin inside a reusable workflow `fix`, because callers run it.
- Lock file maintenance lands `chore(deps)` in every preset, so a release always needs a user-facing change. A
  refreshed transitive dependency ships with the next release a user-facing change cuts. An advisory against one
  does not wait for that release: it takes the alert path below, and its fix is `fix(deps)`.
- A `zachthedev/**` bump's SHA is on `.github`'s `main`. The reviewer checks it with
  `gh api repos/zachthedev/.github/compare/main...<sha>`, reading `behind` or `identical`.
- The Monday window's own pull requests keep a quiet repository active, so its scheduled workflows stay
  enabled (Known defects).
- Security fixes come from Dependabot alerts (Dependabot). Renovate fixes a direct dependency in every ecosystem
  and an indirect Go module, because `go.mod` names it. A transitive Cargo or NuGet advisory is Dependabot's: its
  security update opens the pull request in `rust-crates`, `rust-app` and `csharp-installer`. Renovate opens
  nothing for a transitive Bun advisory, and no other bot does either. The daily `bun audit` reports it, and it is
  fixed by a direct bump or by hand from the alert with `bun audit fix`.
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
  timestamp. The secret scanner's image is pinned the same way on its action's `version` input, which the
  github-actions manager does not read, so the base preset's regex manager moves its tag and digest.

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
  removal condition. A red advisory check blocks the merge like every required check, an `--admin` merge
  included (Branch rules).
- A known advisory against an unchanged action pin is waived per advisory in `.github/zizmor.yml` under
  `rules.known-vulnerable-actions.config.allow`, with the four-part comment `allow-ghsas` needs.
- Go adds `govulncheck` beside both advisory checks, because it blocks only on a reachable call. The Go gate runs
  `govulncheck ./...` and `govulncheck tool`, because `./...` never reads the modules behind `go.mod` tool
  directives.
- A tool-tree advisory with no fixed version is held by pinning the tool back, or by disabling `govulncheck tool`
  with a dated reason at its drift site until a fix ships. `CONTRIBUTING.md` says so.
- Live whole-tree readers run as reports, never as checks: `bun audit` daily, `cargo deny check advisories`
  daily, `dotnet package list --vulnerable` daily. They run from `audit.yml`, on its own clock. A repository
  with an audit script or waivers runs that script in the daily job, not bare `bun audit`. GitHub's
  database lacks RustSec entries that OSV carries, and the daily report covers those. `audit.yml` also carries a
  daily job that calls the reusable `workflows` workflow, so zizmor's online audits of the pinned actions run
  without a pull request. A red run is the report.
- The advisory check sees direct npm packages only under Bun, no NuGet package under central package
  management, and full lockfiles under Cargo. `CONTRIBUTING.md` states which legs the check covers.
- A C# repository submits a dependency snapshot on every pull request head and every push to the default branch
  (Known defects). The snapshot is generated by `Microsoft.Sbom.DotNetTool` from `dotnet-tools.json` over the
  restored tree and submitted by the SPDX dependency submission action, pinned by commit, which downloads
  nothing. A submitter that fetches its scanner at run time is not used. The snapshot counts as coverage only
  once a compare shows real versions.
- A template repository's alerts are fixed first, because its pins are copied into every new repository.

## Tools

- A tool the stack owns is pinned the stack's way: `go.mod` tool directives, `dotnet-tools.json`, cargo for
  xtask dependencies. A tool no stack owns, such as actionlint, zizmor, ShellCheck and taplo, is pinned in
  `mise.toml` with `mise.lock`. `mise.lock` is excluded from the formatter.
- The .NET SDK is pinned exactly. `global.json` names the exact SDK with `rollForward: patch`. CI's setup-dotnet
  then installs and builds with that SDK alone, and a contributor's machine one patch ahead still runs the gate.
  `global.json`'s `errorMessage` names the install command and points at `sdk.version` without repeating the
  number, and `docs/dev.md` reads the version from `global.json`. Renovate rewrites `sdk.version` alone, so a
  literal version anywhere else goes stale on every bump.
- A self-contained installer ships the runtime of the SDK that builds it, so a looser pin lets two builds of one
  commit ship different runtimes. The pin is the SDK carrying the newest runtime past the cooldown, never one
  behind what builds ship. Renovate bumps the SDK as `fix(deps)`, and the bump cuts a release (Updates).
- A .NET Framework project references `Microsoft.NETFramework.ReferenceAssemblies` explicitly, with
  `PrivateAssets="all"` and its version in `Directory.Packages.props`. The SDK adds that package only on a machine
  lacking the framework's targeting pack, so a lock file written on one machine otherwise fails a locked restore
  (`NU1004`) on another. A lock change is proven with `AutomaticallyUseReferenceAssemblyPackages=false` as well as
  with the default.
- A backend is chosen for integrity: the one whose entry reaches the higher tier, and `aqua:` on a tie. `cargo:`
  and `ubi:` record no lockfile integrity, so neither is used (Known defects).
- Each tool's integrity tier is stated under Dependencies in `CONTRIBUTING.md`. The tiers: provenance, a
  checksum in a pinned tree, a checksum recorded by a third party, a checksum mise hashed at lock time, or a
  version alone. "Verified" is never written for a hash check.
- A `github:` backend records a checksum mise hashed at lock time. That binds every later install to the bytes
  the lock fetched, and nothing outside the lockfile vouches for those bytes.
- The settings `locked`, `lockfile`, `locked_verify_provenance`, `provenance_api_failures_fatal`,
  `github_attestations` and `aqua.github_attestations` are set. `lockfile_platforms` names the platforms the
  lockfile pins. `[tool_config] locked` is set, because no environment variable reaches it.
- mise refuses a version disagreement and a missing platform entry. `mise install --locked --dry-run` proves it.
- `mise.toml` and `mise.lock` are the one mise config and lockfile in the tree. mise merges the sibling lockfile
  of every config file it discovers, highest precedence first (Known defects). The gate therefore refuses
  `mise.local.toml`, `.mise.toml`, `.mise.local.toml`, `mise.*.toml` and `mise.*.lock`, `.mise.<env>.toml`,
  `.config/mise*`, `.config/mise/**`, `.config/miserc.toml`, `.mise/**`, a `mise/` directory, `.miserc.toml` and
  `.tool-versions`. The Rust repositories keep `mise.semver.toml` and `mise.semver.lock` as the named exception
  (Releases).
- The gate also refuses a symlink or junction at the root or under `.config`, `.mise` or `mise`, because mise
  follows a link to a config the name check never sees.
- `mise.toml` holds `[tools]`, `[tool_config]` and `[settings]` alone. A `mise.toml` can carry a postinstall,
  hooks, `[env]` or tasks, and each of them runs code (Known defects), so the gate holds the file to an
  allow-list:
  - `[tool_config]` and `[settings]` are compared whole against the expected values;
  - a tool entry in any pin file, and the lockfile's `options`, carries `version` and a `version_prefix` equal to
    the tool's tag prefix, and nothing else;
  - the lockfile's keys are allow-listed at the top, entry and platform levels, its `tools` table holds the
    pinned tools alone, and its `lockfile_version` equals 1.
- Every mise spawn asserts `mise.toml` and `mise.lock` first, inside the one place that starts mise, so no row or
  task reaches mise over an unchecked file.
- Every mise call the gate makes, `install`, `which` and `exec`, carries four pins beside
  `MISE_URL_REPLACEMENTS`: `MISE_OVERRIDE_CONFIG_FILENAMES=mise.toml`,
  `MISE_OVERRIDE_TOOL_VERSIONS_FILENAMES=none`, `MISE_ENV=''` and `MISE_AUTO_ENV=false`. mise reads
  `.tool-versions` under the config override alone, and with auto env on it reads per-platform config files. The
  pins are the second layer behind the refusal above.
- Every workflow that runs mise sets the four pins and the same map at workflow level. A called workflow does not
  inherit its caller's workflow-level `env`, so each shared job sets its own. Every `jdx/mise-action` step sets
  `env: false`, `export_path: false` and `add_shims_to_path: false`, and a later step reaches a tool through its
  `mise which` path. A repository that runs a tool through a shim records the deviation at the drift site. With
  `env` on, the action writes `mise env --json` into `GITHUB_ENV`, where a config's `[env]` template renders with
  the runner's tokens in reach.
- Every job that runs `jdx/mise-action` runs it before `actions/checkout`. The action always runs
  `mise --version` and `mise ls` and trusts the workspace, so a checked-out `mise.toml`'s `exec` templates would
  run in that step, before any gate refusal. With `install: false` and a pinned mise version, the action needs no
  repository file, and its bin directory stays on `PATH` through the checkout.
- Every stack's gate starts mise with an environment built from an allow-list: what mise needs, plus the pins. It
  never passes an inherited environment through, so no `MISE_` name from a `.env` file, the shell or CI's exported
  environment reaches mise unless the gate sets it (Known defects).
- What mise needs, measured on CI runners, is `MISE_TRUSTED_CONFIG_PATHS` naming the checkout and the proxy
  variables in both cases, plus `HOME` and `TMPDIR` on Unix and `SYSTEMROOT`, `LOCALAPPDATA`, `TEMP` and `TMP` on
  Windows. No `XDG_` variable reaches mise. An autoloaded env file could set `XDG_DATA_HOME`, `XDG_CACHE_HOME` or
  `XDG_STATE_HOME` and point mise's data into the checkout, and mise falls back to defaults derived from `HOME`.
- Before setting a `MISE_` variable, the gate removes every case spelling of that name from the inherited
  environment. On Windows a differently cased inherited name wins over the one the gate sets.
- Before any install, the gate reads `mise.lock` with the stack's TOML library, for every tool and every platform
  `lockfile_platforms` names (Known defects). This is a named hand-rolled check, because nothing else reads the
  lockfile against expectations outside it. It asserts:
  - the checksum, the backend and the provenance line;
  - that the pin's version and the lock's version match the tool's version pattern, ASCII digits and dots,
    before any url is built, because the version is substituted into the url;
  - that `url` equals, byte for byte, the download url built from constants in source: owner, repository, tag
    prefix and one asset name per platform. No url parser reads it;
  - that `url_api` is the repository's asset prefix,
    `https://api.github.com/repos/<owner>/<repository>/releases/assets/`, followed by ASCII digits alone;
  - that every platform has an asset constant and every asset constant has a platform;
  - that no entry carries a nested `platforms` table, and no quoted `"platforms.<name>"` table names a platform
    `lockfile_platforms` leaves out. mise reads both spellings.
- A finding quotes every lockfile value it prints and escapes its control characters.
- `mise.toml` carries a `url_replacements` rule that sends the GitHub asset API to an unreachable host, and the
  gate asserts the rule equals a constant. Every install the gate or CI runs carries the same map in
  `MISE_URL_REPLACEMENTS`, because a committed higher-precedence config file lifts a rule `mise.toml` alone
  holds.
- A release whose GitHub assets carry no digest and whose aqua entry names no checksum file gets no checksum
  from `mise lock`. Its checksum is the sha256 of the artifact at the recorded url, computed once and written
  into `mise.lock`, and mise verifies it on install. The comment in `mise.toml` records how it was produced.
- Those hand-written lines survive a relock at the same version and vanish on a bump, so a bump recomputes them.
  No mise command writes them.
- A mise-pinned tool without attestations gets a second source. The shared `workflows` job resolves each
  lockfile asset id through GitHub's API. It requires `browser_download_url` to equal the lockfile url, and
  `digest` to equal the checksum where GitHub records one. A tool with neither attestation nor digest stays on
  its hand-computed checksum.
- `locked_verify_provenance` verifies against the coordinate the lockfile itself supplies. It arms the downgrade
  refusal for an entry that claims provenance and replaces none of the assertions.
- For a tool mise's registry routes, mise reads attestation bundles from its versions host,
  `mise-versions.jdx.dev`, and verifies them locally. When the host answers nothing usable, mise asks the GitHub
  API instead. The versions host refuses every repository outside mise's registry.
- The assertions run before the install, held by construction: one task asserts, then installs.
- The gate resolves a binary through `mise which` and invokes that path. A human activates mise in the shell.
- `MISE_BACKENDS_<TOOL>` overrides a backend from the environment and no setting reports it. The tier statement
  in `CONTRIBUTING.md` names that gap.

## Releases

- release-please in every stack except Rust, which takes release-plz (Known defects). The two never share a
  repository: release-plz skips any crate whose tag already exists.
- The job for the release pull request runs in `release-pr` with `deployment: false`, opened by the releaser
  app. The publish job runs in `release`.
- The release pull request says `Managed by` the app, not the tool.
- A release is created as a draft, every time. Assets upload and attest against the draft. Whether a human or
  the publish job flips the draft public is the repository's choice. The draft is not. `publish` called with no
  artifacts flips the draft alone, under the `release` reviewer. A service chains its deploy on that job.
- release-please pairs the draft with forced tag creation, because GitHub creates no tag for a draft, and sets
  `bump-minor-pre-major` (Versioning). release-plz creates the tag itself.
- The changelog carries user-facing changes alone (Commits). Under release-please, `changelog-sections` shows
  `feat`, `fix`, `perf` and `revert` and hides the rest, `build` included. Under release-plz,
  `[changelog] commit_parsers` shows the same four and skips the rest, with `protect_breaking_commits` on.
- Every repository takes the one changelog block its kickstart carries. A hidden type keeps its section name,
  because a break on a hidden type prints that heading.
- A release needs a user-facing change or a break, under both tools. release-please applies that itself: it cuts
  no release whose changelog is empty. release-plz applies it through `release_commits`.
- Every version heading after the first links GitHub's compare view from the previous tag. The view lists every
  change in the release, hidden types included. `git log <previous tag>..<tag>` lists the same. The first release
  has no previous tag, so its heading carries no link, and `git log <tag>` lists it.
- In a Rust repository `git_release_generate_notes` appends GitHub's generated notes to the draft release, below
  the changelog.
- Under release-please, a squash whose title hid a user-facing change is corrected with `BEGIN_COMMIT_OVERRIDE`
  in the merged pull request's description, before the release pull request merges. That override is the
  sanctioned recovery, never a changelog hand edit.
- The releaser app holds Contents and Pull requests write and no Issues. Nobody removes `autorelease: pending`
  by hand.
- A package published to a registry is published once by hand, then through trusted publishing with no
  long-lived token. An installer is attached to the release, attested, then the draft flips.
- An artifact repository ships a build attestation and `SHA256SUMS` beside its artifacts, and `docs/install.md`
  names both routes. The attestation is recorded through the attestations API, not attached as a release asset.
  One attestation covers the artifacts and `SHA256SUMS`.
- `docs/install.md` shows two verification forms. The first proves the source repository and the signer:

  ```sh
  gh attestation verify <file> --repo zachthedev/<repo> \
    --signer-workflow zachthedev/.github/.github/workflows/publish.yml
  ```

  `--repo` alone fails, because the reusable `publish.yml` signs the attestation. The second form binds the tag:
  resolve the tag's commit with `gh api repos/zachthedev/<repo>/commits/tags/<tag>`, then add
  `--source-digest <sha>`. The `tags/` form means a branch of the same name cannot answer. It binds because
  `publish.yml` refuses a tag that does not name `GITHUB_SHA`.

- `--source-ref refs/tags/...` is never used. `cd.yml` runs on a push to the default branch, so the certificate
  records `refs/heads/main`, and every genuine asset fails the tag form.
- A Rust workspace:
  - `release-plz.toml` carries `git_release_draft = true` and `git_release_latest = false`.
  - A workspace publishing nothing adds `git_only = true` and marks `xtask` with `release = false`.
  - A crate whose `Cargo.toml` says `publish = false` also carries `publish = false` in its `release-plz.toml`
    entry, or the workspace sets it. release-plz's `release` refuses such a crate while its entry leaves `publish`
    at the default, and `release = false` does not cover it. `update` and `release-pr` never check it, so the first
    real release run is where it fails.
  - `release-update` computes the release. It runs in no environment, with a job token that reads and
    `MISE_ENV=semver`, and runs `release-plz update` with the semver check. The check builds rustdoc for each
    changed library and its published baseline, which runs every dependency's build script, so the job holds no
    credential. It uploads the change it computed.
  - `release-pr` runs in `release-pr`. It applies only the `Cargo.lock`, `*Cargo.toml` and `*CHANGELOG.md`
    hunks, mints the releaser token last, and runs `release-plz release-pr --allow-dirty`.
  - That handoff refuses any summary line but a 100644 create of a `CHANGELOG.md`, any binary hunk, and any
    symlink after the apply, because `git apply --include` filters by path alone.
  - cargo-semver-checks lives in `mise.semver.toml` alone, with `mise.semver.lock`, because a mise shim installs
    any configured tool when another tool's shim runs. `MISE_ENV=semver` layers that file over `mise.toml`,
    whose `[tool_config] locked` binds it too.
  - The release job runs under `release` with `id-token: write` and no registry token. release-plz exchanges
    the OIDC token itself.
  - The release job carries `if: startsWith(github.event.head_commit.message, 'chore: release')`, so it queues
    an approval only on the release merge. `release-plz.toml` pins `pr_name`, so the title and the `if:` cannot
    drift.
  - release-plz creates the tags in the release job, under the releaser app. `release` therefore also holds
    `RELEASER_CLIENT_ID` and `RELEASER_PRIVATE_KEY`, and `release-pr` holds the same pair.
  - The crates.io trusted-publishing configuration names `cd.yml` and the environment `release`.
  - After a manual first publish, the owner creates the `<crate>-v<version>` tags at the commit each crate's
    `.cargo_vcs_info.json` names. release-plz never tags a version already on crates.io. A squash merge and the
    branch's deletion leave that commit unreachable, so without the tags release-plz walks the whole history and
    proposes a spurious release.
  - The tag ruleset admits the releaser app alone, so those tags are an owner step. The owner sets the ruleset to
    `disabled`, creates each tag with `POST /repos/{owner}/{repo}/git/refs`, sets it back to `active` and reads it
    back. A git push never creates them, because it runs the `pre-push` gate while the ruleset is disabled and
    widens that window to minutes.

## Versioning

Every version follows [Semantic Versioning](https://semver.org/). This section states the set's own choices and
restates none of the specification's rules.

- The release tool owns the number. Nobody hand-edits a version or a changelog, apart from the one reset a
  kickstart's marker orders (Kickstarts).
- The first version is `0.1.0`, or `1.0.0` where the interface is already settled. The release tool's
  configuration is the one record of that start: `initial-version` under release-please, the crate's version
  under release-plz. No prose restates it or gives its reason.
- Below `1.0.0` a breaking change bumps the minor: release-please through `bump-minor-pre-major`, release-plz by
  its own default. The changelog carries the break. Under release-plz a `feat` below `1.0.0` bumps the patch.
- A Rust workspace releases in lockstep. Its released crates share one release-plz `version_group`, and
  `release_commits` makes a release need a user-facing change (Releases). Every crate takes the shared
  `[workspace.package]` version. `release_commits` without a `version_group` holds back a crate that saw no
  user-facing change without rewriting its dependents' requirements, so a breaking release then fails
  `cargo update`.
- A prerelease is `-rc.N`. Everything that reads the tag admits it before the first one is cut.
- Tags are `v`-prefixed: `v<version>`. A workspace crate tagged on its own takes `<crate>-v<version>`.
- An installer or an assembly carries the numeric core alone, so a prerelease is not an upgrade path.
  `docs/install.md` says so under Upgrade.

## Labels

- The kickstart ships one label set with colors and descriptions. Labels are created at repository creation with
  `gh label clone` from the kickstart, so no repository defines them by hand.
- The base set is GitHub's defaults, `accessibility` among them, without `good first issue` and `question`, plus
  `dependencies`, `ci`, `security`, `autorelease: pending` and `autorelease: tagged`. GitHub creates its
  defaults at repository creation, so a new repository deletes those two after the clone.
- A repository whose label set differs records why at the drift site, the file that names the label.
- Every label a tool applies exists before the tool runs. An undefined label is created on demand with no color
  and no description. That is how a set drifts.
- Label names are written only where a tool reads them: the issue forms' `labels:` lines, the Renovate presets,
  and `dependabot.yml` under Dependabot. The release tool owns `autorelease: pending` and `autorelease: tagged`.
- A release-plz repository sets `pr_labels = ["autorelease: pending"]`. After the release, a step with a
  pull-requests-write token of its own moves the merged pull request to `autorelease: tagged`, with
  `continue-on-error`, so a failed label move never fails a release.

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
- Two kinds of generated file are exempt. A file whose generator reads machine state, such as an installed
  tool's output, names its exemption at its drift site. A tool's own record, `mise.lock`, `CHANGELOG.md` or the
  release manifest, is held by the tool that writes it.
- A prose rule that survives takes Vale as its mechanism, run as one gate step.
- A comment states what the code guarantees now. What changed goes in the commit message.
- `.gitignore` starts from the `github/gitignore` template for the stack, below one marker naming the template
  path and the commit it came from. Repository entries sit above the marker, and `.claude/worktrees/` and
  `.claude/settings.local.json` are among them, because Claude Code writes both locally. A change to the
  template block, a negation included, is edited into the block in place, and no overrides block trails it. The
  terse note at the top of the template section says what changed, so a refresh knows what to carry.

## Known defects

Tool and platform defects that stop something being used as designed. Each entry names the section it
bears on, the defect, and the condition that removes it.

- zizmor (Dependabot): the `dependabot-cooldown` audit returns at the first update whose cooldown meets the
  threshold, so every later entry is unexamined. No workaround. Removed once the early return becomes a
  `continue` upstream.
- wrangler (Gate): `wrangler types --check` compares a hash of the config inputs against the file's header and
  passes a hand-edited body. The gate regenerates the file and diffs it. Removed once the check reads the body.
- Windows `NoDefaultCurrentDirectoryInExePath` (Gate): a shell that sets it hides the current-directory search of
  CreateProcess and Bun. A probe run from such a shell reports no exposure where a runner or a maintainer's
  terminal has one, so a probe sets its child's environment explicitly. Windows documents the variable, so the
  entry stays.
- gofmt (Gate): `gofmt -l` exits 0 with an unformatted file present. golangci-lint's formatter is the check.
  gofmt documents that exit code, so the entry stays.
- codeql-action (CodeQL): falls back from `build-mode: none` to `autobuild` for C# and Java on a server-side
  flag, and logs it as a warning. A C# repository reads its first run's log, and the conclusion alone is not
  trusted. Removed once the fallback fails the run.
- typescript-eslint (Gate): reads types through the TypeScript 6 compiler API. A Bun repository therefore keeps
  `typescript` on 6.x beside the native TypeScript 7 compiler, installed under an alias, and a Renovate rule
  holds the major. Removed once typescript-eslint supports TypeScript 7.
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
  url host swapped. A deleted provenance line disarms the downgrade refusal. mise falls back to `url_api` on any
  failed HEAD of `url`, and no setting turns the fallback off. It reads a nested `platforms` table for any
  platform, and it reads `url_replacements` from every config file. The gate's assertions and the pinned
  `MISE_URL_REPLACEMENTS` under Tools exist for these. Removed once mise refuses each.
- mise config discovery (Tools): mise merges the sibling lockfile of every config file it discovers, highest
  precedence first. A committed `mise.local.toml` with `mise.local.lock`, or a `.miserc.toml` choosing an env
  with `mise.<env>.toml` and its lock, then redirects `mise install --locked` to any url with any checksum. A
  gate reading `mise.toml` and `mise.lock` alone stays green and runs the binary. mise reads `.tool-versions`
  even under `MISE_OVERRIDE_CONFIG_FILENAMES`. With auto env on, set by a miserc or `MISE_AUTO_ENV`, it reads
  per-platform `mise.<platform>.toml` files under that override too. It follows a symlink or junction to a config
  file. The refusals and the four pins under Tools exist for this. Removed once a locked install reads one named
  config and its lockfile alone.
- mise config code (Tools): `mise install` runs a config's `[hooks]` and the `exec(...)` templates in its `[env]`
  and `[vars]`, even from a home with no trust state, while `mise which` refuses an untrusted config.
  `MISE_NO_ENV` and `MISE_NO_HOOKS` leave `[vars]` running, so the `mise.toml` allow-list is the control, not an
  environment pin. Removed once `mise install` refuses an untrusted config as `mise which` does.
- mise global config (Tools, Gate): Bun loads a committed `.env` into any process it starts without
  `--no-env-file`. That file can name `MISE_GLOBAL_CONFIG_FILE`, which mise honors whatever the config-name pins
  say. `jdx/mise-action` trusts the whole workspace, so a hook in any repository file then runs. The environment
  allow-list, `--no-env-file` and the `.env` refusal exist for this. Removed once mise holds
  `MISE_GLOBAL_CONFIG_FILE` to the config-name pins.
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
- actionlint (Workflows): on Windows it stalls when it hands ShellCheck a `run:` script past about 4 KB. Every
  run script therefore stays under 4 KB, and a longer check becomes a step of its own. Removed once actionlint
  hands a long script over on Windows.
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
- The profile README: `zachthedev/zachthedev`, the account's special repository, which the owner alone edits.
  GitHub reads `.github/profile/README.md` only for an organization, so `.github` carries none.
- The files a repository copies: its kickstart.
- The per-repository alignment table: `REPOS.md`, local and gitignored, because it lists repositories that are
  private or not yet on GitHub.
