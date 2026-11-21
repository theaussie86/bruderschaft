// Voller Name und Anschrift eines Mitglieds (GLOSSARY.md), alle freiwillig.
// Die Feldnamen sind die der Collection `mitglieder`.
export type Anschrift = {
  voller_name: string
  strasse: string
  plz: string
  ort: string
}

export const ANSCHRIFT_FELDER = [
  'voller_name',
  'strasse',
  'plz',
  'ort',
] as const

export function anschriftAus(record: Record<string, unknown>): Anschrift {
  return Object.fromEntries(
    ANSCHRIFT_FELDER.map((f) => [
      f,
      typeof record[f] === 'string' ? record[f] : '',
    ]),
  ) as Anschrift
}

// Eine Zeile für Listen: "Johann Huber, Hauptstraße 12, 87724 Ottobeuren",
// leer ohne Angaben.
export function anschriftZeile(a: Anschrift) {
  const ort = [a.plz, a.ort].filter(Boolean).join(' ')
  return [a.voller_name, a.strasse, ort].filter(Boolean).join(', ')
}
