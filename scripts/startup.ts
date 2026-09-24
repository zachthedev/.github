/**
 * The files Bun and the gate's tools read before they run, held against what
 * the gate expects: bunfig.toml, what resolves the gate's own imports, the
 * configs and ignore files the rows read, and the root's program names.
 *
 * @remarks
 * The gate calls {@link startupFindings} before any row, so this file and
 * everything it imports read Bun and `node:` built-ins alone. A package
 * imported here would load from node_modules before the check that refuses a
 * planted one. The comparison helpers here serve tools.ts too, which holds
 * mise.toml and mise.lock the same way.
 */

import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isProgramName, PRETTIERRC, quote } from './run';

/** The file pinning a version for every tool mise installs. */
export const PINS = 'mise.toml';

/** The file holding a checksum, a url and a backend per platform for every pinned tool. */
export const LOCK = 'mise.lock';

/** The manifest Bun and bun install read. */
const PACKAGE_JSON = 'package.json';

/** The one Prettier ignore file, which every Prettier run names with `--ignore-path`. */
export const PRETTIERIGNORE = '.prettierignore';

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

/* ///// The files Bun reads before the gate ///// */

/** The file Bun reads its settings from, in the directory it starts in. */
const BUNFIG = 'bunfig.toml';

/** The directory holding the gate's scripts. */
const SCRIPTS = 'scripts';

/**
 * The gate's own TypeScript config. Bun resolves a module a gate script
 * imports through the tsconfig.json nearest to the script, with no merge, so
 * this one keeps the root config's `paths`, `baseUrl` and `extends` away from
 * the gate.
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
    if (entry.isDirectory() && entry.name.toLowerCase() !== 'node_modules') {
      found.push(...(await walk(join(entry.parentPath, entry.name))));
    }
  }
  return found;
}

/**
 * The packages the gate's scripts import, by name, read from the scripts
 * themselves: every import that is not relative, not absolute, and not a
 * `node:` or `bun:` builtin.
 */
async function gatePackages(): Promise<Set<string>> {
  const transpiler = new Bun.Transpiler({ loader: 'ts' });
  const packages = new Set<string>();
  for (const entry of await walk(SCRIPTS)) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) {
      continue;
    }
    for (const { path } of transpiler.scanImports(await Bun.file(join(entry.parentPath, entry.name)).text())) {
      if (/^(\.|\/|[a-z]:|node:|bun:)/i.test(path)) {
        continue;
      }
      const segments = path.split('/');
      packages.add(path.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] ?? path));
    }
  }
  return packages;
}

/**
 * The findings against what Bun reads to resolve the gate's own imports:
 * {@link SCRIPTS_TSCONFIG} differing from {@link EXPECTED_SCRIPTS_TSCONFIG},
 * any other {@link RESOLUTION_NAMES} entry under `scripts/`, and a
 * `package.json` patch to a package the gate imports.
 *
 * @remarks
 * The package list comes from the scripts' own imports, so a new import is
 * covered the moment it lands. A patch bun.lock records with no package.json
 * entry beside it is not applied, so package.json is the file read.
 */
async function scriptsFindings(): Promise<string[]> {
  const found = await heldWholeFindings({
    path: SCRIPTS_TSCONFIG,
    parse: JSON.parse,
    expected: EXPECTED_SCRIPTS_TSCONFIG,
    missing: "it keeps the root tsconfig.json away from the gate's imports",
    differs: "Its paths, baseUrl and extends redirect the gate's imports",
  });
  for (const entry of await walk(SCRIPTS)) {
    const path = join(entry.parentPath, entry.name).replaceAll('\\', '/');
    if (RESOLUTION_NAMES.includes(entry.name.toLowerCase()) && path.toLowerCase() !== SCRIPTS_TSCONFIG) {
      found.push(`${quote(path)} is one Bun reads to resolve a gate script's imports, and ${SCRIPTS} holds none`);
    }
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(await Bun.file(PACKAGE_JSON).text());
  } catch (error: unknown) {
    // Missing or malformed: refused, since what Bun and bun install read from it is unknown.
    found.push(
      `${PACKAGE_JSON} does not parse, so its patchedDependencies cannot be read: ${quote(error instanceof Error ? error.message : String(error))}`,
    );
    return found;
  }
  const patches = isTable(manifest) ? manifest['patchedDependencies'] : undefined;
  if (isTable(patches)) {
    const packages = await gatePackages();
    for (const key of Object.keys(patches)) {
      const at = key.lastIndexOf('@');
      const name = at > 0 ? key.slice(0, at) : key;
      if (packages.has(name)) {
        found.push(`package.json patches ${quote(key)}, and the gate imports ${name} before its first check`);
      }
    }
  }
  return found;
}

/* ///// The files the rows read ///// */

/**
 * What {@link PRETTIERRC} holds, compared whole. `--config` stops Prettier's
 * search for any other config, and a `plugins` entry here would still load a
 * module, so the file holds formatting options alone.
 */
const EXPECTED_PRETTIERRC = { singleQuote: true, printWidth: 120 } as const;

/**
 * Every pattern {@link PRETTIERIGNORE} holds, each once, beside comments and
 * blank lines. The first two are files release-please writes. The rest are
 * directories a checkout fills locally, so `bun run format`, which walks the
 * tree, never rewrites another worktree or build output.
 */
export const PRETTIERIGNORE_PATTERNS: readonly string[] = [
  'CHANGELOG.md',
  '.release-please-manifest.json',
  '.claude/worktrees/',
  'coverage/',
  'dist/',
];

/** The taplo config the toml row names, compared whole: which TOML files taplo formats. */
const TAPLO_CONFIG = '.taplo.toml';

/** What {@link TAPLO_CONFIG} holds. */
const EXPECTED_TAPLO_CONFIG = {
  include: ['**/*.toml'],
  exclude: ['node_modules/**', '.claude/worktrees/**'],
} as const;

/** The zizmor config the workflows row names. */
export const ZIZMOR_CONFIG = '.github/zizmor.yml';

/**
 * What {@link ZIZMOR_CONFIG} holds, compared whole. `self-repository` is off
 * here alone: ci.yml and cd.yml call the reusable workflows beside them with
 * `./`, which actionlint accepts and that audit refuses.
 */
const EXPECTED_ZIZMOR_CONFIG = {
  rules: {
    'unpinned-uses': { config: { policies: { '*': 'hash-pin' } } },
    'self-repository': { disable: true },
    'known-vulnerable-actions': { config: { allow: [] } },
  },
} as const;

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
    parsed = error instanceof Error ? error.message : String(error);
  }
  return sameValue(parsed, held.expected)
    ? []
    : [
        `${held.path} is ${quoteValue(parsed)}, and it must be exactly ${JSON.stringify(held.expected)}. ${held.differs}`,
      ];
}

/**
 * Every way {@link PRETTIERIGNORE} differs from
 * {@link PRETTIERIGNORE_PATTERNS}, as findings.
 *
 * @remarks
 * Every line is a comment starting with `#`, an empty line, or one of the
 * patterns exactly, and each pattern appears once. A line with a leading or
 * trailing space, a negation or any other pattern is a finding, so what the
 * format row skips changes only with this file.
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
 * Every root file named like a program the gate, its hooks or an install
 * start, as findings: its name before the first dot is one of the program
 * names, with any extension or none.
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
    if (!entry.isDirectory() && !PROGRAM_NAMED_FILES.includes(entry.name.toLowerCase()) && isProgramName(entry.name)) {
      found.push(
        `${quote(entry.name)} is named like a program the gate, its hooks or an install start, and a clone carries no program at its root. Remove it`,
      );
    }
  }
  return found;
}

/**
 * Every way the files Bun and the gate's tools read before they run differ
 * from what the gate expects, as findings: {@link BUNFIG}, what resolves the
 * gate's own imports, {@link PRETTIERRC}, {@link PRETTIERIGNORE},
 * {@link TAPLO_CONFIG}, {@link ZIZMOR_CONFIG} and a root file named like a
 * program.
 *
 * @remarks
 * The gate calls this before any row, because Bun honored its files before
 * the gate's first line: a finding keeps a changed file from merging, and it
 * cannot stop what the file already ran. The last three decide what the
 * format, toml and workflows rows skip or waive, so a change to any of them
 * is a change to this file, which a reviewer reads as a gate change.
 */
export async function startupFindings(): Promise<string[]> {
  return [
    ...(await bunfigFindings()),
    ...(await scriptsFindings()),
    ...(await heldWholeFindings({
      path: PRETTIERRC,
      parse: JSON.parse,
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
    ...(await programFindings()),
  ];
}
