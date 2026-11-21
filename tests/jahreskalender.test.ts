import { describe, expect, test } from 'vitest'

import type { Termin } from '@/lib/termine'
import { jahresblatt, legende } from '@/lib/jahreskalender'

function termin(felder: Partial<Termin>): Termin {
  return {
    id: 'x',
    titel: 'KHS',
    art: 'stammtisch',
    beginn: '2026-03-05 18:30:00.000Z',
    ende: '',
    ganztaegig: false,
    ort: '',
    infotext: '',
    abgesagt: false,
    ...felder,
  }
}

function tag(blatt: ReturnType<typeof jahresblatt>, monat: number, t: number) {
  return blatt[monat - 1].tage[t - 1]
}

describe('Jahresblatt zum Ausdrucken', () => {
  test('hat zwölf Monate mit ihren Tagen und Wochentagen', () => {
    const blatt = jahresblatt(2026, [], [])
    expect(blatt.map((m) => m.name)).toEqual([
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ])
    expect(blatt[1].tage).toHaveLength(28)
    expect(blatt[0].tage).toHaveLength(31)
    expect(jahresblatt(2028, [], [])[1].tage).toHaveLength(29)
    expect(tag(blatt, 1, 1)).toMatchObject({ tag: 1, wochentag: 'Do' })
    expect(tag(blatt, 11, 21)).toMatchObject({ tag: 21, wochentag: 'Sa' })
  })
  test('färbt Samstage hell, Sonntage und Feiertage in Bayern kräftig', () => {
    const blatt = jahresblatt(2026, [], [])
    expect(tag(blatt, 3, 6).farbe).toBeNull()
    expect(tag(blatt, 3, 7).farbe).toBe('samstag')
    expect(tag(blatt, 3, 8).farbe).toBe('frei')
    const feiertage = [
      [1, 1],
      [1, 6],
      [4, 3],
      [4, 6],
      [5, 1],
      [5, 14],
      [5, 25],
      [6, 4],
      [10, 3],
      [12, 25],
      [12, 26],
    ]
    for (const [m, t] of feiertage) expect(tag(blatt, m, t).farbe).toBe('frei')
    // Ostern 2027 liegt am 28. März.
    expect(tag(jahresblatt(2027, [], []), 3, 29).farbe).toBe('frei')
  })
  test('trägt Termine und Geburtstage am Tag ein, abgesagte Termine nicht', () => {
    const blatt = jahresblatt(
      2026,
      [
        termin({ titel: 'KHS', beginn: '2026-03-05 18:30:00.000Z' }),
        // 23:30 deutscher Zeit am 6. März, in UTC noch derselbe Tag
        termin({ titel: 'Spät', beginn: '2026-03-06 22:30:00.000Z' }),
        termin({
          titel: 'Rocknacht',
          art: 'veranstaltung',
          beginn: '2026-07-18 12:00:00.000Z',
          ganztaegig: true,
        }),
        termin({
          titel: 'Fällt aus',
          beginn: '2026-03-12 18:30:00.000Z',
          abgesagt: true,
        }),
        termin({ titel: 'Anderes Jahr', beginn: '2027-03-05 18:30:00.000Z' }),
      ],
      [{ name: 'Harry', datum: '2026-02-17', alter: 50 }],
    )
    expect(tag(blatt, 3, 5).eintraege).toEqual([
      { text: 'KHS', art: 'stammtisch', farbe: 'grau', fortsetzung: false },
    ])
    expect(tag(blatt, 3, 6).eintraege).toEqual([
      { text: 'Spät', art: 'stammtisch', farbe: 'grau', fortsetzung: false },
    ])
    expect(tag(blatt, 7, 18).eintraege).toEqual([
      {
        text: 'Rocknacht',
        art: 'veranstaltung',
        farbe: 'gelb',
        fortsetzung: false,
      },
    ])
    expect(tag(blatt, 2, 17).eintraege).toEqual([
      {
        text: 'Harry Geb.',
        art: 'geburtstag',
        farbe: 'rot',
        fortsetzung: false,
      },
    ])
    expect(tag(blatt, 3, 12).eintraege).toEqual([])
    const alle = blatt.flatMap((m) => m.tage.flatMap((t) => t.eintraege))
    expect(alle).toHaveLength(4)
  })

  test('zieht mehrtägige Termine über alle Tage, mit Titel am Anfang jedes Monats', () => {
    const blatt = jahresblatt(
      2026,
      [
        termin({
          titel: 'Ski fahrn',
          art: 'urlaub',
          beginn: '2026-02-20 12:00:00.000Z',
          ende: '2026-02-22 12:00:00.000Z',
          ganztaegig: true,
        }),
        termin({
          titel: 'Dublin Tour',
          art: 'urlaub',
          beginn: '2026-04-30 12:00:00.000Z',
          ende: '2026-05-02 12:00:00.000Z',
          ganztaegig: true,
        }),
        termin({
          titel: 'Silvester',
          art: 'urlaub',
          beginn: '2025-12-30 12:00:00.000Z',
          ende: '2026-01-02 12:00:00.000Z',
          ganztaegig: true,
        }),
      ],
      [],
    )
    const ski = (t: number) => tag(blatt, 2, t).eintraege
    expect(ski(19)).toEqual([])
    expect(ski(20)).toEqual([
      { text: 'Ski fahrn', art: 'urlaub', farbe: 'gelb', fortsetzung: false },
    ])
    expect(ski(21)).toEqual([
      { text: 'Ski fahrn', art: 'urlaub', farbe: 'gelb', fortsetzung: true },
    ])
    expect(ski(22)).toEqual([
      { text: 'Ski fahrn', art: 'urlaub', farbe: 'gelb', fortsetzung: true },
    ])
    expect(ski(23)).toEqual([])
    expect(tag(blatt, 5, 1).eintraege[0].fortsetzung).toBe(false)
    expect(tag(blatt, 5, 2).eintraege[0].fortsetzung).toBe(true)
    expect(tag(blatt, 1, 1).eintraege[0]).toEqual({
      text: 'Silvester',
      art: 'urlaub',
      farbe: 'gelb',
      fortsetzung: false,
    })
    expect(tag(blatt, 1, 2).eintraege[0].fortsetzung).toBe(true)
    expect(tag(blatt, 1, 3).eintraege).toEqual([])
  })
  test('färbt Termine in ihrer hinterlegten Farbe, sonst nach Art', () => {
    const blatt = jahresblatt(
      2026,
      [
        termin({
          titel: 'GHS',
          farbe: 'blau',
          beginn: '2026-03-20 18:30:00.000Z',
        }),
        termin({ titel: 'KHS', beginn: '2026-03-05 18:30:00.000Z' }),
        termin({
          titel: 'Rocknacht',
          art: 'veranstaltung',
          farbe: 'gruen',
          beginn: '2026-07-18 16:00:00.000Z',
        }),
      ],
      [],
    )
    expect(tag(blatt, 3, 20).eintraege[0].farbe).toBe('blau')
    expect(tag(blatt, 3, 5).eintraege[0].farbe).toBe('grau')
    expect(tag(blatt, 7, 18).eintraege[0].farbe).toBe('gruen')
  })
})

describe('Legende des Jahresblatts', () => {
  test('nennt die Farben der Arten und dazu die Titel mit eigener Farbe', () => {
    const blatt = jahresblatt(
      2026,
      [
        termin({
          titel: 'GHS',
          farbe: 'blau',
          beginn: '2026-03-20 18:30:00.000Z',
        }),
        termin({
          titel: 'GHS',
          farbe: 'blau',
          beginn: '2026-07-31 18:30:00.000Z',
        }),
        termin({
          titel: 'KHS',
          farbe: 'grau',
          beginn: '2026-03-05 18:30:00.000Z',
        }),
        termin({
          titel: 'Dublin Tour',
          art: 'urlaub',
          farbe: 'grau',
          beginn: '2026-05-14 12:00:00.000Z',
          ende: '2026-05-17 12:00:00.000Z',
          ganztaegig: true,
        }),
      ],
      [],
    )
    expect(legende(blatt)).toEqual([
      { farbe: 'grau', text: 'Stammtisch, Dublin Tour' },
      { farbe: 'gelb', text: 'Hahna Äktschn' },
      { farbe: 'blau', text: 'GHS' },
      { farbe: 'rot', text: 'Geburtstag' },
    ])
  })
})
