import reactHooks from 'eslint-plugin-react-hooks'

/** @type {import('eslint').Linter.Config} */
export default {
  plugins: {
    'react-hooks': reactHooks
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': [
      'warn',
      { additionalHooks: 'useDisposable' }
    ]
  }
}
