import { describe, expect, test } from 'vitest'

import {
  anmelden,
  app,
  neuesMitglied,
  pocketbaseUrl,
  superuser,
} from './helpers'
import type { TestMitglied } from './helpers'
import { verlaengereSitzung } from '@/lib/sitzung-verlaengern'

function aendern(cookie: string, id: string, felder: Record<string, unknown>) {
  return app(`/pb/api/collections/mitglieder/records/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(felder),
    cookie,
  })
}

async function gespeichert(m: TestMitglied) {
  const pb = await superuser()
  return pb.collection('mitglieder').getOne(m.id)
}

describe('Geburtstag', () => {
  test('Mitglied setzt und ändert den eigenen Geburtstag', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)

    const erst = await aendern(cookie, mitglied.id, {
      geburtstag: '1990-05-17',
    })
    expect(erst.status).toBe(200)
    const dann = await aendern(cookie, mitglied.id, {
      geburtstag: '1991-02-28',
    })
    expect(dann.status).toBe(200)

    expect((await gespeichert(mitglied)).geburtstag).toMatch(/^1991-02-28/)
  })

  test('die Sitzung liefert den Geburtstag mit, damit die App den Pflichtschritt erkennt', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    const token = decodeURIComponent(cookie.slice('pb_auth='.length))

    const ohne = await verlaengereSitzung(token, pocketbaseUrl)
    expect(ohne?.mitglied.geburtstag).toBe('')

    await aendern(cookie, mitglied.id, { geburtstag: '1985-12-01' })
    const mit = await verlaengereSitzung(token, pocketbaseUrl)
    expect(mit?.mitglied.geburtstag).toBe('1985-12-01')
  })

  test('Mitglied kann einen gesetzten Geburtstag nicht leeren', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    await aendern(cookie, mitglied.id, { geburtstag: '1990-05-17' })

    const res = await aendern(cookie, mitglied.id, { geburtstag: '' })

    expect(res.ok).toBe(false)
    expect((await gespeichert(mitglied)).geburtstag).toMatch(/^1990-05-17/)
  })

  test.each([
    ['name', { name: 'Anderer Name' }],
    ['email', { email: 'anders@test.invalid' }],
    ['admin', { admin: true }],
    ['gesperrt', { gesperrt: true }],
    ['support', { support: true }],
    ['ehemalig', { ehemalig: true }],
  ])('Mitglied kann %s nicht selbst ändern', async (feld, felder) => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    const vorher = await gespeichert(mitglied)

    const res = await aendern(cookie, mitglied.id, {
      geburtstag: '1990-05-17',
      ...felder,
    })

    expect(res.ok).toBe(false)
    const nachher = await gespeichert(mitglied)
    expect(nachher[feld]).toEqual(vorher[feld])
    expect(nachher.geburtstag).toBe('')
  })

  test('Mitglied kann den Geburtstag eines anderen nicht ändern', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()

    const res = await aendern(await anmelden(mitglied), anderes.id, {
      geburtstag: '1990-05-17',
    })

    expect(res.ok).toBe(false)
    expect((await gespeichert(anderes)).geburtstag).toBe('')
  })

  test('Admin korrigiert den Geburtstag eines Mitglieds', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()
    await aendern(await anmelden(mitglied), mitglied.id, {
      geburtstag: '1990-05-17',
    })

    const res = await aendern(await anmelden(admin), mitglied.id, {
      geburtstag: '1990-05-18',
    })

    expect(res.status).toBe(200)
    expect((await gespeichert(mitglied)).geburtstag).toMatch(/^1990-05-18/)
  })

  test('Geburtstag in der Zukunft wird abgelehnt', async () => {
    const mitglied = await neuesMitglied()

    const res = await aendern(await anmelden(mitglied), mitglied.id, {
      geburtstag: '2999-01-01',
    })

    expect(res.ok).toBe(false)
  })
})

describe('Passwort im Profil ändern', () => {
  test('Mitglied ändert sein Passwort mit dem alten Passwort', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    const neu = 'ein-neues-passwort'

    const res = await aendern(cookie, mitglied.id, {
      oldPassword: mitglied.password,
      password: neu,
      passwordConfirm: neu,
    })

    expect(res.status).toBe(200)
    await expect(anmelden({ ...mitglied, password: neu })).resolves.toBeTruthy()
  })

  test('ohne richtiges altes Passwort bleibt das Passwort', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)

    const res = await aendern(cookie, mitglied.id, {
      oldPassword: 'falsch-falsch',
      password: 'ein-neues-passwort',
      passwordConfirm: 'ein-neues-passwort',
    })

    expect(res.ok).toBe(false)
    await expect(anmelden(mitglied)).resolves.toBeTruthy()
  })
})
