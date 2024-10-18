import simpleImportSort from 'eslint-plugin-simple-import-sort'

/** @type {import('eslint').Linter.Config} */
export default {
  plugins: {
    'simple-import-sort': simpleImportSort
  },
  rules: {
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^server-only', '^client-only'],
          [
            '^node:',
            '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)'
          ],
          ['^react', '^@?\\w'],
          ['^\\u0000'],
          ['^(~|src|internals|@)(/.*|$)'],
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ['^.+\\.s?css$']
        ]
      }
    ],

    'simple-import-sort/exports': 'error'
  }
}
