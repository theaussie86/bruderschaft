// Summe eines Auftrags, solange die Bestellrunde offen ist: aus den aktuellen
// Preisen des Sortiments, in Cent (siehe src/lib/geld.ts).

export type AuftragStatus = 'in_arbeit' | 'fertig' | 'verzicht'

// Artikelpreis plus Aufpreis der Größe und der belegten Druckstellen.
export function stueckpreis(
  artikel: { preis: number },
  groesse: { aufpreis: number },
  belegteDruckstellen: Array<{ aufpreis: number }> = [],
) {
  return belegteDruckstellen.reduce(
    (preis, d) => preis + d.aufpreis,
    artikel.preis + groesse.aufpreis,
  )
}

export function auftragsSumme(
  positionen: Array<{
    anzahl: number
    artikel: { preis: number }
    groesse: { aufpreis: number }
    druckstellen?: Array<{ aufpreis: number }>
  }>,
) {
  return positionen.reduce(
    (summe, p) =>
      summe + p.anzahl * stueckpreis(p.artikel, p.groesse, p.druckstellen),
    0,
  )
}
