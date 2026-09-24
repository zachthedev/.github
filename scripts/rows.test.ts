import { expect, test } from 'bun:test';
import {
  comparable,
  ignoreCommentFindings,
  type InheritedCall,
  inheritedCallFindings,
  inheritedCalls,
  testCount,
  unreadSourceFinding,
} from './rows';
import type { Finished } from './run';

/** An asymmetric matcher for a finding carrying `fragment`. */
function carrying(fragment: string): string {
  return expect.stringContaining(fragment) as string;
}

/* ///// Test counts ///// */

/** A bun test run that exited 0 printing `summary` on stderr, where bun test prints it. */
function ended(summary: string): Finished {
  return { exitCode: 0, stdout: '', stderr: summary, heldOpen: false };
}

interface CountCase {
  readonly label: string;
  readonly summary: string;
  /** The row's line, or undefined when the count must throw. */
  readonly line?: string;
  /** A fragment the throw carries. */
  readonly refused?: string;
}

// Each summary is written the way Bun 1.4.2 prints it.
const COUNTS: readonly CountCase[] = [
  {
    label: 'a passing run',
    summary: ' 7 pass\n 0 fail\n 9 expect() calls\nRan 7 tests across 2 files. [80.00ms]\n',
    line: '7 tests across 2 files',
  },
  {
    label: 'one test in one file',
    summary: ' 1 pass\n 0 fail\nRan 1 test across 1 file. [8.00ms]\n',
    line: '1 test across 1 file',
  },
  {
    label: 'some skipped, as on a platform a case does not run on',
    summary: ' 5 pass\n 2 skip\n 0 fail\nRan 7 tests across 2 files. [80.00ms]\n',
    line: '7 tests across 2 files, 2 skipped',
  },
  {
    label: 'Windows line endings',
    summary: ' 3 pass\r\n 1 skip\r\n 0 fail\r\nRan 4 tests across 1 file. [8.00ms]\r\n',
    line: '4 tests across 1 file, 1 skipped',
  },
  {
    label: 'files holding no test',
    summary: ' 0 pass\n 0 fail\nRan 0 tests across 2 files. [5.00ms]\n',
    refused: 'ran no test',
  },
  { label: 'no summary at all', summary: 'error: something else\n', refused: 'ran no test' },
  {
    label: 'every test skipped',
    summary: ' 0 pass\n 3 skip\n 0 fail\nRan 3 tests across 1 file. [5.00ms]\n',
    refused: 'skipped every one of its 3 tests',
  },
  {
    label: 'every test skipped or left to do',
    summary: ' 0 pass\n 4 skip\n 1 todo\n 0 fail\nRan 5 tests across 1 file. [5.00ms]\n',
    refused: 'skipped every one of its 5 tests',
  },
  {
    label: 'a name pattern leaving tests out',
    summary: ' 1 pass\n 2 filtered out\n 0 fail\nRan 1 test across 1 file. [5.00ms]\n',
    refused: 'left 2 tests out through a name pattern',
  },
];

test.each([...COUNTS])('$label', ({ summary, line, refused }: CountCase) => {
  if (line !== undefined) {
    expect(testCount('bun test', ended(summary))).toBe(line);
  } else {
    expect(() => testCount('bun test', ended(summary))).toThrow(refused ?? '');
  }
});

/* ///// Typecheck coverage ///// */

test('a tracked TypeScript file no project read is named, and one read is not', () => {
  const read = new Set([comparable('src/a.ts')]);

  expect(unreadSourceFinding(['src/a.ts', 'src/b.ts', 'README.md'], read)).toEqual(
    carrying('no project reads "src/b.ts", so tsc never reads it'),
  );
});

test.each(['x.ts', 'x.mts', 'x.cts', 'x.tsx', 'x.d.ts', 'X.TS'])('%p counts as a TypeScript source', (path: string) => {
  expect(unreadSourceFinding([path], new Set())).toEqual(carrying(JSON.stringify(path)));
});

test('every tracked TypeScript file read yields nothing', () => {
  expect(unreadSourceFinding(['src/a.ts', 'docs/b.md'], new Set([comparable('src/a.ts')]))).toBeUndefined();
});

/* ///// Prettier ignore comments ///// */

// The comment is spelled from pieces here, since this file is one the format
// row checks.
const IGNORE = ['prettier', 'ignore'].join('-');

test.each([
  `// ${IGNORE}`,
  `/* ${IGNORE} */`,
  `<!-- ${IGNORE} -->`,
  `<!-- ${IGNORE}-start -->`,
  `# ${IGNORE}`,
  `{/* ${IGNORE} */}`,
  `// ${IGNORE.toUpperCase()}`,
])('%p is refused, naming the file and line', (comment: string) => {
  expect(ignoreCommentFindings('src/a.ts', `const a = 1;\n${comment}\nconst b = 2;\n`)).toEqual([
    carrying('"src/a.ts" line 2 carries a Prettier ignore comment'),
  ]);
});

test('a file with no ignore comment yields nothing', () => {
  expect(ignoreCommentFindings('src/a.ts', 'const prettier = 1; // ignore this\n')).toEqual([]);
});

/* ///// secrets: inherit ///// */

/** One finding in the shape zizmor 1.30 prints with --format json. */
function finding(ident: string, path: string, row: number, feature: string): unknown {
  return {
    ident,
    locations: [
      { symbolic: { kind: 'Related' }, concrete: { feature: 'secrets: inherit' } },
      {
        symbolic: { kind: 'Primary', key: { Local: { verbatim_path: path } } },
        concrete: { feature, location: { start_point: { row } } },
      },
    ],
  };
}

test('each secrets-inherit finding becomes its file, one-based line and unquoted callee, and other audits are skipped', () => {
  const report = [
    finding(
      'secrets-inherit',
      '.github\\workflows\\cd.yml',
      35,
      '"zachthedev/.github/.github/workflows/publish.yml@abc"',
    ),
    finding('unpinned-uses', '.github/workflows/ci.yml', 3, 'actions/checkout@v4'),
    finding('secrets-inherit', '.github/workflows/deps.yml', 32, "'zachthedev/.github/.github/workflows/deps.yml@abc'"),
  ];

  expect(inheritedCalls(report)).toEqual([
    { path: '.github/workflows/cd.yml', line: 36, callee: 'zachthedev/.github/.github/workflows/publish.yml@abc' },
    { path: '.github/workflows/deps.yml', line: 33, callee: 'zachthedev/.github/.github/workflows/deps.yml@abc' },
  ]);
});

test.each([
  ['a report that is not a list', { findings: [] }, 'not a list of findings'],
  ['a finding with no primary location', [{ ident: 'secrets-inherit', locations: [] }], 'no primary file'],
  [
    'a finding with no callee',
    [
      {
        ident: 'secrets-inherit',
        locations: [{ symbolic: { kind: 'Primary', key: { Local: { verbatim_path: 'x' } } } }],
      },
    ],
    'no primary file',
  ],
  ['a null finding location', [{ ident: 'secrets-inherit', locations: [null] }], 'no primary file'],
])('%s throws', (_label: string, report: unknown, refused: string) => {
  expect(() => inheritedCalls(report)).toThrow(refused);
});

const HELD = ['zachthedev/.github/.github/workflows/'];

/** A call from `path` to `callee`, at line 10. */
function call(path: string, callee: string): InheritedCall {
  return { path, line: 10, callee };
}

test('calls to reusable workflows of zachthedev/.github, in any case, from every waived file yield nothing', () => {
  const calls = [
    call('.github/workflows/cd.yml', 'zachthedev/.github/.github/workflows/publish.yml@abc'),
    call('.github/workflows/deps.yml', 'ZachTheDev/.GitHub/.github/workflows/deps.yml@abc'),
  ];

  expect(inheritedCallFindings(calls, HELD, ['cd.yml', 'deps.yml'])).toEqual([]);
});

test.each([
  'someone/.github/.github/workflows/publish.yml@abc',
  'zachthedev/.github-fork/.github/workflows/publish.yml@abc',
  'zachthedev/other/.github/workflows/publish.yml@abc',
  './.github/workflows/local.yml',
  'zachthedev/.github/.github/workflowsx/publish.yml@abc',
])('a call to %p is refused, naming the file, line and callee', (callee: string) => {
  expect(inheritedCallFindings([call('.github/workflows/cd.yml', callee)], HELD, ['cd.yml'])).toEqual([
    carrying(`".github/workflows/cd.yml" line 10 passes secrets: inherit to ${JSON.stringify(callee)}`),
  ]);
});

test('a waived file holding no call is refused as stale, in the file form and the line form', () => {
  const calls = [call('.github/workflows/cd.yml', 'zachthedev/.github/.github/workflows/publish.yml@abc')];

  expect(inheritedCallFindings(calls, HELD, ['cd.yml', 'deps.yml', 'ci.yml:3:5'])).toEqual([
    carrying('the secrets-inherit waiver names "deps.yml", and zizmor reported no job there'),
    carrying('the secrets-inherit waiver names "ci.yml:3:5", and zizmor reported no job there'),
  ]);
});

test('no calls and no waivers yield nothing', () => {
  expect(inheritedCallFindings([], HELD, [])).toEqual([]);
});
