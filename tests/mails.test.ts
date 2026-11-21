import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import {
  anmelden,
  anmeldung,
  app,
  json,
  neuesMitglied,
  postfach,
  superuser,
} from './helpers'

describe('Mails', () => {
  test('"Passwort vergessen" kommt in der Club-Hülle mit Link auf die App', async () => {
    const mitglied = await neuesMitglied({ name: 'Hannes' })

    await app(
      '/pb/api/collections/mitglieder/request-password-reset',
      json({ email: mitglied.email }),
    )

    const [mail] = await postfach(mitglied.email)
    expect(mail).toContain('Hallo Hannes,')
    expect(mail).toContain('http://app.test/club-assets/brand/mail-logo.png')
    expect(mail).toMatch(/http:\/\/app\.test\/passwort-setzen\?token=[\w.-]+/)
    expect(mail).not.toContain('/_/#/')
  })

  test('Mail-Änderung geht an die neue Adresse, mit Link auf /email-bestaetigen', async () => {
    const mitglied = await neuesMitglied({ name: 'Hannes' })
    const neu = `neu-${randomUUID()}@test.invalid`

    const res = await app(
      '/pb/api/collections/mitglieder/request-email-change',
      { ...json({ newEmail: neu }), cookie: await anmelden(mitglied) },
    )

    expect(res.status).toBe(204)
    const [mail] = await postfach(neu)
    expect(mail).toContain('Neue Mail-Adresse')
    expect(mail).toContain(neu)
    expect(mail).toMatch(/http:\/\/app\.test\/email-bestaetigen\?token=[\w.-]+/)
    expect(mail).not.toContain('/_/#/')
  })

  test('Mail-Änderung mit Großbuchstaben landet klein, Anmeldung klappt in jeder Schreibweise', async () => {
    const mitglied = await neuesMitglied()
    const u = randomUUID()
    const getippt = `Neu-${u}@Test.invalid`

    await app('/pb/api/collections/mitglieder/request-email-change', {
      ...json({ newEmail: getippt }),
      cookie: await anmelden(mitglied),
    })
    const [mail] = await postfach(getippt)
    const token = /\/email-bestaetigen\?token=([\w.-]+)/.exec(mail)?.[1]
    const res = await app(
      '/pb/api/collections/mitglieder/confirm-email-change',
      json({ token, password: mitglied.password }),
    )
    expect(res.status).toBe(204)

    const pb = await superuser()
    const record = await pb.collection('mitglieder').getOne(mitglied.id)
    expect(record.email).toBe(`neu-${u}@test.invalid`)
    for (const email of [getippt, `neu-${u}@test.invalid`]) {
      const login = await anmeldung({ ...mitglied, email })
      expect(login.status, email).toBe(200)
    }
  })

  test('keine Login-Warnung bei Anmeldung von neuem Gerät', async () => {
    const mitglied = await neuesMitglied()
    for (const geraet of ['Handy/1.0', 'Laptop/2.0', 'Tablet/3.0']) {
      const res = await app(
        '/pb/api/collections/mitglieder/auth-with-password',
        {
          ...json({ identity: mitglied.email, password: mitglied.password }),
          headers: {
            'content-type': 'application/json',
            'user-agent': geraet,
          },
        },
      )
      expect(res.status).toBe(200)
    }

    expect(await postfach(mitglied.email, 1)).toHaveLength(0)
  })
})
