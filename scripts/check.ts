/**
 * The gate: every check a contributor can run locally, in one command.
 *
 * @remarks
 * `bun run check` runs the rows in order and prints one line per row.
 * `bun run check <row>` runs the named rows alone. `bun run check:rows`
 * prints the rows and runs nothing, which is the list CONTRIBUTING.md points
 * at. CI's gate job runs this file on three platforms, so a green run here is a
 * green run there.
 *
 * No row resolves a program from the working directory. Bun is the process
 * running this file, every JavaScript tool starts through `bun x --bun
 * --no-install` once the checkout's node_modules/.bin holds it, every pinned
 * tool resolves through `mise which`, and mise, gh and git start from an
 * absolute PATH entry outside the checkout alone. Every tool that searches for
 * a config runs with its one config named. Before any row, the gate refuses to
 * run beside a config a tool would read in place of the one the gate names, a
 * tracked env file Bun loads, a project config outside the named paths, a
 * node_modules below the root, a JSON key Bun and the shared commits job read
 * two ways, a patch a package.json names, anything that would steer how Bun
 * resolves the gate's own imports, a workflow the workflows row would not
 * read, or an inline zizmor waiver under .github. No config's text is held:
 * code-owner review is the control on a change to one. The other files that
 * run code before the gate's first line, such as a bunfig.toml preload, are
 * refused before a merge by the shared commits and workflows jobs. ci.yml
 * calls those jobs by relative path, so a pull request runs its own copy of
 * each, and code-owner review of .github/workflows/ is the control on a change
 * to one or to the job that runs this file. Every row that walks the tree
 * says how many files it checked and fails when that is none. The rows that
 * run the repository's own code come last, and the preflight runs again after
 * each. No row carries a deadline: the CI job's timeout-minutes bounds the
 * gate.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { styleText } from 'node:util';
import type * as Prettier from 'prettier';
// Every module imported here reads Bun and node: built-ins alone, so the
// preflight runs and prints on a checkout with no install. tools.ts imports
// zod and the format row imports prettier, each by its path under the
// checkout's node_modules, so a missing install fails the row that needs it.
// github.ts takes every GitHub token out of the environment when it loads,
// before any row starts a process.
import { githubToken } from './github';
import {
  actionlintFinished,
  comparable,
  compilerFinding,
  files,
  ignoreCommentFindings,
  inheritedCallFindings,
  inheritedCalls,
  taploFound,
  testCount,
  unreadSourceFinding,
  zizmorCompleted,
} from './rows';
import { describe, type Finished, fold, git, jsTool, plain, printable, quote, run } from './run';
import {
  ESLINT_CONFIG,
  isTable,
  PRETTIERIGNORE,
  PRETTIERRC,
  startupFindings,
  TAPLO_CONFIG,
  trackedFindings,
  TSCONFIG,
  ZIZMOR_CONFIG,
} from './startup';

/** The Bun running the gate, so every row runs the one `packageManager` pins. */
const BUN = process.execPath;

/**
 * The flag every Bun the gate starts directly gets first, so no env file on
 * disk sets a variable inside the row: the test runs and the ShellCheck
 * stand-in. Bun honors it over all eight names it loads, in every mode.
 * bunx ignores it, so no JavaScript tool gets it.
 */
const NO_ENV_FILE = '--no-env-file';

/**
 * Prettier's module entry under the checkout's node_modules, by path, so a
 * missing install fails the format row rather than loading a copy from a
 * parent directory or installing one at run time. The specifier is held in a
 * variable, so tsc takes the types from the `import type` below it and never
 * resolves the untyped file.
 */
const PRETTIER_ENTRY = '../node_modules/prettier/index.mjs';

/**
 * How many characters of file arguments one command carries. Windows caps a
 * whole command line at 32,767, so a longer list runs in batches.
 */
const ARGUMENT_BUDGET = 24_000;

// ShellCheck reads extra flags from SHELLCHECK_OPTS whatever actionlint's --norc
// says, and one can exclude any finding, so no process the gate starts gets it.
// run() withholds BUN_OPTIONS the same way.
delete process.env['SHELLCHECK_OPTS'];

/** A row of the gate: its name, what it checks, and the check itself. */
export interface Row {
  readonly name: string;
  readonly checks: string;
  /** Runs the check. A string it returns prints after the row's time. */
  readonly check: () => string | undefined | Promise<string | undefined>;
  /**
   * True for a row that runs the repository's own code, which can write any
   * file a later row reads, so the preflight runs again before the next row.
   */
  readonly runsCode?: true;
}

/** The binary paths the `tools` row resolves, read by the rows after it. */
const binaries = new Map<string, string>();

/**
 * The path the `tools` row resolved for `key`.
 *
 * @remarks
 * A single row run with `bun run check <row>` skips the `tools` row, so the
 * map is filled from `mise which` on first use. That asserts mise.toml and
 * mise.lock first, resolves installed binaries and checks their versions; it
 * installs nothing.
 */
async function binary(key: string): Promise<string> {
  if (binaries.size === 0) {
    const { resolve } = await import('./tools');
    for (const [tool, path] of await resolve()) {
      binaries.set(tool, path);
    }
  }
  const path = binaries.get(key);
  if (path === undefined) {
    throw new Error(`mise.toml pins no ${key}, so this row cannot run`);
  }
  return path;
}

/** The process's output, or a throw carrying it when the process did not exit 0. */
async function expectClean(
  label: string,
  cmd: readonly string[],
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<Finished> {
  const finished = await run(cmd, env);
  if (finished.exitCode !== 0) {
    throw new Error(`${label} ${describe(finished)}`);
  }
  return finished;
}

/**
 * The tracked files `pathspecs` match, relative to the root, from one
 * `git ls-files`, less any the working tree no longer holds.
 *
 * @remarks
 * Tracked files alone, so no .gitignore decides what a row reads, and CI's
 * checkout holds exactly these. A new file counts once it is added.
 */
async function trackedFiles(...pathspecs: string[]): Promise<string[]> {
  const finished = await git(['ls-files', '-z', '--', ...pathspecs]);
  if (finished.exitCode !== 0) {
    throw new Error(`git ls-files ${describe(finished)}`);
  }
  return [...new Set(finished.stdout.split('\0').filter((path) => path.length > 0))].filter((path) => existsSync(path));
}

/**
 * `paths` in batches that fit {@link ARGUMENT_BUDGET}.
 *
 * @remarks
 * Every command puts `--` ahead of a batch, so a file named like a flag never
 * reads as one. A path keeps its plain form, because taplo matches its
 * excludes against the path as given and a `./` prefix slips past them.
 */
function batches(paths: readonly string[]): string[][] {
  const all: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const path of paths) {
    if (current.length > 0 && length + path.length + 1 > ARGUMENT_BUDGET) {
      all.push(current);
      current = [];
      length = 0;
    }
    current.push(path);
    length += path.length + 1;
  }
  if (current.length > 0) {
    all.push(current);
  }
  return all;
}

/**
 * The variables every bun test the gate starts gets. With CI set, bun test
 * fails a file holding `test.only` rather than running that test alone and
 * leaving the rest out of its count.
 */
const TEST_ENV: Readonly<Record<string, string>> = { CI: 'true' };

/* ///// scripts:test ///// */

// The gate's own tests. Each case starts a stand-in in place of every program
// the gate starts, with a PATH holding the stand-ins alone, so none reaches
// the real gh, git, mise or the network. The row reads bun test's own count,
// and a failure prints the whole report.
async function scriptsTest(): Promise<string> {
  const finished = await run([BUN, NO_ENV_FILE, 'test', './scripts/'], TEST_ENV);
  if (finished.exitCode !== 0) {
    throw new Error(`bun test ./scripts/ ${describe(finished)}`);
  }
  return testCount('bun test ./scripts/', finished);
}

/* ///// tools ///// */

// install() asserts the root, mise.toml and mise.lock before mise starts, as
// every mise command the gate runs does.
async function tools(): Promise<undefined> {
  const { install, resolve } = await import('./tools');
  await install();
  for (const [key, path] of await resolve()) {
    binaries.set(key, path);
  }
}

/* ///// typecheck ///// */

/** The package.json name of the native TypeScript 7 compiler the typecheck row runs. */
const NATIVE = '@typescript/native';

// The native TypeScript 7 compiler, from the `@typescript/native` alias. The
// 6.x `typescript` package that typescript-eslint needs ships a tsc too, and
// bun install links a command two packages claim to the one whose name sorts
// first, so node_modules/.bin/tsc is the alias's. The row first holds
// `tsc --version` to the major package.json pins for the alias, so a renamed
// alias or another tie-break turns it red. The gate is the only TypeScript
// here besides eslint.config.ts, which the root config reads alone. Each
// project is named, so tsc never searches past the checkout for a config, and
// scripts/ carries its own, so the root one never reaches the gate's module
// resolution. --listFiles names every file the program read, so the row
// counts the ones from the repository, and fails on a tracked TypeScript file
// that no project read.
async function typecheck(): Promise<string> {
  const manifest: unknown = JSON.parse(await Bun.file('package.json').text());
  const spec =
    isTable(manifest) && isTable(manifest['devDependencies']) ? manifest['devDependencies'][NATIVE] : undefined;
  if (typeof spec !== 'string') {
    throw new Error(`package.json names no ${NATIVE} in devDependencies, and the typecheck row runs that compiler`);
  }
  const version = await run([...jsTool('tsc'), '--version']);
  if (version.exitCode !== 0) {
    throw new Error(`tsc --version ${describe(version)}`);
  }
  const other = compilerFinding(version.stdout, spec);
  if (other !== undefined) {
    throw new Error(other);
  }
  const root = comparable('.') + sep;
  const counts: number[] = [];
  const checked = new Set<string>();
  for (const [label, project] of [
    ['eslint.config.ts', ['--project', TSCONFIG]],
    ['scripts', ['--project', 'scripts']],
  ] as const) {
    const finished = await run([...jsTool('tsc'), '--noEmit', '--listFiles', ...project]);
    const lines = plain(finished.stdout).split('\n');
    const listed = lines.filter((line) => isAbsolutePath(line));
    if (finished.exitCode !== 0) {
      const report = lines.filter((line) => !isAbsolutePath(line)).join('\n');
      throw new Error(`tsc over ${label} ${describe({ ...finished, stdout: report })}`);
    }
    const read = listed.filter((line) => {
      const path = comparable(line);
      return path.startsWith(root) && !/[\\/]node_modules[\\/]/i.test(path);
    });
    if (read.length === 0) {
      throw new Error(`tsc over ${label} read no file from the repository, so it checked nothing`);
    }
    counts.push(read.length);
    for (const line of read) {
      checked.add(comparable(line));
    }
  }
  const unread = unreadSourceFinding(await trackedFiles(), checked);
  if (unread !== undefined) {
    throw new Error(unread);
  }
  return `${files(counts[0] ?? 0)} and ${files(counts[1] ?? 0)}`;
}

/** Whether a line tsc printed is a path it read rather than a diagnostic. */
function isAbsolutePath(line: string): boolean {
  return /^([A-Za-z]:)?\//.test(line.trim());
}

/* ///// lint ///// */

/** One message ESLint's json formatter reports against a file. */
interface LintMessage {
  readonly ruleId?: string | null;
  readonly severity?: number;
  readonly message?: string;
  readonly line?: number;
  readonly column?: number;
}

/** One file ESLint's json formatter reports on. */
interface LintResult {
  readonly filePath: string;
  readonly messages: readonly LintMessage[];
  /** The reports a directive turned off, which ESLint lists whatever the directive says. */
  readonly suppressedMessages: readonly LintMessage[];
}

/** Whether `value`, parsed from ESLint's json output, is one file's result. */
function isLintResult(value: unknown): value is LintResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { filePath?: unknown }).filePath === 'string' &&
    Array.isArray((value as { messages?: unknown }).messages) &&
    Array.isArray((value as { suppressedMessages?: unknown }).suppressedMessages)
  );
}

/** The rule that refuses a waiver whose reason holds no letter or digit. */
const VISIBLE_REASON = 'gate/visible-reason';

/**
 * Every report of {@link VISIBLE_REASON} a directive turned off, as findings
 * naming the file, line and column.
 *
 * @remarks
 * ESLint applies a directive to the reports at its own position, so a
 * directive naming the rule hides the rule's report on that directive, and a
 * block disable naming it hides every report up to its enable. ESLint lists
 * each report a directive turned off under `suppressedMessages`, and no
 * directive removes one from that list.
 */
export function suppressedReasonFindings(results: readonly LintResult[]): string[] {
  return results.flatMap((result) =>
    result.suppressedMessages
      .filter((message) => message.ruleId === VISIBLE_REASON)
      .map(
        (message) =>
          `${quote(result.filePath)}:${String(message.line ?? 0)}:${String(message.column ?? 0)}  a directive turned off ${VISIBLE_REASON}, which no directive may do. Take the rule out of the directive and give each waiver a reason in words`,
      ),
  );
}

/** The rule that holds a TypeScript waiver comment to a description. */
const BAN_TS_COMMENT = '@typescript-eslint/ban-ts-comment';

/** The prefix of every rule of the plugin that checks ESLint's own directive comments. */
const ESLINT_COMMENTS = '@eslint-community/eslint-comments/';

/** Whether `ruleId` names a rule that reads comments: the visible-reason rule, ban-ts-comment, or an eslint-comments rule. */
function isCommentRule(ruleId: string | null | undefined): boolean {
  return ruleId === VISIBLE_REASON || ruleId === BAN_TS_COMMENT || (ruleId ?? '').startsWith(ESLINT_COMMENTS);
}

/**
 * Every report of a rule that reads comments, from a pass that ignored every
 * directive and configuration comment, as findings naming the file, line and
 * column.
 *
 * @remarks
 * A configuration comment setting a rule to off turns it off for the whole
 * file, and the rule then reports nothing, so nothing lands in
 * `suppressedMessages` either. Under `--no-inline-config` ESLint reads no
 * comment as configuration, so each such rule runs over every file, and each
 * of its reports is one the first pass let a comment hide.
 */
export function unwaivedCommentFindings(results: readonly LintResult[]): string[] {
  return results.flatMap((result) =>
    result.messages
      .filter((message) => isCommentRule(message.ruleId))
      .map(
        (message) =>
          `${quote(result.filePath)}:${String(message.line ?? 0)}:${String(message.column ?? 0)}  ${message.ruleId ?? ''} reports this with every configuration comment ignored, and no comment may turn that rule off: ${message.message ?? ''}`,
      ),
  );
}

/**
 * ESLint over the tree with the one config, and `options` after it, as its
 * finished process and its json results.
 *
 * @throws When ESLint prints no json, or json that is not a list of file results
 */
async function eslintResults(
  label: string,
  options: readonly string[],
): Promise<{ readonly finished: Finished; readonly results: readonly LintResult[] }> {
  const finished = await run([...jsTool('eslint'), '--config', ESLINT_CONFIG, ...options, '.', '--format', 'json']);
  let results: unknown;
  try {
    results = JSON.parse(plain(finished.stdout));
  } catch {
    // No json means ESLint stopped before it linted anything, a config error among them.
    throw new Error(`${label} ${describe(finished)}`);
  }
  if (!Array.isArray(results) || !results.every((result) => isLintResult(result))) {
    throw new Error(`${label} printed json that is not a list of file results: ${describe(finished)}`);
  }
  return { finished, results };
}

// The json formatter names every file ESLint linted, so the row counts them
// and prints each problem itself. It also refuses every report of the
// visible-reason rule a directive turned off, which ESLint lists apart from
// the problems and counts in no exit code. A second pass runs with
// --no-inline-config, which reads no comment as configuration, and the row
// refuses every report there of a rule that reads comments. That pass exits 1
// wherever a directive waives another rule, so its exit code decides nothing
// but a crash. --config names the one config, so ESLint runs no
// eslint.config.* nearer a file than the root.
async function lint(): Promise<string> {
  const { finished, results } = await eslintResults('eslint', ['--max-warnings=0']);
  const problems = results.flatMap((result) =>
    result.messages.map(
      (message) =>
        `${quote(result.filePath)}:${String(message.line ?? 0)}:${String(message.column ?? 0)}  ${message.severity === 2 ? 'error' : 'warning'}  ${message.message ?? ''}  ${message.ruleId ?? ''}`,
    ),
  );
  const suppressed = suppressedReasonFindings(results);
  if (finished.exitCode !== 0) {
    throw new Error(
      `eslint exited ${String(finished.exitCode)} over ${files(results.length)}:\n${[...problems, ...suppressed, finished.stderr.trim()].filter((line) => line.length > 0).join('\n')}`,
    );
  }
  if (results.length === 0) {
    throw new Error('eslint linted no file, so it checked nothing');
  }
  if (suppressed.length > 0) {
    throw new Error(suppressed.join('\n'));
  }
  const second = await eslintResults('eslint --no-inline-config', ['--no-inline-config']);
  if (second.finished.exitCode !== 0 && second.finished.exitCode !== 1) {
    throw new Error(`eslint --no-inline-config ${describe(second.finished)}`);
  }
  if (second.results.length !== results.length) {
    throw new Error(
      `eslint --no-inline-config linted ${files(second.results.length)} and the first pass ${files(results.length)}, so the two passes read different trees`,
    );
  }
  const unwaived = unwaivedCommentFindings(second.results);
  if (unwaived.length > 0) {
    throw new Error(unwaived.join('\n'));
  }
  return files(results.length);
}

/* ///// format ///// */

// Prettier names no file it checked, so the row hands it every tracked file
// Prettier would format, decided by Prettier's own getFileInfo against the one
// ignore file, and counts that list. getFileInfo runs in the gate's process
// and resolves the config nearest each file unless told not to, a package.json
// prettier key and the plugins it names included, so resolveConfig is off.
// .prettierrc holds formatting options alone, under review, so it names no
// parser and the inferred parser is the same either way. --ignore-path names
// .prettierignore alone, so .gitignore never narrows it, and --config names
// the one config, so Prettier searches for no other file and a config under a
// subdirectory never loads. --no-editorconfig keeps any .editorconfig from
// setting an option.
async function format(): Promise<string> {
  const { getFileInfo } = (await import(PRETTIER_ENTRY)) as typeof Prettier;
  const checked: string[] = [];
  for (const path of await trackedFiles()) {
    const info = await getFileInfo(path, { ignorePath: PRETTIERIGNORE, resolveConfig: false });
    if (!info.ignored && info.inferredParser !== null) {
      checked.push(path);
    }
  }
  if (checked.length === 0) {
    throw new Error('no tracked file is one Prettier formats, so the row checks nothing');
  }
  // Prettier leaves the code after its ignore comment unformatted with no
  // reason given, so the row refuses the comment in every file it checks.
  const waived: string[] = [];
  for (const path of checked) {
    waived.push(...ignoreCommentFindings(path, await Bun.file(path).text()));
  }
  if (waived.length > 0) {
    throw new Error(waived.join('\n'));
  }
  for (const batch of batches(checked)) {
    await expectClean('prettier', [
      ...jsTool('prettier'),
      '--check',
      '--config',
      PRETTIERRC,
      '--ignore-path',
      PRETTIERIGNORE,
      '--no-editorconfig',
      '--',
      ...batch,
    ]);
  }
  return files(checked.length);
}

/* ///// toml ///// */

// taplo exits 0 having checked nothing when a file it was handed is missing
// or excluded, so the row matches the files taplo says it found against the
// files it handed over. The config is named, so TAPLO_CONFIG in the
// environment cannot swap it. RUST_LOG is set, because taplo prints its found
// line at that level and a contributor's own setting would hide it.
async function toml(): Promise<string> {
  const taplo = await binary('taplo');
  const handed = (await trackedFiles()).filter((path) => fold(path).endsWith('.toml'));
  if (handed.length === 0) {
    throw new Error('no TOML file is tracked, so the row checks nothing');
  }
  for (const batch of batches(handed)) {
    const finished = await expectClean('taplo', [taplo, 'fmt', '--check', '--config', TAPLO_CONFIG, '--', ...batch], {
      RUST_LOG: 'info',
    });
    const found = taploFound(`${finished.stdout}\n${finished.stderr}`);
    if (found === undefined) {
      throw new Error(`taplo printed no found-files line, so what it checked is unknown: ${describe(finished)}`);
    }
    const reported = new Set(found.map((path) => comparable(path)));
    const missed = batch.filter((path) => !reported.has(comparable(path)));
    if (missed.length > 0 || reported.size !== batch.length) {
      throw new Error(
        `taplo checked ${files(reported.size)} of the ${files(batch.length)} handed to it. Not checked: ${missed.map((path) => quote(path)).join(', ')}. ${TAPLO_CONFIG} decides which it reads`,
      );
    }
  }
  return files(handed.length);
}

/* ///// workflows ///// */

/** A one-step workflow running `script`, for the canaries. */
function canaryWorkflow(script: string): string {
  return `name: canary
on: push
jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - run: |
          ${script.split('\n').join('\n          ')}
`;
}

/**
 * The two canaries, each a workflow and what actionlint must report over it.
 * The first carries one ShellCheck finding and nothing else, and SC2086 comes
 * back only when ShellCheck ran behind the stand-in. actionlint exits 0 when
 * the program its flag names cannot start, so a clean run over the tree
 * carries weight only after this finding came back. The second carries a
 * directive turning that finding off, and the stand-in's refusal comes back
 * only when actionlint started the stand-in rather than ShellCheck itself.
 */
const CANARIES: readonly { readonly name: string; readonly workflow: string; readonly expected: string }[] = [
  { name: 'finding.yml', workflow: canaryWorkflow('echo $GITHUB_REF'), expected: 'SC2086' },
  {
    name: 'directive.yml',
    workflow: canaryWorkflow('# shellcheck disable=SC2086\necho $GITHUB_REF'),
    expected: 'A ShellCheck directive is refused',
  },
];

/**
 * `path` as one word of the command line actionlint splits `-shellcheck` into:
 * forward slashes, single-quoted. actionlint drops the backslashes of an
 * unquoted Windows path and then runs no ShellCheck at all.
 *
 * @throws When the path holds a single quote, which the quoting cannot carry
 */
function shellWord(path: string): string {
  if (path.includes("'")) {
    throw new Error(`${quote(path)} holds a single quote, so actionlint cannot be handed it as one word`);
  }
  return `'${path.replaceAll('\\', '/')}'`;
}

async function workflows(): Promise<string> {
  const actionlint = await binary('actionlint');
  const shellcheck = await binary('shellcheck');
  // actionlint runs ShellCheck through scripts/shellcheck.ts, which refuses a
  // directive in the script ShellCheck reads. -pyflakes= because no Windows
  // package manager ships pyflakes, and actionlint skips that pass without a
  // word when it is missing.
  const standIn = [BUN, NO_ENV_FILE, join(import.meta.dir, 'shellcheck.ts'), shellcheck]
    .map((path) => shellWord(path))
    .join(' ');
  const analyzers = [`-shellcheck=${standIn}`, '-pyflakes='];

  const dir = await mkdtemp(join(tmpdir(), 'actionlint-canary-'));
  try {
    for (const canary of CANARIES) {
      const path = join(dir, canary.name);
      await Bun.write(path, canary.workflow);
      const finished = await run([actionlint, ...analyzers, path]);
      if (finished.exitCode !== 1) {
        throw new Error(
          `actionlint over the ${canary.name} canary ${describe(finished)}, and a canary's one finding exits 1`,
        );
      }
      if (!plain(finished.stdout).includes(canary.expected)) {
        throw new Error(
          `actionlint reported no ${quote(canary.expected)} over the ${canary.name} canary, so the wiring through scripts/shellcheck.ts is unproven. It ${describe(finished)}`,
        );
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  // The workflows are named, so actionlint needs no .git to find them, and
  // -verbose makes it name each file it finished. A committed actionlint
  // config is refused before any row, so none silences a finding here.
  // actionlint lints files in parallel and writes a verbose line's prefix
  // apart from its text, so a line can carry two prefixes and the next none:
  // the per-file line is matched with any number of prefixes, none included.
  const workflowFiles = await trackedFiles(':(glob).github/workflows/*.yml', ':(glob).github/workflows/*.yaml');
  if (workflowFiles.length === 0) {
    throw new Error('no workflow is tracked under .github/workflows, so the row checks nothing');
  }
  for (const batch of batches(workflowFiles)) {
    const finished = await run([actionlint, '-verbose', ...analyzers, '--', ...batch]);
    const report = { ...finished, stderr: finished.stderr.replace(/^verbose:.*\r?\n?/gm, '') };
    if (finished.exitCode !== 0) {
      throw new Error(`actionlint ${describe(report)}`);
    }
    const linted = actionlintFinished(finished.stderr);
    const unlinted = batch.filter((path) => !linted.has(path));
    if (unlinted.length > 0) {
      throw new Error(
        `actionlint finished no lint of ${unlinted.map((path) => quote(path)).join(', ')}: ${describe(report)}`,
      );
    }
  }

  // --strict-collection fails on a file zizmor cannot parse. Without it the
  // file is dropped with a warning and the run reports no findings for a
  // workflow it never read. The config is named so ZIZMOR_CONFIG in the
  // environment cannot swap it. The run is online when gh has a token,
  // because some audits read the pinned actions' repositories, and
  // ZIZMOR_OFFLINE forces offline. With no token the run passes --offline,
  // because zizmor left to find none drops to offline mode with a warning the
  // gate never prints. The input is .github, which holds the workflows and any
  // composite action under .github/actions. --collect=all turns zizmor's
  // ignore handling off, so no .gitignore, exclude file or global excludes
  // file can hide one of them, and the input never reaches node_modules or
  // .claude/worktrees. zizmor prints `completed <file>` for each input at
  // RUST_LOG's info level, so the row proves every tracked workflow was
  // audited.
  const token = process.env['ZIZMOR_OFFLINE'] !== undefined ? undefined : await githubToken('gh');
  const online = token !== undefined;
  const mode = online ? [] : ['--offline'];
  const env: Readonly<Record<string, string>> = online ? { GH_TOKEN: token, RUST_LOG: 'info' } : { RUST_LOG: 'info' };
  const audited = await expectClean(
    `zizmor (${online ? 'online' : 'offline'})`,
    [
      await binary('zizmor'),
      '--no-progress',
      '--strict-collection',
      '--config',
      ZIZMOR_CONFIG,
      ...mode,
      '--collect=all',
      '.github',
    ],
    env,
  );
  const completed = zizmorCompleted(audited.stderr);
  const unaudited = workflowFiles.filter((path) => !completed.has(path));
  if (completed.size === 0 || unaudited.length > 0) {
    throw new Error(
      `zizmor completed ${files(completed.size)}, and these tracked workflows were not among them: ${unaudited.map((path) => quote(path)).join(', ') || 'none'}`,
    );
  }
  const held = await inheritedCallsHeld(await binary('zizmor'));
  return `${files(workflowFiles.length)}, zizmor ${online ? 'online' : 'offline'} over ${files(completed.size)}, ${String(held)} secrets-inherit ${held === 1 ? 'call' : 'calls'} held`;
}

/** What a workflow that passes `secrets: inherit` may call: this repository's reusable workflows, by either path. */
const INHERIT_CALLEES: readonly string[] = ['./.github/workflows/', 'zachthedev/.github/.github/workflows/'];

/**
 * The entries the committed zizmor config's `secrets-inherit` ignore list
 * names, each a file or a file:line:column.
 *
 * @throws When the config does not parse, or the list holds anything but strings
 */
async function inheritWaivers(): Promise<string[]> {
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(await Bun.file(ZIZMOR_CONFIG).text());
  } catch (error: unknown) {
    throw new Error(
      `${ZIZMOR_CONFIG} does not parse as the gate reads YAML, so its secrets-inherit waivers are unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
      { cause: error },
    );
  }
  const ignore = (parsed as { rules?: { 'secrets-inherit'?: { ignore?: unknown } } } | null)?.rules?.['secrets-inherit']
    ?.ignore;
  if (ignore === undefined) {
    return [];
  }
  if (!Array.isArray(ignore) || !ignore.every((entry) => typeof entry === 'string')) {
    throw new Error(`${ZIZMOR_CONFIG} rules.secrets-inherit.ignore is not a list of file names`);
  }
  return ignore;
}

/**
 * How many jobs pass `secrets: inherit`, each held to {@link INHERIT_CALLEES},
 * with a call in every file the committed zizmor.yml waives.
 *
 * @remarks
 * zizmor runs with no config and `--no-ignores`, which drops inline ignore
 * comments too, so it reports every such job, waived or not. ZIZMOR_CONFIG
 * would name a config against --no-config, so it is removed. zizmor exits 10
 * to 14 when it reports findings.
 *
 * @throws When zizmor fails, a job calls anything else, or a waived file holds no call
 */
async function inheritedCallsHeld(zizmor: string): Promise<number> {
  const finished = await run(
    [
      zizmor,
      '--no-progress',
      '--offline',
      '--no-config',
      '--no-ignores',
      '--strict-collection',
      '--format',
      'json',
      '--collect=all',
      '.github',
    ],
    { ZIZMOR_CONFIG: undefined },
  );
  if (finished.exitCode !== 0 && (finished.exitCode < 10 || finished.exitCode > 14)) {
    throw new Error(`zizmor with no config ${describe(finished)}`);
  }
  let calls: ReturnType<typeof inheritedCalls>;
  try {
    calls = inheritedCalls(finished.stdout);
  } catch (error: unknown) {
    throw new Error(
      `zizmor with no config: ${error instanceof Error ? error.message : String(error)}. It ${describe(finished)}`,
      { cause: error },
    );
  }
  const refused = inheritedCallFindings(calls, INHERIT_CALLEES, await inheritWaivers());
  if (refused.length > 0) {
    throw new Error(refused.join('\n'));
  }
  return calls.length;
}

/* ///// renovate ///// */

// The presets and this repository's own config, tracked files alone, so the
// row counts what it validated and fails on none.
async function renovate(): Promise<string> {
  const configs = (await trackedFiles(':(glob)renovate/*.json', '.github/renovate.json')).sort();
  if (configs.length === 0) {
    throw new Error('no Renovate preset or config is tracked, so the row checks nothing');
  }
  for (const config of configs) {
    // The validator exits 0 on a config it never validated, so the success
    // line is required beside the exit code.
    const finished = await run([...jsTool('renovate-config-validator'), '--strict', '--no-global', config]);
    const validated = plain(`${finished.stdout}\n${finished.stderr}`).includes('Config validated successfully');
    if (finished.exitCode !== 0 || !validated) {
      throw new Error(`renovate-config-validator over ${quote(config)} ${describe(finished)}`);
    }
  }
  return files(configs.length);
}

/* ///// The rows ///// */

// The two rows that run the repository's own code come last: lint runs
// eslint.config.ts, and scripts:test runs the gate's own tests. So every row
// that reads a config runs before any code could write one. A single row run
// keeps this order.
export const rows: readonly Row[] = [
  {
    name: 'tools',
    checks: 'the root, mise.toml and mise.lock against scripts/tools.ts, then the install',
    check: tools,
  },
  {
    name: 'typecheck',
    checks:
      'tsc --version reporting the major package.json pins, then tsc --noEmit over eslint.config.ts, then over scripts with its own tsconfig.json, counting the files each read, and every tracked TypeScript file read by one',
    check: typecheck,
  },
  {
    name: 'format',
    checks:
      'prettier --check over every tracked file Prettier formats, with .prettierrc and .prettierignore alone and no .editorconfig, and no Prettier ignore comment in any of them',
    check: format,
  },
  {
    name: 'toml',
    checks: 'taplo fmt --check over every tracked TOML file, each one proven checked',
    check: toml,
  },
  {
    name: 'workflows',
    checks:
      'actionlint over every tracked workflow with ShellCheck behind a stand-in that refuses its directives, both proven by a canary, then zizmor over .github with nothing ignored and each workflow proven audited, online when gh has a token and offline otherwise, then every job passing secrets: inherit held to a reusable workflow of zachthedev/.github',
    check: workflows,
  },
  {
    name: 'renovate',
    checks: 'renovate-config-validator over every tracked preset and .github/renovate.json, counting them',
    check: renovate,
  },
  {
    name: 'lint',
    checks:
      'eslint over the tree with eslint.config.ts alone and no warnings allowed, counting the files it linted, and no gate/visible-reason report a directive turned off, then eslint again with --no-inline-config and no report from a rule that reads comments',
    check: lint,
    runsCode: true,
  },
  {
    name: 'scripts:test',
    checks:
      "bun test over the gate's own scripts/*.test.ts, every program they start a stand-in, counting the tests and failing when every one was skipped",
    check: scriptsTest,
    runsCode: true,
  },
];

/* ///// The run ///// */

const color = process.stdout.isTTY && process.env['NO_COLOR'] === undefined;
const dim = (text: string): string => (color ? styleText('dim', text) : text);
const glyph = (ok: boolean): string => (color ? styleText(ok ? 'green' : 'red', ok ? '✓' : '✗') : ok ? '✓' : '✗');
const width = Math.max(...rows.map((row) => row.name.length));
const seconds = (started: number): string => `${((performance.now() - started) / 1000).toFixed(1)}s`;

async function main(): Promise<number> {
  if (process.argv.includes('--rows')) {
    console.log(dim('rows'));
    console.log();
    for (const row of rows) {
      console.log(`  ${row.name.padEnd(width)}  ${row.checks}`);
    }
    return 0;
  }

  const requested = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  const unknown = requested.filter((name) => !rows.some((row) => row.name === name));
  if (unknown.length > 0) {
    console.error(
      `no such row: ${printable(unknown.map((name) => quote(name)).join(', '))}. bun run check:rows lists them.`,
    );
    return 1;
  }
  const selected = requested.length === 0 ? rows : rows.filter((row) => requested.includes(row.name));

  console.log(dim('check'));
  console.log();

  // The preflight refuses a config a row's tool would read in place of the one
  // the row names, so no row runs beside one. It comes before any other
  // process the gate starts but git, and a single row run passes through it
  // too. A row that runs the repository's code can write any file the
  // preflight reads, so the preflight runs again after one, before any later
  // row.
  const preflight = async (after: string): Promise<boolean> => {
    const refused = [...(await trackedFindings()), ...(await startupFindings())];
    if (refused.length > 0) {
      console.log(`  ${glyph(false)} ${'preflight'.padEnd(width)}  ${dim(after)}`);
      console.log(`    ${printable(refused.join('\n')).split('\n').join('\n    ')}`);
    }
    return refused.length === 0;
  };
  if (!(await preflight('no row ran'))) {
    return 1;
  }
  const failures: string[] = [];
  for (const [index, row] of selected.entries()) {
    const started = performance.now();
    try {
      const note = await row.check();
      console.log(
        `  ${glyph(true)} ${row.name.padEnd(width)}  ${dim(seconds(started))}${note === undefined ? '' : `  ${dim(printable(note))}`}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ${glyph(false)} ${row.name.padEnd(width)}  ${dim(seconds(started))}`);
      console.log(`    ${printable(message).split('\n').join('\n    ')}`);
      failures.push(row.name);
    }
    if (
      row.runsCode === true &&
      index < selected.length - 1 &&
      !(await preflight(`after ${row.name}, no later row ran`))
    ) {
      failures.push('preflight');
      break;
    }
  }
  console.log(`  ${dim('─'.repeat(width + 12))}`);
  if (failures.length === 0) {
    console.log(`  ${String(selected.length)} checks passed`);
    return 0;
  }
  console.log(`  ${String(failures.length)} of ${String(selected.length)} checks failed: ${failures.join(', ')}`);
  return 1;
}

// Run as a file, the gate runs. Imported, as scripts/check.test.ts does, it
// runs nothing and hands over its rows.
if (import.meta.main) {
  process.exitCode = await main();
}
