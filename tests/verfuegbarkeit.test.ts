import { describe, expect, test } from 'vitest'

import { nichtVerfuegbar, positionNichtVerfuegbar } from '@/lib/verfuegbarkeit'

const da = { ausgeblendet: false }
const weg = { ausgeblendet: true }

describe('nicht mehr verfügbar', () => {
  test('alles eingeblendet ist verfügbar', () => {
    expect(nichtVerfuegbar(da, da, [{ druckstelle: da, motiv: da }])).toBe(
      false,
    )
  })

  test('ausgeblendeter Artikel, Größe, Druckstelle oder Motiv markiert', () => {
    expect(nichtVerfuegbar(weg, da)).toBe(true)
    expect(nichtVerfuegbar(da, weg)).toBe(true)
    expect(nichtVerfuegbar(da, da, [{ druckstelle: weg }])).toBe(true)
    expect(nichtVerfuegbar(da, da, [{ druckstelle: da, motiv: weg }])).toBe(
      true,
    )
  })

  function sortiment(felder: {
    artikel?: boolean
    groesse?: boolean
    druckstelle?: boolean
  }) {
    return [
      {
        id: 'hoodie',
        ausgeblendet: !!felder.artikel,
        groessen: [{ id: 'xl', ausgeblendet: !!felder.groesse }],
        druckstellen: [{ id: 'vorne', ausgeblendet: !!felder.druckstelle }],
      },
    ]
  }
  const position = { id: 'p1', artikel: 'hoodie', groesse: 'xl' }
  const belegungen = [
    { position: 'p1', druckstelle: 'vorne', motiv: 'adler' },
    { position: 'p2', druckstelle: 'vorne', motiv: 'logo' },
  ]

  test('Position mit IDs: zählt nur die eigenen Belegungen', () => {
    const motive = [
      { id: 'adler', ausgeblendet: false },
      { id: 'logo', ausgeblendet: true },
    ]
    expect(
      positionNichtVerfuegbar(position, sortiment({}), motive, belegungen),
    ).toBe(false)
    expect(
      positionNichtVerfuegbar(
        position,
        sortiment({}),
        [{ id: 'adler', ausgeblendet: true }],
        belegungen,
      ),
    ).toBe(true)
  })

  test('Position mit IDs: Artikel, Größe und Druckstelle', () => {
    expect(
      positionNichtVerfuegbar(position, sortiment({ artikel: true }), [], []),
    ).toBe(true)
    expect(
      positionNichtVerfuegbar(position, sortiment({ groesse: true }), [], []),
    ).toBe(true)
    expect(
      positionNichtVerfuegbar(
        position,
        sortiment({ druckstelle: true }),
        [],
        belegungen,
      ),
    ).toBe(true)
  })
})
