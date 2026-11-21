import { describe, expect, test } from 'vitest'

import { anmelden, app, neuesMitglied, superuser } from './helpers'
import { ARCHIV_FILTER } from '@/lib/termine'

const TERMINE = '/pb/api/collections/termine/records'

// Ein winziges PDF reicht, PocketBase prüft nur den MIME-Typ.
const PDF = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
)

async function stammtisch(felder: Record<string, unknown> = {}) {
  const pb = await superuser()
  return pb.collection('termine').create({
    titel: 'Stammtisch',
    art: 'stammtisch',
    beginn: '2025-06-01 18:30:00.000Z',
    ...felder,
  })
}

function hochladen(terminId: string, cookie: string) {
  const form = new FormData()
  form.append(
    'protokoll+',
    new File([PDF], 'protokoll.pdf', { type: 'application/pdf' }),
  )
  return app(`${TERMINE}/${terminId}`, { method: 'PATCH', body: form, cookie })
}

type MitProtokoll = {
  id: string
  collectionId: string
  protokoll?: Array<string>
}

async function alsAdminHochladen(terminId: string) {
  const admin = await neuesMitglied({ admin: true })
  const res = await hochladen(terminId, await anmelden(admin))
  expect(res.status).toBe(200)
  return (await res.json()) as MitProtokoll
}

function dateiPfad(t: MitProtokoll, datei: string) {
  return `/pb/api/files/${t.collectionId}/${t.id}/${datei}`
}

describe('Protokolle hochladen', () => {
  test('Admin lädt mehrere Dateien als Protokoll eines Stammtischs hoch', async () => {
    const termin = await stammtisch()
    const admin = await neuesMitglied({ admin: true })
    const cookie = await anmelden(admin)

    await hochladen(termin.id, cookie)
    const res = await hochladen(termin.id, cookie)

    expect(res.status).toBe(200)
    expect((await res.json()).protokoll).toHaveLength(2)
  })

  test('Mitglied kann kein Protokoll hochladen', async () => {
    const termin = await stammtisch()

    const res = await hochladen(
      termin.id,
      await anmelden(await neuesMitglied()),
    )

    expect(res.ok).toBe(false)
    const pb = await superuser()
    expect(
      (await pb.collection('termine').getOne(termin.id)).protokoll,
    ).toEqual([])
  })

  test('Admin löscht eine Datei des Protokolls', async () => {
    const termin = await stammtisch()
    const mitProtokoll = await alsAdminHochladen(termin.id)
    const form = new FormData()
    form.append('protokoll-', mitProtokoll.protokoll![0])

    const res = await app(`${TERMINE}/${termin.id}`, {
      method: 'PATCH',
      body: form,
      cookie: await anmelden(await neuesMitglied({ admin: true })),
    })

    expect(res.status).toBe(200)
    expect((await res.json()).protokoll).toEqual([])
  })
})

describe('Protokolle lesen', () => {
  test('jedes Mitglied liest das Protokoll über den Proxy, ohne Anmeldung nicht', async () => {
    const termin = await stammtisch()
    const mitProtokoll = await alsAdminHochladen(termin.id)
    const pfad = dateiPfad(mitProtokoll, mitProtokoll.protokoll![0])

    const mitglied = await app(pfad, {
      cookie: await anmelden(await neuesMitglied()),
    })
    const anonym = await app(pfad)

    expect(mitglied.status).toBe(200)
    expect(mitglied.headers.get('content-type')).toBe('application/pdf')
    expect(anonym.ok).toBe(false)
  })

  test('wechselt die Art weg von Stammtisch, ist das Protokoll ausgeblendet, nicht gelöscht', async () => {
    const termin = await stammtisch()
    const mitProtokoll = await alsAdminHochladen(termin.id)
    const datei = mitProtokoll.protokoll![0]
    const cookie = await anmelden(await neuesMitglied())
    const pb = await superuser()

    await pb.collection('termine').update(termin.id, { art: 'veranstaltung' })
    const ausgeblendet = await app(`${TERMINE}/${termin.id}`, { cookie })
    expect((await ausgeblendet.json()).protokoll ?? []).toEqual([])
    expect((await app(dateiPfad(mitProtokoll, datei), { cookie })).ok).toBe(
      false,
    )

    await pb.collection('termine').update(termin.id, { art: 'stammtisch' })
    const wieder = await app(`${TERMINE}/${termin.id}`, { cookie })
    expect((await wieder.json()).protokoll).toEqual([datei])
    expect((await app(dateiPfad(mitProtokoll, datei), { cookie })).status).toBe(
      200,
    )
  })
})

// Ein winziges, gültiges PNG (1x1 Pixel) als Bild zu einem Termin.
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

async function mitBild(terminId: string) {
  const mitglied = await neuesMitglied()
  const form = new FormData()
  form.set('termin', terminId)
  form.set('mitglied', mitglied.id)
  form.set('datei', new File([PNG], 'foto.png', { type: 'image/png' }))
  const pb = await superuser()
  await pb.collection('bilder').create(form)
}

async function imArchiv(ids: Array<string>) {
  const nurDiese = ids.map((id) => `id = '${id}'`).join(' || ')
  const filter = `${ARCHIV_FILTER} && (${nurDiese})`
  const res = await app(
    `${TERMINE}?filter=${encodeURIComponent(filter)}&fields=id&perPage=50`,
    { cookie: await anmelden(await neuesMitglied()) },
  )
  const items = (await res.json()).items as Array<{ id: string }>
  return items.map((t) => t.id).sort()
}

describe('Stammtische im Archiv', () => {
  test('ein Stammtisch ist mit Protokoll oder Bildern im Archiv, ohne beides nicht', async () => {
    const ohne = await stammtisch()
    const mitProtokoll = await stammtisch()
    await alsAdminHochladen(mitProtokoll.id)
    const mitBildern = await stammtisch()
    await mitBild(mitBildern.id)

    const archiv = await imArchiv([ohne.id, mitProtokoll.id, mitBildern.id])

    expect(archiv).toEqual([mitProtokoll.id, mitBildern.id].sort())
  })

  test('ein abgesagter Stammtisch mit Bild ist nicht im Archiv', async () => {
    const abgesagt = await stammtisch()
    await mitBild(abgesagt.id)
    const pb = await superuser()
    await pb.collection('termine').update(abgesagt.id, { abgesagt: true })

    expect(await imArchiv([abgesagt.id])).toEqual([])
  })
})
