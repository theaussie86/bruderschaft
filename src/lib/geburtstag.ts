// Geburtstage laufen in der App als JJJJ-MM-TT. PocketBase speichert sie als
// Datum um Mitternacht UTC, deshalb zählen nur die ersten zehn Zeichen.
export function geburtstagAus(wert: unknown) {
  return typeof wert === 'string' ? wert.slice(0, 10) : ''
}

// "17.05.1990" für die Anzeige.
export function geburtstagAnzeigen(geburtstag: string) {
  const [jahr, monat, tag] = geburtstag.split('-')
  return jahr && monat && tag ? `${tag}.${monat}.${jahr}` : ''
}

// Obergrenze für das Datumsfeld: Geburtstage in der Zukunft lehnt PocketBase ab.
export function heute(jetzt = new Date()) {
  const monat = String(jetzt.getMonth() + 1).padStart(2, '0')
  const tag = String(jetzt.getDate()).padStart(2, '0')
  return `${jetzt.getFullYear()}-${monat}-${tag}`
}

// Text für Fehler aus PocketBase: die Meldung zum Feld, sonst die allgemeine.
export function fehlertext(err: unknown, standard: string) {
  const response = (
    err as {
      response?: {
        message?: string
        data?: Record<string, { message?: string } | undefined>
      }
    }
  ).response
  const feld = Object.values(response?.data ?? {}).find((f) => f?.message)
  return feld?.message || response?.message || standard
}
