// This repository's own cases for scripts/check.ts: how the gate reads its
// arguments. Imported, check.ts runs nothing, and selectRows starts no
// program, so no case reaches gh, git, mise or the network.

import { expect, test } from 'bun:test';
import { selectRows } from './check';

/** Every row, in the table's order, written out here rather than read from check.ts. */
const ALL_ROWS: readonly string[] = [
  'tools',
  'typecheck',
  'format',
  'toml',
  'workflows',
  'renovate',
  'lint',
  'scripts:test',
];

/** A selection by its rows' names, or the whole refusal. */
type Selected = { readonly rows: readonly string[]; readonly list: boolean } | { readonly refusal: string };

interface SelectCase {
  readonly label: string;
  /** The arguments after the script's path. */
  readonly args: readonly string[];
  readonly expected: Selected;
}

// Named rows run in the table's order, and one unknown name or flag refuses
// the whole run, so a mistyped name never selects nothing and reads as a green
// gate, and a mistyped flag never runs the whole gate in its place.
const SELECT_CASES: readonly SelectCase[] = [
  {
    label: 'no argument selects every row, in the table order',
    args: [],
    expected: { rows: ALL_ROWS, list: false },
  },
  {
    label: 'one name selects that row alone',
    args: ['workflows'],
    expected: { rows: ['workflows'], list: false },
  },
  {
    label: 'two names run in the table order, not the argument order',
    args: ['lint', 'format'],
    expected: { rows: ['format', 'lint'], list: false },
  },
  {
    label: '--rows asks for the list',
    args: ['--rows'],
    expected: { rows: ALL_ROWS, list: true },
  },
  {
    label: '--quick, which this gate does not take, is refused',
    args: ['--quick'],
    expected: { refusal: 'no such flag: "--quick". The gate takes --rows.' },
  },
  {
    label: 'a misspelled --rows is refused',
    args: ['--row'],
    expected: { refusal: 'no such flag: "--row". The gate takes --rows.' },
  },
  {
    label: 'a row name written as a flag is refused',
    args: ['--lint'],
    expected: { refusal: 'no such flag: "--lint". The gate takes --rows.' },
  },
  {
    label: 'a flag carrying a value is refused',
    args: ['--rows=true'],
    expected: { refusal: 'no such flag: "--rows=true". The gate takes --rows.' },
  },
  {
    label: 'a bare -- is refused',
    args: ['--', 'lint'],
    expected: { refusal: 'no such flag: "--". The gate takes --rows.' },
  },
  {
    label: 'two unknown flags are refused together, beside a known one',
    args: ['--rows', '--quik', '--verbose'],
    expected: { refusal: 'no such flag: "--quik", "--verbose". The gate takes --rows.' },
  },
  {
    label: 'an unknown flag and an unknown name are refused together',
    args: ['--quik', 'nosuchrow'],
    expected: {
      refusal:
        'no such flag: "--quik". The gate takes --rows. no such row: "nosuchrow". bun run check:rows lists them.',
    },
  },
  {
    label: 'an unknown name is refused',
    args: ['nosuchrow'],
    expected: { refusal: 'no such row: "nosuchrow". bun run check:rows lists them.' },
  },
  {
    label: 'one unknown name among known ones refuses the run, naming it alone',
    args: ['workflows', 'zizmor'],
    expected: { refusal: 'no such row: "zizmor". bun run check:rows lists them.' },
  },
  {
    label: 'a flag with one dash reads as a name and is refused',
    args: ['-q'],
    expected: { refusal: 'no such row: "-q". bun run check:rows lists them.' },
  },
  {
    label: 'a package.json script that is not a row is refused',
    args: ['check:rows'],
    expected: { refusal: 'no such row: "check:rows". bun run check:rows lists them.' },
  },
  {
    label: 'a name holding a newline is refused on one line, the newline escaped',
    args: ['a\nb'],
    expected: { refusal: 'no such row: "a\\nb". bun run check:rows lists them.' },
  },
  {
    label: 'a flag holding a C1 control sequence is refused with it escaped',
    args: [`--${String.fromCharCode(0x9b)}31m`],
    expected: { refusal: 'no such flag: "--\\u009b31m". The gate takes --rows.' },
  },
];

test.each([...SELECT_CASES])('selectRows: $label', ({ args, expected }: SelectCase) => {
  const selection = selectRows(args);
  const selected: Selected =
    'refusal' in selection
      ? { refusal: selection.refusal }
      : { rows: selection.rows.map((row) => row.name), list: selection.list };

  expect(selected).toEqual(expected);
});
