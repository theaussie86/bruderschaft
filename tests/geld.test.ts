import { describe, expect, test } from 'vitest'

import { centAus, euro, euroMitVorzeichen, korrekturAus } from '@/lib/geld'

describe('Geldbeträge', () => {
  test('Cent werden als Euro angezeigt', () => {
    expect(euro(3990)).toBe('39,90 €')
    expect(euro(0)).toBe('0,00 €')
    expect(euro(123456)).toBe('1.234,56 €')
  })

  test.each([
    ['39,90', 3990],
    ['39.9', 3990],
    ['39', 3900],
    [' 0,5 ', 50],
    ['', 0],
  ])('Eingabe "%s" ergibt %i Cent', (eingabe, cent) => {
    expect(centAus(eingabe)).toBe(cent)
  })

  test.each(['abc', '-1', '1,234', '1.2.3'])(
    'Eingabe "%s" ist kein Betrag',
    (eingabe) => {
      expect(centAus(eingabe)).toBeNull()
    },
  )
})

describe('Korrekturbetrag', () => {
  test('liest Beträge mit Vorzeichen', () => {
    expect(korrekturAus('-5,00')).toBe(-500)
    expect(korrekturAus('+4,5')).toBe(450)
    expect(korrekturAus('3')).toBe(300)
    expect(korrekturAus('')).toBe(0)
    expect(korrekturAus('- 5')).toBeNull()
    expect(korrekturAus('abc')).toBeNull()
  })

  test('zeigt das Vorzeichen', () => {
    expect(euroMitVorzeichen(-500)).toBe('-5,00 €')
    expect(euroMitVorzeichen(450)).toBe('+4,50 €')
  })
})
