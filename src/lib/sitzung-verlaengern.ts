import PocketBase from 'pocketbase'

import { anschriftAus } from './anschrift'
import { geburtstagAus } from './geburtstag'
import { abmeldeCookie, sitzungsCookie, tokenAusCookieHeader } from './sitzung'
import type { Anschrift } from './anschrift'

export type AngemeldetesMitglied = {
  id: string
  name: string
  email: string
  // Admin-Recht; das Support-Konto zählt dazu (Spec #17, Rechte).
  admin: boolean
  // Support-Konto des Entwicklers: kein Mitglied, braucht keinen Geburtstag.
  support: boolean
  // Geburtstag als JJJJ-MM-TT, leer, solange das Mitglied ihn noch nicht
  // angegeben hat. Dann führt die App zuerst durch den Pflichtschritt.
  geburtstag: string
  // Voller Name und Anschrift, freiwillig, im Profil änderbar.
  anschrift: Anschrift
}

// Verlängert die Sitzung mit authRefresh. Gesperrte Mitglieder und abgelaufene
// Tokens ergeben null, dann gilt das Mitglied als abgemeldet.
export async function verlaengereSitzung(
  token: string,
  pocketbaseUrl: string,
): Promise<{ token: string; mitglied: AngemeldetesMitglied } | null> {
  const pb = new PocketBase(pocketbaseUrl)
  pb.autoCancellation(false)
  pb.authStore.save(token)
  try {
    const { token: neu, record } = await pb
      .collection('mitglieder')
      .authRefresh()
    return {
      token: neu,
      mitglied: {
        id: record.id,
        name: record.name,
        email: record.email,
        admin: record.admin === true || record.support === true,
        support: record.support === true,
        geburtstag: geburtstagAus(record.geburtstag),
        anschrift: anschriftAus(record),
      },
    }
  } catch {
    return null
  }
}

// Was die Root-Route bei jeder Anfrage mit dem Cookie macht: ohne Sitzung
// bleibt die Antwort cookiefrei, eine gültige wird verlängert, eine
// ungültige gelöscht. Öffentliche Seiten setzen damit kein Cookie (Issue #42).
export async function pruefeSitzung(
  cookieHeader: string | null,
  pocketbaseUrl: string,
): Promise<{
  mitglied: AngemeldetesMitglied | null
  setCookie: string | null
}> {
  const token = tokenAusCookieHeader(cookieHeader)
  if (!token) return { mitglied: null, setCookie: null }

  const sitzung = await verlaengereSitzung(token, pocketbaseUrl)
  if (!sitzung) return { mitglied: null, setCookie: abmeldeCookie() }
  return {
    mitglied: sitzung.mitglied,
    setCookie: sitzungsCookie(sitzung.token),
  }
}
