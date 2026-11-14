import { describe, expect, test } from 'vitest'

import {
  belegteDruckstellen,
  belegungsText,
  fehlendePflicht,
  startWahl,
  waehlbareDruckstellen,
  wahlSpeichern,
} from '@/lib/belegung'

const motiv = (id: string, ausgeblendet = false) => ({
  id,
  name: `Motiv ${id}`,
  ausgeblendet,
})

const druckstelle = (
  id: string,
  felder: Partial<{
    art: 'motiv' | 'text'
    pflicht: boolean
    aufpreis: number
    erlaubte_motive: Array<string>
    ausgeblendet: boolean
  }> = {},
) => ({
  id,
  name: id,
  art: 'motiv' as const,
  pflicht: false,
  aufpreis: 0,
  erlaubte_motive: [],
  ausgeblendet: false,
  ...felder,
})

describe('Belegung wählen', () => {
  test('Pflicht-Druckstelle mit nur einem erlaubten Motiv ist vorausgewählt', () => {
    const wahl = startWahl(
      [
        druckstelle('vorne', { pflicht: true, erlaubte_motive: ['a', 'b'] }),
        druckstelle('hinten', { erlaubte_motive: ['a'] }),
        druckstelle('aermel', {
          pflicht: true,
          erlaubte_motive: ['a', 'c'],
        }),
      ],
      [motiv('a'), motiv('b', true), motiv('c')],
      [],
    )

    expect(wahl).toEqual({ vorne: { motiv: 'a' } })
  })

  test('bestehende Belegungen bilden die Startwahl', () => {
    const wahl = startWahl(
      [druckstelle('vorne', { pflicht: true, erlaubte_motive: ['a'] })],
      [motiv('a')],
      [{ id: 'b1', druckstelle: 'vorne', motiv: 'x', text: '' }],
    )

    expect(wahl).toEqual({ vorne: { motiv: 'x' } })
  })

  test('ausgeblendete Druckstellen stehen nicht zur Wahl', () => {
    expect(
      waehlbareDruckstellen([
        druckstelle('vorne'),
        druckstelle('hinten', { ausgeblendet: true }),
      ]).map((d) => d.id),
    ).toEqual(['vorne'])
  })

  test('fehlende Pflicht-Druckstellen, leerer Text zählt als fehlend', () => {
    const druckstellen = [
      druckstelle('vorne', { pflicht: true }),
      druckstelle('name', { art: 'text', pflicht: true }),
      druckstelle('hinten'),
      druckstelle('alt', { pflicht: true, ausgeblendet: true }),
    ]

    expect(
      fehlendePflicht(druckstellen, { name: { text: '  ' } }).map((d) => d.id),
    ).toEqual(['vorne', 'name'])
    expect(
      fehlendePflicht(druckstellen, {
        vorne: { motiv: 'a' },
        name: { text: 'Spitzname' },
      }),
    ).toEqual([])
  })

  test('Speichern legt an, ändert und löscht nur, was sich geändert hat', () => {
    const schritte = wahlSpeichern(
      [
        druckstelle('vorne'),
        druckstelle('name', { art: 'text' }),
        druckstelle('hinten'),
        druckstelle('aermel'),
      ],
      [
        { id: 'b1', druckstelle: 'vorne', motiv: 'a', text: '' },
        { id: 'b2', druckstelle: 'name', motiv: '', text: 'Alt' },
        { id: 'b3', druckstelle: 'hinten', motiv: 'a', text: '' },
      ],
      {
        vorne: { motiv: 'a' },
        name: { text: ' Neu ' },
        aermel: { motiv: 'b' },
      },
    )

    expect(schritte).toEqual({
      anlegen: [{ druckstelle: 'aermel', motiv: 'b', text: '' }],
      aendern: [{ id: 'b2', motiv: '', text: 'Neu' }],
      loeschen: ['b3'],
    })
  })
})

describe('Belegung anzeigen', () => {
  const druckstellen = [
    druckstelle('vorne', { aufpreis: 200 }),
    druckstelle('name', { art: 'text', aufpreis: 500 }),
    druckstelle('hinten', { aufpreis: 100 }),
  ]
  const belegungen = [
    { id: 'b1', druckstelle: 'vorne', motiv: 'a', text: '' },
    { id: 'b2', druckstelle: 'name', motiv: '', text: 'Spitzname' },
  ]

  test('belegte Druckstellen liefern die Aufpreise', () => {
    expect(
      belegteDruckstellen(druckstellen, belegungen).map((d) => d.aufpreis),
    ).toEqual([200, 500])
  })

  test('Text nennt Druckstelle und Motiv oder Text', () => {
    expect(belegungsText(druckstellen, [motiv('a')], belegungen)).toBe(
      'vorne: Motiv a · name: „Spitzname“',
    )
  })
})
