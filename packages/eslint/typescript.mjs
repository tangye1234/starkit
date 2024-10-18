import { config, configs } from 'typescript-eslint'

/** @type {import('eslint').Linter.RulesRecord} */
const rules = {
  '@typescript-eslint/no-empty-interface': 'off',
  '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }
  ]
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config({
    ignores: ['**/types/**/*', '**/*.d.ts'],
    extends: configs.recommended,
    rules
  }),
  ...config({
    files: ['**/types/**/*', '**/*.d.ts'],
    extends: configs.recommended,
    rules: {
      ...rules,
      '@typescript-eslint/no-explicit-any': 'off'
    }
  })
]
