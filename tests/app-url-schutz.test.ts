import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { startePocketBase } from './pocketbase-instanz'
import { json, testumgebung } from './helpers'

// Alle Links in den Mails bauen auf der App-Adresse aus den
// PocketBase-Einstellungen (meta.appURL). Ist sie nie eingetragen, steht dort
// der Standardwert http://localhost:8090, und Eingeladene landen auf
// localhost. Diese Datei setzt den Standardwert in einem eigenen PocketBase
// wieder ein, damit die übrigen Tests ihre App-Adresse behalten.
let pocketbase: Awaited<ReturnType<typeof startePocketBase>>
const { app, superuser, neuesMitglied, anmelden } = testumgebung(
  () => pocketbase.url,
)

beforeAll(async () => {
  pocketbase = await startePocketBase()
  const pb = await superuser()
  await pb.settings.update({ meta: { appURL: 'http://localhost:8090' } })
})

afterAll(async () => {
  await pocketbase.stop()
})

describe('App-Adresse fehlt (Standardwert localhost)', () => {
  test('Einladen bricht mit klarer Meldung ab und legt kein Mitglied an', async () => {
    const admin = await neuesMitglied({ admin: true })
    const email = `eingeladen-${randomUUID()}@test.invalid`

    const res = await app('/pb/api/collections/mitglieder/records', {
      ...json({ name: 'Neues Mitglied', email }),
      cookie: await anmelden(admin),
    })

    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain('App-Adresse')
    const pb = await superuser()
    const treffer = await pb
      .collection('mitglieder')
      .getFullList({ filter: pb.filter('email = {:email}', { email }) })
    expect(treffer).toHaveLength(0)
  })

  test('Erneut einladen bricht mit klarer Meldung ab', async () => {
    const admin = await neuesMitglied({ admin: true })
    const pb = await superuser()
    const passwort = `passwort-${randomUUID()}`
    const eingeladen = await pb.collection('mitglieder').create({
      name: 'Eingeladen',
      email: `eingeladen-${randomUUID()}@test.invalid`,
      password: passwort,
      passwordConfirm: passwort,
      verified: false,
    })

    const res = await app(`/pb/api/club/mitglieder/${eingeladen.id}/einladen`, {
      method: 'POST',
      cookie: await anmelden(admin),
    })

    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain('App-Adresse')
  })
})
