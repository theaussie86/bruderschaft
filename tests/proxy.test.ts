import { describe, expect, inject, test } from 'vitest'

import {
  anmelden,
  anmeldung,
  app,
  json,
  neuesMitglied,
  superuser,
} from './helpers'

describe('Anmeldung über den Proxy', () => {
  test('Login setzt das Token als httpOnly-Cookie und gibt es nicht an JavaScript', async () => {
    const mitglied = await neuesMitglied()

    const res = await anmeldung(mitglied)

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^pb_auth=[^;]+;/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\//i)
    expect(setCookie).toMatch(/Max-Age=7776000/i)
    const body = await res.json()
    expect(body.token).toBeUndefined()
    expect(body.record.id).toBe(mitglied.id)
  })

  test('Request mit Cookie ist angemeldet', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)

    const res = await app('/pb/api/collections/mitglieder/records', { cookie })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((m: { id: string }) => m.id)).toEqual([mitglied.id])
  })

  test('Request ohne Cookie ist anonym, auch mit eigenem Authorization-Header', async () => {
    const mitglied = await neuesMitglied()
    const pb = await superuser()
    const { token } = await pb
      .collection('mitglieder')
      .authWithPassword(mitglied.email, mitglied.password)

    const res = await app('/pb/api/collections/mitglieder/records', {
      headers: { authorization: token },
    })

    expect(res.status).toBe(200)
    expect((await res.json()).items).toEqual([])
  })

  test('gesperrtes Mitglied kann sich nicht anmelden', async () => {
    const mitglied = await neuesMitglied({ gesperrt: true })

    const res = await anmeldung(mitglied)

    expect(res.status).toBe(403)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  test('Abmelden löscht das Cookie', async () => {
    const res = await app('/pb/abmelden', { method: 'POST' })

    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/^pb_auth=;.*Max-Age=0/i)
  })
})

describe('Rechte an Mitgliedern', () => {
  test('Mitglied liest keine anderen Mitglieder, Admin liest alle', async () => {
    const mitglied = await neuesMitglied()
    const admin = await neuesMitglied({ admin: true })

    const alsMitglied = await app(
      `/pb/api/collections/mitglieder/records/${admin.id}`,
      {
        cookie: await anmelden(mitglied),
      },
    )
    const alsAdmin = await app(
      `/pb/api/collections/mitglieder/records/${mitglied.id}`,
      {
        cookie: await anmelden(admin),
      },
    )

    expect(alsMitglied.status).toBe(404)
    expect(alsAdmin.status).toBe(200)
  })
})

describe('Durchreichen von Multipart', () => {
  test('Admin legt ein Mitglied per Multipart an', async () => {
    const admin = await neuesMitglied({ admin: true })
    const form = new FormData()
    form.set('name', 'Per Formular')
    form.set('email', `formular-${crypto.randomUUID()}@test.invalid`)
    form.set('password', 'formular-passwort-123')
    form.set('passwordConfirm', 'formular-passwort-123')

    const res = await app('/pb/api/collections/mitglieder/records', {
      method: 'POST',
      body: form,
      cookie: await anmelden(admin),
    })

    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Per Formular')
  })
})

describe('Sperrliste', () => {
  test('Admin-UI liefert über den Proxy keine Antwort', async () => {
    for (const pfad of ['/pb/_/', '/pb/_', '/pb/_/index.html']) {
      const res = await app(pfad)
      expect(res.status, pfad).toBe(404)
      expect(await res.text(), pfad).not.toMatch(/<html/i)
    }
  })

  test('Superuser-API liefert über den Proxy keine Antwort, auch mit gültigen Daten', async () => {
    const { email, password } = inject('superuser')
    const pb = await superuser()
    const { id } = await pb.collections.getOne('_superusers')

    for (const name of ['_superusers', '%5Fsuperusers', id, id.toUpperCase()]) {
      const res = await app(
        `/pb/api/collections/${name}/auth-with-password`,
        json({ identity: email, password }),
      )
      expect(res.status, name).toBe(404)
      expect(res.headers.get('set-cookie'), name).toBeNull()
    }
  })

  test('Verwaltungs-Endpunkte von PocketBase sind gesperrt', async () => {
    for (const pfad of [
      '/pb/api/settings',
      '/pb/api/collections',
      '/pb/api/collections/mitglieder',
      '/pb/api/backups',
      '/pb/api/logs',
      '/pb/api/crons',
      '/pb/api/collections/_authOrigins/records',
    ]) {
      const res = await app(pfad)
      expect(res.status, pfad).toBe(404)
    }
  })
})
