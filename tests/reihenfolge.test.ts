import { describe, expect, test } from 'vitest'

import { verschieben } from '@/lib/reihenfolge'

const liste = [
  { id: 'a', sortierung: 0 },
  { id: 'b', sortierung: 0 },
  { id: 'c', sortierung: 0 },
]

describe('Reihenfolge verschieben', () => {
  test('nach oben vergibt fortlaufende Nummern und tauscht', () => {
    expect(verschieben(liste, 'b', -1)).toEqual([
      { id: 'a', sortierung: 1 },
      { id: 'c', sortierung: 2 },
    ])
  })

  test('liefert nur Einträge, deren Nummer sich ändert', () => {
    const sortiert = [
      { id: 'a', sortierung: 0 },
      { id: 'b', sortierung: 1 },
      { id: 'c', sortierung: 2 },
    ]
    expect(verschieben(sortiert, 'b', 1)).toEqual([
      { id: 'c', sortierung: 1 },
      { id: 'b', sortierung: 2 },
    ])
  })

  test('am Rand passiert nichts', () => {
    const sortiert = [
      { id: 'a', sortierung: 0 },
      { id: 'b', sortierung: 1 },
    ]
    expect(verschieben(sortiert, 'a', -1)).toEqual([])
    expect(verschieben(sortiert, 'b', 1)).toEqual([])
  })
})
