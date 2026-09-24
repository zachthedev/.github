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
 * running this file, every package runs from its absolute path under
 * node_modules, every pinned tool resolves through `mise which`, and mise, gh
 * and git start from an absolute PATH entry outside the checkout alone. Every
 * tool that searches for a config runs with its one config named. Before any
 * row, the gate refuses to run beside a tracked env file Bun loads, a tracked
 * `.npmrc`, a tracked path under node_modules, a config a tool would read in
 * place of the one the gate names, a bunfig.toml that holds anything but the
 * install cooldown, anything that would steer how Bun resolves an import, a
 * changed config or ignore file a row reads, an inline waiver, or a root file
 * named like a program. Every row that walks the tree says how many files it
 * checked and fails when that is none.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath, sep } from 'node:path';
import { styleText } from 'node:util';
// Every module imported here reads Bun and node: built-ins alone, so nothing
// under node_modules loads before the preflight in main() refuses a planted
// package. tools.ts imports zod and the format row imports prettier, so each
// loads where a row needs it. github.ts takes every GitHub token out of the
// environment when it loads, before any row starts a process.
import { githubToken } from './github';
import { describe, type Finished, fold, quote, run } from './run';
import {
  ESLINT_CONFIG,
  isTable,
  PRETTIERIGNORE,
  PRETTIERRC,
  quoteValue,
  startupFindings,
  TAPLO_CONFIG,
  trackedFindings,
  TSCONFIG,
  ZIZMOR_CONFIG,
} from './startup';

/** The deadline for one linter or formatter pass over the tree. */
const TOOL_TIMEOUT_MS = 300_000;

/** The Bun running the gate, so every row runs the one `packageManager` pins. */
const BUN = process.execPath;

/**
 * The checkout's node_modules as an absolute path. The gate runs from the
 * root. Bun runs a package.json script named like a relative entry that is
 * missing, and fails with "Module not found" on a missing absolute one.
 */
const PACKAGES = join(process.cwd(), 'node_modules');

/**
 * How many characters of file arguments one command carries. Windows caps a
 * whole command line at 32,767, so a longer list runs in batches.
 */
const ARGUMENT_BUDGET = 24_000;

// ShellCheck reads extra flags from SHELLCHECK_OPTS whatever actionlint's --norc
// says, and one can exclude any finding, so no process the gate starts gets it.
delete process.env['SHELLCHECK_OPTS'];

/** A row of the gate: its name, what it checks, and the check itself. */
interface Row {
  readonly name: string;
  readonly checks: string;
  /** Runs the check. A string it returns prints after the row's time. */
  readonly check: () => string | undefined | Promise<string | undefined>;
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
  const finished = await run(cmd, TOOL_TIMEOUT_MS, env);
  if (finished.exitCode !== 0) {
    throw new Error(`${label} ${describe(finished)}`);
  }
  return finished;
}

/**
 * The environment every git call a row makes runs under: the gate's own, with
 * every inherited `GIT_*` variable removed.
 *
 * @remarks
 * A git hook can export `GIT_DIR` and `GIT_INDEX_FILE`, and either points git
 * at a repository or an index other than the tree the gate runs in. With them
 * gone, git finds the repository from the directory alone.
 */
function gitEnv(): Readonly<Record<string, undefined>> {
  return Object.fromEntries(
    Object.keys(process.env)
      .filter((name) => /^GIT_/i.test(name))
      .map((name) => [name, undefined]),
  );
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
  const finished = await run(['git', 'ls-files', '-z', '--', ...pathspecs], TOOL_TIMEOUT_MS, gitEnv());
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

/** `path` as an absolute path compared without regard to case where the filesystem ignores it. */
function comparable(path: string): string {
  const absolute = resolvePath(path);
  return process.platform === 'win32' || process.platform === 'darwin' ? absolute.toLowerCase() : absolute;
}

/** How a count of files reads in a row's line. */
function files(count: number): string {
  return `${String(count)} ${count === 1 ? 'file' : 'files'}`;
}

/* ///// scripts:test ///// */

// The gate's own tests. Each case starts a stand-in in place of every program
// the gate starts, with a PATH holding the stand-ins alone, so none reaches
// the real gh, git, mise or the network. The row reads bun test's own count,
// and a failure prints the whole report.
async function scriptsTest(): Promise<string> {
  const finished = await run([BUN, 'test', './scripts/'], TOOL_TIMEOUT_MS);
  if (finished.exitCode !== 0) {
    throw new Error(`bun test ./scripts/ ${describe(finished)}`);
  }
  const ran = /^Ran (\d+) tests? across (\d+) files?\./m.exec(`${finished.stdout}\n${finished.stderr}`);
  const tests = Number(ran?.[1] ?? 0);
  if (tests === 0) {
    throw new Error(`bun test ./scripts/ ran no test, so the row checks nothing: ${describe(finished)}`);
  }
  return `${String(tests)} ${tests === 1 ? 'test' : 'tests'} across ${files(Number(ran?.[2] ?? 0))}`;
}

/* ///// Shell values ///// */

/** The shells a workflow step may name: the two actionlint hands ShellCheck, and pwsh. */
const HELD_SHELLS: readonly string[] = ['bash', 'sh', 'pwsh'];

/** Each shell value a parsed workflow sets, with where: its defaults, each job's defaults, and each step. */
function shellValues(workflow: Record<string, unknown>): { where: string; value: unknown }[] {
  const values: { where: string; value: unknown }[] = [];
  const fromDefaults = (holder: Record<string, unknown>, where: string): void => {
    const defaults = holder['defaults'];
    const run = isTable(defaults) ? defaults['run'] : undefined;
    if (isTable(run) && Object.hasOwn(run, 'shell')) {
      values.push({ where, value: run['shell'] });
    }
  };
  fromDefaults(workflow, 'defaults.run');
  const jobs = workflow['jobs'];
  for (const [id, job] of Object.entries(isTable(jobs) ? jobs : {})) {
    if (!isTable(job)) {
      continue;
    }
    fromDefaults(job, `jobs.${id}.defaults.run`);
    const steps = job['steps'];
    for (const [index, step] of (Array.isArray(steps) ? (steps as unknown[]) : []).entries()) {
      if (isTable(step) && Object.hasOwn(step, 'shell')) {
        values.push({ where: `jobs.${id}.steps[${String(index)}]`, value: step['shell'] });
      }
    }
  }
  return values;
}

/**
 * Every shell a tracked workflow names outside {@link HELD_SHELLS}, as
 * findings.
 *
 * @remarks
 * actionlint hands ShellCheck a script only when its shell is bash or sh, or
 * starts with "bash " or "sh ", so a step naming `/bin/bash -e {0}` runs bash
 * with no ShellCheck at all. Each workflow is read as YAML, so an escaped or
 * aliased key reads as the key it decodes to. A file that does not parse is a
 * finding, since the parser here refuses some text actionlint's accepts.
 */
async function shellFindings(): Promise<string[]> {
  const found: string[] = [];
  for (const path of await trackedFiles()) {
    if (!fold(path).startsWith('.github/workflows/')) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = Bun.YAML.parse(await Bun.file(path).text());
    } catch (error: unknown) {
      found.push(
        `${quote(path)} does not parse as YAML here, so the shells it names are unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
      );
      continue;
    }
    if (!isTable(parsed)) {
      found.push(`${quote(path)} is not one YAML mapping, so the shells it names are unknown`);
      continue;
    }
    for (const { where, value } of shellValues(parsed)) {
      if (typeof value !== 'string' || !HELD_SHELLS.includes(value)) {
        found.push(
          `${quote(path)} ${where} sets shell ${quoteValue(value)}, and actionlint runs ShellCheck for bash and sh alone. Name bash, sh or pwsh`,
        );
      }
    }
  }
  return found;
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

// The native TypeScript 7 compiler, called by its alias's path because the
// 6.x `typescript` package that typescript-eslint needs ships a tsc of its
// own. The gate is the only TypeScript here besides eslint.config.ts, which
// the root config reads alone. Each project is named, so tsc never searches
// past the checkout for a config, and scripts/ carries its own, so the root
// one never reaches the gate's module resolution. --listFiles names every file
// the program read, so the row counts the ones from the repository, and fails
// on a tracked TypeScript file that no project read.
async function typecheck(): Promise<string> {
  const root = comparable('.') + sep;
  const counts: number[] = [];
  const checked = new Set<string>();
  for (const [label, project] of [
    ['eslint.config.ts', ['--project', TSCONFIG]],
    ['scripts', ['--project', 'scripts']],
  ] as const) {
    const finished = await run(
      [BUN, join(PACKAGES, '@typescript/native/bin/tsc'), '--noEmit', '--listFiles', ...project],
      TOOL_TIMEOUT_MS,
    );
    const lines = finished.stdout.split(/\r?\n/);
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
  const unread = (await trackedFiles()).filter(
    (path) => /\.[cm]?tsx?$/.test(fold(path)) && !checked.has(comparable(path)),
  );
  if (unread.length > 0) {
    throw new Error(
      `no project reads ${unread.map((path) => quote(path)).join(', ')}, so tsc checks none of ${unread.length === 1 ? 'it' : 'them'}. Add each to a project's include`,
    );
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
}

/** Whether `value`, parsed from ESLint's json output, is one file's result. */
function isLintResult(value: unknown): value is LintResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { filePath?: unknown }).filePath === 'string' &&
    Array.isArray((value as { messages?: unknown }).messages)
  );
}

// The json formatter names every file ESLint linted, so the row counts them
// and prints each problem itself. --config names the one config, so ESLint
// runs no eslint.config.* nearer a file than the root.
async function lint(): Promise<string> {
  const finished = await run(
    [
      BUN,
      join(PACKAGES, 'eslint/bin/eslint.js'),
      '--config',
      ESLINT_CONFIG,
      '.',
      '--max-warnings=0',
      '--format',
      'json',
    ],
    TOOL_TIMEOUT_MS,
  );
  let results: unknown;
  try {
    results = JSON.parse(finished.stdout);
  } catch {
    // No json means ESLint stopped before it linted anything, a config error among them.
    throw new Error(`eslint ${describe(finished)}`);
  }
  if (!Array.isArray(results) || !results.every((result) => isLintResult(result))) {
    throw new Error(`eslint printed json that is not a list of file results: ${describe(finished)}`);
  }
  const problems = results.flatMap((result) =>
    result.messages.map(
      (message) =>
        `${result.filePath}:${String(message.line ?? 0)}:${String(message.column ?? 0)}  ${message.severity === 2 ? 'error' : 'warning'}  ${message.message ?? ''}  ${message.ruleId ?? ''}`,
    ),
  );
  if (finished.exitCode !== 0) {
    throw new Error(
      `eslint exited ${String(finished.exitCode)} over ${files(results.length)}:\n${[...problems, finished.stderr.trim()].filter((line) => line.length > 0).join('\n')}`,
    );
  }
  if (results.length === 0) {
    throw new Error('eslint linted no file, so it checked nothing');
  }
  return files(results.length);
}

/* ///// format ///// */

// Prettier names no file it checked, so the row hands it every tracked file
// Prettier would format, decided by Prettier's own getFileInfo against the one
// ignore file, and counts that list. getFileInfo runs in the gate's process
// and resolves the config nearest each file unless told not to, a package.json
// prettier key and the plugins it names included, so resolveConfig is off.
// .prettierrc names no parser, plugin or override, so the inferred parser is
// the same either way. --ignore-path names .prettierignore alone, so
// .gitignore never narrows it, and --config names the one config, so Prettier
// searches for no other file and a config under a subdirectory never loads.
// --no-editorconfig keeps any .editorconfig from setting an option.
async function format(): Promise<string> {
  const { getFileInfo } = await import('prettier');
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
  for (const batch of batches(checked)) {
    await expectClean('prettier', [
      BUN,
      join(PACKAGES, 'prettier/bin/prettier.cjs'),
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

/** Every path in taplo's `found files ... files=[...]` log line, or undefined when it printed none. */
function taploFound(printed: string): string[] | undefined {
  const line = /found files total=\d+ excluded=\d+ files=\[(.*)\]/.exec(printed);
  if (line === null) {
    return undefined;
  }
  return [...(line[1] ?? '').matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => (match[1] ?? '').replace(/\\(.)/g, '$1'));
}

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
        `taplo checked ${files(reported.size)} of the ${files(batch.length)} handed to it. Not checked: ${missed.join(', ')}. ${TAPLO_CONFIG} decides which it reads`,
      );
    }
  }
  return files(handed.length);
}

/* ///// workflows ///// */

// A workflow whose only finding belongs to ShellCheck. actionlint reads it
// clean on its own and reports SC2086 over the unquoted expansion once
// ShellCheck runs. actionlint exits 0 with ShellCheck absent, and no flag
// changes that, so a clean run over the tree carries weight only after this
// finding came back.
const SHELLCHECK_CANARY = `name: canary
on: push
jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - run: echo $GITHUB_REF
`;
const SHELLCHECK_FINDING = 'SC2086';

async function workflows(): Promise<string> {
  const actionlint = await binary('actionlint');
  const shellcheck = await binary('shellcheck');
  // -pyflakes= because no Windows package manager ships pyflakes, and
  // actionlint skips that pass without a word when it is missing.
  const analyzers = [`-shellcheck=${shellcheck}`, '-pyflakes='];

  const dir = await mkdtemp(join(tmpdir(), 'actionlint-canary-'));
  try {
    const canary = join(dir, 'canary.yml');
    await Bun.write(canary, SHELLCHECK_CANARY);
    const finished = await run([actionlint, ...analyzers, canary], TOOL_TIMEOUT_MS);
    if (!finished.stdout.includes(SHELLCHECK_FINDING)) {
      throw new Error(
        `actionlint found no ${SHELLCHECK_FINDING} in a script that carries one, so ShellCheck never ran. It ${describe(finished)}. Check that ${shellcheck} starts`,
      );
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
    const finished = await run([actionlint, '-verbose', ...analyzers, '--', ...batch], TOOL_TIMEOUT_MS);
    const report = { ...finished, stderr: finished.stderr.replace(/^verbose:.*\r?\n?/gm, '') };
    if (finished.exitCode !== 0) {
      throw new Error(`actionlint ${describe(report)}`);
    }
    const linted = new Set(
      [...finished.stderr.matchAll(/^(?:verbose: )*Found total \d+ errors? in \d+ ms for (.+?)\r?$/gm)].map(
        (match) => match[1] ?? '',
      ),
    );
    const unlinted = batch.filter((path) => !linted.has(path));
    if (unlinted.length > 0) {
      throw new Error(`actionlint finished no lint of ${unlinted.join(', ')}: ${describe(report)}`);
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
  const completed = new Set(
    [...audited.stderr.matchAll(/completed (.+?)\r?$/gm)].map((match) => (match[1] ?? '').replaceAll('\\', '/')),
  );
  const unaudited = workflowFiles.filter((path) => !completed.has(path));
  if (completed.size === 0 || unaudited.length > 0) {
    throw new Error(
      `zizmor completed ${files(completed.size)}, and these tracked workflows were not among them: ${unaudited.join(', ') || 'none'}`,
    );
  }
  const held = await inheritedCallsHeld(await binary('zizmor'));
  return `${files(workflowFiles.length)}, zizmor ${online ? 'online' : 'offline'} over ${files(completed.size)}, ${String(held)} secrets-inherit ${held === 1 ? 'call' : 'calls'} held`;
}

/** What a workflow that passes `secrets: inherit` may call: this repository's reusable workflows, by either path. */
const INHERIT_CALLEES: readonly string[] = ['./.github/workflows/', 'zachthedev/.github/.github/workflows/'];

/** One job zizmor reports passing `secrets: inherit`: its file, the line of its `uses:`, and what it calls. */
interface InheritedCall {
  readonly path: string;
  readonly line: number;
  readonly callee: string;
}

/**
 * The jobs in zizmor's JSON report that pass `secrets: inherit`, read from
 * each finding's primary location.
 *
 * @throws When the report is not the shape zizmor 1.30 prints
 */
function inheritedCalls(report: unknown): InheritedCall[] {
  if (!Array.isArray(report)) {
    throw new Error('zizmor printed json that is not a list of findings');
  }
  const calls: InheritedCall[] = [];
  for (const finding of report as unknown[]) {
    const { ident, locations } = (finding ?? {}) as { ident?: unknown; locations?: unknown };
    if (ident !== 'secrets-inherit') {
      continue;
    }
    const primary = (Array.isArray(locations) ? (locations as unknown[]) : []).find(
      (location) => (location as { symbolic?: { kind?: unknown } }).symbolic?.kind === 'Primary',
    ) as
      | {
          symbolic?: { key?: { Local?: { verbatim_path?: unknown } } };
          concrete?: { feature?: unknown; location?: { start_point?: { row?: unknown } } };
        }
      | undefined;
    const path = primary?.symbolic?.key?.Local?.verbatim_path;
    const row = primary?.concrete?.location?.start_point?.row;
    const feature = primary?.concrete?.feature;
    if (typeof path !== 'string' || typeof row !== 'number' || typeof feature !== 'string') {
      throw new Error('zizmor reported a secrets-inherit finding with no primary file, line and callee');
    }
    calls.push({ path: path.replaceAll('\\', '/'), line: row + 1, callee: feature.replace(/^["']|["']$/g, '') });
  }
  return calls;
}

/**
 * How many jobs pass `secrets: inherit`, each held to {@link INHERIT_CALLEES}.
 *
 * @remarks
 * A secrets-inherit waiver in .github/zizmor.yml binds to a file or a line,
 * not to the workflow a job calls, so pointing a waived job at another
 * repository keeps the waiver and hands that repository every secret. zizmor
 * runs with no config and `--no-ignores`, which drops inline ignore comments
 * too, so it reports every such job, waived or not. It exits 10 to 14 when it
 * reports findings.
 *
 * @throws When zizmor fails or a job calls anything else
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
    TOOL_TIMEOUT_MS,
  );
  if (finished.exitCode !== 0 && (finished.exitCode < 10 || finished.exitCode > 14)) {
    throw new Error(`zizmor with no config ${describe(finished)}`);
  }
  let report: unknown;
  try {
    report = JSON.parse(finished.stdout);
  } catch {
    throw new Error(`zizmor with no config printed no json: ${describe(finished)}`);
  }
  const calls = inheritedCalls(report);
  const stray = calls.filter((call) => !INHERIT_CALLEES.some((prefix) => call.callee.toLowerCase().startsWith(prefix)));
  if (stray.length > 0) {
    throw new Error(
      stray
        .map(
          (call) =>
            `${quote(call.path)} line ${String(call.line)} passes secrets: inherit to ${quote(call.callee)}. Only a reusable workflow of zachthedev/.github takes a caller's secrets`,
        )
        .join('\n'),
    );
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
    const finished = await run(
      [BUN, join(PACKAGES, 'renovate', 'dist', 'config-validator.js'), '--strict', '--no-global', config],
      TOOL_TIMEOUT_MS,
    );
    const validated = `${finished.stdout}\n${finished.stderr}`.includes('Config validated successfully');
    if (finished.exitCode !== 0 || !validated) {
      throw new Error(`renovate-config-validator over ${config} ${describe(finished)}`);
    }
  }
  return files(configs.length);
}

/* ///// The rows ///// */

const rows: readonly Row[] = [
  {
    name: 'scripts:test',
    checks: "bun test over the gate's own scripts/*.test.ts, every program they start a stand-in, counting the tests",
    check: scriptsTest,
  },
  {
    name: 'tools',
    checks: 'the root, mise.toml and mise.lock against scripts/tools.ts, then the install',
    check: tools,
  },
  {
    name: 'typecheck',
    checks:
      'tsc --noEmit over eslint.config.ts, then over scripts with its own tsconfig.json, counting the files each read, and every tracked TypeScript file read by one',
    check: typecheck,
  },
  {
    name: 'lint',
    checks: 'eslint over the tree with eslint.config.ts alone and no warnings allowed, counting the files it linted',
    check: lint,
  },
  {
    name: 'format',
    checks:
      'prettier --check over every tracked file Prettier formats, with .prettierrc and .prettierignore alone and no .editorconfig',
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
      'actionlint over every tracked workflow with ShellCheck proven present, then zizmor over .github with nothing ignored and each workflow proven audited, online when gh has a token and offline otherwise, then every job passing secrets: inherit held to a reusable workflow of zachthedev/.github',
    check: workflows,
  },
  {
    name: 'renovate',
    checks: 'renovate-config-validator over every tracked preset and .github/renovate.json, counting them',
    check: renovate,
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
    console.error(`no such row: ${unknown.join(', ')}. bun run check:rows lists them.`);
    return 1;
  }
  const selected = requested.length === 0 ? rows : rows.filter((row) => requested.includes(row.name));

  console.log(dim('check'));
  console.log();

  // Bun loaded any env file here into this process, ran any preload
  // bunfig.toml names, and resolved this file's imports before this line. A
  // tracked .npmrc steered the install, and a file tracked under node_modules
  // stands in for what bun install would put there. So no row runs beside
  // any of them. This comes before any other process the gate starts, and a
  // single row run passes through it too.
  const refused = [...(await trackedFindings()), ...(await startupFindings()), ...(await shellFindings())];
  if (refused.length > 0) {
    console.log(`  ${glyph(false)} ${'preflight'.padEnd(width)}  ${dim('no row ran')}`);
    console.log(`    ${refused.join('\n    ')}`);
    return 1;
  }
  const failures: string[] = [];
  for (const row of selected) {
    const started = performance.now();
    try {
      const note = await row.check();
      console.log(
        `  ${glyph(true)} ${row.name.padEnd(width)}  ${dim(seconds(started))}${note === undefined ? '' : `  ${dim(note)}`}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ${glyph(false)} ${row.name.padEnd(width)}  ${dim(seconds(started))}`);
      console.log(`    ${message.split('\n').join('\n    ')}`);
      failures.push(row.name);
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

process.exitCode = await main();
