import { describe, expect, test } from 'vitest'

import {
  anmelden,
  app,
  json,
  neuesMitglied,
  offeneRunde,
  superuser,
} from './helpers'

const AUFTRAEGE = '/pb/api/collections/auftraege/records'
const POSITIONEN = '/pb/api/collections/positionen/records'
const BELEGUNGEN = '/pb/api/collections/belegungen/records'

function patch(pfad: string, cookie: string, felder: Record<string, unknown>) {
  return app(pfad, { ...json(felder), method: 'PATCH', cookie })
}

function loeschen(pfad: string, cookie: string) {
  return app(pfad, { method: 'DELETE', cookie })
}

async function admin() {
  return anmelden(await neuesMitglied({ admin: true }))
}

// Hoodie in M und XL, vorne Motiv (Logo oder Adler), hinten Text.
async function sortiment() {
  const pb = await superuser()
  const logo = await pb.collection('motive').create({ name: 'Logo' })
  const adler = await pb.collection('motive').create({ name: 'Adler' })
  const artikel = await pb.collection('artikel').create({
    name: 'Hoodie schwarz',
    preis: 3990,
    artikelnummer: 'H-1',
    beschreibung: 'Warm',
    sortierung: 3,
  })
  const m = await pb
    .collection('groessen')
    .create({ artikel: artikel.id, name: 'M', sortierung: 0 })
  const xl = await pb.collection('groessen').create({
    artikel: artikel.id,
    name: 'XL',
    aufpreis: 300,
    sortierung: 1,
  })
  const vorne = await pb.collection('druckstellen').create({
    artikel: artikel.id,
    name: 'vorne',
    art: 'motiv',
    pflicht: true,
    aufpreis: 200,
    erlaubte_motive: [logo.id, adler.id],
    sortierung: 0,
  })
  const hinten = await pb.collection('druckstellen').create({
    artikel: artikel.id,
    name: 'hinten',
    art: 'text',
    sortierung: 1,
  })
  return { artikel, m, xl, vorne, hinten, logo, adler }
}

type Sortiment = Awaited<ReturnType<typeof sortiment>>

async function ausblenden(collection: string, id: string) {
  const pb = await superuser()
  await pb.collection(collection).update(id, { ausgeblendet: true })
}

// Ein Mitglied mit Auftrag in der offenen Runde.
async function mitAuftrag() {
  const mitglied = await neuesMitglied()
  const cookie = await anmelden(mitglied)
  const runde = await offeneRunde()
  const res = await app(AUFTRAEGE, {
    ...json({ runde: runde.id, mitglied: mitglied.id }),
    cookie,
  })
  const auftrag = await res.json()
  return { cookie, auftrag: auftrag.id as string }
}

async function position(
  cookie: string,
  auftrag: string,
  s: Sortiment,
  groesse = s.m.id,
) {
  return app(POSITIONEN, {
    ...json({ auftrag, artikel: s.artikel.id, groesse, anzahl: 1 }),
    cookie,
  })
}

describe('Ausgeblendetes ist für neue Positionen nicht wählbar', () => {
  test('ausgeblendeter Artikel lässt sich nicht neu wählen', async () => {
    const s = await sortiment()
    await ausblenden('artikel', s.artikel.id)
    const { cookie, auftrag } = await mitAuftrag()

    const res = await position(cookie, auftrag, s)

    expect(res.status).toBe(400)
    expect((await res.json()).data.artikel.code).toBe('nicht_verfuegbar')
  })

  test('ausgeblendete Größe lässt sich nicht neu wählen, auch nicht per Änderung', async () => {
    const s = await sortiment()
    await ausblenden('groessen', s.xl.id)
    const { cookie, auftrag } = await mitAuftrag()

    const neu = await position(cookie, auftrag, s, s.xl.id)
    const ok = await position(cookie, auftrag, s)
    const p = await ok.json()
    const geaendert = await patch(`${POSITIONEN}/${p.id}`, cookie, {
      groesse: s.xl.id,
    })

    expect(neu.status).toBe(400)
    expect((await neu.json()).data.groesse.code).toBe('nicht_verfuegbar')
    expect(ok.status).toBe(200)
    expect(geaendert.status).toBe(400)
  })

  test('ausgeblendete Druckstelle und ausgeblendetes Motiv lassen sich nicht neu belegen', async () => {
    const s = await sortiment()
    const { cookie, auftrag } = await mitAuftrag()
    const p = await (await position(cookie, auftrag, s)).json()
    await ausblenden('druckstellen', s.hinten.id)
    await ausblenden('motive', s.adler.id)

    const text = await app(BELEGUNGEN, {
      ...json({ position: p.id, druckstelle: s.hinten.id, text: 'Spitz' }),
      cookie,
    })
    const motiv = await app(BELEGUNGEN, {
      ...json({ position: p.id, druckstelle: s.vorne.id, motiv: s.adler.id }),
      cookie,
    })
    const logo = await app(BELEGUNGEN, {
      ...json({ position: p.id, druckstelle: s.vorne.id, motiv: s.logo.id }),
      cookie,
    })
    const b = await logo.json()
    const umgestellt = await patch(`${BELEGUNGEN}/${b.id}`, cookie, {
      motiv: s.adler.id,
    })

    expect(text.status).toBe(400)
    expect((await text.json()).data.druckstelle.code).toBe('nicht_verfuegbar')
    expect(motiv.status).toBe(400)
    expect((await motiv.json()).data.motiv.code).toBe('nicht_verfuegbar')
    expect(logo.status).toBe(200)
    expect(umgestellt.status).toBe(400)
  })

  test('bestehende Position bleibt gültig und lässt sich weiter ändern', async () => {
    const s = await sortiment()
    const { cookie, auftrag } = await mitAuftrag()
    const p = await (await position(cookie, auftrag, s)).json()
    const b = await (
      await app(BELEGUNGEN, {
        ...json({ position: p.id, druckstelle: s.vorne.id, motiv: s.adler.id }),
        cookie,
      })
    ).json()
    await ausblenden('artikel', s.artikel.id)
    await ausblenden('groessen', s.m.id)
    await ausblenden('druckstellen', s.vorne.id)
    await ausblenden('motive', s.adler.id)

    const anzahl = await patch(`${POSITIONEN}/${p.id}`, cookie, { anzahl: 3 })
    const fertig = await patch(`${AUFTRAEGE}/${auftrag}`, cookie, {
      status: 'fertig',
    })

    expect(anzahl.status).toBe(200)
    expect(fertig.status).toBe(200)
    const pb = await superuser()
    expect((await pb.collection('positionen').getOne(p.id)).anzahl).toBe(3)
    expect((await pb.collection('belegungen').getOne(b.id)).motiv).toBe(
      s.adler.id,
    )
  })
})

describe('Löschen nur, solange nie bestellt', () => {
  test('Bestelltes lässt sich nicht löschen, mit verständlicher Meldung', async () => {
    const s = await sortiment()
    const { cookie, auftrag } = await mitAuftrag()
    const p = await (await position(cookie, auftrag, s)).json()
    await app(BELEGUNGEN, {
      ...json({ position: p.id, druckstelle: s.vorne.id, motiv: s.adler.id }),
      cookie,
    })
    const adminCookie = await admin()

    const ziele = [
      ['artikel', s.artikel.id],
      ['groessen', s.m.id],
      ['druckstellen', s.vorne.id],
      ['motive', s.adler.id],
    ] as const
    for (const [collection, id] of ziele) {
      const res = await loeschen(
        `/pb/api/collections/${collection}/records/${id}`,
        adminCookie,
      )
      expect(res.status, collection).toBe(400)
      expect((await res.json()).message, collection).toMatch(/ausblenden/)
    }

    const pb = await superuser()
    const belegung = await pb
      .collection('belegungen')
      .getFirstListItem(pb.filter('position = {:id}', { id: p.id }))
    expect(belegung.motiv).toBe(s.adler.id)
  })

  test('nie Bestelltes lässt sich löschen', async () => {
    const s = await sortiment()
    const adminCookie = await admin()

    const groesse = await loeschen(
      `/pb/api/collections/groessen/records/${s.xl.id}`,
      adminCookie,
    )
    const motiv = await loeschen(
      `/pb/api/collections/motive/records/${s.logo.id}`,
      adminCookie,
    )
    const artikel = await loeschen(
      `/pb/api/collections/artikel/records/${s.artikel.id}`,
      adminCookie,
    )

    expect(groesse.status).toBe(204)
    expect(motiv.status).toBe(204)
    expect(artikel.status).toBe(204)
  })
})

describe('Artikel kopieren', () => {
  function kopieren(id: string, cookie: string) {
    return app(`/pb/api/club/artikel/${id}/kopieren`, { ...json({}), cookie })
  }

  test('Kopie hat alle Felder, Größen, Druckstellen und erlaubten Motive', async () => {
    const s = await sortiment()
    await ausblenden('groessen', s.xl.id)
    const cookie = await admin()

    const res = await kopieren(s.artikel.id, cookie)

    expect(res.status).toBe(200)
    const kopie = await res.json()
    expect(kopie.id).not.toBe(s.artikel.id)
    const pb = await superuser()
    const artikel = await pb.collection('artikel').getOne(kopie.id)
    expect(artikel).toMatchObject({
      name: 'Hoodie schwarz (Kopie)',
      preis: 3990,
      artikelnummer: 'H-1',
      beschreibung: 'Warm',
      ausgeblendet: false,
    })
    expect(artikel.sortierung).toBeGreaterThan(s.artikel.sortierung)

    const groessen = await pb.collection('groessen').getFullList({
      filter: pb.filter('artikel = {:id}', { id: kopie.id }),
      sort: 'sortierung',
    })
    expect(
      groessen.map((g) => [g.name, g.aufpreis, g.sortierung, g.ausgeblendet]),
    ).toEqual([
      ['M', 0, 0, false],
      ['XL', 300, 1, true],
    ])

    const druckstellen = await pb.collection('druckstellen').getFullList({
      filter: pb.filter('artikel = {:id}', { id: kopie.id }),
      sort: 'sortierung',
    })
    expect(
      druckstellen.map((d) => [
        d.name,
        d.art,
        d.pflicht,
        d.aufpreis,
        d.erlaubte_motive,
      ]),
    ).toEqual([
      ['vorne', 'motiv', true, 200, [s.logo.id, s.adler.id]],
      ['hinten', 'text', false, 0, []],
    ])

    const original = await pb.collection('groessen').getFullList({
      filter: pb.filter('artikel = {:id}', { id: s.artikel.id }),
    })
    expect(original).toHaveLength(2)
  })

  test('Kopie bekommt eine eigene Kopie des Bilds', async () => {
    const pb = await superuser()
    const form = new FormData()
    form.set('name', 'Mütze')
    form.set('preis', '1500')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )
    form.set('bild', new Blob([png], { type: 'image/png' }), 'muetze.png')
    const artikel = await pb.collection('artikel').create(form)
    const cookie = await admin()

    const res = await kopieren(artikel.id, cookie)

    expect(res.status).toBe(200)
    const kopie = await pb.collection('artikel').getOne((await res.json()).id)
    expect(kopie.bild).toMatch(/^muetze.*\.png$/)
    const token = await pb.files.getToken()
    const datei = await fetch(pb.files.getURL(kopie, kopie.bild, { token }))
    expect(datei.status).toBe(200)
    expect(Buffer.from(await datei.arrayBuffer())).toEqual(png)
  })

  test('Mitglied kann keinen Artikel kopieren', async () => {
    const s = await sortiment()
    const cookie = await anmelden(await neuesMitglied())

    const res = await kopieren(s.artikel.id, cookie)

    expect(res.status).toBe(403)
  })

  test('unbekannter Artikel ergibt 404', async () => {
    const res = await kopieren('gibtesnicht1234', await admin())
    expect(res.status).toBe(404)
  })
})
