import { accessSync, constants, readFileSync, realpathSync, statSync } from 'node:fs';
import { delimiter, extname, isAbsolute, join, sep } from 'node:path';

/** The deadline for the one git call the tracked-file check makes. */
const GIT_TIMEOUT_MS = 60_000;

/**
 * The files Bun 1.4.2 loads into the environment of `bun run` from the
 * directory it starts in: the plain pair and each mode's pair. Bun matches
 * them without regard to case where the filesystem does.
 */
const BUN_ENV_FILES: readonly string[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
];

/** The file bun install reads a registry and its scopes from, in the directory it starts in. */
const NPMRC = '.npmrc';

/**
 * Every file name Prettier 3 searches for a config, beside the one
 * `.prettierrc` the gate names with `--config`. A `.js`, `.ts`, `.mjs`,
 * `.mts`, `.cjs` or `.cts` one runs as code, and any of them can name a
 * plugin, which runs too.
 */
const PRETTIER_CONFIGS: readonly string[] = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.json5',
  '.prettierrc.js',
  'prettier.config.js',
  '.prettierrc.ts',
  'prettier.config.ts',
  '.prettierrc.mjs',
  'prettier.config.mjs',
  '.prettierrc.mts',
  'prettier.config.mts',
  '.prettierrc.cjs',
  'prettier.config.cjs',
  '.prettierrc.cts',
  'prettier.config.cts',
  '.prettierrc.toml',
  'package.yaml',
];

/** The one Prettier config the gate reads, at the root. */
export const PRETTIERRC = '.prettierrc';

/** How many tracked paths under node_modules a finding names before it counts the rest. */
const NODE_MODULES_SHOWN = 5;

/** Characters that change how a line reads without printing: bidi controls, zero-width marks, line and paragraph separators, and interlinear annotation marks. */
const INVISIBLE = /[\u061C\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]/g;

/**
 * `value`, read from a file the gate checks, for a finding: JSON-encoded, so a
 * control character prints as an escape, with every {@link INVISIBLE}
 * character escaped too, and cut short.
 */
export function quote(value: string): string {
  return JSON.stringify(value.slice(0, 200)).replace(
    INVISIBLE,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

/**
 * Whether the `package.json` at `path` carries a top-level `prettier` key. A
 * file that does not parse is read as carrying one, so it is refused rather
 * than passed.
 */
function packageNamesPrettier(path: string): boolean {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return typeof parsed === 'object' && parsed !== null && Object.hasOwn(parsed, 'prettier');
  } catch {
    // Unreadable or malformed: refused, since Prettier's reading of it is unknown.
    return true;
  }
}

/** The last segment of a `/`-separated path, lowercased. */
function baseName(path: string): string {
  return (path.split('/').pop() ?? path).toLowerCase();
}

/**
 * Every tracked file the gate refuses to run beside, as findings: an env file
 * Bun loads here, an `.npmrc`, any path under a `node_modules` directory at
 * any depth, and every Prettier config but the root `.prettierrc`, a
 * `package.json` `prettier` key included.
 *
 * @remarks
 * Bun loads an env file into the gate's environment before the gate runs, so
 * a committed one sets variables for every process the gate starts. bun
 * install fetches from the registry an `.npmrc` names, and CI's install runs
 * before the gate. `bun install` keeps a committed file under `node_modules`
 * in place of what it would install, `bun run` puts `node_modules/.bin` ahead
 * of PATH, and a nearer `node_modules` shadows the installed package for the
 * files beside it. The format row and the commit hook pass `--config
 * .prettierrc`, which stops Prettier's search, so another config loads only
 * where Prettier runs without the flag. The gate calls this before any other
 * process. A contributor's own untracked env file or `.npmrc` passes. git
 * starts with its two config switches and nothing else, so no variable an env
 * file set reaches it.
 */
export function trackedFindings(): string[] {
  // icase, because Bun on Windows and macOS opens `.ENV` as `.env`, and a
  // literal pathspec matches case-sensitively even under core.ignorecase.
  const startupFiles = [...BUN_ENV_FILES, NPMRC].map((name) => `:(icase,literal)${name}`);
  const prettierFiles = [...PRETTIER_CONFIGS, 'package.json'].map((name) => `:(icase,glob)**/${name}`);
  const listed = run(
    ['git', 'ls-files', '-z', '--', ':(icase,glob)**/node_modules/**', ...startupFiles, ...prettierFiles],
    GIT_TIMEOUT_MS,
    // /dev/null is the spelling Git for Windows reads as an empty file too.
    { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
    { inherit: false },
  );
  if (listed.exitCode !== 0) {
    return [`git could not list the tracked files the gate refuses: it ${describe(listed)}`];
  }
  const paths = listed.stdout.split('\0').filter((path) => path.length > 0);
  const modules = paths.filter((path) => /(^|\/)node_modules\//i.test(path));
  const found: string[] = [];
  for (const path of paths.filter((entry) => !modules.includes(entry))) {
    const name = baseName(path);
    if (name === 'package.json') {
      if (packageNamesPrettier(path)) {
        found.push(`${quote(path)} carries a prettier key, and ${PRETTIERRC} is the one Prettier config`);
      }
    } else if (PRETTIER_CONFIGS.includes(name)) {
      if (path.toLowerCase() !== PRETTIERRC) {
        found.push(`${quote(path)} is a Prettier config, and ${PRETTIERRC} at the root is the one Prettier config`);
      }
    } else if (name === NPMRC) {
      found.push(
        `${quote(path)} is tracked, and bun install fetches from the registry it names. Remove it from the index: git rm --cached -- ${path}`,
      );
    } else {
      found.push(
        `${quote(path)} is tracked, and Bun loads it into the environment of every bun run here. Remove it from the index: git rm --cached -- ${path}`,
      );
    }
  }
  if (modules.length > 0) {
    const shown = modules.slice(0, NODE_MODULES_SHOWN).map((path) => quote(path));
    const more = modules.length > NODE_MODULES_SHOWN ? ` and ${String(modules.length - NODE_MODULES_SHOWN)} more` : '';
    found.push(
      `${shown.join(', ')}${more} ${modules.length === 1 ? 'is' : 'are'} tracked under a node_modules directory. bun install keeps what it finds there, bun run puts node_modules/.bin ahead of PATH, and Bun resolves an import from the nearest node_modules first. Remove each from the index with git rm -r --cached`,
    );
  }
  return found;
}

/**
 * The programs the gate and its hooks start by name rather than by path.
 *
 * @remarks
 * A file at the repository root named like one of these, with any extension
 * or none, is refused by the tools row. {@link resolveProgram} never reads
 * the working directory, so none of them can stand in for the program either
 * way. The gate starts gh, git and mise by name, the hooks start bun and
 * bunx, and lefthook's install script starts node.
 */
export const PROGRAM_NAMES: readonly string[] = ['bun', 'bunx', 'gh', 'git', 'mise', 'node'];

/**
 * Whether `name`'s part before its first dot, compared without regard to
 * case, is a program name. Windows runs a file for a bare name under any
 * extension PATHEXT lists, and a machine can list more than the defaults.
 */
export function isProgramName(name: string): boolean {
  const stem = name.toLowerCase().split('.')[0] ?? '';
  return PROGRAM_NAMES.includes(stem);
}

/** Whether `path` is a file this process can start. */
function isRunnable(path: string): boolean {
  try {
    if (!statSync(path).isFile()) {
      return false;
    }
    if (process.platform !== 'win32') {
      accessSync(path, constants.X_OK);
    }
    return true;
  } catch {
    // A missing or unreadable candidate is the ordinary miss of a PATH search.
    return false;
  }
}

/**
 * The repository root in its canonical form: the working directory, where
 * `bun run` starts every gate script.
 *
 * @remarks
 * The native realpath resolves every link and junction and expands a Windows
 * 8.3 short name, which the portable realpath leaves in place.
 */
function repositoryRoot(): string {
  return realpathSync.native(process.cwd());
}

/**
 * Whether the PATH entry `directory` resolves to the repository root or a
 * directory inside it, comparing canonical paths without regard to case where
 * the filesystem ignores it.
 *
 * @remarks
 * An entry whose canonical path cannot be resolved counts as inside, so it is
 * never searched: a missing directory holds no program, and one the system
 * cannot resolve is not one the gate can place.
 */
function isInsideRepository(directory: string, root: string): boolean {
  let resolved: string;
  try {
    resolved = realpathSync.native(directory);
  } catch {
    return true;
  }
  const fold = (path: string): string =>
    process.platform === 'win32' || process.platform === 'darwin' ? path.toLowerCase() : path;
  const base = fold(root);
  const target = fold(resolved);
  return target === base || target.startsWith(base.endsWith(sep) ? base : base + sep);
}

/**
 * The absolute path of `program`, found through PATH alone.
 *
 * @remarks
 * Only absolute PATH entries outside the repository are searched. Windows
 * searches the working directory ahead of PATH for a bare name, and Bun's own
 * lookup reads an empty or `.` entry as the working directory, so a file at
 * the repository root named like the program would run in its place. `bun
 * run` puts the checkout's `node_modules/.bin` ahead of PATH as an absolute
 * entry, where a planted file would run the same way. On Windows each
 * PATHEXT extension is tried in PATHEXT's order, as cmd.exe tries them,
 * unless the name already carries one. A program given as an absolute path is
 * returned as it is, and a relative path is never resolved.
 *
 * @returns The path to start, or undefined when no absolute PATH entry that
 * resolves outside the repository holds it
 */
export function resolveProgram(program: string): string | undefined {
  if (isAbsolute(program)) {
    return program;
  }
  if (program.includes('/') || program.includes('\\')) {
    return undefined;
  }
  const windows = process.platform === 'win32';
  const extensions = windows
    ? (process.env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').filter((extension) => extension.length > 0)
    : [];
  const carries = extensions.some((extension) => extension.toLowerCase() === extname(program).toLowerCase());
  const names = windows && !carries ? extensions.map((extension) => program + extension) : [program];
  const root = repositoryRoot();
  for (const entry of (process.env['PATH'] ?? '').split(delimiter)) {
    const directory = windows ? entry.replace(/^"(.*)"$/, '$1') : entry;
    if (!isAbsolute(directory) || isInsideRepository(directory, root)) {
      continue;
    }
    for (const name of names) {
      const candidate = join(directory, name);
      if (isRunnable(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * One finished process: what it printed and how it ended.
 */
export interface Finished {
  /** The exit code, or -1 when the process was killed at the timeout. */
  readonly exitCode: number;
  /** Standard output, decoded as UTF-8. */
  readonly stdout: string;
  /** Standard error, decoded as UTF-8. */
  readonly stderr: string;
  /** True when the process ran past `timeoutMs` and was killed. */
  readonly timedOut: boolean;
}

/** How {@link run} starts a process, beyond its command, deadline and variables. */
export interface RunOptions {
  /**
   * When true the process writes to the gate's own stdout and stderr, so a
   * report it prints reaches the log, and the captured streams are empty.
   */
  readonly show?: boolean;
  /**
   * When false the process starts with the given variables alone and
   * inherits nothing from the gate's environment.
   */
  readonly inherit?: boolean;
}

/**
 * Runs one command to completion with its output captured.
 *
 * @remarks
 * Every process the gate starts goes through here, so every one carries a
 * deadline. A tool that hangs is a red row, not a hung gate.
 *
 * The program starts from the path {@link resolveProgram} finds, never from
 * the working directory. A program no absolute PATH entry holds is a failed
 * process, exit 127 with the reason as its stderr, and so is a spawn error, so
 * a missing prerequisite reads like any other red row rather than a crash of
 * the gate.
 *
 * @param cmd - The program and its arguments, the program first
 * @param timeoutMs - The deadline, after which the process is killed
 * @param env - Variables added to the gate's own environment for this process,
 * or its whole environment when `options.inherit` is false. Each replaces
 * every inherited spelling of its name, because Windows reads a name without
 * regard to case and a second spelling in the block can win. A variable given
 * as undefined is removed, in every spelling
 * @returns What the process printed and how it ended
 */
export function run(
  cmd: readonly string[],
  timeoutMs: number,
  env: Readonly<Record<string, string | undefined>> = {},
  options: RunOptions = {},
): Finished {
  const show = options.show === true;
  const replaced = new Set(Object.keys(env).map((name) => name.toUpperCase()));
  const merged: Record<string, string> = {};
  if (options.inherit !== false) {
    for (const [name, value] of Object.entries(process.env)) {
      if (value !== undefined && !replaced.has(name.toUpperCase())) {
        merged[name] = value;
      }
    }
  }
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined) {
      merged[name] = value;
    }
  }
  const [program = '', ...args] = cmd;
  const path = resolveProgram(program);
  if (path === undefined) {
    return {
      exitCode: 127,
      stdout: '',
      stderr: `${program}: no absolute PATH entry holds it, and the working directory is never searched`,
      timedOut: false,
    };
  }
  let finished: ReturnType<typeof Bun.spawnSync>;
  try {
    finished = Bun.spawnSync({
      cmd: [path, ...args],
      cwd: process.cwd(),
      env: merged,
      stdout: show ? 'inherit' : 'pipe',
      stderr: show ? 'inherit' : 'pipe',
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 127, stdout: '', stderr: `${program}: ${message}`, timedOut: false };
  }
  const timedOut: boolean = finished.exitedDueToTimeout === true;
  return {
    exitCode: timedOut ? -1 : finished.exitCode,
    stdout: finished.stdout?.toString() ?? '',
    stderr: finished.stderr?.toString() ?? '',
    timedOut,
  };
}

/**
 * The text a failed process leaves for the row's message: its exit and both
 * streams, trimmed, or a note that it printed nothing.
 */
export function describe(finished: Finished): string {
  const printed: string = [finished.stdout, finished.stderr].join('\n').trim();
  const ending: string = finished.timedOut ? 'was killed at its deadline' : `exited ${String(finished.exitCode)}`;
  return `${ending} saying: ${printed.length === 0 ? 'nothing' : printed}`;
}
