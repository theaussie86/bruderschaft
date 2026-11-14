//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

// reference/ hält den Klick-Dummy als Vorlage für die Screens, er wird weder
// gebaut noch gelintet.
export default [{ ignores: ['reference/**', '.pocketbase/**'] }, ...tanstackConfig]
