import { describe, expect, test } from 'vitest'

import { anmelden, app, neuesMitglied, superuser } from './helpers'
import type { Termin } from '@/lib/termine'
import { protokollDokument, protokollTextLeer } from '@/lib/protokoll'
import { hatProtokoll } from '@/lib/termine'

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

// Ein Protokolltext, wie ihn der Editor als Tiptap/ProseMirror-JSON liefert.
const TEXT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '14 da. Kasse stimmt.' }],
    },
  ],
}

function textSpeichern(terminId: string, cookie: string, text: unknown = TEXT) {
  return app(`${TERMINE}/${terminId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protokolltext: text }),
    cookie,
  })
}

function zeitpunkt(wert: unknown) {
  return new Date(String(wert).replace(' ', 'T')).getTime()
}

describe('Protokolltext', () => {
  test('Admin speichert Text, jedes Mitglied liest ihn mit dem Zeitpunkt der Speicherung', async () => {
    const termin = await stammtisch()
    const vorher = Date.now()

    const res = await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied({ admin: true })),
    )
    expect(res.status).toBe(200)

    const gelesen = await app(`${TERMINE}/${termin.id}`, {
      cookie: await anmelden(await neuesMitglied()),
    })
    const daten = await gelesen.json()
    expect(daten.protokolltext).toEqual(TEXT)
    const gespeichert = zeitpunkt(daten.protokoll_gespeichert)
    expect(gespeichert).toBeGreaterThanOrEqual(vorher - 1000)
    expect(gespeichert).toBeLessThanOrEqual(Date.now() + 1000)
  })

  test('Mitglied kann keinen Protokolltext speichern', async () => {
    const termin = await stammtisch()

    const res = await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied()),
    )

    expect(res.ok).toBe(false)
    const pb = await superuser()
    const gelesen = await pb.collection('termine').getOne(termin.id)
    expect(gelesen.protokolltext).toBeNull()
    expect(gelesen.protokoll_gespeichert).toBe('')
  })

  test('der Zeitpunkt folgt dem Text, nicht anderen Änderungen am Termin', async () => {
    const termin = await stammtisch()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const erst = await (await textSpeichern(termin.id, cookie)).json()

    const verschoben = await app(`${TERMINE}/${termin.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ort: 'Wirtschaft',
        protokoll_gespeichert: '2020-01-01 00:00:00.000Z',
      }),
      cookie,
    })

    expect((await verschoben.json()).protokoll_gespeichert).toBe(
      erst.protokoll_gespeichert,
    )
  })

  test('ein mit leerem Dokument angelegter Stammtisch hat keinen Zeitpunkt', async () => {
    const termin = await stammtisch({
      protokolltext: { type: 'doc', content: [{ type: 'paragraph' }] },
    })

    expect(termin.protokoll_gespeichert).toBe('')
  })

  test('derselbe Text in anderer Schlüssel-Reihenfolge ändert den Zeitpunkt nicht', async () => {
    const termin = await stammtisch()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const erst = await (await textSpeichern(termin.id, cookie)).json()

    const umsortiert = {
      content: [
        {
          content: [{ text: '14 da. Kasse stimmt.', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    }
    const res = await textSpeichern(termin.id, cookie, umsortiert)

    expect((await res.json()).protokoll_gespeichert).toBe(
      erst.protokoll_gespeichert,
    )
  })

  test('Admin ergänzt den Text eines vergangenen Stammtischs', async () => {
    const termin = await stammtisch({ beginn: '2024-03-01 18:30:00.000Z' })
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    await textSpeichern(termin.id, cookie)
    const ergaenzt = {
      type: 'doc',
      content: [
        ...TEXT.content,
        { type: 'paragraph', content: [{ type: 'text', text: 'Nachtrag.' }] },
      ],
    }

    const res = await textSpeichern(termin.id, cookie, ergaenzt)

    expect(res.status).toBe(200)
    expect((await res.json()).protokolltext).toEqual(ergaenzt)
  })

  test('Text und Dateien hängen zusammen am Protokoll', async () => {
    const termin = await stammtisch()
    await alsAdminHochladen(termin.id)
    await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied({ admin: true })),
    )

    const res = await app(`${TERMINE}/${termin.id}`, {
      cookie: await anmelden(await neuesMitglied()),
    })

    const daten = await res.json()
    expect(daten.protokolltext).toEqual(TEXT)
    expect(daten.protokoll).toHaveLength(1)
  })

  test('wechselt die Art weg von Stammtisch, ist der Text ausgeblendet, nicht gelöscht', async () => {
    const termin = await stammtisch()
    await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied({ admin: true })),
    )
    const cookie = await anmelden(await neuesMitglied())
    const pb = await superuser()

    await pb
      .collection('termine')
      .update(termin.id, { art: 'urlaub', ende: '2025-06-08 18:30:00.000Z' })
    const ausgeblendet = await (
      await app(`${TERMINE}/${termin.id}`, { cookie })
    ).json()
    expect(ausgeblendet.protokolltext ?? null).toBeNull()
    expect(ausgeblendet.protokoll_gespeichert ?? '').toBe('')

    await pb.collection('termine').update(termin.id, { art: 'stammtisch' })
    const wieder = await (
      await app(`${TERMINE}/${termin.id}`, { cookie })
    ).json()
    expect(wieder.protokolltext).toEqual(TEXT)
    expect(wieder.protokoll_gespeichert).not.toBe('')
  })
})

describe('Protokolltext prüft PocketBase', () => {
  test.each([
    ['HTML als Zeichenkette', '<b>x</b>'],
    ['eine Zahl', 42],
    ['eine Liste', [TEXT]],
    ['ein Knoten, der kein Dokument ist', { type: 'paragraph' }],
  ])('%s wird abgelehnt', async (_, text) => {
    const termin = await stammtisch()

    const res = await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied({ admin: true })),
      text,
    )

    expect(res.status).toBe(400)
    const pb = await superuser()
    expect(
      (await pb.collection('termine').getOne(termin.id)).protokolltext,
    ).toBeNull()
  })

  test('an einem Termin, der kein Stammtisch ist, wird Text abgelehnt', async () => {
    const termin = await stammtisch({ art: 'veranstaltung' })

    const res = await textSpeichern(
      termin.id,
      await anmelden(await neuesMitglied({ admin: true })),
    )

    expect(res.status).toBe(400)
    const pb = await superuser()
    expect(
      (await pb.collection('termine').getOne(termin.id)).protokolltext,
    ).toBeNull()
  })

  test('ein Termin, der kein Stammtisch ist, wird nicht mit Text angelegt', async () => {
    const pb = await superuser()

    await expect(
      pb.collection('termine').create({
        titel: 'Ausflug',
        art: 'veranstaltung',
        beginn: '2025-06-01 18:30:00.000Z',
        protokolltext: TEXT,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('geleert werden darf der Text', async () => {
    const termin = await stammtisch()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    await textSpeichern(termin.id, cookie)

    const res = await textSpeichern(termin.id, cookie, null)

    expect(res.status).toBe(200)
    expect((await res.json()).protokolltext ?? null).toBeNull()
  })
})

describe('Protokolltext für den Editor', () => {
  test('ein Dokument geht an den Editor', () => {
    expect(protokollDokument(TEXT)).toEqual(TEXT)
  })

  test.each([
    ['nie gespeichert', null],
    ['HTML als Zeichenkette', '<b>x</b>'],
    ['eine Liste', [TEXT]],
    ['ein Knoten, der kein Dokument ist', { type: 'paragraph' }],
  ])('%s geht nicht an den Editor', (_, wert) => {
    expect(protokollDokument(wert)).toBeNull()
  })
})

describe('Protokolltext ist leer', () => {
  test.each([
    ['nie gespeichert', null],
    ['leeres Dokument', { type: 'doc', content: [] }],
    ['ein leerer Absatz', { type: 'doc', content: [{ type: 'paragraph' }] }],
    [
      'nur Leerzeichen und leere Listen',
      {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
          },
        ],
      },
    ],
  ])('%s zählt als kein Text', (_, text) => {
    expect(protokollTextLeer(text)).toBe(true)
  })

  test('ein Wort in einer Liste zählt als Text', () => {
    expect(
      protokollTextLeer({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Kasse' }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(false)
  })
})

// Welche der Stammtische laut PocketBase ein Protokoll haben, so wie die
// Liste es als Marke zeigt.
async function habenProtokoll(ids: Array<string>) {
  const nurDiese = ids.map((id) => `id = '${id}'`).join(' || ')
  const res = await app(
    `${TERMINE}?filter=${encodeURIComponent(nurDiese)}&fields=id,protokoll,hat_protokolltext&perPage=50`,
    { cookie: await anmelden(await neuesMitglied()) },
  )
  const items = (await res.json()).items as Array<Termin>
  return items
    .filter(hatProtokoll)
    .map((t) => t.id)
    .sort()
}

describe('Protokoll-Marke am Stammtisch', () => {
  test('ein Stammtisch hat mit Dateien ein Protokoll, ohne nicht', async () => {
    const ohne = await stammtisch()
    const mitDatei = await stammtisch()
    await alsAdminHochladen(mitDatei.id)

    expect(await habenProtokoll([ohne.id, mitDatei.id])).toEqual([mitDatei.id])
  })

  test('ein Stammtisch hat mit geschriebenem Text ein Protokoll', async () => {
    const mitText = await stammtisch()
    await textSpeichern(
      mitText.id,
      await anmelden(await neuesMitglied({ admin: true })),
    )

    expect(await habenProtokoll([mitText.id])).toEqual([mitText.id])
  })

  test('ein Stammtisch mit leerem Dokument und ohne Dateien hat kein Protokoll', async () => {
    const leer = await stammtisch()
    await textSpeichern(
      leer.id,
      await anmelden(await neuesMitglied({ admin: true })),
      {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: '  ' }] },
        ],
      },
    )

    expect(await habenProtokoll([leer.id])).toEqual([])
  })

  test('wird der Text wieder geleert, hat der Stammtisch kein Protokoll mehr', async () => {
    const termin = await stammtisch()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    await textSpeichern(termin.id, cookie)
    await textSpeichern(termin.id, cookie, {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })

    expect(await habenProtokoll([termin.id])).toEqual([])
  })

  test('ob es Text gibt, bestimmt PocketBase, nicht was mitgeschickt wird', async () => {
    const termin = await stammtisch()
    const res = await app(`${TERMINE}/${termin.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ort: 'Wirtschaft', hat_protokolltext: true }),
      cookie: await anmelden(await neuesMitglied({ admin: true })),
    })
    expect(res.status).toBe(200)

    expect(await habenProtokoll([termin.id])).toEqual([])
  })
})
