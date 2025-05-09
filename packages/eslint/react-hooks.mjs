import { configs } from 'eslint-plugin-react-hooks'

/** @type {import('eslint').Linter.Config[]} */
export default [
  configs['recommended-latest'],
  {
    rules: {
      'react-hooks/exhaustive-deps': [
        'warn',
        { additionalHooks: 'useDisposable' }
      ]
    }
  }
]
