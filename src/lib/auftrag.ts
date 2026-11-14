// Summe eines Auftrags, solange die Bestellrunde offen ist: aus den aktuellen
// Preisen des Sortiments, in Cent (siehe src/lib/geld.ts).

export type AuftragStatus = 'in_arbeit' | 'fertig' | 'verzicht'

export function stueckpreis(
  artikel: { preis: number },
  groesse: { aufpreis: number },
) {
  return artikel.preis + groesse.aufpreis
}

export function auftragsSumme(
  positionen: Array<{
    anzahl: number
    artikel: { preis: number }
    groesse: { aufpreis: number }
  }>,
) {
  return positionen.reduce(
    (summe, p) => summe + p.anzahl * stueckpreis(p.artikel, p.groesse),
    0,
  )
}
