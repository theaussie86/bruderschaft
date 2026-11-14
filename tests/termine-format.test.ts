import { describe, expect, test } from 'vitest'

import type { Termin } from '@/lib/termine'
import {
  archivTermine,
  berlinTag,
  berlinZeit,
  bilderErlaubt,
  formularAusTermin,
  kommendeTermine,
  terminDaten,
  zeitText,
} from '@/lib/termine'

function termin(felder: Partial<Termin>): Termin {
  return {
    id: 'x',
    titel: 'Stammtisch',
    art: 'stammtisch',
    beginn: '2026-12-11 18:30:00.000Z',
    ende: '',
    ganztaegig: false,
    ort: '',
    infotext: '',
    abgesagt: false,
    ...felder,
  }
}

describe('Termine: Zeiten in deutscher Zeit', () => {
  test('Tag und Uhrzeit aus dem PocketBase-Wert, Winter- und Sommerzeit', () => {
    expect(berlinTag('2026-12-11 18:30:00.000Z')).toBe('2026-12-11')
    expect(berlinZeit('2026-12-11 18:30:00.000Z')).toBe('19:30')
    expect(berlinZeit('2027-07-10 14:00:00.000Z')).toBe('16:00')
    expect(berlinTag('2026-12-11 23:30:00.000Z')).toBe('2026-12-12')
  })

  test('Formular in PocketBase-Werte, Uhrzeit als deutsche Zeit', () => {
    expect(
      terminDaten({
        tag: '2026-12-11',
        von: '19:30',
        endeTag: '',
        bis: '22:00',
        ganztaegig: false,
      }),
    ).toEqual({
      beginn: '2026-12-11 18:30:00.000Z',
      ende: '2026-12-11 21:00:00.000Z',
    })
    expect(
      terminDaten({
        tag: '2027-07-10',
        von: '14:00',
        endeTag: '2027-07-11',
        bis: '02:00',
        ganztaegig: false,
      }),
    ).toEqual({
      beginn: '2027-07-10 12:00:00.000Z',
      ende: '2027-07-11 00:00:00.000Z',
    })
  })

  test('ganztägig zählt nur der Tag, ohne Ende kein Ende', () => {
    expect(
      terminDaten({
        tag: '2027-07-10',
        von: '',
        endeTag: '2027-07-11',
        bis: '',
        ganztaegig: true,
      }),
    ).toEqual({
      beginn: '2027-07-10 12:00:00.000Z',
      ende: '2027-07-11 12:00:00.000Z',
    })
    expect(
      terminDaten({
        tag: '2027-07-10',
        von: '',
        endeTag: '',
        bis: '',
        ganztaegig: true,
      }),
    ).toEqual({ beginn: '2027-07-10 12:00:00.000Z', ende: '' })
  })

  test('Formular aus einem Termin und zurück ergibt dieselben Werte', () => {
    const t = termin({
      beginn: '2027-07-10 12:00:00.000Z',
      ende: '2027-07-11 00:00:00.000Z',
    })
    expect(terminDaten(formularAusTermin(t))).toEqual({
      beginn: t.beginn,
      ende: t.ende,
    })
  })

  test('Zeittext für die Anzeige', () => {
    expect(zeitText(termin({}))).toBe('19:30 Uhr')
    expect(zeitText(termin({ ende: '2026-12-11 21:00:00.000Z' }))).toBe(
      '19:30 bis 22:00 Uhr',
    )
    expect(
      zeitText(
        termin({ beginn: '2026-12-11 12:00:00.000Z', ganztaegig: true }),
      ),
    ).toBe('ganztägig')
    expect(
      zeitText(
        termin({
          beginn: '2026-12-11 12:00:00.000Z',
          ende: '2026-12-13 12:00:00.000Z',
          ganztaegig: true,
        }),
      ),
    ).toBe('ganztägig bis 13.12.2026')
  })
})

describe('Termine: Ansicht Kommend', () => {
  const jetzt = new Date('2026-12-11T20:00:00.000Z')

  test('heutige und künftige Termine, aufsteigend, auch abgesagte', () => {
    const liste = kommendeTermine(
      [
        termin({ id: 'spaeter', beginn: '2027-01-08 18:30:00.000Z' }),
        termin({ id: 'gestern', beginn: '2026-12-10 18:30:00.000Z' }),
        termin({ id: 'heute', beginn: '2026-12-11 06:00:00.000Z' }),
        termin({
          id: 'abgesagt',
          beginn: '2026-12-20 18:30:00.000Z',
          abgesagt: true,
        }),
      ],
      jetzt,
    )

    expect(liste.map((t) => t.id)).toEqual(['heute', 'abgesagt', 'spaeter'])
  })

  test('ein mehrtägiger Termin bleibt bis zu seinem Ende kommend', () => {
    const liste = kommendeTermine(
      [
        termin({
          id: 'wochenende',
          beginn: '2026-12-09 12:00:00.000Z',
          ende: '2026-12-11 12:00:00.000Z',
          ganztaegig: true,
        }),
      ],
      jetzt,
    )

    expect(liste.map((t) => t.id)).toEqual(['wochenende'])
  })
})

describe('Termine: Archiv', () => {
  const jetzt = new Date('2026-12-11T10:00:00Z')

  test('vergangene, nicht abgesagte Veranstaltungen, neueste zuerst', () => {
    const liste = archivTermine(
      [
        termin({
          id: 'alt',
          art: 'veranstaltung',
          beginn: '2025-06-01 12:00:00.000Z',
        }),
        termin({
          id: 'neu',
          art: 'veranstaltung',
          beginn: '2026-12-10 18:00:00.000Z',
        }),
        termin({
          id: 'abgesagt',
          art: 'veranstaltung',
          beginn: '2026-11-01 18:00:00.000Z',
          abgesagt: true,
        }),
        termin({ id: 'stammtisch', beginn: '2026-11-05 18:30:00.000Z' }),
        termin({
          id: 'heute',
          art: 'veranstaltung',
          beginn: '2026-12-11 08:00:00.000Z',
        }),
      ],
      jetzt,
    )

    expect(liste.map((t) => t.id)).toEqual(['neu', 'alt'])
  })

  test('ein mehrtägiger Termin kommt erst nach seinem letzten Tag ins Archiv', () => {
    const wochenende = termin({
      art: 'veranstaltung',
      beginn: '2026-12-09 12:00:00.000Z',
      ende: '2026-12-11 12:00:00.000Z',
      ganztaegig: true,
    })

    expect(archivTermine([wochenende], jetzt)).toEqual([])
    expect(
      archivTermine([wochenende], new Date('2026-12-12T10:00:00Z')),
    ).toHaveLength(1)
  })

  test('Bilder gibt es zu Veranstaltungen, sobald sie begonnen haben', () => {
    const fest = termin({
      art: 'veranstaltung',
      beginn: '2026-12-11 08:00:00.000Z',
    })

    expect(bilderErlaubt(fest, jetzt)).toBe(true)
    expect(bilderErlaubt(fest, new Date('2026-12-11T07:00:00Z'))).toBe(false)
    expect(bilderErlaubt({ ...fest, abgesagt: true }, jetzt)).toBe(false)
    expect(bilderErlaubt({ ...fest, art: 'stammtisch' }, jetzt)).toBe(false)
  })
})
