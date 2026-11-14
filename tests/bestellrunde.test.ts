import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, superuser } from './helpers'
import type { TestMitglied } from './helpers'

const RUNDEN = '/pb/api/collections/bestellrunden/records'
const AUFTRAEGE = '/pb/api/collections/auftraege/records'
const POSITIONEN = '/pb/api/collections/positionen/records'

// Alle Testdateien teilen sich ein PocketBase, und es gibt höchstens eine
// offene Bestellrunde. Die Tests nutzen deshalb die offene Runde, die gerade
// da ist, oder legen sie an.
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

async function abgeschlosseneRunde() {
  const pb = await superuser()
  return pb.collection('bestellrunden').create({
    name: 'Alte Runde',
    bestelldatum: '2025-12-01 12:00:00.000Z',
    status: 'abgeschlossen',
    abgeschlossen_am: '2025-12-02 12:00:00.000Z',
  })
}

async function artikelMitGroesse() {
  const pb = await superuser()
  const artikel = await pb
    .collection('artikel')
    .create({ name: 'Hoodie', preis: 3990 })
  const groesse = await pb
    .collection('groessen')
    .create({ artikel: artikel.id, name: 'XL', aufpreis: 300 })
  return { artikel, groesse }
}

async function auftragAnlegen(
  m: TestMitglied,
  cookie: string,
  runde: string,
  felder: Record<string, unknown> = {},
) {
  return app(AUFTRAEGE, {
    ...json({ runde, mitglied: m.id, status: 'in_arbeit', ...felder }),
    cookie,
  })
}

async function mitAuftrag(felder: Record<string, unknown> = {}) {
  const m = await neuesMitglied()
  const cookie = await anmelden(m)
  const runde = await offeneRunde()
  const res = await auftragAnlegen(m, cookie, runde.id, felder)
  if (!res.ok) throw new Error(`Auftrag nicht angelegt: ${res.status}`)
  return { m, cookie, runde, auftrag: await res.json() }
}

function patch(pfad: string, cookie: string, felder: Record<string, unknown>) {
  return app(pfad, { ...json(felder), method: 'PATCH', cookie })
}

describe('Bestellrunde', () => {
  test('Admin eröffnet eine Runde, wenn keine offen ist', async () => {
    const pb = await superuser()
    for (const r of await pb
      .collection('bestellrunden')
      .getFullList({ filter: "status = 'offen'" })) {
      await pb.collection('bestellrunden').update(r.id, {
        status: 'abgeschlossen',
        abgeschlossen_am: '2026-01-01 12:00:00.000Z',
      })
    }
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(RUNDEN, {
      ...json({ name: 'Winter', bestelldatum: '2026-12-01 12:00:00.000Z' }),
      cookie,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ name: 'Winter', status: 'offen' })
  })

  test('zweite offene Runde wird abgelehnt', async () => {
    await offeneRunde()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(RUNDEN, {
      ...json({ name: 'Noch eine', bestelldatum: '2026-12-01 12:00:00.000Z' }),
      cookie,
    })

    expect(res.status).toBe(400)
  })

  test('Mitglied kann keine Runde eröffnen, aber lesen', async () => {
    const runde = await offeneRunde()
    const cookie = await anmelden(await neuesMitglied())

    const neu = await app(RUNDEN, {
      ...json({ name: 'Meine', bestelldatum: '2026-12-01 12:00:00.000Z' }),
      cookie,
    })
    const gelesen = await app(`${RUNDEN}/${runde.id}`, { cookie })

    expect(neu.ok).toBe(false)
    expect(gelesen.status).toBe(200)
  })

  test('Admin ändert den Status nicht direkt', async () => {
    const runde = await offeneRunde()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await patch(`${RUNDEN}/${runde.id}`, cookie, {
      status: 'abgeschlossen',
    })

    expect(res.ok).toBe(false)
    const pb = await superuser()
    expect((await pb.collection('bestellrunden').getOne(runde.id)).status).toBe(
      'offen',
    )
  })
})

describe('Auftrag', () => {
  test('Mitglied legt seinen Auftrag mit Anmerkung an', async () => {
    const { auftrag } = await mitAuftrag({ anmerkung: 'Bitte weit' })

    expect(auftrag).toMatchObject({
      status: 'in_arbeit',
      anmerkung: 'Bitte weit',
    })
  })

  test('zweiter Auftrag pro Runde wird abgelehnt', async () => {
    const { m, cookie, runde } = await mitAuftrag()

    const res = await auftragAnlegen(m, cookie, runde.id)

    expect(res.status).toBe(400)
  })

  test('Mitglied liest keinen fremden Auftrag', async () => {
    const { auftrag } = await mitAuftrag()
    const fremd = await anmelden(await neuesMitglied())

    const einzeln = await app(`${AUFTRAEGE}/${auftrag.id}`, { cookie: fremd })
    const liste = await app(AUFTRAEGE, { cookie: fremd })

    expect(einzeln.status).toBe(404)
    expect((await liste.json()).items).toEqual([])
  })

  test('Mitglied legt keinen Auftrag für ein anderes Mitglied an', async () => {
    const anderes = await neuesMitglied()
    const cookie = await anmelden(await neuesMitglied())
    const runde = await offeneRunde()

    const res = await auftragAnlegen(anderes, cookie, runde.id)

    expect(res.ok).toBe(false)
  })

  test('Mitglied ändert keinen fremden Auftrag', async () => {
    const { auftrag } = await mitAuftrag()
    const fremd = await anmelden(await neuesMitglied())

    const res = await patch(`${AUFTRAEGE}/${auftrag.id}`, fremd, {
      anmerkung: 'fremd',
    })

    expect(res.ok).toBe(false)
  })

  test('in einer abgeschlossenen Runde legt niemand einen Auftrag an', async () => {
    const m = await neuesMitglied()
    const cookie = await anmelden(m)
    const runde = await abgeschlosseneRunde()

    const res = await auftragAnlegen(m, cookie, runde.id)

    expect(res.ok).toBe(false)
  })

  test('Admin liest und legt Aufträge für andere an', async () => {
    const { auftrag } = await mitAuftrag()
    const anderes = await neuesMitglied()
    const admin = await anmelden(await neuesMitglied({ admin: true }))
    const runde = await offeneRunde()

    const gelesen = await app(`${AUFTRAEGE}/${auftrag.id}`, { cookie: admin })
    const angelegt = await auftragAnlegen(anderes, admin, runde.id)

    expect(gelesen.status).toBe(200)
    expect(angelegt.status).toBe(200)
  })

  test('Bin fertig, wieder öffnen und Diesmal nichts', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()
    await app(POSITIONEN, {
      ...json({
        auftrag: auftrag.id,
        artikel: artikel.id,
        groesse: groesse.id,
        anzahl: 1,
      }),
      cookie,
    })
    const pfad = `${AUFTRAEGE}/${auftrag.id}`

    const fertig = await patch(pfad, cookie, { status: 'fertig' })
    const offen = await patch(pfad, cookie, { status: 'in_arbeit' })

    expect(fertig.status).toBe(200)
    expect(offen.status).toBe(200)
  })

  test('Bin fertig ohne Positionen wird abgelehnt', async () => {
    const { cookie, auftrag } = await mitAuftrag()

    const res = await patch(`${AUFTRAEGE}/${auftrag.id}`, cookie, {
      status: 'fertig',
    })

    expect(res.status).toBe(400)
  })

  test('Verzicht geht nur ohne Positionen', async () => {
    const leer = await mitAuftrag()
    const voll = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()
    await app(POSITIONEN, {
      ...json({
        auftrag: voll.auftrag.id,
        artikel: artikel.id,
        groesse: groesse.id,
        anzahl: 1,
      }),
      cookie: voll.cookie,
    })

    const ohne = await patch(`${AUFTRAEGE}/${leer.auftrag.id}`, leer.cookie, {
      status: 'verzicht',
    })
    const mit = await patch(`${AUFTRAEGE}/${voll.auftrag.id}`, voll.cookie, {
      status: 'verzicht',
    })

    expect(ohne.status).toBe(200)
    expect(mit.status).toBe(400)
  })

  test('Mitglied hängt seinen Auftrag nicht an ein anderes Mitglied', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const anderes = await neuesMitglied()

    const res = await patch(`${AUFTRAEGE}/${auftrag.id}`, cookie, {
      mitglied: anderes.id,
    })

    expect(res.ok).toBe(false)
  })
})

describe('Position', () => {
  async function position(
    cookie: string,
    auftrag: string,
    felder: Record<string, unknown>,
  ) {
    return app(POSITIONEN, {
      ...json({ auftrag, anzahl: 1, ...felder }),
      cookie,
    })
  }

  test('Mitglied legt Position an, ändert und löscht sie', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()

    const neu = await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
      anzahl: 2,
    })
    const { id } = await neu.json()
    const geaendert = await patch(`${POSITIONEN}/${id}`, cookie, { anzahl: 3 })
    const geloescht = await app(`${POSITIONEN}/${id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(neu.status).toBe(200)
    expect((await geaendert.json()).anzahl).toBe(3)
    expect(geloescht.status).toBe(204)
  })

  test('Größe eines anderen Artikels wird abgelehnt', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const hoodie = await artikelMitGroesse()
    const muetze = await artikelMitGroesse()

    const neu = await position(cookie, auftrag.id, {
      artikel: hoodie.artikel.id,
      groesse: muetze.groesse.id,
    })

    expect(neu.status).toBe(400)
  })

  test('Größe lässt sich nicht auf einen fremden Artikel umstellen', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const hoodie = await artikelMitGroesse()
    const muetze = await artikelMitGroesse()
    const neu = await position(cookie, auftrag.id, {
      artikel: hoodie.artikel.id,
      groesse: hoodie.groesse.id,
    })
    const { id } = await neu.json()

    const res = await patch(`${POSITIONEN}/${id}`, cookie, {
      groesse: muetze.groesse.id,
    })

    expect(res.status).toBe(400)
  })

  test('Anzahl unter 1 wird abgelehnt', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()

    const res = await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
      anzahl: 0,
    })

    expect(res.status).toBe(400)
  })

  test('Mitglied sieht und ändert keine fremden Positionen', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()
    const neu = await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
    })
    const { id } = await neu.json()
    const fremd = await anmelden(await neuesMitglied())

    const gelesen = await app(`${POSITIONEN}/${id}`, { cookie: fremd })
    const angehaengt = await position(fremd, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
    })

    expect(gelesen.status).toBe(404)
    expect(angehaengt.ok).toBe(false)
  })

  test('abgeschickter Auftrag ist für das Mitglied gesperrt', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()
    await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
    })
    await patch(`${AUFTRAEGE}/${auftrag.id}`, cookie, { status: 'fertig' })

    const res = await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
    })

    expect(res.ok).toBe(false)
  })

  test('Artikel mit bestellter Position lässt sich nicht löschen', async () => {
    const { cookie, auftrag } = await mitAuftrag()
    const { artikel, groesse } = await artikelMitGroesse()
    await position(cookie, auftrag.id, {
      artikel: artikel.id,
      groesse: groesse.id,
    })
    const admin = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(`/pb/api/collections/artikel/records/${artikel.id}`, {
      method: 'DELETE',
      cookie: admin,
    })

    expect(res.ok).toBe(false)
  })
})
