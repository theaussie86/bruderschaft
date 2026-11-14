// Cookie-Hinweis (Issue #42). Die App speichert nur technisch Notwendiges,
// eine Einwilligung braucht es dafür nicht (§ 25 Abs. 2 Nr. 2 TDDDG). Der
// Hinweis informiert deshalb nur und merkt sich, dass er gelesen wurde.
//
// Kommt etwas Einwilligungspflichtiges dazu (Analyse, Einbettungen), bekommt
// es hier eine eigene Kategorie mit Schalter, und HINWEIS_VERSION steigt.
// Dann fragt der Hinweis alle erneut.

export const HINWEIS_SCHLUESSEL = 'cookie-hinweis'
export const HINWEIS_VERSION = 1

// Jede Speicherung im Browser, die die App vornimmt. Die Cookie-Seite und die
// Datenschutzerklärung zeigen genau diese Liste.
export type Speicherung = {
  name: string
  art: 'Cookie' | 'localStorage'
  zweck: string
  dauer: string
}

export const SPEICHERUNGEN: ReadonlyArray<Speicherung> = [
  {
    name: 'pb_auth',
    art: 'Cookie',
    zweck:
      'Hält dich angemeldet. Wird erst beim Login gesetzt, ist für JavaScript nicht lesbar (httpOnly) und geht nur an diese App.',
    dauer: '90 Tage, verlängert sich bei jeder Nutzung. Beim Abmelden gelöscht.',
  },
  {
    name: HINWEIS_SCHLUESSEL,
    art: 'localStorage',
    zweck:
      'Merkt sich, dass du den Cookie-Hinweis gelesen hast. Bleibt in deinem Browser und wird nie übertragen.',
    dauer: 'Bis du ihn auf der Cookie-Seite zurücksetzt oder die Browserdaten löschst.',
  },
]

type Speicher = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function hinweisBestaetigt(speicher: Speicher): boolean {
  try {
    const roh = speicher.getItem(HINWEIS_SCHLUESSEL)
    if (!roh) return false
    const wert = JSON.parse(roh) as { version?: unknown }
    return wert.version === HINWEIS_VERSION
  } catch {
    return false
  }
}

export function hinweisBestaetigen(speicher: Speicher, jetzt = new Date()) {
  try {
    speicher.setItem(
      HINWEIS_SCHLUESSEL,
      JSON.stringify({
        version: HINWEIS_VERSION,
        bestaetigtAm: jetzt.toISOString(),
      }),
    )
  } catch {
    // Gesperrter Speicher (z. B. strenger Privatmodus): Der Hinweis kommt
    // dann beim nächsten Laden wieder, mehr passiert nicht.
  }
}

export function hinweisZuruecksetzen(speicher: Speicher) {
  try {
    speicher.removeItem(HINWEIS_SCHLUESSEL)
  } catch {
    // siehe hinweisBestaetigen
  }
}
