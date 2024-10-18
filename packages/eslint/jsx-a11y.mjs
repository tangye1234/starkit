import jsxA11y from 'eslint-plugin-jsx-a11y'

/** @type {import('eslint').Linter.Config[]} */
export default [
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      'jsx-a11y/alt-text': [
        'warn',
        {
          elements: ['img']
        }
      ],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn'
    }
  }
]
