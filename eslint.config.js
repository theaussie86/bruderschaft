//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

// reference/ hält den Klick-Dummy als Vorlage für die Screens, er wird weder
// gebaut noch gelintet. .sandcastle/ und die Config-Dateien liegen außerhalb
// des tsconfig-Projekts, der typisierte Parser kann sie nicht auflösen. Unter
// pocketbase/ läuft JavaScript in der Laufzeit von PocketBase, nicht in Node.
export default [
  {
    ignores: [
      'reference/**',
      '.pocketbase/**',
      '.sandcastle/**',
      'pocketbase/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  ...tanstackConfig,
]
