import { describe, expect, test } from 'vitest'

import { auftragsSumme, stueckpreis } from '@/lib/auftrag'

describe('Summe eines Auftrags', () => {
  test('Stückpreis ist Artikelpreis plus Größen-Aufpreis', () => {
    expect(stueckpreis({ preis: 3990 }, { aufpreis: 300 })).toBe(4290)
    expect(stueckpreis({ preis: 3990 }, { aufpreis: 0 })).toBe(3990)
  })

  test('Summe zählt jede Position mit ihrer Anzahl', () => {
    expect(
      auftragsSumme([
        { anzahl: 2, artikel: { preis: 3990 }, groesse: { aufpreis: 300 } },
        { anzahl: 1, artikel: { preis: 1500 }, groesse: { aufpreis: 0 } },
      ]),
    ).toBe(2 * 4290 + 1500)
  })

  test('ein leerer Auftrag kostet nichts', () => {
    expect(auftragsSumme([])).toBe(0)
  })
})

describe('Aufpreise belegter Druckstellen', () => {
  test('Stückpreis enthält die Aufpreise belegter Druckstellen', () => {
    expect(
      stueckpreis({ preis: 3990 }, { aufpreis: 300 }, [
        { aufpreis: 200 },
        { aufpreis: 500 },
      ]),
    ).toBe(4990)
  })

  test('Summe rechnet die Aufpreise pro Stück', () => {
    expect(
      auftragsSumme([
        {
          anzahl: 2,
          artikel: { preis: 3990 },
          groesse: { aufpreis: 0 },
          druckstellen: [{ aufpreis: 500 }],
        },
        { anzahl: 1, artikel: { preis: 1500 }, groesse: { aufpreis: 0 } },
      ]),
    ).toBe(2 * 4490 + 1500)
  })
})
