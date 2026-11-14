import { describe, expect, test } from 'vitest'

import {
  hinweisBestaetigen,
  hinweisBestaetigt,
  hinweisZuruecksetzen,
} from '@/lib/cookie-hinweis'

// Der Browser-Speicher als einfache Map, so wie localStorage ihn anbietet.
function speicher(start: Record<string, string> = {}) {
  const werte = new Map(Object.entries(start))
  return {
    getItem: (k: string) => werte.get(k) ?? null,
    setItem: (k: string, v: string) => void werte.set(k, v),
    removeItem: (k: string) => void werte.delete(k),
  }
}

describe('Cookie-Hinweis', () => {
  test('ist beim ersten Besuch nicht bestätigt', () => {
    expect(hinweisBestaetigt(speicher())).toBe(false)
  })

  test('bleibt nach dem Bestätigen bestätigt', () => {
    const s = speicher()

    hinweisBestaetigen(s, new Date('2026-11-14T10:00:00Z'))

    expect(hinweisBestaetigt(s)).toBe(true)
  })

  test('fragt nach dem Zurücksetzen erneut', () => {
    const s = speicher()
    hinweisBestaetigen(s)

    hinweisZuruecksetzen(s)

    expect(hinweisBestaetigt(s)).toBe(false)
  })

  test('fragt erneut, wenn eine ältere Fassung bestätigt wurde', () => {
    const s = speicher({
      'cookie-hinweis': JSON.stringify({
        version: 0,
        bestaetigtAm: '2026-01-01',
      }),
    })

    expect(hinweisBestaetigt(s)).toBe(false)
  })

  test('fragt erneut bei einem kaputten Eintrag', () => {
    expect(hinweisBestaetigt(speicher({ 'cookie-hinweis': '{kaputt' }))).toBe(
      false,
    )
  })

  test('ohne nutzbaren Speicher gilt der Hinweis als nicht bestätigt', () => {
    const gesperrt = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {},
    }

    expect(() => hinweisBestaetigen(gesperrt)).not.toThrow()
    expect(hinweisBestaetigt(gesperrt)).toBe(false)
  })
})
