/**
 * The gate: every check a contributor can run locally, in one command.
 *
 * @remarks
 * `bun run check` runs the rows in order and prints one line per row.
 * `bun run check <row>` runs the named rows alone. `bun run check:rows`
 * prints the rows and runs nothing, which is the list CONTRIBUTING.md points
 * at. CI's gate job runs this same script, so a green run here is a green
 * run there.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { styleText } from 'node:util';
import { describe, run } from './run';
import { install, lockfileFindings, resolve } from './tools';

/** The deadline for one linter or formatter pass over the tree. */
const TOOL_TIMEOUT_MS = 300_000;

// The two tokens CI hands the gate are read once and taken out of the
// environment every row's processes inherit. GH_TOKEN is the job token; the
// zizmor row is the one that uses it. MISE_GITHUB_TOKEN is the same token as
// jdx/mise-action exports it; the mise install in the tools row is the one
// that uses it, for its attestation reads. No other row's process sees
// either.
const ghToken: string | undefined = process.env['GH_TOKEN'];
delete process.env['GH_TOKEN'];
const miseToken: string | undefined = process.env['MISE_GITHUB_TOKEN'];
delete process.env['MISE_GITHUB_TOKEN'];

/** A row of the gate: its name, what it checks, and the check itself. */
interface Row {
  readonly name: string;
  readonly checks: string;
  readonly check: () => void | Promise<void>;
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
function expectClean(label: string, cmd: readonly string[], env: Readonly<Record<string, string>> = {}): void {
  const finished = run(cmd, TOOL_TIMEOUT_MS, env);
  if (finished.exitCode !== 0) {
    throw new Error(`${label} ${describe(finished)}`);
  }
}

/* ///// tools ///// */

async function tools(): Promise<void> {
  const found = await lockfileFindings();
  if (found.length > 0) {
    throw new Error(found.join('\n'));
  }
  install(miseToken);
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

/** The GitHub token for zizmor's online audits: the CI token, else gh's, else none. */
function githubToken(): string | undefined {
  if (ghToken !== undefined && ghToken.length > 0) {
    return ghToken;
  }
  const printed = run(['gh', 'auth', 'token'], TOOL_TIMEOUT_MS);
  const found = printed.stdout.trim();
  return printed.exitCode === 0 && found.length > 0 ? found : undefined;
}

async function workflows(): Promise<void> {
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
  // environment cannot swap it. Online when a token is at hand, because some
  // audits read the pinned actions' repositories; offline otherwise, so no
  // contributor needs a token, and ZIZMOR_OFFLINE forces offline.
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
      '.github/workflows',
    ],
    env,
  );
}

/* ///// renovate ///// */

function renovate(): void {
  const files = [...new Bun.Glob('renovate/*.json').scanSync('.'), '.github/renovate.json'].sort();
  for (const file of files) {
    // The validator exits 0 on a config it never validated, so the success
    // line is required beside the exit code.
    const finished = run(
      ['bun', 'node_modules/renovate/dist/config-validator.js', '--strict', '--no-global', file],
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
    checks: 'mise.toml and mise.lock against scripts/tools.ts, then the install',
    check: tools,
  },
  {
    name: 'typecheck',
    checks: 'tsc --noEmit over the gate',
    // The native TypeScript 7 compiler, called by its alias's path because the 6.x `typescript` package that
    // typescript-eslint needs ships a tsc of its own.
    check: () => {
      expectClean('tsc', ['bun', 'node_modules/@typescript/native/bin/tsc', '--noEmit']);
    },
  },
  {
    name: 'lint',
    checks: 'eslint over the tree with no warnings allowed',
    check: () => {
      expectClean('eslint', ['bun', 'node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0']);
    },
  },
  {
    name: 'format',
    checks: 'prettier --check over the tree',
    check: () => {
      expectClean('prettier', ['bunx', '--no-install', 'prettier', '--check', '.']);
    },
  },
  {
    name: 'toml',
    checks: 'taplo fmt --check over every TOML file',
    check: async () => {
      expectClean('taplo', [await binary('taplo'), 'fmt', '--check']);
    },
  },
  {
    name: 'workflows',
    checks: 'actionlint with ShellCheck proven present, then zizmor, over .github/workflows',
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
  const failures: string[] = [];
  for (const row of selected) {
    const started = performance.now();
    try {
      await row.check();
      console.log(
        `  ${glyph(true)} ${row.name.padEnd(width)}  ${dim(`${((performance.now() - started) / 1000).toFixed(1)}s`)}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `  ${glyph(false)} ${row.name.padEnd(width)}  ${dim(`${((performance.now() - started) / 1000).toFixed(1)}s`)}`,
      );
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
