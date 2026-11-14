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
