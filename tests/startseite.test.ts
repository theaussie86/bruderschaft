import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, superuser } from './helpers'

const STARTSEITE = '/pb/api/collections/startseite/records'

async function datensatz() {
  const pb = await superuser()
  const [s] = await pb.collection('startseite').getFullList()
  return s
}

describe('Startseite', () => {
  test('ohne Anmeldung lesbar', async () => {
    const res = await app(STARTSEITE)

    expect(res.status).toBe(200)
    const { items } = (await res.json()) as { items: Array<{ text: string }> }
    expect(items).toHaveLength(1)
    expect(typeof items[0].text).toBe('string')
  })

  test('Mitglied kann den Text nicht ändern', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const vorher = await datensatz()

    const res = await app(`${STARTSEITE}/${vorher.id}`, {
      ...json({ text: 'Von einem Mitglied' }),
      method: 'PATCH',
      cookie,
    })

    expect(res.ok).toBe(false)
    expect((await datensatz()).text).toBe(vorher.text)
  })

  test('ohne Anmeldung nicht änderbar', async () => {
    const vorher = await datensatz()

    const res = await app(`${STARTSEITE}/${vorher.id}`, {
      ...json({ text: 'Von außen' }),
      method: 'PATCH',
    })

    expect(res.ok).toBe(false)
    expect((await datensatz()).text).toBe(vorher.text)
  })

  test('Admin ändert den Text', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const vorher = await datensatz()

    const res = await app(`${STARTSEITE}/${vorher.id}`, {
      ...json({ text: 'Willkommen beim Club.' }),
      method: 'PATCH',
      cookie,
    })

    expect(res.status).toBe(200)
    expect((await datensatz()).text).toBe('Willkommen beim Club.')
  })

  test('niemand legt einen zweiten Datensatz an oder löscht ihn', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const s = await datensatz()

    const anlegen = await app(STARTSEITE, {
      ...json({ text: 'Zweite Startseite' }),
      cookie,
    })
    const loeschen = await app(`${STARTSEITE}/${s.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(anlegen.ok).toBe(false)
    expect(loeschen.ok).toBe(false)
    const pb = await superuser()
    expect(await pb.collection('startseite').getFullList()).toHaveLength(1)
  })
})
