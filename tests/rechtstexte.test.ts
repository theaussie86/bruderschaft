import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

// Issue #43: Impressum und Datenschutz dürfen keine Platzhalter wie
// "[Name des Verantwortlichen]" mehr enthalten. Geprüft wird der Seitentext,
// also alles zwischen JSX-Tags, nicht Code wie `useState` oder Arrays.
function seitentext(datei: string) {
  const quelle = readFileSync(join(__dirname, '../src/routes', datei), 'utf8')
  return [...quelle.matchAll(/>([^<>]*)</g)].map((m) => m[1]).join(' ')
}

describe.each(['impressum.tsx', 'datenschutz.tsx'])('%s', (datei) => {
  test('enthält keine eckigen Platzhalter', () => {
    const text = seitentext(datei)

    expect(text).toContain('Hahna Brothers')
    expect(text).not.toMatch(/\[[^\]]*\]/)
  })
})
