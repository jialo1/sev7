import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Faux positif récurrent sur le pattern documenté de data fetching
      // dans useEffect (https://react.dev/reference/react/useEffect#fetching-data-with-effects).
      // Nos effets utilisent un drapeau `active` pour gérer le cleanup, ce
      // qui couvre déjà le cascading-render que la règle vise à éviter.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
