import PocketBase from 'pocketbase'

export type AngemeldetesMitglied = {
  id: string
  name: string
  email: string
  // Admin-Recht; das Support-Konto zählt dazu (Spec #17, Rechte).
  admin: boolean
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
      },
    }
  } catch {
    return null
  }
}
