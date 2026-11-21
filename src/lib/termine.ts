import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Termine im Kalender (Spec #17). PocketBase speichert Zeitpunkte in UTC, der
// Die Bruderschaft lebt in deutscher Zeit. Alle Umrechnungen laufen deshalb fest über
// Europe/Berlin, damit Server-Rendering und Browser dasselbe zeigen.
export type TerminArt = 'stammtisch' | 'veranstaltung' | 'urlaub'

// Farbe eines Termins im Kalender, aus einer festen Auswahl. Ohne Farbe gilt
// die der Art. Rot gehört den Geburtstagen.
export type TerminFarbe = 'grau' | 'gelb' | 'blau' | 'gruen' | 'lila'

export const FARBEN: Array<{ farbe: TerminFarbe; name: string }> = [
  { farbe: 'grau', name: 'Grau' },
  { farbe: 'gelb', name: 'Gelb' },
  { farbe: 'blau', name: 'Blau' },
  { farbe: 'gruen', name: 'Grün' },
  { farbe: 'lila', name: 'Lila' },
]

// Farbe einer Art, wenn der Termin keine eigene hat. Wie im alten Kalender:
// Stammtische grau, alles andere ist "Hahna Äktschn" in Gelb.
export const ART_FARBE: Record<TerminArt, TerminFarbe> = {
  stammtisch: 'grau',
  veranstaltung: 'gelb',
  urlaub: 'gelb',
}

// Farbwerte für Papier und Bildschirm, kräftig wie in Excel.
export const FARBWERT: Record<TerminFarbe | 'rot', string> = {
  grau: '#c4c4c4',
  gelb: '#fff200',
  blau: '#5b9bd5',
  gruen: '#92d050',
  lila: '#b4a7d6',
  rot: '#e5372c',
}

export type Termin = {
  id: string
  titel: string
  art: TerminArt
  // Leer, wenn keine eigene Farbe hinterlegt ist.
  farbe?: TerminFarbe | ''
  beginn: string
  ende: string
  ganztaegig: boolean
  ort: string
  infotext: string
  abgesagt: boolean
  // Dateinamen des Protokolls. PocketBase liefert sie nur bei Stammtischen.
  protokoll?: Array<string>
}

export const ART_NAME: Record<TerminArt, string> = {
  stammtisch: 'Stammtisch',
  veranstaltung: 'Veranstaltung',
  urlaub: 'Urlaub',
}

const ZEITZONE = 'Europe/Berlin'

const teileFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZEITZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function alsDate(wert: string | Date) {
  return typeof wert === 'string' ? new Date(wert.replace(' ', 'T')) : wert
}

function berlinTeile(wert: string | Date) {
  const teile: Record<string, string> = {}
  for (const t of teileFormat.formatToParts(alsDate(wert))) {
    teile[t.type] = t.value
  }
  return teile
}

// "2026-12-11" in deutscher Zeit.
export function berlinTag(wert: string | Date) {
  const t = berlinTeile(wert)
  return `${t.year}-${t.month}-${t.day}`
}

// "19:30" in deutscher Zeit.
export function berlinZeit(wert: string | Date) {
  const t = berlinTeile(wert)
  return `${t.hour}:${t.minute}`
}

function fuerPocketBase(ms: number) {
  return new Date(ms).toISOString().replace('T', ' ')
}

// Deutsche Ortszeit in UTC. Der Abstand zu UTC hängt vom Tag ab (Sommerzeit),
// deshalb wird er am geschätzten Zeitpunkt nachgemessen.
function zeitpunktFuerPocketBase(tag: string, zeit: string) {
  const [jahr, monat, t] = tag.split('-').map(Number)
  const [stunde, minute] = zeit.split(':').map(Number)
  const alsUtc = Date.UTC(jahr, monat - 1, t, stunde, minute)
  let ms = alsUtc
  for (let i = 0; i < 2; i++) {
    const b = berlinTeile(new Date(ms))
    const gezeigt = Date.UTC(
      Number(b.year),
      Number(b.month) - 1,
      Number(b.day),
      Number(b.hour),
      Number(b.minute),
    )
    ms = alsUtc - (gezeigt - ms)
  }
  return fuerPocketBase(ms)
}

// Ganztägige Termine liegen mittags UTC, damit der Tag in jeder Zeitzone
// derselbe bleibt (wie das Bestelldatum).
function tagFuerPocketBase(tag: string) {
  return `${tag} 12:00:00.000Z`
}

export type TerminFormular = {
  tag: string
  von: string
  endeTag: string
  bis: string
  ganztaegig: boolean
}

// Beginn und Ende aus dem Formular. Ohne Endtag endet ein Termin am selben Tag.
export function terminDaten(f: TerminFormular) {
  if (f.ganztaegig) {
    return {
      beginn: tagFuerPocketBase(f.tag),
      ende: f.endeTag ? tagFuerPocketBase(f.endeTag) : '',
    }
  }
  return {
    beginn: zeitpunktFuerPocketBase(f.tag, f.von),
    ende: f.bis ? zeitpunktFuerPocketBase(f.endeTag || f.tag, f.bis) : '',
  }
}

export function formularAusTermin(t: Termin): TerminFormular {
  const endeTag = t.ende ? berlinTag(t.ende) : ''
  const tag = berlinTag(t.beginn)
  if (t.ganztaegig) return { tag, von: '', endeTag, bis: '', ganztaegig: true }
  return {
    tag,
    von: berlinZeit(t.beginn),
    endeTag: endeTag === tag ? '' : endeTag,
    bis: t.ende ? berlinZeit(t.ende) : '',
    ganztaegig: false,
  }
}

function datumKurz(tag: string) {
  const [jahr, monat, t] = tag.split('-')
  return `${t}.${monat}.${jahr}`
}

// "19:30 bis 22:00 Uhr", "ganztägig" oder mit Datum, wenn das Ende auf einen
// anderen Tag fällt.
export function zeitText(t: Termin) {
  const tag = berlinTag(t.beginn)
  const endeTag = t.ende ? berlinTag(t.ende) : ''
  const anderenTags = endeTag && endeTag !== tag
  if (t.ganztaegig) {
    return anderenTags ? `ganztägig bis ${datumKurz(endeTag)}` : 'ganztägig'
  }
  if (!t.ende) return `${berlinZeit(t.beginn)} Uhr`
  const bis = anderenTags
    ? `${datumKurz(endeTag)}, ${berlinZeit(t.ende)}`
    : berlinZeit(t.ende)
  return `${berlinZeit(t.beginn)} bis ${bis} Uhr`
}

export const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WOCHENTAG_LANG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
]
export const MONAT = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

// Teile eines Tages für Kalenderblatt und Monatsüberschrift.
export function tagTeile(wert: string) {
  const [jahr, monat, tag] = berlinTag(wert).split('-').map(Number)
  const wochentag = new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay()
  return {
    tag,
    wochentag: WOCHENTAG[wochentag],
    monatKurz: MONAT[monat - 1].slice(0, 3),
    monat: `${MONAT[monat - 1]} ${jahr}`,
    lang: `${WOCHENTAG_LANG[wochentag]}, ${tag}. ${MONAT[monat - 1]} ${jahr}`,
  }
}

// Kommend sind Termine, die heute oder später stattfinden oder noch laufen,
// auch abgesagte. Sortiert nach Beginn.
export function kommendeTermine(termine: Array<Termin>, jetzt = new Date()) {
  const heute = berlinTag(jetzt)
  return termine
    .filter((t) => berlinTag(t.ende || t.beginn) >= heute)
    .sort((a, b) => alsDate(a.beginn).getTime() - alsDate(b.beginn).getTime())
}

// Das Archiv: vergangene, nicht abgesagte Veranstaltungen und Urlaube, auch
// ohne Bilder, und vergangene, nicht abgesagte Stammtische mit Protokoll oder
// Bildern. Vergangen ist ein Termin nach seinem letzten Tag. Neueste zuerst.
// bilder ist die Zahl der Bilder pro Termin.
export function archivTermine(
  termine: Array<Termin>,
  bilder: Map<string, number>,
  jetzt = new Date(),
) {
  const heute = berlinTag(jetzt)
  const gehoertDazu = (t: Termin) =>
    t.art !== 'stammtisch' ||
    (t.protokoll?.length ?? 0) > 0 ||
    (bilder.get(t.id) ?? 0) > 0
  return termine
    .filter(
      (t) =>
        gehoertDazu(t) && !t.abgesagt && berlinTag(t.ende || t.beginn) < heute,
    )
    .sort((a, b) => alsDate(b.beginn).getTime() - alsDate(a.beginn).getTime())
}

// Bilder lassen sich zu jedem Termin hochladen, sobald er begonnen hat, und
// nur, wenn er nicht abgesagt ist. Dieselbe Regel prüft PocketBase.
export function bilderErlaubt(t: Termin, jetzt = new Date()) {
  return !t.abgesagt && alsDate(t.beginn).getTime() <= jetzt.getTime()
}

export const FELDER =
  'id,titel,art,farbe,beginn,ende,ganztaegig,ort,infotext,abgesagt,protokoll'

// Lädt grob ab vorgestern, den genauen Schnitt macht kommendeTermine.
export async function ladeKommendeTermine(jetzt = new Date()) {
  const pb = createBrowserPocketBase()
  const ab = fuerPocketBase(jetzt.getTime() - 2 * 24 * 60 * 60 * 1000)
  const termine = await pb.collection('termine').getFullList<Termin>({
    sort: 'beginn',
    fields: FELDER,
    filter: pb.filter('beginn >= {:ab} || ende >= {:ab}', { ab }),
  })
  return kommendeTermine(termine, jetzt)
}

export async function ladeTermin(id: string): Promise<Termin> {
  const pb = createBrowserPocketBase()
  return pb.collection('termine').getOne<Termin>(id, { fields: FELDER })
}

// Was PocketBase fürs Archiv liefert, den genauen Schnitt macht archivTermine.
// Ein Stammtisch braucht ein Protokoll oder mindestens ein Bild (Rückbeziehung
// der Bilder auf den Termin).
export const ARCHIV_FILTER =
  "(art = 'veranstaltung' || art = 'urlaub' || (art = 'stammtisch' && (protokoll:length > 0 || bilder_via_termin.id ?!= ''))) && abgesagt = false"

// bilder ist die Zahl der Bilder pro Termin, die die Archiv-Ansicht ohnehin lädt.
export async function ladeArchiv(
  bilder: Map<string, number>,
  jetzt = new Date(),
) {
  const pb = createBrowserPocketBase()
  const bis = fuerPocketBase(jetzt.getTime())
  const termine = await pb.collection('termine').getFullList<Termin>({
    sort: '-beginn',
    fields: FELDER,
    filter: pb.filter(`${ARCHIV_FILTER} && beginn <= {:bis}`, { bis }),
  })
  return archivTermine(termine, bilder, jetzt)
}

// Ein Geburtstag im Kalender, wie ihn die Hook-Route liefert: nur Name, Datum
// und das Alter, das das Mitglied wird. Kein Termin.
export type Geburtstag = { name: string; datum: string; alter: number }

export type KalenderEintrag =
  | { art: 'termin'; beginn: string; termin: Termin }
  | { art: 'geburtstag'; beginn: string; geburtstag: Geburtstag }

// Termine und Geburtstage in einer Liste nach Tag, Geburtstage am Tag zuerst.
// Ein Geburtstag liegt mittags UTC, damit der Tag in jeder Zeitzone stimmt.
export function kalenderEintraege(
  termine: Array<Termin>,
  geburtstage: Array<Geburtstag>,
): Array<KalenderEintrag> {
  const eintraege: Array<KalenderEintrag> = [
    ...geburtstage.map((g) => ({
      art: 'geburtstag' as const,
      beginn: tagFuerPocketBase(g.datum),
      geburtstag: g,
    })),
    ...termine.map((t) => ({
      art: 'termin' as const,
      beginn: t.beginn,
      termin: t,
    })),
  ]
  const schluessel = (e: KalenderEintrag) =>
    `${berlinTag(e.beginn)}${e.art === 'geburtstag' ? 0 : 1}`
  return eintraege
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const sa = schluessel(a.e)
      const sb = schluessel(b.e)
      return sa === sb ? a.i - b.i : sa < sb ? -1 : 1
    })
    .map(({ e }) => e)
}

// Geburtstage für "Kommend": von heute bis einen Tag vor heute in einem Jahr.
export function geburtstagsZeitraum(jetzt = new Date()) {
  const von = berlinTag(jetzt)
  const [jahr, monat, tag] = von.split('-').map(Number)
  const bis = new Date(Date.UTC(jahr + 1, monat - 1, tag - 1))
  return { von, bis: bis.toISOString().slice(0, 10) }
}

export async function ladeGeburtstage(
  zeitraum: { von: string; bis: string } = geburtstagsZeitraum(),
) {
  const pb = createBrowserPocketBase()
  return pb.send<Array<Geburtstag>>('/api/club/geburtstage', {
    query: zeitraum,
  })
}
