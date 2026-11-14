import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, superuser } from './helpers'

const ARTIKEL = '/pb/api/collections/artikel/records'
const GROESSEN = '/pb/api/collections/groessen/records'

async function anlegen(
  pfad: string,
  cookie: string,
  felder: Record<string, unknown>,
) {
  return app(pfad, { ...json(felder), cookie })
}

async function alsAdmin() {
  return anmelden(await neuesMitglied({ admin: true }))
}

async function artikelVomSuperuser(felder: Record<string, unknown> = {}) {
  const pb = await superuser()
  return pb
    .collection('artikel')
    .create({ name: 'Hoodie', preis: 3990, ...felder })
}

// Ein winziges, gültiges PNG (1x1 Pixel), damit PocketBase Thumbnails bauen kann.
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

describe('Sortiment: Rechte', () => {
  test('Mitglied kann keinen Artikel anlegen, ändern oder löschen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const artikel = await artikelVomSuperuser()

    const neu = await anlegen(ARTIKEL, cookie, { name: 'Mütze', preis: 1500 })
    const geaendert = await app(`${ARTIKEL}/${artikel.id}`, {
      ...json({ preis: 1 }),
      method: 'PATCH',
      cookie,
    })
    const geloescht = await app(`${ARTIKEL}/${artikel.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(neu.ok).toBe(false)
    expect(geaendert.ok).toBe(false)
    expect(geloescht.ok).toBe(false)
    const pb = await superuser()
    expect((await pb.collection('artikel').getOne(artikel.id)).preis).toBe(3990)
  })

  test('Mitglied kann keine Größe anlegen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const artikel = await artikelVomSuperuser()

    const res = await anlegen(GROESSEN, cookie, {
      artikel: artikel.id,
      name: 'XL',
    })

    expect(res.ok).toBe(false)
  })

  test('Mitglied liest Artikel und Größen, auch ausgeblendete', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const artikel = await artikelVomSuperuser({ ausgeblendet: true })
    const pb = await superuser()
    await pb.collection('groessen').create({ artikel: artikel.id, name: 'M' })

    const a = await app(`${ARTIKEL}/${artikel.id}`, { cookie })
    const g = await app(
      `${GROESSEN}?filter=${encodeURIComponent(`artikel = "${artikel.id}"`)}`,
      { cookie },
    )

    expect(a.status).toBe(200)
    expect((await g.json()).items.map((x: { name: string }) => x.name)).toEqual(
      ['M'],
    )
  })

  test('ohne Anmeldung ist das Sortiment nicht lesbar', async () => {
    const artikel = await artikelVomSuperuser()

    const res = await app(`${ARTIKEL}/${artikel.id}`)

    expect(res.status).toBe(404)
  })

  test('Support-Konto pflegt das Sortiment wie ein Admin', async () => {
    const cookie = await anmelden(await neuesMitglied({ support: true }))

    const res = await anlegen(ARTIKEL, cookie, { name: 'Shirt', preis: 2000 })

    expect(res.status).toBe(200)
  })
})

describe('Sortiment: Admin pflegt Artikel und Größen', () => {
  test('Admin legt einen Artikel mit allen Feldern an', async () => {
    const cookie = await alsAdmin()

    const res = await anlegen(ARTIKEL, cookie, {
      name: 'Hoodie schwarz',
      preis: 3990,
      beschreibung: 'Schwerer Stoff',
      artikelnummer: 'K-123',
      sortierung: 3,
    })

    expect(res.status).toBe(200)
    const artikel = await res.json()
    expect(artikel).toMatchObject({
      name: 'Hoodie schwarz',
      preis: 3990,
      beschreibung: 'Schwerer Stoff',
      artikelnummer: 'K-123',
      sortierung: 3,
      ausgeblendet: false,
    })
  })

  test.each([
    ['ohne Namen', { preis: 1000 }],
    ['mit negativem Preis', { name: 'Mütze', preis: -1 }],
    ['mit Preis in Bruchteilen von Cent', { name: 'Mütze', preis: 10.5 }],
  ])('Artikel %s wird abgelehnt', async (_, felder) => {
    const res = await anlegen(ARTIKEL, await alsAdmin(), felder)

    expect(res.status).toBe(400)
  })

  test('Größe hat standardmäßig keinen Aufpreis', async () => {
    const cookie = await alsAdmin()
    const artikel = await artikelVomSuperuser()

    const ohne = await anlegen(GROESSEN, cookie, {
      artikel: artikel.id,
      name: 'M',
    })
    const mit = await anlegen(GROESSEN, cookie, {
      artikel: artikel.id,
      name: 'XXL',
      aufpreis: 300,
    })

    expect(ohne.status).toBe(200)
    expect((await ohne.json()).aufpreis).toBe(0)
    expect((await mit.json()).aufpreis).toBe(300)
  })

  test('Größe ohne Artikel wird abgelehnt', async () => {
    const res = await anlegen(GROESSEN, await alsAdmin(), { name: 'M' })

    expect(res.status).toBe(400)
  })

  test('Admin ändert die Reihenfolge der Artikel', async () => {
    const cookie = await alsAdmin()
    const marke = crypto.randomUUID()
    const a = await artikelVomSuperuser({ name: `A ${marke}`, sortierung: 1 })
    const b = await artikelVomSuperuser({ name: `B ${marke}`, sortierung: 2 })

    await app(`${ARTIKEL}/${a.id}`, {
      ...json({ sortierung: 2 }),
      method: 'PATCH',
      cookie,
    })
    await app(`${ARTIKEL}/${b.id}`, {
      ...json({ sortierung: 1 }),
      method: 'PATCH',
      cookie,
    })
    const res = await app(
      `${ARTIKEL}?sort=sortierung&filter=${encodeURIComponent(`name ~ "${marke}"`)}`,
      { cookie },
    )

    expect((await res.json()).items.map((x: { id: string }) => x.id)).toEqual([
      b.id,
      a.id,
    ])
  })

  test.each(['artikel', 'groessen', 'druckstellen', 'motive'])(
    '%s lässt sich wie in der App nach sortierung,created lesen',
    async (collection) => {
      const cookie = await anmelden(await neuesMitglied())
      const res = await app(
        `/pb/api/collections/${collection}/records?sort=sortierung,created`,
        { cookie },
      )
      expect(res.status).toBe(200)
    },
  )

  test('bei gleicher Sortierung kommt der zuerst angelegte Artikel zuerst', async () => {
    const cookie = await alsAdmin()
    const marke = crypto.randomUUID()
    const erster = await artikelVomSuperuser({ name: `Z ${marke}` })
    await new Promise((r) => setTimeout(r, 5))
    const zweiter = await artikelVomSuperuser({ name: `A ${marke}` })
    const res = await app(
      `${ARTIKEL}?sort=sortierung,created&filter=${encodeURIComponent(`name ~ "${marke}"`)}`,
      { cookie },
    )
    expect((await res.json()).items.map((x: { id: string }) => x.id)).toEqual([
      erster.id,
      zweiter.id,
    ])
  })

  test('Löschen eines nie bestellten Artikels nimmt seine Größen mit', async () => {
    const cookie = await alsAdmin()
    const artikel = await artikelVomSuperuser()
    const pb = await superuser()
    const groesse = await pb
      .collection('groessen')
      .create({ artikel: artikel.id, name: 'S' })

    const res = await app(`${ARTIKEL}/${artikel.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(res.status).toBe(204)
    await expect(pb.collection('groessen').getOne(groesse.id)).rejects.toThrow()
  })
})

describe('Artikelbild über den Proxy', () => {
  async function artikelMitBild() {
    const form = new FormData()
    form.set('name', 'Mit Bild')
    form.set('preis', '2500')
    form.set('bild', new File([PNG], 'hoodie.png', { type: 'image/png' }))
    const res = await app(ARTIKEL, {
      method: 'POST',
      body: form,
      cookie: await alsAdmin(),
    })
    expect(res.status).toBe(200)
    const artikel = (await res.json()) as {
      id: string
      collectionId: string
      bild: string
    }
    return `/pb/api/files/${artikel.collectionId}/${artikel.id}/${artikel.bild}`
  }

  test('ohne Anmeldung nicht abrufbar', async () => {
    const pfad = await artikelMitBild()

    const res = await app(pfad)

    expect(res.ok).toBe(false)
  })

  test('angemeldetes Mitglied bekommt das Bild mit Cache-Header', async () => {
    const pfad = await artikelMitBild()
    const cookie = await anmelden(await neuesMitglied())

    const res = await app(pfad, { cookie })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^image\/png/)
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable',
    )
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG)
  })

  test('Thumbnail ist für angemeldete Mitglieder abrufbar', async () => {
    const pfad = await artikelMitBild()
    const cookie = await anmelden(await neuesMitglied())

    const res = await app(`${pfad}?thumb=200x200`, { cookie })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^image\//)
  })

  test('gesperrtes Token holt kein Bild', async () => {
    const pfad = await artikelMitBild()

    const res = await app(pfad, { cookie: 'pb_auth=kein-gueltiges-token' })

    expect(res.ok).toBe(false)
  })
})
