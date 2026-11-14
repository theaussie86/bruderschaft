import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, postfach } from './helpers'

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
