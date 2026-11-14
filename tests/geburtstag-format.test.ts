import { describe, expect, test } from 'vitest'

import { geburtstagAnzeigen, geburtstagAus, heute } from '@/lib/geburtstag'

describe('Geburtstag formatieren', () => {
  test('nimmt das Datum aus dem PocketBase-Wert', () => {
    expect(geburtstagAus('1990-05-17 00:00:00.000Z')).toBe('1990-05-17')
    expect(geburtstagAus('')).toBe('')
    expect(geburtstagAus(undefined)).toBe('')
  })

  test('zeigt das Datum deutsch an', () => {
    expect(geburtstagAnzeigen('1990-05-17')).toBe('17.05.1990')
    expect(geburtstagAnzeigen('')).toBe('')
  })

  test('heute als Obergrenze für das Datumsfeld', () => {
    expect(heute(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
