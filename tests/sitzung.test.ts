import { describe, expect, test } from 'vitest'

import { anmelden, neuesMitglied, pocketbaseUrl, superuser } from './helpers'
import { pruefeSitzung, verlaengereSitzung } from '@/lib/sitzung-verlaengern'

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
      support: false,
      geburtstag: '',
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

// HTTP-Seam der Root-Route (Issue #42): Welche Set-Cookie-Antwort eine
// Anfrage bekommt, hängt nur am Cookie-Header.
describe('Cookie der Root-Route', () => {
  test('öffentliche Seite ohne Login setzt kein Cookie', async () => {
    expect(await pruefeSitzung(null, pocketbaseUrl)).toEqual({
      mitglied: null,
      setCookie: null,
    })
  })

  test('fremde Cookies ohne Sitzung setzen auch kein Cookie', async () => {
    const antwort = await pruefeSitzung('theme=dunkel; x=1', pocketbaseUrl)

    expect(antwort.setCookie).toBeNull()
  })

  test('ungültige Sitzung löscht das Cookie', async () => {
    const antwort = await pruefeSitzung('pb_auth=kein-token', pocketbaseUrl)

    expect(antwort.mitglied).toBeNull()
    expect(antwort.setCookie).toMatch(/^pb_auth=;.*Max-Age=0/i)
  })

  test('gültige Sitzung erneuert das Cookie', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)

    const antwort = await pruefeSitzung(cookie, pocketbaseUrl)

    expect(antwort.mitglied?.id).toBe(mitglied.id)
    expect(antwort.setCookie).toMatch(/^pb_auth=[^;]+;.*Max-Age=7776000/i)
    expect(antwort.setCookie).toMatch(/HttpOnly/i)
  })
})
