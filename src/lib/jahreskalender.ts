import type { Geburtstag, Termin, TerminArt, TerminFarbe } from '@/lib/termine'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import {
  ART_FARBE,
  FELDER,
  MONAT,
  WOCHENTAG,
  berlinTag,
  ladeGeburtstage,
} from '@/lib/termine'

// Das Jahresblatt zum Ausdrucken: zwölf Monate nebeneinander, jeder Tag eine
// Zeile, wie der alte Kalender aus Excel für den Kühlschrank.

// Ein Eintrag in der Zelle eines Tages. Mehrtägige Termine stehen an jedem
// Tag; der Titel steht nur am ersten Tag und am Ersten jedes Monats, die
// übrigen Tage sind Fortsetzung und werden nur eingefärbt.
export type BlattFarbe = TerminFarbe | 'rot'

export type BlattEintrag = {
  text: string
  art: TerminArt | 'geburtstag'
  farbe: BlattFarbe
  fortsetzung: boolean
}

export type BlattTag = {
  tag: number
  wochentag: string
  // Samstage hell, freie Tage (Sonntage und Feiertage) kräftig, wie im
  // alten Kalender.
  farbe: 'samstag' | 'frei' | null
  eintraege: Array<BlattEintrag>
}

export type BlattMonat = { name: string; tage: Array<BlattTag> }

// Ostersonntag nach dem anonymen gregorianischen Algorithmus, als UTC-Zeitstempel.
function ostern(jahr: number) {
  const a = jahr % 19
  const b = Math.floor(jahr / 100)
  const c = jahr % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31)
  const tag = ((h + l - 7 * m + 114) % 31) + 1
  return Date.UTC(jahr, monat - 1, tag)
}

const TAG_MS = 24 * 60 * 60 * 1000

// "2026-12-11" eines UTC-Zeitstempels.
function utcTag(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

// Gesetzliche Feiertage in Bayern als "MM-TT". Mariä Himmelfahrt gilt nur in
// katholischen Gemeinden, die Bruderschaft sitzt im Allgäu.
function feiertage(jahr: number) {
  const os = ostern(jahr)
  const beweglich = [-2, 1, 39, 50, 60].map((d) =>
    utcTag(os + d * TAG_MS).slice(5),
  )
  return new Set([
    '01-01',
    '01-06',
    '05-01',
    '08-15',
    '10-03',
    '11-01',
    '12-25',
    '12-26',
    ...beweglich,
  ])
}

export function jahresblatt(
  jahr: number,
  termine: Array<Termin>,
  geburtstage: Array<Geburtstag>,
): Array<BlattMonat> {
  const frei = feiertage(jahr)
  const eintraege = new Map<string, Array<BlattEintrag>>()
  const eintragen = (tag: string, e: BlattEintrag) => {
    const liste = eintraege.get(tag) ?? []
    liste.push(e)
    eintraege.set(tag, liste)
  }
  for (const g of geburtstage) {
    eintragen(g.datum, {
      text: `${g.name} Geb.`,
      art: 'geburtstag',
      farbe: 'rot',
      fortsetzung: false,
    })
  }
  for (const t of termine) {
    if (t.abgesagt) continue
    const erster = berlinTag(t.beginn)
    const letzter = t.ende ? berlinTag(t.ende) : erster
    for (
      let ms = Date.parse(`${erster}T00:00:00Z`);
      ms <= Date.parse(`${letzter}T00:00:00Z`);
      ms += TAG_MS
    ) {
      const tag = utcTag(ms)
      eintragen(tag, {
        text: t.titel,
        art: t.art,
        farbe: t.farbe || ART_FARBE[t.art],
        fortsetzung: tag !== erster && !tag.endsWith('-01'),
      })
    }
  }
  return MONAT.map((name, m) => {
    const anzahl = new Date(Date.UTC(jahr, m + 1, 0)).getUTCDate()
    const tage = Array.from({ length: anzahl }, (_, i): BlattTag => {
      const ms = Date.UTC(jahr, m, i + 1)
      const tag = utcTag(ms)
      const wt = new Date(ms).getUTCDay()
      const farbe =
        wt === 0 || frei.has(tag.slice(5))
          ? 'frei'
          : wt === 6
            ? 'samstag'
            : null
      return {
        tag: i + 1,
        wochentag: WOCHENTAG[wt],
        farbe,
        eintraege: eintraege.get(tag) ?? [],
      }
    })
    return { name, tage }
  })
}

const REIHENFOLGE: Array<BlattFarbe> = [
  'grau',
  'gelb',
  'blau',
  'gruen',
  'lila',
  'rot',
]

// Die Legende unter dem Blatt: immer Stammtisch, Hahna Äktschn und
// Geburtstag, dazu die Titel der Termine, die eine andere Farbe als ihre Art
// tragen, z. B. "GHS" in Blau.
export function legende(
  blatt: Array<BlattMonat>,
): Array<{ farbe: BlattFarbe; text: string }> {
  const texte = new Map<BlattFarbe, Array<string>>([
    ['grau', ['Stammtisch']],
    ['gelb', ['Hahna Äktschn']],
    ['rot', ['Geburtstag']],
  ])
  const eintraege = blatt.flatMap((m) => m.tage.flatMap((t) => t.eintraege))
  for (const e of eintraege) {
    if (e.art === 'geburtstag' || e.farbe === ART_FARBE[e.art]) continue
    const liste = texte.get(e.farbe) ?? []
    if (!liste.includes(e.text)) liste.push(e.text)
    texte.set(e.farbe, liste)
  }
  return REIHENFOLGE.filter((f) => texte.has(f)).map((farbe) => ({
    farbe,
    text: (texte.get(farbe) ?? []).join(', '),
  }))
}

// Alle Termine und Geburtstage eines Jahres. Der Filter greift einen Tag
// großzügiger, den genauen Schnitt macht jahresblatt über den deutschen Tag.
export async function ladeJahr(jahr: number) {
  const pb = createBrowserPocketBase()
  const ab = `${jahr - 1}-12-31 00:00:00.000Z`
  const bis = `${jahr + 1}-01-02 00:00:00.000Z`
  const [termine, geburtstage] = await Promise.all([
    pb.collection('termine').getFullList<Termin>({
      sort: 'beginn',
      fields: FELDER,
      filter: pb.filter(
        'beginn < {:bis} && (beginn >= {:ab} || ende >= {:ab})',
        {
          ab,
          bis,
        },
      ),
    }),
    ladeGeburtstage({ von: `${jahr}-01-01`, bis: `${jahr}-12-31` }),
  ])
  return jahresblatt(jahr, termine, geburtstage)
}
