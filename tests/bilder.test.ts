import { describe, expect, test } from 'vitest'

import { anmelden, app, neuesMitglied, superuser } from './helpers'
import type { TestMitglied } from './helpers'

const BILDER = '/pb/api/collections/bilder/records'

// Ein winziges, gültiges PNG (1x1 Pixel), damit PocketBase Thumbnails bauen kann.
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

const VERGANGEN = '2025-06-01 12:00:00.000Z'
const KUENFTIG = '2099-06-01 12:00:00.000Z'

async function veranstaltung(felder: Record<string, unknown> = {}) {
  const pb = await superuser()
  return pb.collection('termine').create({
    titel: 'Sommerfest',
    art: 'veranstaltung',
    beginn: VERGANGEN,
    ...felder,
  })
}

function hochladen(
  terminId: string,
  mitglied: TestMitglied | { id: string },
  cookie: string,
) {
  const form = new FormData()
  form.set('termin', terminId)
  form.set('mitglied', mitglied.id)
  form.set('datei', new File([PNG], 'foto.png', { type: 'image/png' }))
  return app(BILDER, { method: 'POST', body: form, cookie })
}

type Bild = { id: string; collectionId: string; datei: string }

async function bildVon(mitglied: TestMitglied, terminId?: string) {
  const id = terminId ?? (await veranstaltung()).id
  const res = await hochladen(id, mitglied, await anmelden(mitglied))
  expect(res.status).toBe(200)
  return (await res.json()) as Bild
}

function dateiPfad(b: Bild) {
  return `/pb/api/files/${b.collectionId}/${b.id}/${b.datei}`
}

describe('Bilder hochladen', () => {
  test('Mitglied lädt ein Bild zu einer vergangenen Veranstaltung hoch', async () => {
    const mitglied = await neuesMitglied()
    const termin = await veranstaltung()

    const res = await hochladen(termin.id, mitglied, await anmelden(mitglied))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      termin: termin.id,
      mitglied: mitglied.id,
    })
  })

  test('Upload zu einer künftigen Veranstaltung wird abgelehnt', async () => {
    const mitglied = await neuesMitglied()
    const termin = await veranstaltung({ beginn: KUENFTIG })

    const res = await hochladen(termin.id, mitglied, await anmelden(mitglied))

    expect(res.ok).toBe(false)
  })

  test('Upload zu einer abgesagten Veranstaltung wird abgelehnt', async () => {
    const mitglied = await neuesMitglied()
    const termin = await veranstaltung({ abgesagt: true })

    const res = await hochladen(termin.id, mitglied, await anmelden(mitglied))

    expect(res.ok).toBe(false)
  })

  test('Mitglied lädt ein Bild zu einem Urlaub hoch', async () => {
    const mitglied = await neuesMitglied()
    const termin = await veranstaltung({
      art: 'urlaub',
      ende: '2025-06-08 12:00:00.000Z',
    })

    const res = await hochladen(termin.id, mitglied, await anmelden(mitglied))

    expect(res.status).toBe(200)
  })

  test('Mitglied lädt ein Bild zu einem vergangenen Stammtisch hoch', async () => {
    const mitglied = await neuesMitglied()
    const termin = await veranstaltung({ art: 'stammtisch' })

    const res = await hochladen(termin.id, mitglied, await anmelden(mitglied))

    expect(res.status).toBe(200)
  })

  test('Upload zu einem künftigen oder abgesagten Stammtisch wird abgelehnt', async () => {
    const mitglied = await neuesMitglied()
    const cookie = await anmelden(mitglied)
    const kuenftig = await veranstaltung({
      art: 'stammtisch',
      beginn: KUENFTIG,
    })
    const abgesagt = await veranstaltung({ art: 'stammtisch', abgesagt: true })

    const zuKuenftig = await hochladen(kuenftig.id, mitglied, cookie)
    const zuAbgesagt = await hochladen(abgesagt.id, mitglied, cookie)

    expect(zuKuenftig.ok).toBe(false)
    expect(zuAbgesagt.ok).toBe(false)
  })

  test('Mitglied lädt kein Bild im Namen eines anderen hoch', async () => {
    const mitglied = await neuesMitglied()
    const anderes = await neuesMitglied()
    const termin = await veranstaltung()

    const res = await hochladen(termin.id, anderes, await anmelden(mitglied))

    expect(res.ok).toBe(false)
  })

  test('ohne Anmeldung kein Upload', async () => {
    const termin = await veranstaltung()

    const res = await hochladen(termin.id, { id: 'x' }, '')

    expect(res.ok).toBe(false)
  })
})

describe('Bilder ansehen', () => {
  test('alle Mitglieder sehen die Bilder einer Veranstaltung', async () => {
    const bild = await bildVon(await neuesMitglied())
    const cookie = await anmelden(await neuesMitglied())

    const res = await app(`${BILDER}/${bild.id}`, { cookie })

    expect(res.status).toBe(200)
  })

  test('Datei ohne Anmeldung nicht abrufbar', async () => {
    const bild = await bildVon(await neuesMitglied())

    const res = await app(dateiPfad(bild))

    expect(res.ok).toBe(false)
  })

  test('angemeldetes Mitglied bekommt Datei und Thumbnail mit Cache-Header', async () => {
    const bild = await bildVon(await neuesMitglied())
    const cookie = await anmelden(await neuesMitglied())

    const datei = await app(dateiPfad(bild), { cookie })
    const thumb = await app(`${dateiPfad(bild)}?thumb=400x400`, { cookie })

    expect(datei.status).toBe(200)
    expect(datei.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable',
    )
    expect(thumb.status).toBe(200)
    expect(thumb.headers.get('content-type')).toMatch(/^image\//)
  })

  test('nach einem Wechsel der Art bleiben die Bilder sichtbar', async () => {
    const termin = await veranstaltung()
    await bildVon(await neuesMitglied(), termin.id)
    const cookie = await anmelden(await neuesMitglied())
    const pb = await superuser()

    await pb.collection('termine').update(termin.id, { art: 'stammtisch' })
    const res = await app(
      `${BILDER}?filter=${encodeURIComponent(`termin='${termin.id}'`)}`,
      { cookie },
    )

    expect((await res.json()).items).toHaveLength(1)
  })
})

describe('Bilder löschen', () => {
  test('Mitglied löscht sein eigenes Bild', async () => {
    const mitglied = await neuesMitglied()
    const bild = await bildVon(mitglied)

    const res = await app(`${BILDER}/${bild.id}`, {
      method: 'DELETE',
      cookie: await anmelden(mitglied),
    })

    expect(res.status).toBe(204)
  })

  test('fremdes Bild löschen wird abgelehnt', async () => {
    const bild = await bildVon(await neuesMitglied())

    const res = await app(`${BILDER}/${bild.id}`, {
      method: 'DELETE',
      cookie: await anmelden(await neuesMitglied()),
    })

    expect(res.ok).toBe(false)
    const pb = await superuser()
    expect(await pb.collection('bilder').getOne(bild.id)).toBeTruthy()
  })

  test('Admin löscht jedes Bild', async () => {
    const bild = await bildVon(await neuesMitglied())

    const res = await app(`${BILDER}/${bild.id}`, {
      method: 'DELETE',
      cookie: await anmelden(await neuesMitglied({ admin: true })),
    })

    expect(res.status).toBe(204)
  })

  test('beim Stammtisch löscht ein Mitglied nur eigene Bilder, ein Admin jedes', async () => {
    const termin = await veranstaltung({ art: 'stammtisch' })
    const mitglied = await neuesMitglied()
    const eigenes = await bildVon(mitglied, termin.id)
    const fremdes = await bildVon(await neuesMitglied(), termin.id)
    const cookie = await anmelden(mitglied)

    const eigenesLoeschen = await app(`${BILDER}/${eigenes.id}`, {
      method: 'DELETE',
      cookie,
    })
    const fremdesLoeschen = await app(`${BILDER}/${fremdes.id}`, {
      method: 'DELETE',
      cookie,
    })
    const alsAdmin = await app(`${BILDER}/${fremdes.id}`, {
      method: 'DELETE',
      cookie: await anmelden(await neuesMitglied({ admin: true })),
    })

    expect(eigenesLoeschen.status).toBe(204)
    expect(fremdesLoeschen.ok).toBe(false)
    expect(alsAdmin.status).toBe(204)
  })

  test('niemand tauscht ein Bild nachträglich aus', async () => {
    const mitglied = await neuesMitglied()
    const bild = await bildVon(mitglied)
    const anderer = await veranstaltung()
    const form = new FormData()
    form.set('termin', anderer.id)

    const res = await app(`${BILDER}/${bild.id}`, {
      method: 'PATCH',
      body: form,
      cookie: await anmelden(mitglied),
    })

    expect(res.ok).toBe(false)
  })
})

describe('Bilder und Mitglieder', () => {
  test('Mitglied sieht den Namen unter fremden Bildern nicht, Admin schon', async () => {
    const bild = await bildVon(await neuesMitglied({ name: 'Bildgeber' }))
    const pfad = `${BILDER}/${bild.id}?expand=mitglied`

    const alsMitglied = await app(pfad, {
      cookie: await anmelden(await neuesMitglied()),
    })
    const alsAdmin = await app(pfad, {
      cookie: await anmelden(await neuesMitglied({ admin: true })),
    })

    expect((await alsMitglied.json()).expand?.mitglied).toBeUndefined()
    expect((await alsAdmin.json()).expand.mitglied.name).toBe('Bildgeber')
  })

  test('ein Mitglied mit Bildern lässt sich nicht löschen', async () => {
    const mitglied = await neuesMitglied()
    await bildVon(mitglied)
    const pb = await superuser()

    await expect(
      pb.collection('mitglieder').delete(mitglied.id),
    ).rejects.toThrow()
  })
})
