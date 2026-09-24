/**
 * The files Bun and the gate's tools read before they run, held against what
 * the gate expects: the tracked files a tool would read in place of the one
 * the gate names, bunfig.toml, what resolves the gate's own imports, the
 * configs and ignore files the rows read, and the root's program names.
 *
 * @remarks
 * The gate calls {@link trackedFindings} and {@link startupFindings} before
 * any row, so this file and everything it imports read Bun and `node:`
 * built-ins alone. A package imported here would load from node_modules before
 * the check that refuses a planted one. The comparison helpers here serve
 * tools.ts too, which holds mise.toml and mise.lock the same way. What differs
 * between repositories of the set lives in expected.ts.
 */

import type { Dirent } from 'node:fs';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import {
  EXPECTED_ESLINT_CONFIG,
  EXPECTED_PROJECT_CONFIGS,
  EXPECTED_UNTYPED_SOURCES,
  EXPECTED_ZIZMOR_CONFIG,
  OWN_PRETTIERIGNORE_PATTERNS,
} from './expected';
import { describe, fold, isProgramName, quote, run, treeKillProgram } from './run';

/** The file pinning a version for every tool mise installs. */
export const PINS = 'mise.toml';

/** The file holding a checksum, a url and a backend per platform for every pinned tool. */
export const LOCK = 'mise.lock';

/** The manifest Bun and bun install read. */
const PACKAGE_JSON = 'package.json';

/** The project's TypeScript config, which the typecheck row names with `--project`. */
export const TSCONFIG = 'tsconfig.json';

/** The one Prettier config, which every Prettier run names with `--config`. */
export const PRETTIERRC = '.prettierrc';

/** The one Prettier ignore file, which every Prettier run names with `--ignore-path`. */
export const PRETTIERIGNORE = '.prettierignore';

/** The one ESLint config, which the lint row and the commit hook name with `--config`. */
export const ESLINT_CONFIG = 'eslint.config.ts';

/** The one commitlint config, which the commit hook and CI's commits job name with `--config`. */
const COMMITLINT_CONFIG = 'commitlint.config.js';

/** The one taplo config, which the toml row names with `--config`. */
export const TAPLO_CONFIG = '.taplo.toml';

/** The one zizmor config, which the workflows row names with `--config`. */
export const ZIZMOR_CONFIG = '.github/zizmor.yml';

/** The one lefthook config, which lefthook reads first of every name it searches. */
const LEFTHOOK_CONFIG = 'lefthook.yml';

/** The root files a repository carries under a program's name: the lockfile Bun writes and the two mise files. */
const PROGRAM_NAMED_FILES: readonly string[] = ['bun.lock', PINS, LOCK];

/* ///// Comparing parsed files ///// */

/** Whether `value`, parsed from TOML or JSON, is a table. */
export function isTable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether two values parsed from TOML or JSON are the same: equal primitives, equal arrays item by item, tables with the same keys and equal values. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isTable(a) || isTable(b)) {
    if (!isTable(a) || !isTable(b)) {
      return false;
    }
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameValue(a[key], b[key]))
    );
  }
  return a === b;
}

/** Any value read from a file the gate checks, for a finding, through {@link quote}. */
export function quoteValue(value: unknown): string {
  if (value === undefined) {
    return 'nothing';
  }
  return quote(typeof value === 'string' ? value : JSON.stringify(value));
}

/** The entries of `path`, or none when it is a file rather than a directory. */
export async function directoryEntries(path: string): Promise<Dirent[]> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOTDIR') {
      return [];
    }
    throw error;
  }
}

/**
 * Every key that appears twice within one object of `text`, which is JSON
 * that parses.
 *
 * @remarks
 * Strings are skipped whole, and a key is decoded, so an escaped spelling
 * counts as the key it spells.
 */
function repeatedKeys(text: string): string[] {
  const repeated: string[] = [];
  // One entry per open object or array; an array has no keys.
  const open: (Set<string> | undefined)[] = [];
  let at = 0;
  while (at < text.length) {
    const character = text[at];
    if (character === '"') {
      let end = at + 1;
      while (text[end] !== '"') {
        end += text[end] === '\\' ? 2 : 1;
      }
      const token = text.slice(at, end + 1);
      at = end + 1;
      while (/\s/.test(text[at] ?? '')) {
        at++;
      }
      const keys = open.at(-1);
      if (keys !== undefined && text[at] === ':') {
        const key = String(JSON.parse(token));
        if (keys.has(key)) {
          repeated.push(key);
        }
        keys.add(key);
      }
      continue;
    }
    if (character === '{') {
      open.push(new Set());
    } else if (character === '[') {
      open.push(undefined);
    } else if (character === '}' || character === ']') {
      open.pop();
    }
    at++;
  }
  return repeated;
}

/**
 * `text` parsed as JSON, refusing a key repeated within one object.
 *
 * @remarks
 * Bun's package.json and tsconfig reader keeps the first of two equal keys,
 * and a JSON parser the last, so the gate refuses a file with a repeated key
 * rather than read it two ways.
 *
 * @throws When the text does not parse, or repeats a key
 */
function parseJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text);
  const repeated = repeatedKeys(text);
  if (repeated.length > 0) {
    throw new Error(
      `it repeats ${repeated.map((key) => quote(key)).join(', ')} within one object, and Bun reads the first where a JSON parser reads the last`,
    );
  }
  return parsed;
}

/* ///// The tracked files ///// */

/** The deadline for the one git call that lists the tracked files. */
const GIT_TIMEOUT_MS = 60_000;

/** How many tracked paths under node_modules a finding names before it counts the rest. */
const NODE_MODULES_SHOWN = 5;

/**
 * The files Bun 1.4.2 loads into the environment of `bun run` from the
 * directory it starts in: the plain pair and each mode's pair.
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

/** A program that reads a file it finds by name: the names it reads, and the one the gate names for it. */
interface ConfigSearch {
  /** What a refused file is, read after "is". */
  readonly what: string;
  /** Every path the program reads, as a pattern over the folded path: `*` is any run within one segment, and a leading `**` slash is any directory, the root included. */
  readonly paths: readonly string[];
  /** The one path the gate names for the program, which passes in this exact spelling alone. */
  readonly named?: string;
  /** What the program does with a refused file, read after "and". */
  readonly reads: string;
  /**
   * True for a file a contributor keeps on their own machine, refused only
   * when tracked. Every other file is refused on disk too, tracked or not.
   */
  readonly personal?: true;
}

/**
 * Every program the gate, its hooks or an install start that reads a file it
 * finds by name, with every name it reads, measured on the pinned versions.
 *
 * @remarks
 * Each program runs with its one file named where it takes a flag for it:
 * Prettier with `--config .prettierrc` and `--no-editorconfig`, ESLint with
 * `--config eslint.config.ts`, commitlint with `--config commitlint.config.js`,
 * taplo with `--config .taplo.toml` and zizmor with `--config
 * .github/zizmor.yml`. Every other name is refused, so a run without the flag,
 * from an editor or by hand, reads the same file. actionlint and lefthook
 * take no config flag here, so their other names are refused alone. The
 * patterns reach past each program's own search where that costs nothing, to
 * any directory and any extension. The root `.config` directory, which mise,
 * lefthook and cosmiconfig read, is refused whole on its own.
 */
const CONFIG_SEARCHES: readonly ConfigSearch[] = [
  {
    what: 'an env file Bun loads',
    paths: BUN_ENV_FILES.map((name) => `**/${name}`),
    reads: 'Bun loads it into the environment of every bun run started beside it',
    personal: true,
  },
  {
    what: 'an .npmrc',
    paths: ['**/.npmrc'],
    reads: 'bun install fetches from the registry it names',
    personal: true,
  },
  {
    what: 'a package.yaml',
    paths: ['**/package.yaml'],
    reads: 'Prettier and commitlint read a config from it, and package.json is the one manifest',
  },
  {
    what: 'a Prettier config',
    paths: ['**/.prettierrc', '**/.prettierrc.*', '**/prettier.config.*'],
    named: PRETTIERRC,
    reads: 'Prettier loads the nearest one for a file when no config is named, running it when it is a module',
  },
  {
    what: 'an ESLint config',
    paths: ['**/eslint.config.*'],
    named: ESLINT_CONFIG,
    reads: 'ESLint runs the nearest one for each file it lints when no config is named',
  },
  {
    what: 'a commitlint config',
    paths: ['**/.commitlintrc', '**/.commitlintrc.*', '**/commitlint.config.*'],
    named: COMMITLINT_CONFIG,
    reads: 'commitlint reads the first of its names it finds when no config is named, running it when it is a module',
  },
  {
    what: 'a taplo config',
    paths: ['**/.taplo.toml', '**/taplo.toml'],
    named: TAPLO_CONFIG,
    reads: 'taplo reads the first it finds from its working directory upward when no config is named',
  },
  {
    what: 'a zizmor config',
    paths: ['**/zizmor.yml', '**/zizmor.yaml'],
    named: ZIZMOR_CONFIG,
    reads: 'zizmor reads one from .github or the root when no config is named, and a rule in it can turn an audit off',
  },
  {
    what: 'an actionlint config',
    paths: ['.github/actionlint.yaml', '.github/actionlint.yml'],
    reads: 'actionlint reads it, and it can ignore any finding by pattern, ShellCheck included',
  },
  {
    what: 'a lefthook config',
    paths: ['lefthook', 'lefthook.*', '.lefthook', '.lefthook.*'],
    named: LEFTHOOK_CONFIG,
    reads: 'lefthook reads it in place of lefthook.yml when that file is missing',
  },
  {
    what: 'a local lefthook config',
    paths: ['lefthook-local', 'lefthook-local.*', '.lefthook-local', '.lefthook-local.*'],
    reads: 'lefthook merges it over lefthook.yml, where it can replace any hook job. .gitignore lists it',
    personal: true,
  },
  {
    what: "Claude Code's local settings",
    paths: ['.claude/settings.local.json'],
    reads: "Claude Code reads it as one contributor's own settings. .gitignore lists it",
    personal: true,
  },
];

/** `glob`, one of a {@link ConfigSearch}'s paths, as a pattern over a whole folded path. */
function searchPattern(glob: string): RegExp {
  const anywhere = glob.startsWith('**/');
  const body = (anywhere ? glob.slice(3) : glob)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*');
  return new RegExp(`^${anywhere ? '(?:.*/)?' : ''}${body}$`);
}

/**
 * The keys a program reads its config from in any `package.json`, and the
 * program.
 */
const PACKAGE_KEYS: readonly (readonly [string, string])[] = [
  ['prettier', 'Prettier'],
  ['commitlint', 'commitlint'],
  ['cosmiconfig', "commitlint's cosmiconfig"],
];

/** Every way the tracked `package.json` at `path` carries a program's config, as findings. */
function packageKeyFindings(path: string): string[] {
  let parsed: unknown;
  try {
    parsed = parseJson(readFileSync(path, 'utf8'));
  } catch (error: unknown) {
    // Unreadable, malformed or read two ways: refused, since what each program reads from it is unknown.
    return [
      `${quote(path)} does not parse as the gate reads it, so the config keys Prettier and commitlint read from it are unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
    ];
  }
  const manifest = isTable(parsed) ? parsed : {};
  const found = PACKAGE_KEYS.filter(([key]) => Object.hasOwn(manifest, key)).map(
    ([key, program]) =>
      `${quote(path)} carries a ${key} key, and ${program} reads its config from it. The one config is a file the gate names`,
  );
  if (Object.hasOwn(manifest, PATCHES_KEY)) {
    found.push(
      `${quote(path)} carries a ${PATCHES_KEY} key, and bun install applies each patch it names over the package bun.lock pins, so a tool a row runs can change while its pin stays the same. Remove it`,
    );
  }
  return found;
}

/**
 * The `package.json` key bun install reads patches from. A patch bun.lock
 * records with no entry here is not applied, so the manifest is the file read.
 */
const PATCHES_KEY = 'patchedDependencies';

/** The names Bun and typescript-eslint read a project's TypeScript options from. */
const PROJECT_CONFIG_NAMES: readonly string[] = ['tsconfig.json', 'jsconfig.json'];

/** The compiler options that send a bare import somewhere other than node_modules, folded. */
const REDIRECTING_OPTIONS: readonly string[] = ['paths', 'baseurl'];

/**
 * The file an `extends` entry in the config at `from` names, or why the gate
 * refuses it: a path relative to the config, as written or with `.json` added,
 * whose canonical path lies inside the checkout.
 *
 * @remarks
 * A package's config or a file outside the checkout is one this read cannot
 * hold, and a missing one is refused rather than read as nothing, so each is
 * a finding.
 */
function extendedConfig(from: string, target: unknown): { readonly file: string } | { readonly refused: string } {
  if (typeof target !== 'string' || !/^\.\.?[\\/]/.test(target)) {
    return {
      refused: `names ${quoteValue(target)} in extends, and the gate follows a path relative to the config alone, never a package or an absolute path`,
    };
  }
  const directory = dirname(from);
  const file = [resolve(directory, target), resolve(directory, `${target}.json`)].find((candidate) =>
    existsSync(candidate),
  );
  if (file === undefined) {
    return { refused: `names ${quote(target)} in extends, and no such file exists` };
  }
  const inside = relative(realpathSync.native('.'), realpathSync.native(file));
  if (inside.startsWith('..') || isAbsolute(inside)) {
    return { refused: `names ${quote(target)} in extends, and it resolves outside the checkout` };
  }
  return { file };
}

/**
 * Every way the project config at `config`, or a config its `extends` chain
 * reads, sets an option in {@link REDIRECTING_OPTIONS} or reaches a config
 * the gate cannot read or does not hold, as findings. `file` is the config
 * read at this step, and `seen` the ones read before it, so a cycle ends.
 *
 * @remarks
 * Bun applies `paths` and `baseUrl` to every import in the directory below the
 * config, node_modules code included, so under Bun a bare package name a
 * commit hook's tool imports resolves to repository code. `extends` is
 * one path or a list, and the gate follows every entry. Each entry names
 * scripts/tsconfig.json or a config expected.ts holds, so a held chain holds
 * only held files, and an option such as `noCheck` never arrives through an
 * unheld base. The set's project configs are plain JSON, so a comment is
 * refused with any other text JSON does not parse. A key is compared through {@link fold}, and a file that
 * repeats a key is refused, so no spelling Bun reads differently passes.
 */
function redirectFindings(config: string, file: string, seen: Set<string>): string[] {
  const at = resolve(file);
  if (seen.has(at)) {
    return [];
  }
  seen.add(at);
  const shown =
    file === config ? quote(config) : `${quote(config)}, through ${quote(relative('.', at).replaceAll('\\', '/'))},`;
  let parsed: unknown;
  try {
    parsed = parseJson(readFileSync(at, 'utf8'));
  } catch (error: unknown) {
    return [
      `${shown} does not parse as plain JSON, so whether Bun redirects an import through it is unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
    ];
  }
  if (!isTable(parsed)) {
    return [];
  }
  const found: string[] = [];
  const options = parsed['compilerOptions'];
  if (isTable(options)) {
    for (const key of Object.keys(options).filter((name) => REDIRECTING_OPTIONS.includes(fold(name)))) {
      found.push(
        `${shown} sets compilerOptions.${key}, and Bun applies it to every import below it, node_modules code included, so a bare package name can resolve to repository code. Alias through package.json imports (# names)`,
      );
    }
  }
  if (Object.hasOwn(parsed, 'extends')) {
    const extended = parsed['extends'];
    for (const target of Array.isArray(extended) ? extended : [extended]) {
      const next = extendedConfig(at, target);
      if (!('file' in next)) {
        found.push(`${shown} ${next.refused}`);
        continue;
      }
      const held = relative(realpathSync.native('.'), realpathSync.native(next.file)).replaceAll('\\', '/');
      if (held !== SCRIPTS_TSCONFIG && !Object.hasOwn(EXPECTED_PROJECT_CONFIGS, held)) {
        found.push(
          `${shown} names ${quoteValue(target)} in extends, and the gate does not hold ${quote(held)}, so a change to it reaches the typecheck and lint rows unseen. Hold it in scripts/expected.ts, or fold it into the config`,
        );
        continue;
      }
      found.push(...redirectFindings(config, next.file, seen));
    }
  }
  return found;
}

/**
 * Every finding against the project config at `path`: one the gate does not
 * hold is refused, and one it holds is read through its `extends` chain.
 *
 * @remarks
 * typescript-eslint reads the project config nearest each file it lints, so
 * one the gate does not hold changes what the lint row reports.
 */
function projectConfigFindings(path: string): string[] {
  if (path !== SCRIPTS_TSCONFIG && !Object.hasOwn(EXPECTED_PROJECT_CONFIGS, path)) {
    return [
      `${quote(path)} is a TypeScript project config the gate does not hold, and typescript-eslint reads the nearest one for each file it lints while Bun applies its paths and baseUrl to every import below it. Hold it in scripts/expected.ts, or remove it`,
    ];
  }
  return redirectFindings(path, path, new Set());
}

/**
 * The directory names a version control system keeps its own data in.
 * Prettier's CLI skips a file it is handed under one without a word, while
 * its getFileInfo accepts it, so the format row would count a file it never
 * checked.
 */
const VCS_DIRECTORIES: readonly string[] = ['.git', '.sl', '.svn', '.hg', '.jj'];

/**
 * The root directories the lint and format rows skip: ESLint's globalIgnores
 * and .prettierignore name each. A checkout fills them locally, and a file
 * force-added there is tracked like any other, which the product can import.
 */
const SKIPPED_DIRECTORIES: readonly string[] = ['dist', 'coverage', '.claude/worktrees'];

/**
 * A JavaScript or declaration file, by the end of its folded name: `.js`,
 * `.jsx`, `.mjs`, `.cjs`, `.d.ts`, `.d.mts`, `.d.cts`, and a declaration for
 * another extension such as `.d.css.ts`.
 */
const UNTYPED_SOURCE = /\.(?:[cm]?jsx?|d\.(?:[^./]+\.)?[cm]?ts)$/;

/** The directory GitHub reads workflows from, which reads one whose name ends in lowercase `.yml` here. */
const WORKFLOWS = '.github/workflows';

/**
 * An inline zizmor waiver, which zizmor honors in any file it audits. Spaces
 * and case are allowed to differ, so a spelling zizmor might read never
 * passes.
 */
const ZIZMOR_IGNORE_COMMENT = /zizmor\s*:\s*ignore\s*\[/i;

/**
 * The `shell:` values a workflow may name. actionlint hands ShellCheck a
 * script whose shell is bash or sh, and pwsh is the one other shell the set
 * writes, so any other value runs a script no linter reads.
 */
const WORKFLOW_SHELLS: readonly string[] = ['bash', 'sh', 'pwsh'];

/**
 * Every `shell:` value in the workflow at `path` outside
 * {@link WORKFLOW_SHELLS}, as findings: under the workflow's `defaults.run`,
 * a job's `defaults.run`, or a step.
 *
 * @remarks
 * actionlint skips ShellCheck for a value such as `/bin/bash -e {0}`
 * although bash runs the script, so a value is held to the exact names. Bun's
 * YAML reader refuses some text actionlint's accepts, so a workflow it cannot
 * read is a finding rather than a pass.
 */
function shellFindings(path: string, text: string): string[] {
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(text);
  } catch (error: unknown) {
    return [
      `${quote(path)} does not parse as the gate reads YAML, so its shell values are unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
    ];
  }
  if (!isTable(parsed)) {
    return [`${quote(path)} is not one YAML mapping as the gate reads it, so its shell values are unknown`];
  }
  const shells: (readonly [string, unknown])[] = [];
  const defaultShell = (where: string, holder: unknown): void => {
    const defaults = isTable(holder) ? holder['defaults'] : undefined;
    const run = isTable(defaults) ? defaults['run'] : undefined;
    if (isTable(run) && Object.hasOwn(run, 'shell')) {
      shells.push([`${where}defaults.run.shell`, run['shell']]);
    }
  };
  defaultShell('', parsed);
  const jobs = parsed['jobs'];
  for (const [id, job] of isTable(jobs) ? Object.entries(jobs) : []) {
    defaultShell(`jobs.${id}.`, job);
    const steps = isTable(job) ? job['steps'] : undefined;
    for (const [index, step] of (Array.isArray(steps) ? (steps as unknown[]) : []).entries()) {
      if (isTable(step) && Object.hasOwn(step, 'shell')) {
        shells.push([`jobs.${id}.steps[${String(index)}].shell`, step['shell']]);
      }
    }
  }
  return shells
    .filter(([, value]) => typeof value !== 'string' || !WORKFLOW_SHELLS.includes(value))
    .map(
      ([where, value]) =>
        `${quote(path)} sets ${where} to ${quoteValue(value)}, and actionlint hands ShellCheck a bash or sh script alone. Use ${WORKFLOW_SHELLS.join(', ')}`,
    );
}

/**
 * Every way the tracked file at `path` falls outside what the workflows and
 * format rows read, as findings: a workflow whose path is not
 * `.github/workflows/<name>.yml` exactly, a workflow `shell:` value outside
 * {@link WORKFLOW_SHELLS}, an inline zizmor waiver under `.github`, a path
 * under a version control directory or one of {@link SKIPPED_DIRECTORIES},
 * and a JavaScript or declaration file expected.ts does not name.
 *
 * @remarks
 * actionlint and zizmor read a workflow by its lowercase `.yml` name alone,
 * so a `.YML` or `.yaml` one passes both unread. A zizmor waiver belongs in
 * the held zizmor.yml, where changing it is a gate change. A ShellCheck
 * directive is refused by scripts/shellcheck.ts, which reads each script as
 * ShellCheck does.
 */
function rowScopeFindings(path: string, segments: readonly string[]): string[] {
  const found: string[] = [];
  const folded = segments.join('/');
  const directory = segments.slice(0, -1).join('/');
  const present = segments[0] === '.github' && existsSync(path);
  const text = present ? readFileSync(path, 'utf8') : '';
  if (directory === WORKFLOWS && /\.ya?ml$/.test(folded)) {
    if (!(path.startsWith(`${WORKFLOWS}/`) && path.endsWith('.yml'))) {
      found.push(
        `${quote(path)} is a workflow outside ${WORKFLOWS}/<name>.yml, and actionlint and zizmor read that spelling alone. Rename it`,
      );
    }
    if (present) {
      found.push(...shellFindings(path, text));
    }
  }
  if (ZIZMOR_IGNORE_COMMENT.test(text)) {
    found.push(
      `${quote(path)} carries a zizmor ignore comment, and zizmor waives the audit it names. A waiver is an entry in ${ZIZMOR_CONFIG}, which the gate holds whole`,
    );
  }
  const vcs = segments.slice(0, -1).find((segment) => VCS_DIRECTORIES.includes(segment));
  if (vcs !== undefined) {
    found.push(
      `${quote(path)} sits under a ${vcs} directory, and Prettier skips a file there without a word, so the format row would count a file it never checked. Move it`,
    );
  }
  const skipped = SKIPPED_DIRECTORIES.find((directory) => folded.startsWith(`${directory}/`));
  if (skipped !== undefined) {
    found.push(
      `${quote(path)} is tracked under ${skipped}/, which the lint and format rows skip, so no row checks it while the product can still import it. Remove it from the index with git rm --cached`,
    );
  }
  if (UNTYPED_SOURCE.test(folded) && !EXPECTED_UNTYPED_SOURCES.includes(path)) {
    found.push(
      `${quote(path)} is JavaScript or a declaration file, which tsc never checks, and ESLint lints no .jsx. Write it as TypeScript, or name it in scripts/expected.ts`,
    );
  }
  return found;
}

/** The variables git starts with, and nothing else: no system or global config. */
const GIT_ENVIRONMENT: Readonly<Record<string, string>> = {
  GIT_CONFIG_NOSYSTEM: '1',
  // /dev/null is the spelling Git for Windows reads as an empty file too.
  GIT_CONFIG_GLOBAL: '/dev/null',
};

/** The paths one `git ls-files` call lists, split, or a finding when git fails. */
async function listFiles(args: readonly string[], what: string): Promise<string[] | string> {
  const listed = await run(['git', 'ls-files', '-z', ...args], GIT_TIMEOUT_MS, GIT_ENVIRONMENT, { inherit: false });
  if (listed.exitCode !== 0) {
    return `git could not list the ${what} the gate refuses: it ${describe(listed)}`;
  }
  return [...new Set(listed.stdout.split('\0').filter((path) => path.length > 0))];
}

/**
 * A finding when git's work tree is not this checkout, or undefined when it
 * is, compared by canonical path.
 *
 * @remarks
 * git passes over a `.git` directory it cannot read, an empty one among them,
 * and uses the first repository above it, where `git ls-files` lists that
 * repository's files without a word. A `.git` file it cannot read fails
 * instead.
 */
async function topLevelFinding(): Promise<string | undefined> {
  const finished = await run(['git', 'rev-parse', '--show-toplevel'], GIT_TIMEOUT_MS, GIT_ENVIRONMENT, {
    inherit: false,
  });
  const top = finished.stdout.trim();
  if (finished.exitCode !== 0 || top.length === 0) {
    return `git could not name the work tree it reads: it ${describe(finished)}`;
  }
  let same: boolean;
  try {
    same = realpathSync.native(top) === realpathSync.native('.');
  } catch {
    // A top directory that cannot be resolved is not this checkout.
    same = false;
  }
  return same
    ? undefined
    : `git reads the work tree at ${quote(top)}, not this checkout, so every file it lists belongs to another repository. A .git here that git cannot read, such as an empty directory, sends it to one above. Run the gate from the root of a clone`;
}

/**
 * Every file in the tree the gate refuses to run beside, as findings: a file
 * a program in {@link CONFIG_SEARCHES} reads in place of the one the gate
 * names, a project config the gate does not hold or one that redirects a bare
 * import, a config key or `patchedDependencies` in any tracked
 * `package.json`, a tracked path under a
 * `node_modules` directory, a `node_modules` directory on disk below the root,
 * and a tracked file outside what the workflows and format rows read.
 *
 * @remarks
 * git lists nothing until it names this checkout as its work tree, and a
 * work tree anywhere else is the one finding. It then lists the tracked files
 * once and the untracked ones on disk once, the ignored ones included,
 * outside the root node_modules and Claude Code's worktrees.
 * The gate compares each name through {@link fold}, since git's `icase`
 * pathspec magic folds ASCII alone. A config that changes what a row reports
 * is refused on disk, tracked or not, so a local gate agrees with CI, and a
 * personal file is refused only when tracked. git starts with its two config
 * switches and nothing else, so no variable an env file set reaches it. Bun
 * loads an env file into the gate's environment before the gate runs, so a
 * committed one sets variables for every process the gate starts. bun install
 * fetches from the registry an `.npmrc` names, and CI's install runs before
 * the gate. `bun install` keeps a committed file under `node_modules` in place
 * of what it would install, `bun run` puts `node_modules/.bin` ahead of PATH,
 * and a nearer `node_modules` shadows the installed package for the files
 * beside it.
 */
export async function trackedFindings(): Promise<string[]> {
  const top = await topLevelFinding();
  if (top !== undefined) {
    return [top];
  }
  const tracked = await listFiles([], 'tracked files');
  const untracked = await listFiles(
    ['--others', '--exclude=/node_modules/', '--exclude=/.claude/worktrees/'],
    'untracked files',
  );
  if (typeof tracked === 'string' || typeof untracked === 'string') {
    return [tracked, untracked].filter((entry) => typeof entry === 'string');
  }
  const trackedSet = new Set(tracked);
  const searches = CONFIG_SEARCHES.map((search) => ({ ...search, patterns: search.paths.map(searchPattern) }));
  const found: string[] = [];
  const modules: string[] = [];
  const nested = new Set<string>();
  for (const path of [...tracked, ...untracked.filter((entry) => !trackedSet.has(entry))]) {
    const isTracked = trackedSet.has(path);
    const segments = path.split('/').map(fold);
    // node_modules itself too: a tracked link by that name stands in for the whole directory.
    const at = segments.indexOf('node_modules');
    if (at >= 0) {
      if (isTracked) {
        modules.push(path);
      } else if (at > 0) {
        nested.add(
          path
            .split('/')
            .slice(0, at + 1)
            .join('/'),
        );
      }
      continue;
    }
    const folded = segments.join('/');
    const search = searches.find(
      (entry) =>
        (isTracked || entry.personal !== true) &&
        path !== entry.named &&
        entry.patterns.some((pattern) => pattern.test(folded)),
    );
    if (search !== undefined) {
      const remove = search.personal === true ? 'Remove it from the index with git rm --cached' : 'Remove it';
      found.push(`${quote(path)} is ${search.what}, and ${search.reads}. ${remove}`);
    }
    const base = segments.at(-1) ?? '';
    if (PROJECT_CONFIG_NAMES.includes(base)) {
      found.push(...projectConfigFindings(path));
    }
    if (isTracked) {
      if (base === PACKAGE_JSON && existsSync(path)) {
        found.push(...packageKeyFindings(path));
      }
      found.push(...rowScopeFindings(path, segments));
    }
  }
  if (modules.length > 0) {
    const shown = modules.slice(0, NODE_MODULES_SHOWN).map((path) => quote(path));
    const more = modules.length > NODE_MODULES_SHOWN ? ` and ${String(modules.length - NODE_MODULES_SHOWN)} more` : '';
    found.push(
      `${shown.join(', ')}${more} ${modules.length === 1 ? 'is' : 'are'} tracked as or under a node_modules directory. bun install keeps what it finds there, bun run puts node_modules/.bin ahead of PATH, and Bun resolves an import from the nearest node_modules first. Remove each from the index with git rm -r --cached`,
    );
  }
  if (nested.size > 0) {
    const directories = [...nested];
    const shown = directories.slice(0, NODE_MODULES_SHOWN).map((path) => quote(path));
    const more =
      directories.length > NODE_MODULES_SHOWN ? ` and ${String(directories.length - NODE_MODULES_SHOWN)} more` : '';
    found.push(
      `${shown.join(', ')}${more} ${directories.length === 1 ? 'is a node_modules directory' : 'are node_modules directories'} below the root. Bun, tsc and typescript-eslint resolve a bare import from the nearest node_modules first, so each replaces the installed package for the files beside it, and CI's checkout holds none. Remove each`,
    );
  }
  return found;
}

/* ///// The files Bun reads before the gate ///// */

/** The file Bun reads its settings from, in the directory it starts in. */
const BUNFIG = 'bunfig.toml';

/** The directory holding the gate's scripts. */
const SCRIPTS = 'scripts';

/**
 * The gate's own TypeScript config. Bun resolves a module a gate script
 * imports through the tsconfig.json nearest to the script, with no merge, so
 * this one keeps the root config away from the gate.
 */
const SCRIPTS_TSCONFIG = `${SCRIPTS}/tsconfig.json`;

/** What {@link SCRIPTS_TSCONFIG} holds, compared whole: no `paths`, `baseUrl` or `extends`. */
const EXPECTED_SCRIPTS_TSCONFIG = {
  compilerOptions: {
    target: 'es2025',
    module: 'esnext',
    moduleResolution: 'bundler',
    types: ['bun'],
    strict: true,
    noUncheckedIndexedAccess: true,
    noImplicitOverride: true,
    exactOptionalPropertyTypes: true,
    noPropertyAccessFromIndexSignature: true,
    verbatimModuleSyntax: true,
    noEmit: true,
    skipLibCheck: true,
  },
  include: ['*.ts'],
} as const;

/**
 * The names Bun reads under a script's directory to resolve its imports:
 * another tsconfig or jsconfig, a package scope, and a `node_modules` that
 * shadows the installed one.
 */
const RESOLUTION_NAMES: readonly string[] = ['tsconfig.json', 'jsconfig.json', 'package.json', 'node_modules'];

/**
 * What {@link BUNFIG} holds, compared whole: the install cooldown and nothing
 * else.
 *
 * @remarks
 * Bun reads the file on every `bun <file>`, `bun run` and `bun test` started
 * in the checkout, and no flag turns that off. A top-level `preload` runs a
 * module before the gate's first line, a `[test]` preload runs one before
 * every test, and a `[define]` table rewrites values in the code Bun runs. The
 * file is committed because Renovate's lock file maintenance runs
 * `bun install` in a container with no user-level config.
 */
const EXPECTED_BUNFIG = { install: { minimumReleaseAge: 259_200 } } as const;

/** Every way {@link BUNFIG} differs from {@link EXPECTED_BUNFIG}, as findings. */
async function bunfigFindings(): Promise<string[]> {
  const file = Bun.file(BUNFIG);
  if (!(await file.exists())) {
    return [`${BUNFIG} is missing from the root, and it holds the install cooldown`];
  }
  let parsed: unknown;
  try {
    parsed = Bun.TOML.parse(await file.text());
  } catch (error: unknown) {
    return [`${BUNFIG} does not parse: ${quote(error instanceof Error ? error.message : String(error))}`];
  }
  if (!isTable(parsed)) {
    return [`${BUNFIG} is not a table`];
  }
  const found: string[] = [];
  for (const key of Object.keys(parsed)) {
    if (key !== 'install') {
      found.push(
        `${BUNFIG} carries ${quote(key)}, and it holds [install] minimumReleaseAge alone. Bun runs a preload and applies a define before the gate's first line`,
      );
    }
  }
  const install = parsed['install'];
  if (!isTable(install)) {
    found.push(`${BUNFIG} carries no [install] table, and it holds the install cooldown`);
    return found;
  }
  for (const key of Object.keys(install)) {
    if (key !== 'minimumReleaseAge') {
      found.push(`${BUNFIG} [install] carries ${quote(key)}, and it holds minimumReleaseAge alone`);
    }
  }
  if (!sameValue(install['minimumReleaseAge'], EXPECTED_BUNFIG.install.minimumReleaseAge)) {
    found.push(
      `${BUNFIG} [install] minimumReleaseAge is ${quoteValue(install['minimumReleaseAge'])}, and it must be ${String(EXPECTED_BUNFIG.install.minimumReleaseAge)}`,
    );
  }
  return found;
}

/**
 * Every file and directory under `path`, links not followed. A `node_modules`
 * directory is listed and not entered, since one under `scripts/` is refused
 * whole.
 */
async function walk(path: string): Promise<Dirent[]> {
  const entries = await directoryEntries(path);
  const found: Dirent[] = [...entries];
  for (const entry of entries) {
    if (entry.isDirectory() && fold(entry.name) !== 'node_modules') {
      found.push(...(await walk(join(entry.parentPath, entry.name))));
    }
  }
  return found;
}

/**
 * The findings against what Bun reads to resolve the gate's own imports:
 * {@link SCRIPTS_TSCONFIG} differing from {@link EXPECTED_SCRIPTS_TSCONFIG},
 * and any other {@link RESOLUTION_NAMES} entry under `scripts/`.
 */
async function scriptsFindings(): Promise<string[]> {
  const found = await heldWholeFindings({
    path: SCRIPTS_TSCONFIG,
    parse: parseJson,
    expected: EXPECTED_SCRIPTS_TSCONFIG,
    missing: "it keeps the root tsconfig.json away from the gate's imports",
    differs: "Its paths, baseUrl and extends redirect the gate's imports",
  });
  for (const entry of await walk(SCRIPTS)) {
    const path = join(entry.parentPath, entry.name).replaceAll('\\', '/');
    if (RESOLUTION_NAMES.includes(fold(entry.name)) && fold(path) !== SCRIPTS_TSCONFIG) {
      found.push(`${quote(path)} is one Bun reads to resolve a gate script's imports, and ${SCRIPTS} holds none`);
    }
  }
  return found;
}

/** The `package.json` tables that name the packages bun install puts under node_modules. */
const DEPENDENCY_KEYS: readonly string[] = ['dependencies', 'devDependencies', 'optionalDependencies'];

/**
 * Every package the root {@link PACKAGE_JSON} names that the checkout's
 * `node_modules` lacks, or holds through a link out of the checkout, as
 * findings.
 *
 * @remarks
 * Bun resolves a bare import from the nearest `node_modules` holding the
 * package, so a checkout that lacks one loads a parent directory's copy, and
 * with no `node_modules` at all Bun tries to install it at run time. Either
 * way the code that runs is not the version bun.lock pins. The gate imports
 * zod and prettier, eslint.config.ts and commitlint.config.js import their
 * plugins, and each is refused here before any row loads it.
 */
async function installFindings(): Promise<string[]> {
  let manifest: unknown;
  try {
    manifest = parseJson(await Bun.file(PACKAGE_JSON).text());
  } catch (error: unknown) {
    // Missing, malformed or read two ways: refused, since which packages Bun must find is unknown.
    return [
      `${PACKAGE_JSON} does not parse as the gate reads it, so which packages node_modules must hold is unknown: ${quote(error instanceof Error ? error.message : String(error))}`,
    ];
  }
  const names = DEPENDENCY_KEYS.flatMap((key) => {
    const table = isTable(manifest) ? manifest[key] : undefined;
    return isTable(table) ? Object.keys(table) : [];
  });
  const modules = resolve('node_modules');
  const found: string[] = [];
  for (const name of names) {
    let real: string;
    try {
      real = realpathSync.native(join(modules, name, PACKAGE_JSON));
    } catch {
      // Missing, or a link to nothing: either way the checkout does not hold the package.
      found.push(
        `${quote(name)} is missing from node_modules, and Bun then loads a copy from a parent directory's node_modules or installs one at run time, neither the version bun.lock pins. Run bun install`,
      );
      continue;
    }
    const inside = relative(realpathSync.native('.'), real);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      found.push(
        `${quote(name)} in node_modules leads out of the checkout, to ${quote(real)}, so what loads is not this checkout's install. Run bun install`,
      );
    }
  }
  return found;
}

/* ///// The files the rows and hooks read ///// */

/**
 * What {@link PRETTIERRC} holds, compared whole. `--config` stops Prettier's
 * search for any other config, and a `plugins` entry here would still load a
 * module, so the file holds formatting options alone.
 */
const EXPECTED_PRETTIERRC = { singleQuote: true, printWidth: 120 } as const;

/**
 * The patterns every repository's {@link PRETTIERIGNORE} holds, beside the
 * ones expected.ts adds, each anchored at the root: the two files
 * release-please writes, the {@link SKIPPED_DIRECTORIES}, and every personal
 * file {@link CONFIG_SEARCHES} names at the root. `bun run format` walks the
 * tree past .gitignore, so it never rewrites another worktree, build output
 * or personal settings, and a pattern skips exactly what the gate refuses to
 * track.
 */
const SHARED_PRETTIERIGNORE_PATTERNS: readonly string[] = [
  '/CHANGELOG.md',
  '/.release-please-manifest.json',
  ...SKIPPED_DIRECTORIES.map((directory) => `/${directory}/`),
  ...CONFIG_SEARCHES.filter((search) => search.personal === true)
    .flatMap((search) => search.paths)
    .filter((path) => !path.startsWith('**/'))
    .map((path) => `/${path}`),
];

/** Every pattern {@link PRETTIERIGNORE} holds, each once. */
export const PRETTIERIGNORE_PATTERNS: readonly string[] = [
  ...SHARED_PRETTIERIGNORE_PATTERNS,
  ...OWN_PRETTIERIGNORE_PATTERNS,
];

/** What {@link TAPLO_CONFIG} holds: which TOML files taplo formats. */
const EXPECTED_TAPLO_CONFIG = {
  include: ['**/*.toml'],
  exclude: ['node_modules/**', '.claude/worktrees/**'],
} as const;

/**
 * What {@link COMMITLINT_CONFIG} holds, byte for byte, the same in every
 * repository of the set. commitlint runs the file as a module, and it decides
 * which commit messages pass.
 */
const EXPECTED_COMMITLINT_CONFIG = `import { readFileSync } from 'node:fs';

// .github/commit-scopes.json lists each scope and what it covers. CONTRIBUTING.md points at it
// rather than restating it, so a new scope is one edit. The path resolves against this file,
// so the list is found however this module is loaded.
const vocabularyPath = new URL('.github/commit-scopes.json', import.meta.url);
const scopes = JSON.parse(readFileSync(vocabularyPath, 'utf8')).map((entry) => entry.scope);

// scope-enum accepts every scope when handed an empty list, so a vocabulary
// that failed to load would read as a passing gate.
if (scopes.length === 0) {
  throw new Error(\`\${vocabularyPath.href} must list at least one scope.\`);
}

export default {
  extends: ['@commitlint/config-conventional'],
  // Dependabot writes body lines past the 72-column limit that hold no URL, such
  // as a grouped update's "Updates \`<package>\` from <old> to <new>", and that is
  // the update path the cooldown protects. A repository without Dependabot never
  // matches it. The match reads the lines after the header alone, so a title
  // carrying the text is still linted, and the squash subject lint in CI checks
  // the header where it lands.
  ignores: [
    (message) =>
      message
        .split('\\n')
        .slice(1)
        .some((line) => line.startsWith('Signed-off-by: dependabot[bot] <')),
  ],
  rules: {
    'scope-enum': [2, 'always', scopes],
    // 72 keeps a subject readable in \`git log --oneline\` inside an 80-column
    // terminal, with room for the hash and any ref decoration.
    'header-max-length': [2, 'always', 72],
    // The same width for the body, so a message reads the same in a terminal
    // as it does on GitHub. A line holding a URL is exempt by the rule.
    'body-max-line-length': [2, 'always', 72],
  },
};
`;

/** A file the gate holds whole: how to read it, what it must hold, and why. */
interface HeldWhole {
  readonly path: string;
  readonly parse: (text: string) => unknown;
  readonly expected: unknown;
  /** Why the file must be there, after "is missing, and". */
  readonly missing: string;
  /** What a change to it would do. */
  readonly differs: string;
}

/** Every way `held.path` differs from `held.expected`, as findings. */
async function heldWholeFindings(held: HeldWhole): Promise<string[]> {
  const file = Bun.file(held.path);
  if (!(await file.exists())) {
    return [`${held.path} is missing, and ${held.missing}`];
  }
  let parsed: unknown;
  try {
    parsed = held.parse(await file.text());
  } catch (error: unknown) {
    return [
      `${held.path} does not parse as the gate reads it: ${quote(error instanceof Error ? error.message : String(error))}. ${held.differs}`,
    ];
  }
  return sameValue(parsed, held.expected)
    ? []
    : [
        `${held.path} is ${quoteValue(parsed)}, and it must be exactly ${JSON.stringify(held.expected)}. ${held.differs}`,
      ];
}

/** A file written as code that the gate holds byte for byte: what it must hold, and why. */
interface HeldText {
  readonly path: string;
  readonly expected: string;
  /** What the file decides, after "because". */
  readonly decides: string;
}

/**
 * Every way `held.path` differs from `held.expected`, as findings, naming the
 * first line that differs, quoted on both sides with its line ending.
 */
async function heldTextFindings(held: HeldText): Promise<string[]> {
  const file = Bun.file(held.path);
  if (!(await file.exists())) {
    return [`${held.path} is missing, and the gate holds it whole, because ${held.decides}`];
  }
  const text = await file.text();
  if (text === held.expected) {
    return [];
  }
  const got = text.split(/(?<=\n)/);
  const want = held.expected.split(/(?<=\n)/);
  const line =
    Array.from({ length: Math.max(got.length, want.length) }, (_, i) => i).find((i) => got[i] !== want[i]) ?? 0;
  const shown = (lines: readonly string[]): string => {
    const at = lines[line];
    return at === undefined ? 'the end of the file' : quote(at);
  };
  return [
    `${held.path} differs from the text the gate holds for it, first at line ${String(line + 1)}, which reads ${shown(got)} where the gate holds ${shown(want)}. The gate holds it whole, because ${held.decides}, so change both in one commit`,
  ];
}

/**
 * Every way {@link PRETTIERIGNORE} differs from
 * {@link PRETTIERIGNORE_PATTERNS}, as findings.
 *
 * @remarks
 * Every line is a comment starting with `#`, an empty line, or one of the
 * patterns exactly, and each pattern appears once. A line with a leading or
 * trailing space, a negation or any other pattern is a finding, and so is a
 * missing pattern, so what the format row skips changes only with this file.
 */
async function prettierignoreFindings(): Promise<string[]> {
  const file = Bun.file(PRETTIERIGNORE);
  if (!(await file.exists())) {
    return [`${PRETTIERIGNORE} is missing, and the format row passes it as the one ignore file`];
  }
  const found: string[] = [];
  const seen = new Set<string>();
  const lines = (await file.text()).split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  for (const line of lines) {
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    if (!PRETTIERIGNORE_PATTERNS.includes(line) || seen.has(line)) {
      found.push(
        `${PRETTIERIGNORE} carries ${quote(line)}, and it holds ${PRETTIERIGNORE_PATTERNS.join(', ')} alone, each once. A pattern there hides files from the format row`,
      );
    }
    seen.add(line);
  }
  for (const pattern of PRETTIERIGNORE_PATTERNS.filter((entry) => !seen.has(entry))) {
    found.push(`${PRETTIERIGNORE} lacks ${quote(pattern)}`);
  }
  return found;
}

/**
 * Every root entry the gate refuses, as findings: a file named like a program
 * the gate, its hooks or an install start, with any extension or none, and a
 * `.config` in any case.
 *
 * @remarks
 * The gate starts a program from an absolute PATH entry outside the
 * repository alone. Windows runs a file from the working directory ahead of
 * PATH for a bare name that anything else starts, so a clone carries none,
 * and the gate refuses one before any row.
 */
async function programFindings(): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir('.', { withFileTypes: true })) {
    if (!entry.isDirectory() && !PROGRAM_NAMED_FILES.includes(fold(entry.name)) && isProgramName(entry.name)) {
      found.push(
        `${quote(entry.name)} is named like a program the gate, its hooks or an install start, and a clone carries no program at its root. Remove it`,
      );
    }
    if (fold(entry.name) === '.config') {
      found.push(
        `${quote(entry.name)} is at the root, and mise, lefthook and commitlint's cosmiconfig each read a config from it that no row holds. Remove it`,
      );
    }
  }
  return found;
}

/** A finding when the system holds no program the tree kill runs, since a row past its deadline then leaves its tool's processes running. */
function treeKillFindings(): string[] {
  if (treeKillProgram() !== undefined) {
    return [];
  }
  return [
    process.platform === 'win32'
      ? "Windows' System32 directory holds no taskkill.exe, so a row past its deadline cannot end the processes its tool started"
      : 'neither /bin/ps nor /usr/bin/ps exists, so a row past its deadline cannot end the processes its tool started',
  ];
}

/**
 * Every way the files Bun and the gate's tools read before they run differ
 * from what the gate expects, as findings: {@link BUNFIG}, what resolves the
 * gate's own imports, a package the manifest names that node_modules lacks,
 * the configs and ignore files the rows and hooks read, a root file named
 * like a program, and a system with no program for the tree kill.
 *
 * @remarks
 * The gate calls this before any row, because Bun honored its files before
 * the gate's first line: a finding keeps a changed file from merging, and it
 * cannot stop what the file already ran. The configs decide what the rows
 * check, skip or waive, and the two written as code run inside a tool, so a
 * change to any of them is a change to this file or expected.ts, which a
 * reviewer reads as a gate change.
 */
export async function startupFindings(): Promise<string[]> {
  return [
    ...(await bunfigFindings()),
    ...(await scriptsFindings()),
    ...(await installFindings()),
    ...(
      await Promise.all(
        Object.entries(EXPECTED_PROJECT_CONFIGS).map(([path, expected]) =>
          heldWholeFindings({
            path,
            parse: parseJson,
            expected,
            missing: 'scripts/expected.ts holds it',
            differs: 'Its files, strictness and noCheck decide what the typecheck and lint rows check',
          }),
        ),
      )
    ).flat(),
    ...(await heldWholeFindings({
      path: PRETTIERRC,
      parse: parseJson,
      expected: EXPECTED_PRETTIERRC,
      missing: 'the format row names it',
      differs: 'Prettier loads a plugin it names',
    })),
    ...(await prettierignoreFindings()),
    ...(await heldWholeFindings({
      path: TAPLO_CONFIG,
      parse: Bun.TOML.parse,
      expected: EXPECTED_TAPLO_CONFIG,
      missing: 'the toml row names it',
      differs: 'Its include and exclude decide which TOML files the toml row checks',
    })),
    ...(await heldWholeFindings({
      path: ZIZMOR_CONFIG,
      parse: Bun.YAML.parse,
      expected: EXPECTED_ZIZMOR_CONFIG,
      missing: 'the workflows row names it',
      differs: 'It can turn an audit off or waive an advisory',
    })),
    ...(await heldTextFindings({
      path: ESLINT_CONFIG,
      expected: EXPECTED_ESLINT_CONFIG,
      decides: 'ESLint runs it as a module, and its ignores and rules decide what the lint row checks',
    })),
    ...(await heldTextFindings({
      path: COMMITLINT_CONFIG,
      expected: EXPECTED_COMMITLINT_CONFIG,
      decides: 'commitlint runs it as a module, and it decides which commit messages pass',
    })),
    ...(await programFindings()),
    ...treeKillFindings(),
  ];
}
