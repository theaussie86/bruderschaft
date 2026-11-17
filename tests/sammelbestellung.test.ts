import ExcelJS from 'exceljs'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { TEST_CLUB, startePocketBase } from './pocketbase-instanz'
import { json, testumgebung } from './helpers'
import { sammelbestellungAbrufen } from '@/lib/sammelbestellung-abruf'

// Der Download braucht eine abgeschlossene Runde. Abschließen trifft die
// offene Runde, an der andere Testdateien arbeiten, deshalb läuft diese Datei
// gegen ein eigenes PocketBase.
let pocketbase: Awaited<ReturnType<typeof startePocketBase>>

const { app, superuser, neuesMitglied, anmelden } = testumgebung(
  () => pocketbase.url,
)

function download(runde: string, format: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return sammelbestellungAbrufen(
    new Request(`http://app.test/api/sammelbestellung/${runde}/${format}`, {
      headers,
    }),
    pocketbase.url,
    runde,
    format,
  )
}

let adminCookie: string
let rundeId: string
let offeneRundeId: string

// Eine Runde mit zwei mitbestellten Aufträgen (einer mit Anmerkung) und einem
// weggelassenen; Hoodie mit Motiv vorne und Text hinten.
beforeAll(async () => {
  pocketbase = await startePocketBase()
  const pb = await superuser()

  const hoodie = await pb.collection('artikel').create({
    name: 'Hoodie',
    preis: 3990,
    artikelnummer: 'H-100',
  })
  const xl = await pb
    .collection('groessen')
    .create({ artikel: hoodie.id, name: 'XL', aufpreis: 300 })
  const logo = await pb.collection('motive').create({ name: 'Logo' })
  const vorne = await pb.collection('druckstellen').create({
    artikel: hoodie.id,
    name: 'vorne',
    art: 'motiv',
    erlaubte_motive: [logo.id],
  })
  const hinten = await pb.collection('druckstellen').create({
    artikel: hoodie.id,
    name: 'hinten',
    art: 'text',
    sortierung: 1,
  })
  const runde = await pb.collection('bestellrunden').create({
    name: 'Winter 2026',
    bestelldatum: '2026-12-01 12:00:00.000Z',
    status: 'offen',
  })
  rundeId = runde.id

  async function auftrag(
    name: string,
    status: 'fertig' | 'in_arbeit',
    anzahl: number,
    text: string,
    anmerkung = '',
  ) {
    const m = await neuesMitglied({ name })
    const a = await pb.collection('auftraege').create({
      runde: runde.id,
      mitglied: m.id,
      status: 'in_arbeit',
      anmerkung,
    })
    const p = await pb.collection('positionen').create({
      auftrag: a.id,
      artikel: hoodie.id,
      groesse: xl.id,
      anzahl,
    })
    await pb
      .collection('belegungen')
      .create({ position: p.id, druckstelle: vorne.id, motiv: logo.id })
    await pb
      .collection('belegungen')
      .create({ position: p.id, druckstelle: hinten.id, text })
    if (status === 'fertig')
      await pb.collection('auftraege').update(a.id, { status })
  }
  await auftrag('Bert Beispiel', 'fertig', 2, 'Bertl')
  await auftrag('Anna Beispiel', 'fertig', 1, 'Anni', 'Bitte weit')
  await auftrag('Carl Beispiel', 'in_arbeit', 5, 'Carli')

  adminCookie = await anmelden(
    await neuesMitglied({ name: 'Admin Beispiel', admin: true }),
  )
  const res = await app(`/pb/api/club/bestellrunden/${runde.id}/abschliessen`, {
    ...json({ mitnehmen: false }),
    cookie: adminCookie,
  })
  if (!res.ok) throw new Error(`Abschließen fehlgeschlagen: ${res.status}`)

  const offen = await pb.collection('bestellrunden').create({
    name: 'Sommer 2027',
    bestelldatum: '2027-06-01 12:00:00.000Z',
    status: 'offen',
  })
  offeneRundeId = offen.id
})

afterAll(async () => {
  await pocketbase.stop()
})

function blattZeilen(mappe: ExcelJS.Workbook, name: string) {
  const ws = mappe.getWorksheet(name)
  if (!ws) throw new Error(`Blatt ${name} fehlt`)
  const zeilen: Array<Array<unknown>> = []
  ws.eachRow((row) => {
    zeilen.push((row.values as Array<unknown>).slice(1))
  })
  return zeilen
}

describe('Download der Sammelbestellung', () => {
  test('Admin bekommt Excel mit Kopf, Summen, Motiven, Textdrucken und Mitgliedern', async () => {
    const res = await download(rundeId, 'xlsx', adminCookie)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('spreadsheetml')
    expect(res.headers.get('content-disposition')).toContain(
      'Sammelbestellung-Winter-2026.xlsx',
    )

    const mappe = new ExcelJS.Workbook()
    await mappe.xlsx.load(await res.arrayBuffer())

    const kopf = blattZeilen(mappe, 'Kopf')
    expect(kopf).toContainEqual(['Bruderschaft', TEST_CLUB])
    expect(kopf).toContainEqual(['Bestellrunde', 'Winter 2026'])
    expect(kopf).toContainEqual(['Aufträge', 2])
    expect(kopf).toContainEqual(['Stücke gesamt', 3])

    expect(blattZeilen(mappe, 'Summen')).toEqual([
      ['Artikel', 'Artikelnummer', 'Größe', 'Belegung', 'Anzahl', 'Hinweis'],
      ['Hoodie', 'H-100', 'XL', 'vorne: Logo · hinten: Text', 3],
    ])
    expect(blattZeilen(mappe, 'Motive')).toEqual([
      ['Nr.', 'Motiv', 'Drucke'],
      [undefined, 'Logo', 3],
    ])
    expect(blattZeilen(mappe, 'Textdrucke')).toEqual([
      [
        'Artikel',
        'Größe',
        'Druckstelle',
        'Text',
        'Anzahl',
        'Mitglied',
        'Hinweis',
      ],
      ['Hoodie', 'XL', 'hinten', 'Anni', 1, 'Anna Beispiel'],
      ['Hoodie', 'XL', 'hinten', 'Bertl', 2, 'Bert Beispiel'],
    ])
    const mitglieder = blattZeilen(mappe, 'Mitglieder')
    expect(mitglieder.slice(1)).toEqual([
      [
        'Anna Beispiel',
        'Hoodie',
        'H-100',
        'XL',
        'vorne: Logo · hinten: „Anni“',
        1,
        undefined,
        'Bitte weit',
      ],
      [
        'Bert Beispiel',
        'Hoodie',
        'H-100',
        'XL',
        'vorne: Logo · hinten: „Bertl“',
        2,
      ],
    ])
  })

  test('weggelassene Aufträge, Preise und Zahlungsstand stehen nicht darin', async () => {
    const res = await download(rundeId, 'xlsx', adminCookie)
    const mappe = new ExcelJS.Workbook()
    await mappe.xlsx.load(await res.arrayBuffer())
    const alles = JSON.stringify(
      mappe.worksheets.map((ws) => blattZeilen(mappe, ws.name)),
    )
    expect(alles).not.toContain('Carl')
    expect(alles).not.toContain('Carli')
    expect(alles).not.toMatch(/€|Preis|Summe|bezahlt|Korrektur/i)
    expect(alles).not.toContain('4490')
  })

  test('PDF ist ein gültiges PDF', async () => {
    const res = await download(rundeId, 'pdf', adminCookie)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(new TextDecoder().decode(bytes.slice(-8))).toContain('%%EOF')
  })

  test('Support-Konto darf herunterladen', async () => {
    const cookie = await anmelden(
      await neuesMitglied({ name: 'Support', support: true }),
    )
    expect((await download(rundeId, 'pdf', cookie)).status).toBe(200)
  })

  test('Mitglied bekommt keinen Download', async () => {
    const cookie = await anmelden(await neuesMitglied())
    expect((await download(rundeId, 'xlsx', cookie)).status).toBe(403)
    expect((await download(rundeId, 'pdf', cookie)).status).toBe(403)
  })

  test('ohne Anmeldung kein Download', async () => {
    expect((await download(rundeId, 'pdf')).status).toBe(401)
    expect((await download(rundeId, 'pdf', 'pb_auth=kaputt')).status).toBe(401)
  })

  test('Mitglied kann den Clubnamen-Endpunkt nicht aufrufen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const res = await app('/pb/api/club/clubname', { cookie })
    expect(res.status).toBe(403)
  })

  test('offene Runde hat noch keine Sammelbestellung', async () => {
    expect((await download(offeneRundeId, 'pdf', adminCookie)).status).toBe(409)
  })

  test('unbekannte Runde und unbekanntes Format ergeben 404', async () => {
    expect((await download('gibtesnicht1234', 'pdf', adminCookie)).status).toBe(
      404,
    )
    expect((await download(rundeId, 'csv', adminCookie)).status).toBe(404)
  })
})
