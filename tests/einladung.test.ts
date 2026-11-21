import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import {
  anmelden,
  anmeldung,
  app,
  json,
  linkToken,
  neuesMitglied,
  postfach,
  superuser,
} from './helpers'

function neueMail() {
  return `eingeladen-${randomUUID()}@test.invalid`
}

async function einladen(
  cookie: string,
  email: string,
  name = 'Neues Mitglied',
) {
  return app('/pb/api/collections/mitglieder/records', {
    ...json({ name, email }),
    cookie,
  })
}

function passwortSetzen(token: string, passwort: string) {
  return app(
    '/pb/api/collections/mitglieder/confirm-password-reset',
    json({ token, password: passwort, passwordConfirm: passwort }),
  )
}

function erneutEinladen(cookie: string, id: string) {
  return app(`/pb/api/club/mitglieder/${id}/einladen`, {
    method: 'POST',
    cookie,
  })
}

async function verified(id: string) {
  const pb = await superuser()
  return (await pb.collection('mitglieder').getOne(id)).verified as boolean
}

describe('Einladen', () => {
  test('Admin legt ein Mitglied nur mit Name und Mail an, die Einladung landet im Postfach', async () => {
    const admin = await neuesMitglied({
      admin: true,
      name: 'Einladender Admin',
    })
    const email = neueMail()

    const res = await einladen(await anmelden(admin), email)

    expect(res.status).toBe(200)
    const record = await res.json()
    expect(record.name).toBe('Neues Mitglied')
    expect(record.verified).toBe(false)
    const [mail] = await postfach(email)
    expect(mail).toContain('Testclub')
    expect(mail).toContain('Einladender Admin')
    expect(mail).toContain('Passwort setzen')
    expect(mail).toMatch(/http:\/\/app\.test\/passwort-setzen\?token=/)
  })

  test('Passwort setzen macht das Mitglied aktiv, danach klappt die Anmeldung', async () => {
    const admin = await neuesMitglied({ admin: true })
    const email = neueMail()
    const { id } = await (await einladen(await anmelden(admin), email)).json()
    expect(await verified(id)).toBe(false)

    const res = await passwortSetzen(
      await linkToken(email),
      'mein-neues-passwort',
    )

    expect(res.status).toBe(204)
    expect(await verified(id)).toBe(true)
    const login = await anmeldung({
      id,
      email,
      password: 'mein-neues-passwort',
    })
    expect(login.status).toBe(200)
  })

  test('Groß- und Kleinschreibung der Mail spielt keine Rolle', async () => {
    // Ein Admin hat "Stefan@..." angelegt, das Mitglied tippt "stefan@..."
    // (und umgekehrt). Passwort setzen klappte, die Anmeldung nicht.
    const admin = await neuesMitglied({ admin: true })
    const u = randomUUID()
    const res = await einladen(await anmelden(admin), `Gross-${u}@Test.invalid`)
    const { id, email } = await res.json()
    expect(email).toBe(`gross-${u}@test.invalid`)
    await passwortSetzen(await linkToken(email), 'mein-neues-passwort')

    for (const getippt of [
      `gross-${u}@test.invalid`,
      `Gross-${u}@test.invalid`,
      ` GROSS-${u}@TEST.INVALID `,
    ]) {
      const login = await anmeldung({
        id,
        email: getippt,
        password: 'mein-neues-passwort',
      })
      expect(login.status, getippt).toBe(200)
    }
  })

  test('der Link gilt 7 Tage', async () => {
    const admin = await neuesMitglied({ admin: true })
    const email = neueMail()
    await einladen(await anmelden(admin), email)

    const token = await linkToken(email)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp: number }
    const tage = (payload.exp * 1000 - Date.now()) / (24 * 60 * 60 * 1000)

    expect(tage).toBeGreaterThan(6.9)
    expect(tage).toBeLessThanOrEqual(7)
  })

  test('ein vom Admin mitgeschicktes Passwort zählt nicht', async () => {
    const admin = await neuesMitglied({ admin: true })
    const email = neueMail()
    const res = await app('/pb/api/collections/mitglieder/records', {
      ...json({
        name: 'Mit Passwort',
        email,
        password: 'admin-kennt-es-123',
        passwordConfirm: 'admin-kennt-es-123',
      }),
      cookie: await anmelden(admin),
    })
    expect(res.status).toBe(200)
    const { id } = await res.json()

    const login = await anmeldung({ id, email, password: 'admin-kennt-es-123' })
    expect(login.status).toBe(400)
    expect(await verified(id)).toBe(false)
  })

  test('Nicht-Admins können niemanden anlegen', async () => {
    const mitglied = await neuesMitglied()
    const email = neueMail()

    const alsMitglied = await einladen(await anmelden(mitglied), email)
    const anonym = await app(
      '/pb/api/collections/mitglieder/records',
      json({ name: 'Anonym', email }),
    )

    expect(alsMitglied.status).toBe(400)
    expect(anonym.status).toBe(400)
    expect(await postfach(email, 0)).toEqual([])
  })
})

describe('Erneut einladen', () => {
  test('neuer Link funktioniert, der alte ist ungültig', async () => {
    const admin = await neuesMitglied({ admin: true })
    const cookie = await anmelden(admin)
    const email = neueMail()
    const { id } = await (await einladen(cookie, email)).json()
    const alt = await linkToken(email)

    const res = await erneutEinladen(cookie, id)

    expect(res.status).toBe(204)
    const neu = await linkToken(email, 2)
    expect(neu).not.toBe(alt)
    expect((await passwortSetzen(alt, 'altes-link-passwort')).status).toBe(400)
    expect((await passwortSetzen(neu, 'neues-link-passwort')).status).toBe(204)
  })

  test('nur bei eingeladenen Mitgliedern', async () => {
    const admin = await neuesMitglied({ admin: true })
    const cookie = await anmelden(admin)
    const email = neueMail()
    const { id } = await (await einladen(cookie, email)).json()
    await passwortSetzen(await linkToken(email), 'schon-aktiv-123')

    const res = await erneutEinladen(cookie, id)

    expect(res.status).toBe(400)
    expect(await postfach(email)).toHaveLength(1)
  })

  test('Mitglied und Anonyme dürfen nicht erneut einladen', async () => {
    const admin = await neuesMitglied({ admin: true })
    const email = neueMail()
    const { id } = await (await einladen(await anmelden(admin), email)).json()
    const mitglied = await neuesMitglied()

    const alsMitglied = await erneutEinladen(await anmelden(mitglied), id)
    const anonym = await app(`/pb/api/club/mitglieder/${id}/einladen`, {
      method: 'POST',
    })

    expect(alsMitglied.status).toBe(403)
    expect(anonym.status).toBe(401)
    expect(await postfach(email)).toHaveLength(1)
  })
})

describe('Passwort vergessen', () => {
  test('schickt einen Link, über den das Mitglied ein neues Passwort setzt', async () => {
    const mitglied = await neuesMitglied()

    const res = await app(
      '/pb/api/collections/mitglieder/request-password-reset',
      json({ email: mitglied.email }),
    )

    expect(res.status).toBe(204)
    const [mail] = await postfach(mitglied.email)
    expect(mail).toContain('Testclub')
    const token = await linkToken(mitglied.email)
    expect((await passwortSetzen(token, 'vergessen-neu-123')).status).toBe(204)
    const login = await anmeldung({
      ...mitglied,
      password: 'vergessen-neu-123',
    })
    expect(login.status).toBe(200)
  })
})
