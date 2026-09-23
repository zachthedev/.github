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
 * running this file, every package runs from its path under node_modules,
 * every pinned tool resolves through `mise which`, and mise, gh and git start
 * from an absolute PATH entry outside the checkout alone. Before any row, the
 * gate refuses to run beside a tracked env file Bun loads or a tracked path
 * under node_modules.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { styleText } from 'node:util';
import { describe, run, trackedFindings } from './run';
import { install, lockfileFindings, resolve } from './tools';

/** The deadline for one linter or formatter pass over the tree. */
const TOOL_TIMEOUT_MS = 300_000;

/** The deadline for `gh auth token`, past which the gate reads gh as holding no token. */
const GH_TIMEOUT_MS = 5_000;

/** The Bun running the gate, so every row runs the one `packageManager` pins. */
const BUN = process.execPath;

// Every name gh, zizmor and mise read a GitHub token from is taken out of the
// environment every row's processes inherit. gh's own two are kept aside for
// `gh auth token` alone, so gh answers as it would from the contributor's
// shell, and the workflows row hands its answer to zizmor alone. A locked mise
// install makes no api.github.com request, so no row has a use for mise's.
// CI's gate step carries none of them, so there zizmor runs offline.
const GH_ENVIRONMENT: Readonly<Record<string, string | undefined>> = {
  GH_TOKEN: process.env['GH_TOKEN'],
  GITHUB_TOKEN: process.env['GITHUB_TOKEN'],
};
delete process.env['GH_TOKEN'];
delete process.env['GITHUB_TOKEN'];
delete process.env['ZIZMOR_GITHUB_TOKEN'];
delete process.env['MISE_GITHUB_TOKEN'];
delete process.env['MISE_GITHUB_ENTERPRISE_TOKEN'];
delete process.env['GITHUB_API_TOKEN'];

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
 * map is filled from `mise which` on first use. That resolves installed
 * binaries and checks their versions; it installs nothing.
 */
async function binary(key: string): Promise<string> {
  if (binaries.size === 0) {
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

/** Throws with the process's output when it did not exit 0. */
function expectClean(
  label: string,
  cmd: readonly string[],
  env: Readonly<Record<string, string | undefined>> = {},
): void {
  const finished = run(cmd, TOOL_TIMEOUT_MS, env);
  if (finished.exitCode !== 0) {
    throw new Error(`${label} ${describe(finished)}`);
  }
}

/** A row that runs one package's command from its path under node_modules. */
function packaged(label: string, entry: string, ...args: string[]): () => undefined {
  return () => {
    expectClean(label, [BUN, join('node_modules', entry), ...args]);
  };
}

/* ///// tools ///// */

async function tools(): Promise<undefined> {
  const found = await lockfileFindings();
  if (found.length > 0) {
    throw new Error(found.join('\n'));
  }
  install();
  for (const [key, path] of await resolve()) {
    binaries.set(key, path);
  }
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

/**
 * The token `gh auth token` answers with, for zizmor's online audits, or none.
 * A gh that is missing, fails, prints nothing or outlives
 * {@link GH_TIMEOUT_MS} reads as no token.
 */
function githubToken(): string | undefined {
  const printed = run(['gh', 'auth', 'token'], GH_TIMEOUT_MS, GH_ENVIRONMENT);
  const found = printed.stdout.trim();
  return printed.exitCode === 0 && found.length > 0 ? found : undefined;
}

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
    const finished = run([actionlint, ...analyzers, canary], TOOL_TIMEOUT_MS);
    if (!finished.stdout.includes(SHELLCHECK_FINDING)) {
      throw new Error(
        `actionlint found no ${SHELLCHECK_FINDING} in a script that carries one, so ShellCheck never ran. It ${describe(finished)}. Check that ${shellcheck} starts`,
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  expectClean('actionlint', [actionlint, ...analyzers]);

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
  // .claude/worktrees.
  const token = process.env['ZIZMOR_OFFLINE'] !== undefined ? undefined : githubToken();
  const online = token !== undefined;
  const mode = online ? [] : ['--offline'];
  const env: Readonly<Record<string, string>> = online ? { GH_TOKEN: token } : {};
  expectClean(
    `zizmor (${online ? 'online' : 'offline'})`,
    [
      await binary('zizmor'),
      '--no-progress',
      '--strict-collection',
      '--config',
      '.github/zizmor.yml',
      ...mode,
      '--collect=all',
      '.github',
    ],
    env,
  );
  return `zizmor ${online ? 'online' : 'offline'}`;
}

/* ///// renovate ///// */

function renovate(): undefined {
  const files = [...new Bun.Glob('renovate/*.json').scanSync('.'), '.github/renovate.json'].sort();
  for (const file of files) {
    // The validator exits 0 on a config it never validated, so the success
    // line is required beside the exit code.
    const finished = run(
      [BUN, join('node_modules', 'renovate', 'dist', 'config-validator.js'), '--strict', '--no-global', file],
      TOOL_TIMEOUT_MS,
    );
    const validated = `${finished.stdout}\n${finished.stderr}`.includes('Config validated successfully');
    if (finished.exitCode !== 0 || !validated) {
      throw new Error(`renovate-config-validator over ${file} ${describe(finished)}`);
    }
  }
}

/* ///// The rows ///// */

const rows: readonly Row[] = [
  {
    name: 'tools',
    checks: 'the root, mise.toml and mise.lock against scripts/tools.ts, then the install',
    check: tools,
  },
  {
    name: 'typecheck',
    checks: 'tsc --noEmit over the gate',
    // The native TypeScript 7 compiler, called by its alias's path because the 6.x `typescript` package that
    // typescript-eslint needs ships a tsc of its own.
    check: packaged('tsc', '@typescript/native/bin/tsc', '--noEmit'),
  },
  {
    name: 'lint',
    checks: 'eslint over the tree with no warnings allowed',
    check: packaged('eslint', 'eslint/bin/eslint.js', '.', '--max-warnings=0'),
  },
  {
    name: 'format',
    checks: 'prettier --check over the tree',
    check: packaged('prettier', 'prettier/bin/prettier.cjs', '--check', '.'),
  },
  {
    name: 'toml',
    checks: 'taplo fmt --check over every TOML file .taplo.toml names',
    // The config is named, so TAPLO_CONFIG in the environment cannot swap it for
    // one that matches no file, which checks nothing and exits 0.
    check: async (): Promise<undefined> => {
      expectClean('taplo', [await binary('taplo'), 'fmt', '--check', '--config', '.taplo.toml']);
    },
  },
  {
    name: 'workflows',
    checks:
      'actionlint with ShellCheck proven present, then zizmor over .github with nothing ignored, online when gh has a token and offline otherwise',
    check: workflows,
  },
  {
    name: 'renovate',
    checks: 'renovate-config-validator over every preset and .github/renovate.json',
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

  // Bun loaded any env file here into this process before it ran, and a file
  // tracked under node_modules stands in for what bun install would put
  // there, so no row runs beside either. This comes before any other process
  // the gate starts.
  const tracked = trackedFindings();
  if (tracked.length > 0) {
    console.log(`  ${glyph(false)} ${'tracked'.padEnd(width)}  ${dim('no row ran')}`);
    console.log(`    ${tracked.join('\n    ')}`);
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
