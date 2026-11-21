import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, superuser } from './helpers'

const TERMINE = '/pb/api/collections/termine/records'

const STAMMTISCH = {
  titel: 'Stammtisch',
  art: 'stammtisch',
  beginn: '2026-12-11 18:30:00.000Z',
  ort: 'Vereinsheim',
  infotext: 'Wie immer.',
}

async function terminVomSuperuser(felder: Record<string, unknown> = {}) {
  const pb = await superuser()
  return pb.collection('termine').create({ ...STAMMTISCH, ...felder })
}

describe('Termine: Rechte', () => {
  test('Mitglied kann keinen Termin anlegen, ändern oder löschen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const termin = await terminVomSuperuser()

    const neu = await app(TERMINE, { ...json(STAMMTISCH), cookie })
    const geaendert = await app(`${TERMINE}/${termin.id}`, {
      ...json({ abgesagt: true }),
      method: 'PATCH',
      cookie,
    })
    const geloescht = await app(`${TERMINE}/${termin.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(neu.ok).toBe(false)
    expect(geaendert.ok).toBe(false)
    expect(geloescht.ok).toBe(false)
    const pb = await superuser()
    expect((await pb.collection('termine').getOne(termin.id)).abgesagt).toBe(
      false,
    )
  })

  test('Mitglied liest Termine, auch abgesagte', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const termin = await terminVomSuperuser({ abgesagt: true })

    const res = await app(`${TERMINE}/${termin.id}`, { cookie })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      titel: 'Stammtisch',
      art: 'stammtisch',
      abgesagt: true,
    })
  })

  test('ohne Anmeldung sind Termine nicht lesbar', async () => {
    const termin = await terminVomSuperuser()

    const res = await app(`${TERMINE}/${termin.id}`)

    expect(res.status).toBe(404)
  })
})

describe('Termine: Admin pflegt den Kalender', () => {
  test('Admin legt einen Termin an und sagt ihn ab', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const neu = await app(TERMINE, {
      ...json({
        titel: 'Sommerfest',
        art: 'veranstaltung',
        beginn: '2027-07-10 14:00:00.000Z',
        ende: '2027-07-10 22:00:00.000Z',
        ort: 'Festwiese',
      }),
      cookie,
    })
    expect(neu.status).toBe(200)
    const termin = await neu.json()
    expect(termin).toMatchObject({ abgesagt: false, ganztaegig: false })

    const abgesagt = await app(`${TERMINE}/${termin.id}`, {
      ...json({ abgesagt: true }),
      method: 'PATCH',
      cookie,
    })

    expect(abgesagt.status).toBe(200)
    const pb = await superuser()
    expect((await pb.collection('termine').getOne(termin.id)).abgesagt).toBe(
      true,
    )
  })

  test('Admin legt einen Termin rückwirkend und ganztägig an', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({
        titel: 'Ausflug',
        art: 'veranstaltung',
        beginn: '2019-06-01 12:00:00.000Z',
        ganztaegig: true,
      }),
      cookie,
    })

    expect(res.status).toBe(200)
  })

  test('Admin legt einen Urlaub über mehrere Tage an', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({
        titel: 'Ausfahrt Gardasee',
        art: 'urlaub',
        beginn: '2027-05-14 12:00:00.000Z',
        ende: '2027-05-16 12:00:00.000Z',
        ganztaegig: true,
      }),
      cookie,
    })

    expect(res.status).toBe(200)
  })

  test('Ein Urlaub ohne Ende wird abgelehnt', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({
        titel: 'Ausfahrt Gardasee',
        art: 'urlaub',
        beginn: '2027-05-14 12:00:00.000Z',
        ganztaegig: true,
      }),
      cookie,
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.data.ende.code).toBe('urlaub_ohne_ende')
  })

  test('Admin löscht einen falsch angelegten Termin', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const termin = await terminVomSuperuser()

    const res = await app(`${TERMINE}/${termin.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(res.status).toBe(204)
  })

  test('Support-Konto pflegt Termine wie ein Admin', async () => {
    const cookie = await anmelden(await neuesMitglied({ support: true }))

    const res = await app(TERMINE, { ...json(STAMMTISCH), cookie })

    expect(res.status).toBe(200)
  })

  test('Ende vor dem Beginn wird abgelehnt', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({ ...STAMMTISCH, ende: '2026-12-11 17:00:00.000Z' }),
      cookie,
    })

    expect(res.status).toBe(400)
    expect((await res.json()).data.ende.message).toMatch(/Ende/)
  })

  test('Art außer Stammtisch und Veranstaltung wird abgelehnt', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({ ...STAMMTISCH, art: 'sitzung' }),
      cookie,
    })

    expect(res.status).toBe(400)
  })
})

describe('Termine: Farbe', () => {
  test('Admin hinterlegt eine Farbe, ohne Farbe bleibt sie leer', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const blau = await app(TERMINE, {
      ...json({ ...STAMMTISCH, titel: 'GHS', farbe: 'blau' }),
      cookie,
    })
    const ohne = await app(TERMINE, { ...json(STAMMTISCH), cookie })

    expect(blau.status).toBe(200)
    expect(await blau.json()).toMatchObject({ titel: 'GHS', farbe: 'blau' })
    expect(await ohne.json()).toMatchObject({ farbe: '' })
  })

  test('Eine Farbe außerhalb der Auswahl wird abgelehnt', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(TERMINE, {
      ...json({ ...STAMMTISCH, farbe: '#ff00ff' }),
      cookie,
    })

    expect(res.status).toBe(400)
  })
})
