import { describe, expect, test } from 'vitest'

import {
  anmelden,
  anmeldung,
  app,
  neuesMitglied,
  offeneRunde,
  superuser,
} from './helpers'
import type { TestMitglied } from './helpers'

const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

function datenLoeschen(cookie: string, id: string) {
  return app(`/pb/api/club/mitglieder/${id}/daten-loeschen`, {
    method: 'POST',
    cookie,
  })
}

// Ein Mitglied mit Geburtstag, einem Auftrag in der offenen Runde und einem
// Bild zu einer vergangenen Veranstaltung.
async function mitgliedMitSpuren(): Promise<
  TestMitglied & { auftrag: string; bild: string }
> {
  const mitglied = await neuesMitglied({ name: 'Wird gelöscht' })
  const pb = await superuser()
  await pb
    .collection('mitglieder')
    .update(mitglied.id, { geburtstag: '1980-05-17 12:00:00.000Z' })
  const runde = await offeneRunde()
  const auftrag = await pb.collection('auftraege').create({
    runde: runde.id,
    mitglied: mitglied.id,
    status: 'in_arbeit',
  })
  const termin = await pb.collection('termine').create({
    titel: 'Sommerfest',
    art: 'veranstaltung',
    beginn: '2025-06-01 12:00:00.000Z',
  })
  const form = new FormData()
  form.set('termin', termin.id)
  form.set('mitglied', mitglied.id)
  form.set('datei', new File([PNG], 'foto.png', { type: 'image/png' }))
  const bild = await pb.collection('bilder').create(form)
  return { ...mitglied, auftrag: auftrag.id, bild: bild.id }
}

describe('DSGVO-Löschung', () => {
  test('Admin anonymisiert ein Mitglied, Aufträge und Bilder bleiben', async () => {
    const mitglied = await mitgliedMitSpuren()
    const admin = await neuesMitglied({ admin: true })

    const res = await datenLoeschen(await anmelden(admin), mitglied.id)
    expect(res.status).toBe(204)

    const pb = await superuser()
    const gespeichert = await pb.collection('mitglieder').getOne(mitglied.id)
    expect(gespeichert).toMatchObject({
      name: 'Ehemaliges Mitglied',
      ehemalig: true,
      gesperrt: true,
      admin: false,
      geburtstag: '',
    })
    expect(gespeichert.email).not.toBe(mitglied.email)
    expect(gespeichert.email).toMatch(/@[^@]+\.invalid$/)
    expect(JSON.stringify(gespeichert)).not.toContain('Wird gelöscht')
    expect(JSON.stringify(gespeichert)).not.toContain('1980')

    const auftrag = await pb.collection('auftraege').getOne(mitglied.auftrag)
    expect(auftrag.mitglied).toBe(mitglied.id)
    const bild = await pb.collection('bilder').getOne(mitglied.bild)
    expect(bild.mitglied).toBe(mitglied.id)
  })

  test('nach der Löschung ist kein Login mehr möglich', async () => {
    const mitglied = await neuesMitglied()
    const admin = await neuesMitglied({ admin: true })

    await datenLoeschen(await anmelden(admin), mitglied.id)

    expect((await anmeldung(mitglied)).ok).toBe(false)
  })

  test('alte Sitzung des Mitglieds gilt nicht mehr', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    const admin = await neuesMitglied({ admin: true })

    await datenLoeschen(await anmelden(admin), mitglied.id)

    const res = await app(
      `/pb/api/collections/mitglieder/records/${mitglied.id}`,
      { cookie },
    )
    expect(res.ok).toBe(false)
  })

  test('Mitglied kann die Route nicht aufrufen', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied({ name: 'Bleibt' })

    const res = await datenLoeschen(await anmelden(mitglied), anderes.id)

    expect(res.status).toBe(403)
    const pb = await superuser()
    expect((await pb.collection('mitglieder').getOne(anderes.id)).name).toBe(
      'Bleibt',
    )
  })

  test('ohne Anmeldung abgelehnt', async () => {
    const mitglied = await neuesMitglied()

    const res = await datenLoeschen('', mitglied.id)

    expect(res.ok).toBe(false)
  })

  test('Admin kann das Support-Konto nicht anonymisieren', async () => {
    const support = await neuesMitglied({ support: true, name: 'Support' })
    const admin = await neuesMitglied({ admin: true })

    const res = await datenLoeschen(await anmelden(admin), support.id)

    expect(res.status).toBe(404)
    const pb = await superuser()
    expect((await pb.collection('mitglieder').getOne(support.id)).name).toBe(
      'Support',
    )
  })
})
