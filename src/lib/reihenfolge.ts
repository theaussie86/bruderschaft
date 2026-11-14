// Reihenfolge, die der Admin selbst bestimmt (Artikel, Größen, später
// Druckstellen und Motive). Ein Eintrag rückt um eine Stelle nach oben (-1)
// oder unten (+1); danach sind die Nummern fortlaufend ab 0. Zurück kommen
// nur die Einträge, deren Nummer sich ändert, damit so wenig wie möglich
// gespeichert wird.
export type Sortierbar = { id: string; sortierung: number }

export function verschieben(
  liste: ReadonlyArray<Sortierbar>,
  id: string,
  richtung: -1 | 1,
): Array<Sortierbar> {
  const index = liste.findIndex((e) => e.id === id)
  const ziel = index + richtung
  if (index < 0 || ziel < 0 || ziel >= liste.length) return []

  const neu = [...liste]
  ;[neu[index], neu[ziel]] = [neu[ziel], neu[index]]
  return neu
    .map((e, i) => ({ id: e.id, sortierung: i, vorher: e.sortierung }))
    .filter((e) => e.sortierung !== e.vorher)
    .map(({ id: eId, sortierung }) => ({ id: eId, sortierung }))
}

// Nummer für einen neuen Eintrag: ans Ende der Liste.
export function naechsteSortierung(liste: ReadonlyArray<Sortierbar>) {
  return liste.reduce((max, e) => Math.max(max, e.sortierung + 1), 0)
}
