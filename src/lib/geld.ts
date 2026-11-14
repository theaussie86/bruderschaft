// Preise und Aufpreise liegen in PocketBase in Cent als ganze Zahl.

const FORMAT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// 3990 -> "39,90 €"
export function euro(cent: number) {
  return `${FORMAT.format(cent / 100)} €`
}

// Eingabe aus einem Formularfeld ("39,90", "39.9", "39") in Cent. Leer heißt
// 0; alles andere, auch negative Beträge, ergibt null.
export function centAus(eingabe: string): number | null {
  const text = eingabe.trim()
  if (text === '') return 0
  const treffer = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text)
  if (!treffer) return null
  const [, euroTeil, centTeil = ''] = treffer
  return Number(euroTeil) * 100 + Number(centTeil.padEnd(2, '0'))
}

// 3990 -> "39,90" für das Formularfeld.
export function centAlsEingabe(cent: number) {
  return (cent / 100).toFixed(2).replace('.', ',')
}

// Korrektur aus dem Formularfeld ("-5,00", "+4,5", "3") in Cent, mit
// Vorzeichen. Leer heißt 0, alles andere ergibt null.
export function korrekturAus(eingabe: string): number | null {
  const text = eingabe.trim()
  if (/^[+-]\s/.test(text)) return null
  const betrag = centAus(text.replace(/^[+-]/, ''))
  if (betrag === null) return null
  return text.startsWith('-') ? -betrag : betrag
}

// -500 -> "-5,00 €", 450 -> "+4,50 €"
export function euroMitVorzeichen(cent: number) {
  return `${cent < 0 ? '-' : '+'}${euro(Math.abs(cent))}`
}
