import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import {
  anmelden,
  anmeldung,
  app,
  json,
  neuesMitglied,
  offeneRunde,
  postfach,
  superuser,
} from './helpers'

const MITGLIEDER = '/pb/api/collections/mitglieder/records'

function aendern(cookie: string, id: string, felder: Record<string, unknown>) {
  return app(`${MITGLIEDER}/${id}`, {
    ...json(felder),
    method: 'PATCH',
    cookie,
  })
}

function loeschen(cookie: string, id: string) {
  return app(`${MITGLIEDER}/${id}`, { method: 'DELETE', cookie })
}

async function gespeichert(id: string) {
  const pb = await superuser()
  return pb.collection('mitglieder').getOne(id)
}

async function liste(cookie: string) {
  const res = await app(`${MITGLIEDER}?perPage=500`, { cookie })
  expect(res.status).toBe(200)
  const { items } = (await res.json()) as { items: Array<{ id: string }> }
  return items.map((m) => m.id)
}

describe('Admin-Recht', () => {
  test('Admin vergibt das Recht, das neue Admin entzieht es wieder', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()

    const geben = await aendern(await anmelden(admin), mitglied.id, {
      admin: true,
    })
    expect(geben.status).toBe(200)
    expect((await gespeichert(mitglied.id)).admin).toBe(true)

    const entziehen = await aendern(await anmelden(mitglied), admin.id, {
      admin: false,
    })
    expect(entziehen.status).toBe(200)
    expect((await gespeichert(admin.id)).admin).toBe(false)
  })

  test('niemand macht ein Mitglied über die App zum Support-Konto', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()

    const res = await aendern(await anmelden(admin), mitglied.id, {
      support: true,
    })

    expect(res.ok).toBe(false)
    expect((await gespeichert(mitglied.id)).support).toBe(false)
  })
})

describe('Sperren', () => {
  test('gesperrtes Mitglied kommt nicht hinein, nach dem Entsperren wieder', async () => {
    const admin = await neuesMitglied({ admin: true })
    const cookie = await anmelden(admin)
    const mitglied = await neuesMitglied()

    expect(
      (await aendern(cookie, mitglied.id, { gesperrt: true })).status,
    ).toBe(200)
    expect((await anmeldung(mitglied)).status).toBe(403)

    expect(
      (await aendern(cookie, mitglied.id, { gesperrt: false })).status,
    ).toBe(200)
    expect((await anmeldung(mitglied)).status).toBe(200)
  })

  test('Mitglied kann niemanden sperren', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()

    const res = await aendern(await anmelden(mitglied), anderes.id, {
      gesperrt: true,
    })

    expect(res.ok).toBe(false)
    expect((await gespeichert(anderes.id)).gesperrt).toBe(false)
  })
})

describe('Mail ändern', () => {
  test('Admin ändert die Mail direkt, ohne Bestätigungsmail', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()
    const neu = `geaendert-${randomUUID()}@test.invalid`

    const res = await aendern(await anmelden(admin), mitglied.id, {
      email: neu,
    })

    expect(res.status).toBe(200)
    expect((await gespeichert(mitglied.id)).email).toBe(neu)
    expect((await anmeldung({ ...mitglied, email: neu })).status).toBe(200)
    expect((await anmeldung(mitglied)).status).toBe(400)
    expect(await postfach(neu, 0)).toEqual([])
    expect(await postfach(mitglied.email, 0)).toEqual([])
  })
})

describe('Löschen', () => {
  test('Admin löscht ein falsch angelegtes Mitglied ohne Aufträge', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()

    const res = await loeschen(await anmelden(admin), mitglied.id)

    expect(res.status).toBe(204)
    const pb = await superuser()
    await expect(
      pb.collection('mitglieder').getOne(mitglied.id),
    ).rejects.toThrow()
  })

  test('Mitglied mit Auftrag lässt sich nicht löschen', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()
    const runde = await offeneRunde()
    const pb = await superuser()
    await pb
      .collection('auftraege')
      .create({ runde: runde.id, mitglied: mitglied.id, status: 'in_arbeit' })

    const res = await loeschen(await anmelden(admin), mitglied.id)

    expect(res.ok).toBe(false)
    expect((await gespeichert(mitglied.id)).id).toBe(mitglied.id)
  })

  test('Mitglied kann niemanden löschen', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()

    const res = await loeschen(await anmelden(mitglied), anderes.id)

    expect(res.ok).toBe(false)
    expect((await gespeichert(anderes.id)).id).toBe(anderes.id)
  })
})

describe('Lesen', () => {
  test('Mitglied liest nur sich selbst', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()
    const cookie = await anmelden(mitglied)

    expect(await liste(cookie)).toEqual([mitglied.id])
    const fremd = await app(`${MITGLIEDER}/${anderes.id}`, { cookie })
    expect(fremd.status).toBe(404)
  })

  test('Admin liest alle, aber nie das Support-Konto', async () => {
    const admin = await neuesMitglied({ admin: true })
    const mitglied = await neuesMitglied()
    const support = await neuesMitglied({ support: true })
    const cookie = await anmelden(admin)

    const ids = await liste(cookie)

    expect(ids).toContain(mitglied.id)
    expect(ids).toContain(admin.id)
    expect(ids).not.toContain(support.id)
    const direkt = await app(`${MITGLIEDER}/${support.id}`, { cookie })
    expect(direkt.status).toBe(404)
  })

  test('Admin kann das Support-Konto weder ändern noch löschen', async () => {
    const admin = await neuesMitglied({ admin: true })
    const support = await neuesMitglied({ support: true })
    const cookie = await anmelden(admin)

    expect((await aendern(cookie, support.id, { gesperrt: true })).ok).toBe(
      false,
    )
    expect((await loeschen(cookie, support.id)).ok).toBe(false)
    expect((await gespeichert(support.id)).gesperrt).toBe(false)
  })
})
