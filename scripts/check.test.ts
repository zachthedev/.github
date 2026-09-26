// This repository's own cases for scripts/check.ts: the lint row's refusal of
// a gate/visible-reason report a directive turned off, and of a report a
// configuration comment hid from a rule that reads comments. ESLint lints each
// case in this process with the rules the repository sets on a waiver, once as
// written and once with no comment read as configuration, and run() is swapped
// for a function handing the lint row that json before check.ts loads, so no
// case starts a program.

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
  plugins: { gate: gatePlugin, '@typescript-eslint': tseslint.plugin },
  rules: {
    'gate/visible-reason': 'error',
    '@eslint-community/eslint-comments/require-description': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { minimumDescriptionLength: 10 }],
    'no-debugger': 'error',
  },
});

const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: CONFIG });

/** The same, reading no comment as configuration, as the lint row's second pass does with --no-inline-config. */
const noInline = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: CONFIG, allowInlineConfig: false });

/* ///// The stand-in for run(), in place before check.ts loads ///// */

/** What the lint row's first eslint run hands back in the case running now. */
let printed: Finished = { exitCode: 0, stdout: '[]', stderr: '', heldOpen: false };

/** What its second run, the one passing --no-inline-config, hands back. */
let printedNoInline: Finished = { exitCode: 0, stdout: '[]', stderr: '', heldOpen: false };

// Copied before the mock replaces them in place, so afterAll can put them back
// for the test files that run after this one in the same process.
const REAL_RUN = { ...runModule };

await mock.module('./run', () => ({
  ...REAL_RUN,
  jsTool: (tool: string): string[] => [`${tool}-stand-in`],
  run: (cmd: readonly string[]): Promise<Finished> =>
    Promise.resolve(cmd.includes('--no-inline-config') ? printedNoInline : printed),
}));

const check = await import('./check');

afterAll(async () => {
  await mock.module('./run', () => REAL_RUN);
});

/** ESLint's json over `text` from `linter`, exiting 1 when it reports a problem, as its command line does. */
async function linted(linter: ESLint, text: string): Promise<Finished> {
  const results = await linter.lintText(text, { filePath: PROBE });
  const formatter = await linter.loadFormatter('json');
  return {
    exitCode: results.some((result) => result.messages.length > 0) ? 1 : 0,
    stdout: await formatter.format(results),
    stderr: '',
    heldOpen: false,
  };
}

/** Hands the lint row both passes' json over `text`. */
async function lintedAs(text: string): Promise<void> {
  printed = await linted(eslint, text);
  printedNoInline = await linted(noInline, text);
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

test('used waivers with reasons in words pass both passes, though the second reports the rule they waive', async () => {
  await lintedAs(
    "/* eslint-disable no-debugger -- the block steps through by hand */\ndebugger;\n/* eslint-enable no-debugger -- the block ends here */\n// eslint-disable-next-line no-debugger -- one more stop by hand\ndebugger;\n// @ts-expect-error the fixture assigns a string to a number\nexport const count: number = 'text';\n",
  );
  const second: unknown = JSON.parse(printedNoInline.stdout);

  expect(second).toMatchObject([
    {
      messages: [
        { ruleId: 'no-debugger', line: 2 },
        { ruleId: 'no-debugger', line: 5 },
      ],
    },
  ]);
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

test('a configuration comment turning the rule off for the file is refused, naming the waiver it hid', async () => {
  await lintedAs(
    `/* eslint gate/visible-reason: "off" -- the rule stays off in this file */\n// eslint-disable-next-line no-debugger -- ${WORD_JOINER}\ndebugger;\n`,
  );

  expect(await lintRow()).toBe(
    `${JSON.stringify(PROBE)}:2:1  gate/visible-reason reports this with every configuration comment ignored, and no comment may turn that rule off: This eslint-disable-next-line comment gives no reason holding a letter or a digit once the characters that print nothing are removed. Write the reason in words.`,
  );
});

test('a configuration comment turning off a rule that reads no comments passes', async () => {
  await lintedAs('/* eslint no-debugger: "off" -- this file steps through the gate by hand */\ndebugger;\n');

  expect(await lintRow()).toBe('passed 1 file');
});

test.each([
  [
    'lints another number of files',
    { exitCode: 0, stdout: '[]', stderr: '', heldOpen: false },
    'eslint --no-inline-config linted 0 files and the first pass 1 file',
  ],
  [
    'exits 2',
    { exitCode: 2, stdout: '[]', stderr: 'config error', heldOpen: false },
    'eslint --no-inline-config exited 2',
  ],
])('a second pass that %s is refused', async (_label: string, second: Finished, start: string) => {
  await lintedAs('export const count = 1;\n');
  printedNoInline = second;

  expect(await lintRow()).toStartWith(start);
});
