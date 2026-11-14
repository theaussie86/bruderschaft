import { randomUUID } from 'node:crypto'
import PocketBase from 'pocketbase'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { SUPERUSER, startePocketBase } from './pocketbase-instanz'
import { cookieAus, json } from './helpers'
import { pbProxy } from '@/lib/pb-proxy'

// "Es bleibt immer mindestens ein Admin" betrachtet alle Mitglieder. Die
// übrigen Testdateien legen im gemeinsamen PocketBase laufend Admins an,
// deshalb läuft diese Datei gegen ein eigenes.
let pocketbase: Awaited<ReturnType<typeof startePocketBase>>

beforeAll(async () => {
  pocketbase = await startePocketBase()
})

afterAll(async () => {
  await pocketbase.stop()
})

function app(pfad: string, init: RequestInit & { cookie?: string } = {}) {
  const { cookie, ...rest } = init
  const headers = new Headers(rest.headers)
  if (cookie) headers.set('cookie', cookie)
  return pbProxy(
    new Request(`http://app.test${pfad}`, { ...rest, headers }),
    pocketbase.url,
  )
}

async function superuser() {
  const pb = new PocketBase(pocketbase.url)
  pb.autoCancellation(false)
  await pb
    .collection('_superusers')
    .authWithPassword(SUPERUSER.email, SUPERUSER.password)
  return pb
}

type Konto = { id: string; email: string; password: string }

async function konto(felder: Record<string, unknown>): Promise<Konto> {
  const pb = await superuser()
  const email = `konto-${randomUUID()}@test.invalid`
  const password = `passwort-${randomUUID()}`
  const record = await pb.collection('mitglieder').create({
    name: 'Testmitglied',
    email,
    password,
    passwordConfirm: password,
    verified: true,
    ...felder,
  })
  return { id: record.id, email, password }
}

async function anmelden(k: Konto) {
  const res = await app(
    '/pb/api/collections/mitglieder/auth-with-password',
    json({ identity: k.email, password: k.password }),
  )
  if (!res.ok) throw new Error(`Anmeldung fehlgeschlagen: ${res.status}`)
  return cookieAus(res)
}

function aendern(cookie: string, id: string, felder: Record<string, unknown>) {
  return app(`/pb/api/collections/mitglieder/records/${id}`, {
    ...json(felder),
    method: 'PATCH',
    cookie,
  })
}

async function gespeichert(id: string) {
  return (await superuser()).collection('mitglieder').getOne(id)
}

// Tests einer Datei laufen nacheinander und bauen auf demselben Datenbestand auf.
describe('letzter Admin', () => {
  let erster: Konto
  let support: Konto

  test('der letzte Admin kann sich weder das Recht nehmen noch sich sperren oder löschen', async () => {
    erster = await konto({ admin: true })
    support = await konto({ support: true })
    const cookie = await anmelden(erster)

    const recht = await aendern(cookie, erster.id, { admin: false })
    const sperre = await aendern(cookie, erster.id, { gesperrt: true })
    const loeschen = await app(
      `/pb/api/collections/mitglieder/records/${erster.id}`,
      { method: 'DELETE', cookie },
    )

    expect(recht.status).toBe(400)
    expect(await recht.json()).toMatchObject({
      data: { admin: { code: 'letzter_admin' } },
    })
    expect(sperre.status).toBe(400)
    expect(loeschen.status).toBe(400)
    const nachher = await gespeichert(erster.id)
    expect(nachher.admin).toBe(true)
    expect(nachher.gesperrt).toBe(false)
  })

  test('das Support-Konto zählt nicht und kann den letzten Admin auch nicht absetzen', async () => {
    const res = await aendern(await anmelden(support), erster.id, {
      admin: false,
    })

    expect(res.status).toBe(400)
    expect((await gespeichert(erster.id)).admin).toBe(true)
  })

  test('ein gesperrter oder nur eingeladener Admin zählt nicht', async () => {
    await konto({ admin: true, gesperrt: true })
    await konto({ admin: true, verified: false })

    const res = await aendern(await anmelden(erster), erster.id, {
      admin: false,
    })

    expect(res.status).toBe(400)
  })

  test('mit einem zweiten aktiven Admin geht es', async () => {
    const zweiter = await konto({ admin: true })
    const cookie = await anmelden(erster)

    const res = await aendern(cookie, erster.id, { admin: false })

    expect(res.status).toBe(200)
    const sperre = await aendern(await anmelden(zweiter), zweiter.id, {
      gesperrt: true,
    })
    expect(sperre.status).toBe(400)
  })
})
