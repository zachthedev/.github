// This repository's own cases for scripts/check.ts: the lint row's refusal of
// a gate/visible-reason report a directive turned off. ESLint lints each case
// in this process with the rules the repository sets on a waiver, and run() is
// swapped for a function handing the lint row that json before check.ts loads,
// so no case starts a program.

import { afterAll, expect, mock, setDefaultTimeout, test } from 'bun:test';
import { join } from 'node:path';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { gatePlugin } from './eslint-plugin';
import type { Finished } from './run';
import * as runModule from './run';

// Loading typescript-eslint takes seconds on a cold cache.
setDefaultTimeout(30_000);

/** The repository root, where eslint.config.ts sits. */
const ROOT = join(import.meta.dir, '..');

/** The file each case's text is linted as. */
const PROBE = join(ROOT, 'probe.ts');

// Built from its code point, so no invisible character is written into this file.
const WORD_JOINER = String.fromCodePoint(0x2060);

/**
 * The rules eslint.config.ts sets on a waiver, the gate's among them, and a
 * rule for a waiver to turn off, with no type information, since each case is
 * text that no project holds.
 */
const CONFIG = defineConfig(comments.recommended, {
  files: ['**/*.ts'],
  languageOptions: { parser: tseslint.parser },
  plugins: { gate: gatePlugin },
  rules: {
    'gate/visible-reason': 'error',
    '@eslint-community/eslint-comments/require-description': 'error',
    'no-debugger': 'error',
  },
});

const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: CONFIG });

/* ///// The stand-in for run(), in place before check.ts loads ///// */

/** What the lint row's eslint run hands back in the case running now. */
let printed: Finished = { exitCode: 0, stdout: '[]', stderr: '', heldOpen: false };

// Copied before the mock replaces them in place, so afterAll can put them back
// for the test files that run after this one in the same process.
const REAL_RUN = { ...runModule };

await mock.module('./run', () => ({
  ...REAL_RUN,
  jsTool: (tool: string): string[] => [`${tool}-stand-in`],
  run: (): Promise<Finished> => Promise.resolve(printed),
}));

const check = await import('./check');

afterAll(async () => {
  await mock.module('./run', () => REAL_RUN);
});

/** Hands the lint row ESLint's json over `text`, exiting 1 when ESLint reports a problem, as its command line does. */
async function lintedAs(text: string): Promise<void> {
  const results = await eslint.lintText(text, { filePath: PROBE });
  const formatter = await eslint.loadFormatter('json');
  printed = {
    exitCode: results.some((result) => result.messages.length > 0) ? 1 : 0,
    stdout: await formatter.format(results),
    stderr: '',
    heldOpen: false,
  };
}

/** What the lint row ended with: `passed <note>`, or the message it threw. */
async function lintRow(): Promise<string> {
  const row = check.rows.find((candidate) => candidate.name === 'lint');
  if (row === undefined) {
    throw new Error('fixture: check.ts has no lint row');
  }
  try {
    return `passed ${String(await row.check())}`;
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** The lint row's finding for a gate/visible-reason report turned off at `line` and `column` of the probe. */
const turnedOff = (line: number, column: number): string =>
  `${JSON.stringify(PROBE)}:${String(line)}:${String(column)}  a directive turned off gate/visible-reason, which no directive may do. Take the rule out of the directive and give each waiver a reason in words`;

test.each([
  [
    'a disable-line naming the rule beside the one it waives, with an invisible reason',
    `debugger; // eslint-disable-line no-debugger, gate/visible-reason -- ${WORD_JOINER}\n`,
    [turnedOff(1, 11)],
  ],
  [
    'a block disable naming the rule, closed by an enable with a reason in words, and a waiver between them',
    `/* eslint-disable gate/visible-reason -- ${WORD_JOINER} */\n// eslint-disable-next-line no-debugger -- ${WORD_JOINER}\ndebugger;\n/* eslint-enable gate/visible-reason -- restore the rule */\n`,
    [turnedOff(1, 1), turnedOff(2, 1)],
  ],
])('%s is refused, naming each report turned off', async (_label: string, text: string, findings: string[]) => {
  await lintedAs(text);

  expect(await lintRow()).toBe(findings.join('\n'));
});

test('a waiver with a reason in words passes, though it turns off another rule', async () => {
  await lintedAs('// eslint-disable-next-line no-debugger -- the reason\ndebugger;\n');

  expect(await lintRow()).toBe('passed 1 file');
});

test('json whose results list no suppressed reports is refused, since the row cannot read them', async () => {
  printed = {
    exitCode: 0,
    stdout: JSON.stringify([{ filePath: PROBE, messages: [] }]),
    stderr: '',
    heldOpen: false,
  };

  expect(await lintRow()).toStartWith('eslint printed json that is not a list of file results');
});
