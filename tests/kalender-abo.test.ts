import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import {
  anmelden,
  app,
  json,
  neuesMitglied,
  pocketbaseUrl,
  superuser,
} from './helpers'
import { kalenderAboAbrufen } from '@/lib/kalender-abo'

const EINSTELLUNGEN = '/pb/api/collections/einstellungen/records'
const ERNEUERN = '/pb/api/club/kalender-abo/erneuern'

async function aktuellerToken() {
  const pb = await superuser()
  const [e] = await pb.collection('einstellungen').getFullList()
  return e.kalender_token as string
}

function abo(token: string) {
  return kalenderAboAbrufen(`${token}.ics`, pocketbaseUrl)
}

async function mitGeburtstag(
  geburtstag: string,
  felder: { gesperrt?: boolean; support?: boolean } = {},
) {
  const name = `Geburtstagskind ${randomUUID().slice(0, 8)}`
  const m = await neuesMitglied({ name, ...felder })
  const pb = await superuser()
  await pb
    .collection('mitglieder')
    .update(m.id, { geburtstag: `${geburtstag} 00:00:00.000Z` })
  return { ...m, name }
}

describe('Kalender-Abo: Token', () => {
  test('Mitglied liest den Token für den Abo-Link', async () => {
    const cookie = await anmelden(await neuesMitglied())

    const res = await app(EINSTELLUNGEN, { cookie })

    expect(res.status).toBe(200)
    const { items } = (await res.json()) as {
      items: Array<{ kalender_token: string }>
    }
    expect(items[0].kalender_token).toMatch(/^\w{40}$/)
  })

  test('niemand setzt den Token direkt, auch kein Admin', async () => {
    const cookie = await anmelden(await neuesMitglied({ admin: true }))
    const pb = await superuser()
    const [e] = await pb.collection('einstellungen').getFullList()

    const res = await app(`${EINSTELLUNGEN}/${e.id}`, {
      ...json({ kalender_token: 'selbst-gewaehlt' }),
      method: 'PATCH',
      cookie,
    })

    expect(res.ok).toBe(false)
    expect(await aktuellerToken()).toBe(e.kalender_token)
  })

  test('ungültiger Token wird abgelehnt', async () => {
    expect((await abo('falsch')).status).toBe(404)
    expect((await abo('')).status).toBe(404)
  })

  test('gültiger Token liefert iCal', async () => {
    const res = await abo(await aktuellerToken())

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const ics = await res.text()
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics).toMatch(/END:VCALENDAR\r\n$/)
  })

  test('Mitglied kann den Link nicht erneuern', async () => {
    const vorher = await aktuellerToken()
    const cookie = await anmelden(await neuesMitglied())

    const res = await app(ERNEUERN, { method: 'POST', cookie })

    expect(res.status).toBe(403)
    expect(await aktuellerToken()).toBe(vorher)
  })

  test('erneuerter Token macht den alten sofort ungültig', async () => {
    const alt = await aktuellerToken()
    const cookie = await anmelden(await neuesMitglied({ admin: true }))

    const res = await app(ERNEUERN, { method: 'POST', cookie })

    expect(res.status).toBe(200)
    const { kalender_token: neu } = (await res.json()) as {
      kalender_token: string
    }
    expect(neu).toMatch(/^\w{40}$/)
    expect(neu).not.toBe(alt)
    expect(await aktuellerToken()).toBe(neu)
    expect((await abo(alt)).status).toBe(404)
    expect((await abo(neu)).status).toBe(200)
  })
})

describe('Kalender-Abo: Inhalt', () => {
  test('enthält Termine, abgesagte als abgesagt markiert', async () => {
    const pb = await superuser()
    const titel = `Sommerfest ${randomUUID().slice(0, 8)}`
    const fest = await pb.collection('termine').create({
      titel,
      art: 'veranstaltung',
      beginn: '2027-07-10 14:00:00.000Z',
      ende: '2027-07-10 22:00:00.000Z',
      ort: 'Festwiese, am See',
    })
    const abgesagt = await pb.collection('termine').create({
      titel: `Stammtisch ${randomUUID().slice(0, 8)}`,
      art: 'stammtisch',
      beginn: '2027-01-08 18:30:00.000Z',
      abgesagt: true,
    })
    const ganztaegig = await pb.collection('termine').create({
      titel: `Ausflug ${randomUUID().slice(0, 8)}`,
      art: 'veranstaltung',
      beginn: '2027-05-01 12:00:00.000Z',
      ende: '2027-05-02 12:00:00.000Z',
      ganztaegig: true,
    })

    const ics = await (await abo(await aktuellerToken())).text()
    const ereignis = (id: string) => ereignisMitUid(ics, `termin-${id}`)

    expect(ereignis(fest.id)).toContain('DTSTART:20270710T140000Z')
    expect(ereignis(fest.id)).toContain('DTEND:20270710T220000Z')
    expect(ereignis(fest.id)).toContain(`SUMMARY:${titel}`)
    expect(ereignis(fest.id)).toContain('LOCATION:Festwiese\\, am See')
    expect(ereignis(fest.id)).not.toContain('CANCELLED')

    expect(ereignis(abgesagt.id)).toContain('STATUS:CANCELLED')
    expect(ereignis(abgesagt.id)).toContain('SUMMARY:Abgesagt: Stammtisch')

    expect(ereignis(ganztaegig.id)).toContain('DTSTART;VALUE=DATE:20270501')
    expect(ereignis(ganztaegig.id)).toContain('DTEND;VALUE=DATE:20270503')
  })

  test('enthält Geburtstage als ganztägige Einträge mit Alter', async () => {
    const kind = await mitGeburtstag('1990-05-17')
    const jahr = new Date().getUTCFullYear()

    const ics = await (await abo(await aktuellerToken())).text()
    const ereignis = ereignisMitUid(ics, `geburtstag-${kind.id}-${jahr + 1}`)

    expect(ereignis).toContain(`DTSTART;VALUE=DATE:${jahr + 1}0517`)
    expect(ereignis).toContain(`DTEND;VALUE=DATE:${jahr + 1}0518`)
    expect(ereignis).toContain(`SUMMARY:${kind.name} wird ${jahr + 1 - 1990}`)
    expect(ics).not.toContain(kind.email)
  })

  test('ohne gesperrte Mitglieder und Support-Konto', async () => {
    const gesperrt = await mitGeburtstag('1985-03-03', { gesperrt: true })
    const support = await mitGeburtstag('1985-03-03', { support: true })

    const ics = await (await abo(await aktuellerToken())).text()

    expect(ics).not.toContain(gesperrt.name)
    expect(ics).not.toContain(support.name)
  })
})

describe('Geburtstage im Kalender der App', () => {
  const GEBURTSTAGE = '/pb/api/club/geburtstage'

  async function geburtstage(cookie: string, von: string, bis: string) {
    const res = await app(`${GEBURTSTAGE}?von=${von}&bis=${bis}`, { cookie })
    expect(res.status).toBe(200)
    return (await res.json()) as Array<Record<string, unknown>>
  }

  test('liefert nur Name, Datum und Alter, keine Mails', async () => {
    const kind = await mitGeburtstag('1990-05-17')
    const cookie = await anmelden(await neuesMitglied())

    const liste = await geburtstage(cookie, '2027-05-01', '2027-05-31')

    const eintrag = liste.find((g) => g.name === kind.name)
    expect(eintrag).toEqual({ name: kind.name, datum: '2027-05-17', alter: 37 })
    for (const g of liste) {
      expect(Object.keys(g).sort()).toEqual(['alter', 'datum', 'name'])
    }
    expect(JSON.stringify(liste)).not.toContain('@')
  })

  test('29.02. steht in Nicht-Schaltjahren am 28.02.', async () => {
    const kind = await mitGeburtstag('2000-02-29')
    const cookie = await anmelden(await neuesMitglied())

    const normal = await geburtstage(cookie, '2027-02-01', '2027-03-31')
    const schalt = await geburtstage(cookie, '2028-02-01', '2028-03-31')

    expect(normal.filter((g) => g.name === kind.name)).toEqual([
      { name: kind.name, datum: '2027-02-28', alter: 27 },
    ])
    expect(schalt.filter((g) => g.name === kind.name)).toEqual([
      { name: kind.name, datum: '2028-02-29', alter: 28 },
    ])
  })

  test('über den Jahreswechsel und ohne Tage außerhalb des Zeitraums', async () => {
    const kind = await mitGeburtstag('1990-01-02')
    const cookie = await anmelden(await neuesMitglied())

    const liste = await geburtstage(cookie, '2026-12-15', '2027-01-14')
    const ausserhalb = await geburtstage(cookie, '2027-01-03', '2027-01-31')

    expect(liste.filter((g) => g.name === kind.name)).toEqual([
      { name: kind.name, datum: '2027-01-02', alter: 37 },
    ])
    expect(ausserhalb.some((g) => g.name === kind.name)).toBe(false)
  })

  test('gesperrtes Mitglied und Support-Konto fehlen', async () => {
    const gesperrt = await mitGeburtstag('1985-03-03', { gesperrt: true })
    const support = await mitGeburtstag('1985-03-03', { support: true })
    const cookie = await anmelden(await neuesMitglied())

    const liste = await geburtstage(cookie, '2027-03-01', '2027-03-31')

    expect(liste.some((g) => g.name === gesperrt.name)).toBe(false)
    expect(liste.some((g) => g.name === support.name)).toBe(false)
  })

  test('ohne Anmeldung nicht abrufbar, ungültiger Zeitraum abgelehnt', async () => {
    const cookie = await anmelden(await neuesMitglied())

    const ohne = await app(`${GEBURTSTAGE}?von=2027-01-01&bis=2027-12-31`)
    const kaputt = await app(`${GEBURTSTAGE}?von=gestern&bis=2027-12-31`, {
      cookie,
    })
    const zuLang = await app(`${GEBURTSTAGE}?von=2027-01-01&bis=2030-01-01`, {
      cookie,
    })

    expect(ohne.status).toBe(401)
    expect(kaputt.status).toBe(400)
    expect(zuLang.status).toBe(400)
  })
})

// Ein VEVENT aus dem Feed, mit entfalteten Zeilen.
function ereignisMitUid(ics: string, uid: string) {
  const entfaltet = ics.replace(/\r\n /g, '')
  const ereignis = entfaltet
    .split('BEGIN:VEVENT')
    .find((e) => e.includes(`\r\nUID:${uid}@`))
  if (!ereignis) throw new Error(`Kein Ereignis ${uid}`)
  return ereignis
}
