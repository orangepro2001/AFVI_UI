import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/',
      // Generated: Wails bindings and the Tailwind output.
      'wailsjs/',
      'src/styles/generated.css',
      // Added by `scripts/ui-add.sh` (shadcn-vue); kept as the CLI writes them.
      'src/components/ui/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['vite.config.ts', 'tools/**/*.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Prettier owns formatting; these only fight it (it hugs the brackets of inline elements).
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'always' } }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
)
