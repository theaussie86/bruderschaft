import { PDFDocument } from 'pdf-lib'
import { describe, expect, test } from 'vitest'

import type { Sammelbestellung } from '@/lib/sammelbestellung'
import { sammelbestellungPdf } from '@/lib/sammelbestellung-pdf'
import { sammelbestellungXlsx } from '@/lib/sammelbestellung-xlsx'

// Viele Mitglieder für mehrere Seiten, dazu Zeichen, die die PDF-Schrift
// nicht kennt (Emoji), und eine lange Anmerkung.
function modell(): Sammelbestellung {
  const position = {
    artikel: 'Hoodie Größe Übergröße',
    artikelnummer: 'H-100',
    groesse: 'XXL',
    belegung: 'vorne: Logo · hinten: „Spitzname 🦅“',
    anzahl: 2,
    nichtVerfuegbar: true,
  }
  return {
    kopf: {
      clubname: 'Testclub',
      runde: 'Winter 2026',
      erstellt: '14.11.2026',
      auftraege: 80,
      stuecke: 160,
    },
    summen: [{ ...position, belegung: 'vorne: Logo · hinten: Text' }],
    motive: [{ nummer: '7', motiv: 'Logo', drucke: 160 }],
    textdrucke: [
      {
        artikel: 'Hoodie',
        groesse: 'XXL',
        druckstelle: 'hinten',
        text: 'Spitzname 🦅',
        mitglied: 'Mitglied 1',
        anzahl: 2,
        nichtVerfuegbar: false,
      },
    ],
    mitglieder: Array.from({ length: 80 }, (_, i) => ({
      name: `Mitglied ${i + 1}`,
      anmerkung: 'Bitte etwas weiter schneiden, ß und Umlaute äöü. '.repeat(8),
      positionen: [position],
    })),
  }
}

describe('Renderer der Sammelbestellung', () => {
  test('PDF mit Sonderzeichen über mehrere Seiten', async () => {
    const bytes = await sammelbestellungPdf(modell())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })

  test('Excel mit Sonderzeichen', async () => {
    const bytes = await sammelbestellungXlsx(modell())
    // xlsx ist ein Zip-Archiv.
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b])
  })
})
