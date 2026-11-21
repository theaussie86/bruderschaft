import { describe, expect, test } from 'vitest'

import { anmelden, app, neuesMitglied, superuser } from './helpers'
import type { TestMitglied } from './helpers'

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

const ANSCHRIFT = {
  voller_name: 'Johann Huber',
  strasse: 'Hauptstraße 12',
  plz: '87724',
  ort: 'Ottobeuren',
}

describe('Voller Name und Anschrift', () => {
  test('Mitglied trägt seinen vollen Namen und seine Anschrift selbst ein', async () => {
    const mitglied = await neuesMitglied()

    const res = await aendern(await anmelden(mitglied), mitglied.id, ANSCHRIFT)

    expect(res.status).toBe(200)
    expect(await gespeichert(mitglied)).toMatchObject(ANSCHRIFT)
  })

  test('Mitglied kann seine Angaben wieder leeren', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    await aendern(cookie, mitglied.id, ANSCHRIFT)

    const res = await aendern(cookie, mitglied.id, { strasse: '', plz: '' })

    expect(res.status).toBe(200)
    expect(await gespeichert(mitglied)).toMatchObject({
      voller_name: 'Johann Huber',
      strasse: '',
      plz: '',
    })
  })

  test('Mitglied kann die Anschrift eines anderen weder lesen noch ändern', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()
    const pb = await superuser()
    await pb.collection('mitglieder').update(anderes.id, ANSCHRIFT)
    const cookie = await anmelden(mitglied)

    const lesen = await app(
      `/pb/api/collections/mitglieder/records/${anderes.id}`,
      { cookie },
    )
    const schreiben = await aendern(cookie, anderes.id, { ort: 'Memmingen' })

    expect(lesen.ok).toBe(false)
    expect(schreiben.ok).toBe(false)
    expect((await gespeichert(anderes)).ort).toBe('Ottobeuren')
  })

  test('Admin sieht und korrigiert die Anschrift eines Mitglieds', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()
    await aendern(await anmelden(mitglied), mitglied.id, ANSCHRIFT)
    const cookie = await anmelden(admin)

    const lesen = await app(
      `/pb/api/collections/mitglieder/records/${mitglied.id}`,
      { cookie },
    )
    const res = await aendern(cookie, mitglied.id, { plz: '87700' })

    expect(await lesen.json()).toMatchObject(ANSCHRIFT)
    expect(res.status).toBe(200)
    expect((await gespeichert(mitglied)).plz).toBe('87700')
  })
})
