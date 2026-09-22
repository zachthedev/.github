# Security

This repository holds what every `zachthedev` repository runs and reads: the reusable workflows under
`.github/workflows/`, the Renovate presets under `renovate/`, the default community files, and the
[handbook](HANDBOOK.md). A defect here reaches every repository on its next run. This file says what counts as
a vulnerability in that arrangement, and how to report one without publishing it first.

## Reporting

Open a private advisory on the repository the report concerns, from its Security tab. For this repository:
<https://github.com/zachthedev/.github/security/advisories/new>. Where the Security tab offers no private
report, email [hey@zachthe.dev](mailto:hey@zachthe.dev).

Never open a public issue for a vulnerability. Everything else belongs in the issue tracker.

A report is most useful with the workflow or preset it concerns, the commit it was read at, and what a caller
would have to do to reach the hole. Keep a proof of concept inert: a workflow run in your own fork that prints
what it could reach proves it as well as one that pushes, publishes or reads a secret.

## What is supported

The default branch. A fix lands on `main`. Every caller reads the presets from there on its next run. A
caller pins a reusable workflow by commit, so a workflow fix reaches it after the next release here and that
caller's merged bump. Nothing here is released to a registry, so there is no older version to patch.

## In scope

- A reusable workflow that hands a caller's secret, an app token or write access to something the pull
  request under test controls: a step that runs untrusted input, a permission wider than the job needs, or a
  checkout that keeps credentials it does not use.
- A workflow or preset that lifts a control every repository relies on: the SHA pin on an action, the
  three-day cooldown, the read-only default token, or a required check that stops reporting.
- A preset that makes Renovate open a pull request it must not, or hide one it must open, such as a security
  fix.
- The gate in this repository, where it runs on a contributor's machine: a check that reads a file it must
  not, or a tool resolved from somewhere other than its pin.

## Out of scope

- GitHub itself: Actions, Dependabot, code scanning and the rulesets. Report those to GitHub.
- Renovate, actionlint, zizmor, ShellCheck, taplo, Prettier, commitlint and lefthook themselves. Report those
  upstream; a pin bump lands here once a fix ships.
- A repository that calls these workflows with settings the handbook does not describe. Its own `SECURITY.md`
  covers it.
- The handbook's text. A rule that reads wrongly is an issue, not a vulnerability.

## After a report

One person maintains this repository, and a first reply takes up to a week. There is no bounty. A report gets
an acknowledgment, a fix on `main`, and a credit in the advisory unless you ask to stay anonymous.
