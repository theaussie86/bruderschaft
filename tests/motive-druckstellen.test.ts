import { describe, expect, test } from 'vitest'

import { anmelden, app, json, neuesMitglied, superuser } from './helpers'

const MOTIVE = '/pb/api/collections/motive/records'
const DRUCKSTELLEN = '/pb/api/collections/druckstellen/records'

async function alsAdmin() {
  return anmelden(await neuesMitglied({ admin: true }))
}

async function artikel() {
  const pb = await superuser()
  return pb.collection('artikel').create({ name: 'Hoodie', preis: 3990 })
}

async function motiv(name = 'Brotherhood') {
  const pb = await superuser()
  return pb.collection('motive').create({ name })
}

describe('Motive und Druckstellen: Rechte', () => {
  test('Mitglied kann kein Motiv und keine Druckstelle anlegen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const a = await artikel()

    const m = await app(MOTIVE, { ...json({ name: 'Logo' }), cookie })
    const d = await app(DRUCKSTELLEN, {
      ...json({ artikel: a.id, name: 'vorne', art: 'text' }),
      cookie,
    })

    expect(m.ok).toBe(false)
    expect(d.ok).toBe(false)
  })

  test('Mitglied kann Motiv und Druckstelle weder ändern noch löschen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const m = await motiv()
    const pb = await superuser()
    const d = await pb
      .collection('druckstellen')
      .create({ artikel: (await artikel()).id, name: 'vorne', art: 'text' })

    const geaendert = await app(`${MOTIVE}/${m.id}`, {
      ...json({ name: 'Anders' }),
      method: 'PATCH',
      cookie,
    })
    const geloescht = await app(`${DRUCKSTELLEN}/${d.id}`, {
      method: 'DELETE',
      cookie,
    })

    expect(geaendert.ok).toBe(false)
    expect(geloescht.ok).toBe(false)
    expect((await pb.collection('motive').getOne(m.id)).name).toBe(
      'Brotherhood',
    )
    expect((await pb.collection('druckstellen').getOne(d.id)).name).toBe(
      'vorne',
    )
  })

  test('Mitglied liest Motive und Druckstellen', async () => {
    const cookie = await anmelden(await neuesMitglied())
    const m = await motiv()
    const pb = await superuser()
    const d = await pb.collection('druckstellen').create({
      artikel: (await artikel()).id,
      name: 'hinten',
      art: 'motiv',
      erlaubte_motive: [m.id],
    })

    const rm = await app(`${MOTIVE}/${m.id}`, { cookie })
    const rd = await app(`${DRUCKSTELLEN}/${d.id}`, { cookie })

    expect(rm.status).toBe(200)
    expect(rd.status).toBe(200)
    expect((await rd.json()).erlaubte_motive).toEqual([m.id])
  })

  test('ohne Anmeldung nicht lesbar', async () => {
    const m = await motiv()

    const res = await app(`${MOTIVE}/${m.id}`)

    expect(res.status).toBe(404)
  })
})

describe('Motive und Druckstellen: Admin pflegt', () => {
  test('Admin legt ein Motiv an', async () => {
    const res = await app(MOTIVE, {
      ...json({ name: 'Hahna Allgäu', sortierung: 2 }),
      cookie: await alsAdmin(),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      name: 'Hahna Allgäu',
      sortierung: 2,
      ausgeblendet: false,
    })
  })

  test('Admin legt eine Druckstelle mit erlaubten Motiven an', async () => {
    const cookie = await alsAdmin()
    const a = await artikel()
    const m1 = await motiv('Brotherhood')
    const m2 = await motiv('Hahna Allgäu')

    const res = await app(DRUCKSTELLEN, {
      ...json({
        artikel: a.id,
        name: 'Ärmel links',
        art: 'motiv',
        pflicht: true,
        aufpreis: 500,
        erlaubte_motive: [m1.id, m2.id],
        sortierung: 1,
      }),
      cookie,
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      artikel: a.id,
      name: 'Ärmel links',
      art: 'motiv',
      pflicht: true,
      aufpreis: 500,
      erlaubte_motive: [m1.id, m2.id],
      sortierung: 1,
      ausgeblendet: false,
    })
  })

  test('Text-Druckstelle ist standardmäßig optional und ohne Aufpreis', async () => {
    const res = await app(DRUCKSTELLEN, {
      ...json({ artikel: (await artikel()).id, name: 'Nacken', art: 'text' }),
      cookie: await alsAdmin(),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ pflicht: false, aufpreis: 0 })
  })

  test.each([
    ['ohne Artikel', { name: 'vorne', art: 'text' }],
    ['ohne Namen', { art: 'text' }],
    ['ohne Art', { name: 'vorne' }],
    ['mit unbekannter Art', { name: 'vorne', art: 'stick' }],
    ['mit negativem Aufpreis', { name: 'vorne', art: 'text', aufpreis: -1 }],
  ])('Druckstelle %s wird abgelehnt', async (titel, felder) => {
    const a = await artikel()
    const body =
      titel === 'ohne Artikel' ? felder : { artikel: a.id, ...felder }

    const res = await app(DRUCKSTELLEN, {
      ...json(body),
      cookie: await alsAdmin(),
    })

    expect(res.status).toBe(400)
  })

  test('Text-Druckstelle mit erlaubten Motiven wird abgelehnt', async () => {
    const m = await motiv()

    const res = await app(DRUCKSTELLEN, {
      ...json({
        artikel: (await artikel()).id,
        name: 'Nacken',
        art: 'text',
        erlaubte_motive: [m.id],
      }),
      cookie: await alsAdmin(),
    })

    expect(res.status).toBe(400)
  })

  test('Motiv ohne Namen wird abgelehnt', async () => {
    const res = await app(MOTIVE, { ...json({}), cookie: await alsAdmin() })

    expect(res.status).toBe(400)
  })

  test('Löschen eines Artikels nimmt seine Druckstellen mit', async () => {
    const a = await artikel()
    const pb = await superuser()
    const d = await pb
      .collection('druckstellen')
      .create({ artikel: a.id, name: 'vorne', art: 'text' })

    const res = await app(`/pb/api/collections/artikel/records/${a.id}`, {
      method: 'DELETE',
      cookie: await alsAdmin(),
    })

    expect(res.status).toBe(204)
    await expect(pb.collection('druckstellen').getOne(d.id)).rejects.toThrow()
  })
})
