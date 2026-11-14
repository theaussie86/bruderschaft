import { describe, expect, test } from 'vitest'

import { anmelden, neuesMitglied, pocketbaseUrl, superuser } from './helpers'
import { verlaengereSitzung } from '@/lib/sitzung-verlaengern'

function token(cookie: string) {
  return decodeURIComponent(cookie.slice('pb_auth='.length))
}

describe('Sitzung verlängern (authRefresh in der Root-Route)', () => {
  test('liefert ein neues Token und das angemeldete Mitglied', async () => {
    const mitglied = await neuesMitglied()
    const alt = token(await anmelden(mitglied))

    const sitzung = await verlaengereSitzung(alt, pocketbaseUrl)

    expect(sitzung?.token).toBeTruthy()
    expect(sitzung?.mitglied).toEqual({
      id: mitglied.id,
      name: 'Testmitglied',
      email: mitglied.email,
      admin: false,
    })
  })

  test('Support-Konto gilt als Admin', async () => {
    const support = await neuesMitglied({ support: true })

    const sitzung = await verlaengereSitzung(
      token(await anmelden(support)),
      pocketbaseUrl,
    )

    expect(sitzung?.mitglied.admin).toBe(true)
  })

  test('nach dem Sperren endet die Sitzung', async () => {
    const mitglied = await neuesMitglied()
    const alt = token(await anmelden(mitglied))
    const pb = await superuser()
    await pb.collection('mitglieder').update(mitglied.id, { gesperrt: true })

    expect(await verlaengereSitzung(alt, pocketbaseUrl)).toBeNull()
  })

  test('ungültiges Token ergibt keine Sitzung', async () => {
    expect(await verlaengereSitzung('kein-token', pocketbaseUrl)).toBeNull()
  })
})
