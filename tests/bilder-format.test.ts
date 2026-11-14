import { describe, expect, test } from 'vitest'

import { zielGroesse } from '@/lib/bilder'

describe('Bilder: Verkleinern vor dem Upload', () => {
  test('längste Kante auf 2000 px, Seitenverhältnis bleibt', () => {
    expect(zielGroesse(4032, 3024)).toEqual({ breite: 2000, hoehe: 1500 })
    expect(zielGroesse(3024, 4032)).toEqual({ breite: 1500, hoehe: 2000 })
  })

  test('kleinere Bilder werden nicht vergrößert', () => {
    expect(zielGroesse(1200, 800)).toEqual({ breite: 1200, hoehe: 800 })
  })
})
