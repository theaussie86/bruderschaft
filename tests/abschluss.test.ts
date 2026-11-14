import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { startePocketBase } from './pocketbase-instanz'
import { json, testumgebung } from './helpers'
import type { TestMitglied } from './helpers'

// Abschließen schließt die offene Runde, an der die übrigen Testdateien
// gleichzeitig arbeiten. Deshalb läuft diese Datei gegen ein eigenes
// PocketBase; die Tests darin laufen nacheinander.
let pocketbase: Awaited<ReturnType<typeof startePocketBase>>

beforeAll(async () => {
  pocketbase = await startePocketBase()
})

afterAll(async () => {
  await pocketbase.stop()
})

const { app, superuser, neuesMitglied, offeneRunde, anmelden } = testumgebung(
  () => pocketbase.url,
)

const RUNDEN = '/pb/api/collections/bestellrunden/records'
const AUFTRAEGE = '/pb/api/collections/auftraege/records'
const POSITIONEN = '/pb/api/collections/positionen/records'
const EINSTELLUNGEN = '/pb/api/collections/einstellungen/records'

function patch(pfad: string, cookie: string, felder: Record<string, unknown>) {
  return app(pfad, { ...json(felder), method: 'PATCH', cookie })
}

function abschliessen(cookie: string, runde: string, mitnehmen = false) {
  return app(`/pb/api/club/bestellrunden/${runde}/abschliessen`, {
    ...json({ mitnehmen }),
    cookie,
  })
}

function oeffnen(cookie: string, runde: string) {
  return app(`/pb/api/club/bestellrunden/${runde}/oeffnen`, {
    ...json({}),
    cookie,
  })
}

async function admin() {
  return anmelden(await neuesMitglied({ admin: true }))
}

// Hoodie 39,90 € in XL (+3 €) mit Druckstelle vorne (+2 €, Text).
async function sortiment() {
  const pb = await superuser()
  const artikel = await pb
    .collection('artikel')
    .create({ name: 'Hoodie', preis: 3990 })
  const groesse = await pb
    .collection('groessen')
    .create({ artikel: artikel.id, name: 'XL', aufpreis: 300 })
  const vorne = await pb.collection('druckstellen').create({
    artikel: artikel.id,
    name: 'vorne',
    art: 'text',
    aufpreis: 200,
  })
  return { artikel, groesse, vorne }
}

type Sortiment = Awaited<ReturnType<typeof sortiment>>

// Ein Mitglied mit Auftrag in der offenen Runde: zwei Hoodies mit Text vorne
// (2 × 44,90 €), Status wie gewünscht.
async function auftrag(
  s: Sortiment,
  status: 'in_arbeit' | 'fertig' | 'verzicht',
  m?: TestMitglied,
) {
  const mitglied = m ?? (await neuesMitglied())
  const cookie = await anmelden(mitglied)
  const runde = await offeneRunde()
  const neu = await app(AUFTRAEGE, {
    ...json({ runde: runde.id, mitglied: mitglied.id }),
    cookie,
  })
  const a = await neu.json()
  if (status !== 'verzicht') {
    const p = await app(POSITIONEN, {
      ...json({
        auftrag: a.id,
        artikel: s.artikel.id,
        groesse: s.groesse.id,
        anzahl: 2,
      }),
      cookie,
    })
    const position = await p.json()
    await app('/pb/api/collections/belegungen/records', {
      ...json({ position: position.id, druckstelle: s.vorne.id, text: 'X' }),
      cookie,
    })
  }
  if (status !== 'in_arbeit') {
    const res = await patch(`${AUFTRAEGE}/${a.id}`, cookie, { status })
    if (!res.ok) throw new Error(`Status nicht gesetzt: ${res.status}`)
  }
  return { mitglied, cookie, runde, id: a.id as string }
}

async function gespeichert(collection: string, id: string) {
  return (await superuser()).collection(collection).getOne(id)
}

async function positionVon(auftragId: string) {
  const pb = await superuser()
  return pb
    .collection('positionen')
    .getFirstListItem(pb.filter('auftrag = {:id}', { id: auftragId }))
}

describe('Abschließen', () => {
  test('Warnzahl nennt die nicht fertigen Aufträge', async () => {
    const s = await sortiment()
    await auftrag(s, 'fertig')
    const { runde } = await auftrag(s, 'in_arbeit')
    await auftrag(s, 'verzicht')
    const cookie = await admin()

    const res = await app(`/pb/api/club/bestellrunden/${runde.id}/abschluss`, {
      cookie,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ nicht_fertig: 1 })
    await abschliessen(cookie, runde.id)
  })

  test('weglassen: nur fertige Aufträge sind mitbestellt, Preise festgehalten', async () => {
    const s = await sortiment()
    const fertig = await auftrag(s, 'fertig')
    const offen = await auftrag(s, 'in_arbeit')
    const verzicht = await auftrag(s, 'verzicht')
    const cookie = await admin()

    const res = await abschliessen(cookie, fertig.runde.id, false)

    expect(res.status).toBe(200)
    expect(await gespeichert('bestellrunden', fertig.runde.id)).toMatchObject({
      status: 'abgeschlossen',
    })
    expect(
      (await gespeichert('bestellrunden', fertig.runde.id)).abgeschlossen_am,
    ).not.toBe('')
    expect(await gespeichert('auftraege', fertig.id)).toMatchObject({
      mitbestellt: true,
      summe: 2 * 4490,
    })
    expect(await positionVon(fertig.id)).toMatchObject({ stueckpreis: 4490 })
    expect(await gespeichert('auftraege', offen.id)).toMatchObject({
      mitbestellt: false,
      summe: 0,
    })
    expect(await gespeichert('auftraege', verzicht.id)).toMatchObject({
      mitbestellt: false,
    })
  })

  test('mitnehmen: auch nicht fertige Aufträge sind mitbestellt', async () => {
    const s = await sortiment()
    const fertig = await auftrag(s, 'fertig')
    const offen = await auftrag(s, 'in_arbeit')
    const cookie = await admin()

    await abschliessen(cookie, fertig.runde.id, true)

    expect(await gespeichert('auftraege', fertig.id)).toMatchObject({
      mitbestellt: true,
    })
    expect(await gespeichert('auftraege', offen.id)).toMatchObject({
      mitbestellt: true,
      summe: 2 * 4490,
    })
  })

  test('Festpreise bleiben nach einer Preisänderung stabil', async () => {
    const s = await sortiment()
    const fertig = await auftrag(s, 'fertig')
    const cookie = await admin()
    await abschliessen(cookie, fertig.runde.id)

    const pb = await superuser()
    await pb.collection('artikel').update(s.artikel.id, { preis: 5000 })

    expect(await gespeichert('auftraege', fertig.id)).toMatchObject({
      summe: 2 * 4490,
    })
    expect(await positionVon(fertig.id)).toMatchObject({ stueckpreis: 4490 })
  })

  test('Mitglied kann nicht abschließen und keine Warnzahlen abrufen', async () => {
    const runde = await offeneRunde()
    const cookie = await anmelden(await neuesMitglied())

    const zu = await abschliessen(cookie, runde.id)
    const warnung = await app(
      `/pb/api/club/bestellrunden/${runde.id}/abschluss`,
      { cookie },
    )

    expect(zu.status).toBe(403)
    expect(warnung.status).toBe(403)
    expect(await gespeichert('bestellrunden', runde.id)).toMatchObject({
      status: 'offen',
    })
    await abschliessen(await admin(), runde.id)
  })

  test('Mitglied setzt mitbestellt, Summe und Stückpreis nicht selbst', async () => {
    const s = await sortiment()
    const a = await auftrag(s, 'in_arbeit')
    const position = await positionVon(a.id)

    const mitbestellt = await patch(`${AUFTRAEGE}/${a.id}`, a.cookie, {
      mitbestellt: true,
    })
    const summe = await patch(`${AUFTRAEGE}/${a.id}`, a.cookie, { summe: 1 })
    const preis = await patch(`${POSITIONEN}/${position.id}`, a.cookie, {
      stueckpreis: 1,
    })

    expect(mitbestellt.ok).toBe(false)
    expect(summe.ok).toBe(false)
    expect(preis.ok).toBe(false)
    await abschliessen(await admin(), a.runde.id)
  })
})

describe('Nach dem Abschluss', () => {
  test('Mitglied schreibt nichts mehr', async () => {
    const s = await sortiment()
    const a = await auftrag(s, 'in_arbeit')
    await abschliessen(await admin(), a.runde.id, true)
    const position = await positionVon(a.id)

    const anmerkung = await patch(`${AUFTRAEGE}/${a.id}`, a.cookie, {
      anmerkung: 'zu spät',
    })
    const anzahl = await patch(`${POSITIONEN}/${position.id}`, a.cookie, {
      anzahl: 5,
    })
    const neu = await app(POSITIONEN, {
      ...json({
        auftrag: a.id,
        artikel: s.artikel.id,
        groesse: s.groesse.id,
        anzahl: 1,
      }),
      cookie: a.cookie,
    })

    expect(anmerkung.ok).toBe(false)
    expect(anzahl.ok).toBe(false)
    expect(neu.ok).toBe(false)
    expect(await gespeichert('auftraege', a.id)).toMatchObject({
      anmerkung: '',
    })
  })

  test('Admin ändert nur Korrektur und bezahlt, die Summe zieht mit', async () => {
    const s = await sortiment()
    const a = await auftrag(s, 'fertig')
    const cookie = await admin()
    await abschliessen(cookie, a.runde.id)
    const pfad = `${AUFTRAEGE}/${a.id}`

    const korrektur = await patch(pfad, cookie, {
      korrektur_betrag: -500,
      korrektur_grund: 'Rabatt',
      bezahlt: true,
    })
    const status = await patch(pfad, cookie, { status: 'in_arbeit' })
    const anmerkung = await patch(pfad, cookie, { anmerkung: 'später' })

    expect(korrektur.status).toBe(200)
    expect(await korrektur.json()).toMatchObject({
      bezahlt: true,
      summe: 2 * 4490 - 500,
    })
    expect(status.ok).toBe(false)
    expect(anmerkung.ok).toBe(false)
  })

  test('Admin ändert auch keine Positionen mehr', async () => {
    const s = await sortiment()
    const a = await auftrag(s, 'fertig')
    const cookie = await admin()
    await abschliessen(cookie, a.runde.id)
    const position = await positionVon(a.id)

    const res = await patch(`${POSITIONEN}/${position.id}`, cookie, {
      anzahl: 5,
    })

    expect(res.ok).toBe(false)
  })

  test('zweimal abschließen wird abgelehnt', async () => {
    const runde = await offeneRunde()
    const cookie = await admin()
    await abschliessen(cookie, runde.id)

    const res = await abschliessen(cookie, runde.id)

    expect(res.status).toBe(400)
  })
})

describe('Wieder öffnen', () => {
  test('nimmt wieder die aktuellen Preise und leert die Festwerte', async () => {
    const s = await sortiment()
    const a = await auftrag(s, 'fertig')
    const cookie = await admin()
    await abschliessen(cookie, a.runde.id)

    const res = await oeffnen(cookie, a.runde.id)

    expect(res.status).toBe(200)
    expect(await gespeichert('bestellrunden', a.runde.id)).toMatchObject({
      status: 'offen',
      abgeschlossen_am: '',
    })
    expect(await gespeichert('auftraege', a.id)).toMatchObject({
      mitbestellt: false,
      summe: 0,
    })
    expect(await positionVon(a.id)).toMatchObject({ stueckpreis: 0 })

    const pb = await superuser()
    await pb.collection('artikel').update(s.artikel.id, { preis: 5000 })
    await abschliessen(cookie, a.runde.id)

    expect(await gespeichert('auftraege', a.id)).toMatchObject({
      mitbestellt: true,
      summe: 2 * (5000 + 300 + 200),
    })
  })

  test('geht nicht, solange eine andere Runde offen ist', async () => {
    const alt = await offeneRunde()
    const cookie = await admin()
    await abschliessen(cookie, alt.id)
    const neu = await offeneRunde()

    const res = await oeffnen(cookie, alt.id)

    expect(res.status).toBe(400)
    expect(await gespeichert('bestellrunden', alt.id)).toMatchObject({
      status: 'abgeschlossen',
    })
    await abschliessen(cookie, neu.id)
  })

  test('Mitglied kann nicht wieder öffnen', async () => {
    const runde = await offeneRunde()
    await abschliessen(await admin(), runde.id)
    const cookie = await anmelden(await neuesMitglied())

    const res = await oeffnen(cookie, runde.id)

    expect(res.status).toBe(403)
  })
})

describe('Einstellungen', () => {
  test('alle Mitglieder lesen den Zahlungshinweis, nur Admins ändern ihn', async () => {
    const mitglied = await anmelden(await neuesMitglied())
    const liste = await app(EINSTELLUNGEN, { cookie: mitglied })
    const [einstellungen] = (await liste.json()).items
    const pfad = `${EINSTELLUNGEN}/${einstellungen.id}`

    const vomMitglied = await patch(pfad, mitglied, {
      zahlungshinweis: 'falsch',
    })
    const vomAdmin = await patch(pfad, await admin(), {
      zahlungshinweis: 'Bitte überweisen',
    })
    const anonym = await app(EINSTELLUNGEN)

    expect(vomMitglied.ok).toBe(false)
    expect(vomAdmin.status).toBe(200)
    expect((await app(pfad, { cookie: mitglied })).status).toBe(200)
    expect((await anonym.json()).items ?? []).toEqual([])
  })
})

test('Runden-Status ändert weiter niemand direkt', async () => {
  const runde = await offeneRunde()
  const res = await patch(`${RUNDEN}/${runde.id}`, await admin(), {
    status: 'abgeschlossen',
  })
  expect(res.ok).toBe(false)
})
