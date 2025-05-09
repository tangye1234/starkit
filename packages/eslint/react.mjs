import { default as reactPlugin } from 'eslint-plugin-react'

import base from './index.mjs'
import jsxA11y from './jsx-a11y.mjs'
import prettier from './prettier.mjs'
import reactHooks from './react-hooks.mjs'

const { configs } = reactPlugin

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base.slice(0, -1),
  ...jsxA11y,
  ...reactHooks,
  configs.flat.recommended,
  configs.flat['jsx-runtime'],
  {
    rules: {
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  prettier
]
