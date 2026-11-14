import PocketBase from 'pocketbase'

import { geburtstagAus } from './geburtstag'

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
      },
    }
  } catch {
    return null
  }
}
