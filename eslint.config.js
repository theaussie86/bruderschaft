//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

// reference/ hält den Klick-Dummy als Vorlage für die Screens, er wird weder
// gebaut noch gelintet. .sandcastle/ und die Config-Dateien liegen außerhalb
// des tsconfig-Projekts, der typisierte Parser kann sie nicht auflösen.
export default [
  {
    ignores: [
      'reference/**',
      '.pocketbase/**',
      '.sandcastle/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  ...tanstackConfig,
]
