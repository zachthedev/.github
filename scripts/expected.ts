/**
 * What the gate expects of the files each repository writes for itself: its
 * TypeScript project configs, the zizmor config, the JavaScript and
 * declaration files it tracks, the patterns its `.prettierignore` adds to the
 * shared ones, and `eslint.config.ts`.
 *
 * @remarks
 * scripts/run.ts, scripts/tools.ts, scripts/startup.ts and
 * scripts/shellcheck.ts are the same in every repository of the set, and
 * startup.ts reads this module for the rest.
 * A change to one of these files changes the matching value here in the same
 * commit, which a reviewer reads as a gate change. The preflight loads this
 * module before any check, so it imports nothing.
 */

/**
 * Every `tsconfig.json` and `jsconfig.json` the repository keeps beside
 * scripts/tsconfig.json, by path, with what each holds, compared as parsed
 * JSON. The gate is this repository's only TypeScript. The root one reads
 * eslint.config.ts alone, the one TypeScript file outside scripts/, so the
 * typecheck row checks it. Their files, strictness and `noCheck` decide what
 * the typecheck and lint rows check, so any other project config in the tree
 * is refused. None carries `paths` or `baseUrl`, which startup.ts refuses
 * along any `extends` chain.
 */
export const EXPECTED_PROJECT_CONFIGS: Readonly<Record<string, unknown>> = {
  'tsconfig.json': {
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
    include: ['eslint.config.ts'],
  },
};

/**
 * What `.github/zizmor.yml` holds, compared as parsed YAML. `self-repository`
 * is off: ci.yml and cd.yml call the reusable workflows beside them with
 * `./`, which actionlint accepts and that audit refuses. `secrets-inherit`
 * is waived for cd.yml, whose release-pr job needs its environment's secret.
 * The waiver binds to the file, so the gate holds every job that passes
 * `secrets: inherit` to this repository's own reusable workflows.
 */
export const EXPECTED_ZIZMOR_CONFIG = {
  rules: {
    'unpinned-uses': { config: { policies: { '*': 'hash-pin' } } },
    'self-repository': { disable: true },
    'secrets-inherit': { ignore: ['cd.yml'] },
    'known-vulnerable-actions': { config: { allow: [] } },
  },
} as const;

/**
 * Every tracked JavaScript file (`.js`, `.jsx`, `.mjs`, `.cjs`) and
 * declaration file (`.d.ts` and its kin) the repository keeps, by path. tsc
 * checks neither kind: no project allows JavaScript, and `skipLibCheck` skips
 * every declaration file, the repository's own included. ESLint lints no
 * `.jsx` at all. So startup.ts refuses any other tracked file of either kind.
 */
export const EXPECTED_UNTYPED_SOURCES: readonly string[] = ['commitlint.config.js'];

/**
 * The patterns `.prettierignore` holds beside the shared ones startup.ts
 * lists, each once. REPOS.md is the maintainer's local alignment table, which
 * .gitignore keeps out of the index and `bun run format` would otherwise walk.
 */
export const OWN_PRETTIERIGNORE_PATTERNS: readonly string[] = ['/REPOS.md'];

/**
 * What `eslint.config.ts` holds, byte for byte. ESLint runs the file as a
 * module, and its ignores and rules decide what the lint row checks.
 */
export const EXPECTED_ESLINT_CONFIG = `import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// typescript-eslint reads types through the TypeScript 6.x compiler API, which the native TypeScript 7 compiler
// does not expose, so the \`typescript\` package it resolves stays on 6.x beside the \`@typescript/native\` alias the
// typecheck row runs.
export default defineConfig(
  // flat config reads no .gitignore, so every ignored directory a lint could
  // reach is named here, the worktrees Claude Code writes included.
  globalIgnores(['node_modules/**', 'coverage/**', 'dist/**', '.claude/worktrees/**']),

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  // An inline ESLint directive names each rule it turns off and gives its
  // reason after \`--\`. The recommended set refuses a disable that names no
  // rule or is never closed, and require-description refuses one with no
  // reason. ESLint reports a directive that silences nothing, and the lint row
  // allows no warning.
  comments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error',
    },
  },

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['commitlint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Production and tooling code
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      // Conflicts with strict-boolean-expressions; explicit null/undefined
      // checks are preferred for clarity.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
    },
  },

  // Tests
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },

  // commitlint.config.js sits outside every tsconfig project, and the typecheck
  // row checks eslint.config.ts; lint both without type information.
  {
    files: ['commitlint.config.js', 'eslint.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // commitlint.config.js is byte-identical in every repository and reads the
  // URL global Node and Bun both provide, so the global is declared here
  // rather than imported there.
  {
    files: ['commitlint.config.js'],
    languageOptions: {
      globals: { URL: 'readonly' },
    },
  },

  // Must stay last: disables rules that conflict with prettier formatting
  prettierConfig,
);
`;
