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
  const text = (feld: keyof Anschrift) =>
    typeof record[feld] === 'string' ? record[feld] : ''
  return {
    voller_name: text('voller_name'),
    strasse: text('strasse'),
    plz: text('plz'),
    ort: text('ort'),
  }
}

// Eine Zeile für Listen: "Johann Huber, Hauptstraße 12, 87724 Ottobeuren",
// leer ohne Angaben.
export function anschriftZeile(a: Anschrift) {
  const ort = [a.plz, a.ort].filter(Boolean).join(' ')
  return [a.voller_name, a.strasse, ort].filter(Boolean).join(', ')
}
