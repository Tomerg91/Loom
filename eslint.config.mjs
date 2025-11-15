import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginImport from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript"), {
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ]
  }
}, {
  plugins: { import: pluginImport },
  settings: { 'import/resolver': { typescript: true } },
  rules: {
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        groups: [["builtin", "external"], 'internal', ["parent", "sibling", "index"]],
        pathGroups: [
          { pattern: '@/**', group: 'internal', position: 'after' },
        ],
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-cycle': 'warn',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['**/*.test.*', 'tests/**', 'scripts/**', 'src/test/**', '**/*.stories.*', '.storybook/**'] }
    ],
  },
}];

export default eslintConfig;
