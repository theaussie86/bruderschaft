import type { ProtokollKnoten } from '@/lib/protokoll'
import { fehlertext } from '@/lib/geburtstag'
import { protokollTextLeer } from '@/lib/protokoll'
import { berlinZeit } from '@/lib/termine'

// Der Entwurf des Protokolltexts auf dem Gerät (Issue #65). Am Stammtisch ist
// das WLAN wacklig: Während des Tippens sichert der Browser den Stand pro
// Termin im localStorage, damit er Netzausfall und Absturz übersteht. Nach
// erfolgreichem Speichern fällt der Entwurf weg.

export const ENTWURF_PRAEFIX = 'protokoll-entwurf:'

type Speicher = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function schluessel(terminId: string) {
  return `${ENTWURF_PRAEFIX}${terminId}`
}

export function entwurfSichern(
  speicher: Speicher,
  terminId: string,
  dokument: ProtokollKnoten,
) {
  try {
    speicher.setItem(schluessel(terminId), JSON.stringify(dokument))
  } catch {
    // Gesperrter oder voller Speicher (z. B. strenger Privatmodus): Der Text
    // bleibt im Editor, nur der Schutz vor Absturz fehlt.
  }
}

export function entwurfLesen(
  speicher: Speicher,
  terminId: string,
): ProtokollKnoten | null {
  try {
    const roh = speicher.getItem(schluessel(terminId))
    return roh ? (JSON.parse(roh) as ProtokollKnoten) : null
  } catch {
    return null
  }
}

// Zwei Stände des Protokolltexts sind gleich, wenn sie dasselbe Dokument
// beschreiben. Die Reihenfolge der Schlüssel im JSON zählt nicht, und zwei
// leere Dokumente sind gleich, auch wenn eines davon gar nicht existiert.
export function dokumenteGleich(a: unknown, b: unknown): boolean {
  if (protokollTextLeer(a) && protokollTextLeer(b)) return true
  return geordnet(a) === geordnet(b)
}

function geordnet(wert: unknown): string {
  return JSON.stringify(wert ?? null, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
        )
      : v,
  )
}

export const OHNE_NETZ =
  'Keine Verbindung. Dein Text ist auf diesem Gerät gesichert. Versuch es gleich noch einmal.'

export type SpeicherErgebnis<T> =
  { ok: true; termin: T } | { ok: false; fehler: string }

// Speichert den Protokolltext und räumt danach den Entwurf auf. Wer während
// des Speicherns weitergeschrieben hat, behält seinen neueren Entwurf. Schlägt
// das Speichern fehl, bleibt der Entwurf, und es gibt eine Meldung statt
// eines Fehlers.
export async function speichernMitEntwurf<T>({
  speicher,
  terminId,
  dokument,
  aktuell,
  senden,
}: {
  speicher: Speicher
  terminId: string
  dokument: ProtokollKnoten
  aktuell: () => ProtokollKnoten
  senden: (dokument: ProtokollKnoten) => Promise<T>
}): Promise<SpeicherErgebnis<T>> {
  entwurfSichern(speicher, terminId, dokument)
  try {
    const termin = await senden(dokument)
    const jetzt = aktuell()
    if (dokumenteGleich(jetzt, dokument)) entwurfEntfernen(speicher, terminId)
    else entwurfSichern(speicher, terminId, jetzt)
    return { ok: true, termin }
  } catch (err) {
    const ohneAntwort = (err as { status?: unknown }).status === 0
    return {
      ok: false,
      fehler: ohneAntwort
        ? OHNE_NETZ
        : fehlertext(err, 'Das Protokoll konnte nicht gespeichert werden.'),
    }
  }
}

// Der Status im Kopf des Vollbilds: "Nicht gespeichert", sobald der Text vom
// gespeicherten Stand abweicht, sonst die Uhrzeit der letzten Speicherung.
export function speicherStatus(
  aktuell: unknown,
  gespeichert: unknown,
  gespeichertUm: string | undefined,
): { ungespeichert: boolean; text: string | null } {
  if (!dokumenteGleich(aktuell, gespeichert)) {
    return { ungespeichert: true, text: 'Nicht gespeichert' }
  }
  return {
    ungespeichert: false,
    text: gespeichertUm ? `Gespeichert um ${berlinZeit(gespeichertUm)}` : null,
  }
}

// Beim Öffnen wird ein Entwurf nur angeboten, wenn er vom gespeicherten Stand
// abweicht. Sonst gibt es nichts zu retten.
export function entwurfAnbieten(
  entwurf: ProtokollKnoten | null,
  gespeichert: unknown,
): boolean {
  return entwurf !== null && !dokumenteGleich(entwurf, gespeichert)
}

export function entwurfEntfernen(speicher: Speicher, terminId: string) {
  try {
    speicher.removeItem(schluessel(terminId))
  } catch {
    // siehe entwurfSichern
  }
}
