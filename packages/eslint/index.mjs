import eslintjs from '@eslint/js'

import importX from './import.mjs'
import prettier from './prettier.mjs'
import simpleImportSort from './simple-import-sort.mjs'
import typescript from './typescript.mjs'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/.next',
      '**/public',
      '**/.turbo'
    ]
  },
  eslintjs.configs.recommended,
  ...typescript,
  ...importX,
  simpleImportSort,
  prettier
]
