import { randomUUID } from 'node:crypto'
import PocketBase from 'pocketbase'
import { inject } from 'vitest'

import { SUPERUSER } from './pocketbase-instanz'
import { pbProxy } from '@/lib/pb-proxy'

export const pocketbaseUrl = inject('pocketbaseUrl')

// Die HTTP-Oberfläche der App gegen ein bestimmtes PocketBase: derselbe
// Handler, den die Route /pb/* aufruft, dazu Testdaten über den Superuser.
// Die meisten Tests nutzen das gemeinsame PocketBase (Exporte unten); wer den
// ganzen Datenbestand betrachtet oder die offene Runde schließt, startet ein
// eigenes (tests/pocketbase-instanz.ts).
export function testumgebung(url: () => string) {
  function app(pfad: string, init: RequestInit & { cookie?: string } = {}) {
    const { cookie, ...rest } = init
    const headers = new Headers(rest.headers)
    if (cookie) headers.set('cookie', cookie)
    return pbProxy(
      new Request(`http://app.test${pfad}`, { ...rest, headers }),
      url(),
    )
  }

  // Testdaten legt der Superuser direkt in PocketBase an, nicht über die App.
  async function superuser() {
    const pb = new PocketBase(url())
    pb.autoCancellation(false)
    await pb
      .collection('_superusers')
      .authWithPassword(SUPERUSER.email, SUPERUSER.password)
    return pb
  }

  async function neuesMitglied(
    felder: {
      name?: string
      admin?: boolean
      gesperrt?: boolean
      support?: boolean
    } = {},
  ): Promise<TestMitglied> {
    const pb = await superuser()
    const email = `mitglied-${randomUUID()}@test.invalid`
    const password = `passwort-${randomUUID()}`
    const record = await pb.collection('mitglieder').create({
      name: 'Testmitglied',
      email,
      password,
      passwordConfirm: password,
      ...felder,
    })
    return { id: record.id, email, password }
  }

  // Es gibt höchstens eine offene Bestellrunde. Tests nutzen deshalb die
  // offene Runde, die gerade da ist, oder legen sie an.
  async function offeneRunde() {
    const pb = await superuser()
    const offen = await pb
      .collection('bestellrunden')
      .getFullList({ filter: "status = 'offen'" })
    if (offen.length > 0) return offen[0]
    return pb.collection('bestellrunden').create({
      name: 'Testrunde',
      bestelldatum: '2026-12-01 12:00:00.000Z',
      status: 'offen',
    })
  }

  function anmeldung(m: TestMitglied) {
    return app(
      '/pb/api/collections/mitglieder/auth-with-password',
      json({ identity: m.email, password: m.password }),
    )
  }

  // Liefert den Cookie-Header für Folge-Requests eines angemeldeten Mitglieds.
  async function anmelden(m: TestMitglied) {
    const res = await anmeldung(m)
    if (!res.ok) throw new Error(`Anmeldung fehlgeschlagen: ${res.status}`)
    return cookieAus(res)
  }

  return { app, superuser, neuesMitglied, offeneRunde, anmeldung, anmelden }
}

export type TestMitglied = { id: string; email: string; password: string }

export function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function cookieAus(res: Response) {
  const setCookie = res.headers.get('set-cookie') ?? ''
  return setCookie.split(';')[0]
}

// Das gemeinsame PocketBase aller Testdateien.
export const {
  app,
  superuser,
  neuesMitglied,
  offeneRunde,
  anmeldung,
  anmelden,
} = testumgebung(() => pocketbaseUrl)

// Postfach des Test-SMTP (tests/test-smtp.ts). Wartet kurz, bis die erwartete
// Zahl an Mails da ist, und liefert sie dekodiert.
export async function postfach(email: string, mindestens = 1) {
  const ende = Date.now() + 5_000
  for (;;) {
    const res = await fetch(
      `${inject('postfachUrl')}/?an=${encodeURIComponent(email)}`,
    )
    const mails = (await res.json()) as Array<{ roh: string }>
    if (mails.length >= mindestens || Date.now() > ende)
      return mails.map((m) => quotedPrintable(m.roh))
    await new Promise((r) => setTimeout(r, 50))
  }
}

function quotedPrintable(text: string) {
  const ohneUmbrueche = text.replace(/=\r\n/g, '')
  const bytes: Array<number> = []
  for (let i = 0; i < ohneUmbrueche.length; i++) {
    const hex = ohneUmbrueche.slice(i + 1, i + 3)
    if (ohneUmbrueche[i] === '=' && /^[0-9A-F]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16))
      i += 2
    } else {
      bytes.push(...Buffer.from(ohneUmbrueche[i], 'utf8'))
    }
  }
  return Buffer.from(bytes).toString('utf8')
}

// Das Token aus dem Link "Passwort setzen" der letzten Mail an diese Adresse.
export async function linkToken(email: string, mindestens = 1) {
  const mails = await postfach(email, mindestens)
  const letzte = mails.at(-1) ?? ''
  const token = /\/passwort-setzen\?token=([\w.-]+)/.exec(letzte)?.[1]
  if (!token) throw new Error(`Kein Link in der Mail an ${email}`)
  return token
}
