import importX from 'eslint-plugin-import-x'

/** @type {import('eslint').Linter.Config[]} */
export default [
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    rules: {
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/namespace': 'off'
    }
  }
]
