/**
 * What the gate's rows conclude from what their tools printed, kept apart
 * from the processes that print it, so the suite beside this file covers the
 * logic every repository's check.ts runs.
 *
 * @remarks
 * The same in every repository of the set. It reads Bun and `node:` built-ins
 * and run.ts alone, so check.ts can import it before the preflight.
 */

import { resolve } from 'node:path';
import { describe, type Finished, fold, quote } from './run';

/* ///// Paths and counts ///// */

/** `path` as an absolute path compared without regard to case where the filesystem ignores it. */
export function comparable(path: string): string {
  const absolute = resolve(path);
  return process.platform === 'win32' || process.platform === 'darwin' ? absolute.toLowerCase() : absolute;
}

/** How a count of files reads in a row's line. */
export function files(count: number): string {
  return `${String(count)} ${count === 1 ? 'file' : 'files'}`;
}

/* ///// Typecheck coverage ///// */

/** A TypeScript source file tsc reads, by the end of its name through {@link fold}. */
const TYPESCRIPT_SOURCE = /\.[cm]?tsx?$/;

/**
 * A finding naming every tracked TypeScript file in `tracked` that no project
 * read, or undefined when every one was read. `read` holds each file tsc
 * listed, through {@link comparable}.
 *
 * @remarks
 * Read is not checked: tsc lists a declaration file and a `@ts-nocheck` file
 * it reads without checking either. The preflight refuses an unlisted
 * declaration file, and the lint row refuses `@ts-nocheck`.
 */
export function unreadSourceFinding(tracked: readonly string[], read: ReadonlySet<string>): string | undefined {
  const unread = tracked.filter((path) => TYPESCRIPT_SOURCE.test(fold(path)) && !read.has(comparable(path)));
  if (unread.length === 0) {
    return undefined;
  }
  return `no project reads ${unread.map((path) => quote(path)).join(', ')}, so tsc never reads ${unread.length === 1 ? 'it' : 'them'}. Add each to a project's include`;
}

/* ///// Test counts ///// */

/** One count from bun test's summary, such as ` 3 skip`, or 0 when it printed none. */
function summaryCount(printed: string, label: string): number {
  return Number(new RegExp(`^\\s*(\\d+) ${label}$`, 'm').exec(printed)?.[1] ?? 0);
}

/**
 * What a finished bun test run counted, for the row's line.
 *
 * @remarks
 * bun test exits 0 over a file that holds no test, and over one whose every
 * test is skipped, so the row reads its summary. A name pattern leaves tests
 * out of `Ran N tests` and prints how many it filtered out.
 *
 * @throws When it ran no test, when every test it counted was skipped or left
 * to do, or when a name pattern filtered any out
 */
export function testCount(label: string, finished: Finished): string {
  const printed = `${finished.stdout}\n${finished.stderr}`.replaceAll('\r', '');
  const ran = /^Ran (\d+) tests? across (\d+) files?\./m.exec(printed);
  const tests = Number(ran?.[1] ?? 0);
  if (tests === 0) {
    throw new Error(`${label} ran no test, so the row checks nothing: ${describe(finished)}`);
  }
  const skipped = summaryCount(printed, 'skip') + summaryCount(printed, 'todo');
  if (skipped >= tests) {
    throw new Error(`${label} skipped every one of its ${String(tests)} tests, so the row checks nothing`);
  }
  const filtered = summaryCount(printed, 'filtered out');
  if (filtered > 0) {
    throw new Error(
      `${label} left ${String(filtered)} tests out through a name pattern, so its count is not the suite`,
    );
  }
  const skip = skipped > 0 ? `, ${String(skipped)} skipped` : '';
  return `${String(tests)} ${tests === 1 ? 'test' : 'tests'} across ${files(Number(ran?.[2] ?? 0))}${skip}`;
}

/* ///// Prettier ignore comments ///// */

// Prettier's ignore comment, in any case. The character class keeps this line
// from matching itself, since the format row reads this file too.
const PRETTIER_IGNORE = /prettier[-]ignore/i;

/**
 * A finding for every line of `text`, the file at `path`, carrying Prettier's
 * ignore comment.
 *
 * @remarks
 * Prettier leaves the code after the comment as written, in every language it
 * formats, and no tool asks for a reason. The comment's form differs by
 * language, so the text is refused anywhere in a file the format row checks.
 * A file .prettierignore names is not checked, and changing that list is a
 * gate change.
 */
export function ignoreCommentFindings(path: string, text: string): string[] {
  return text
    .split('\n')
    .flatMap((line, index) =>
      PRETTIER_IGNORE.test(line)
        ? [
            `${quote(path)} line ${String(index + 1)} carries a Prettier ignore comment, which leaves the code after it unformatted with no reason given. Format the code instead`,
          ]
        : [],
    );
}

/* ///// secrets: inherit ///// */

/** One job zizmor reports passing `secrets: inherit`: its file, the line of its `uses:`, and what it calls. */
export interface InheritedCall {
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
export function inheritedCalls(report: unknown): InheritedCall[] {
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
      (location) => (location as { symbolic?: { kind?: unknown } } | null)?.symbolic?.kind === 'Primary',
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
 * A finding for every call in `calls` whose callee starts with none of
 * `held`, compared without regard to case, and for every file `waived` names
 * that holds no call.
 *
 * @remarks
 * A waiver names a file, not the workflow a job there calls, so a job pointed
 * at another repository keeps its waiver and hands that repository every
 * secret. A waived file with no call means the audit or the waiver went stale,
 * and a hold that counts nothing proves nothing.
 */
export function inheritedCallFindings(
  calls: readonly InheritedCall[],
  held: readonly string[],
  waived: readonly string[],
): string[] {
  const stray = calls
    .filter((call) => !held.some((prefix) => call.callee.toLowerCase().startsWith(prefix)))
    .map(
      (call) =>
        `${quote(call.path)} line ${String(call.line)} passes secrets: inherit to ${quote(call.callee)}. Only a reusable workflow of zachthedev/.github takes a caller's secrets`,
    );
  const idle = waived
    .filter((name) => !calls.some((call) => call.path.split('/').at(-1) === name.split(':')[0]))
    .map(
      (name) =>
        `the secrets-inherit waiver names ${quote(name)}, and zizmor reported no job there passing secrets: inherit, so the waiver or the audit is stale`,
    );
  return [...stray, ...idle];
}
