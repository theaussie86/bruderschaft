import type { AuftragStatus } from '@/lib/auftrag'
import type { Belegung } from '@/lib/belegung'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Bestellrunde, Auftrag und Position aus PocketBase. Wer was lesen und
// schreiben darf, entscheiden die Rules (ADR 0002).
export type Bestellrunde = {
  id: string
  name: string
  bestelldatum: string
  status: 'offen' | 'abgeschlossen'
  abgeschlossen_am: string
}

export type Auftrag = {
  id: string
  runde: string
  mitglied: string
  status: AuftragStatus
  anmerkung: string
  bezahlt: boolean
  // Korrektur in Cent mit Vorzeichen, 0 heißt keine. Setzen nur Admins.
  korrektur_betrag: number
  korrektur_grund: string
  // Setzt das Abschließen: Der Auftrag geht in die Sammelbestellung.
  mitbestellt: boolean
  // Beim Abschließen festgehaltene Summe in Cent inklusive Korrektur, nur bei
  // mitbestellten Aufträgen.
  summe: number
}

export type UebersichtMitglied = {
  id: string
  name: string
  gesperrt: boolean
  support: boolean
}

export type Position = {
  id: string
  auftrag: string
  artikel: string
  groesse: string
  anzahl: number
  // Beim Abschließen festgehaltener Stückpreis in Cent, sonst 0.
  stueckpreis: number
}

export type PositionsBelegung = Belegung & { position: string }

export async function ladeRunden(): Promise<Array<Bestellrunde>> {
  const pb = createBrowserPocketBase()
  return pb
    .collection('bestellrunden')
    .getFullList<Bestellrunde>({ sort: '-bestelldatum,-created' })
}

export async function ladeOffeneRunde(): Promise<Bestellrunde | null> {
  const pb = createBrowserPocketBase()
  const offen = await pb
    .collection('bestellrunden')
    .getFullList<Bestellrunde>({ filter: "status = 'offen'" })
  return offen.at(0) ?? null
}

// Die Runde, um die es im Tab Bestellen geht: die offene, sonst die zuletzt
// abgeschlossene.
export async function ladeAktuelleRunde(): Promise<Bestellrunde | null> {
  const pb = createBrowserPocketBase()
  const runden = await pb
    .collection('bestellrunden')
    .getList<Bestellrunde>(1, 1, { sort: '-status,-abgeschlossen_am,-created' })
  return runden.items.at(0) ?? null
}

export async function ladeRunde(id: string) {
  return createBrowserPocketBase()
    .collection('bestellrunden')
    .getOne<Bestellrunde>(id)
}

// Abgeschlossene Runden, in denen das Mitglied einen Auftrag hat, die neueste
// zuerst.
export async function ladeFruehereRunden(
  mitglied: string,
): Promise<Array<Bestellrunde>> {
  const pb = createBrowserPocketBase()
  const auftraege = await pb
    .collection('auftraege')
    .getFullList<Auftrag & { expand?: { runde?: Bestellrunde } }>({
      filter: pb.filter(
        "mitglied = {:mitglied} && runde.status = 'abgeschlossen'",
        { mitglied },
      ),
      expand: 'runde',
    })
  return auftraege
    .flatMap((a) => (a.expand?.runde ? [a.expand.runde] : []))
    .sort((x, y) => y.abgeschlossen_am.localeCompare(x.abgeschlossen_am))
}

// Warnung vor dem Abschließen: Zahl der nicht fertigen Aufträge mit
// Positionen und die Positionen, die nicht mehr verfügbar sind.
export async function ladeAbschlussWarnung(runde: string) {
  return createBrowserPocketBase().send<{
    nicht_fertig: number
    nicht_verfuegbar: Array<{
      mitglied: string
      artikel: string
      groesse: string
    }>
  }>(`/api/club/bestellrunden/${encodeURIComponent(runde)}/abschluss`, {
    method: 'GET',
  })
}

// Abschließen hält die Preise fest; nicht fertige Aufträge kommen nur mit
// `mitnehmen` in die Sammelbestellung. Wieder öffnen geht nur, wenn keine
// andere Runde offen ist. Beides prüft PocketBase (ADR 0002).
export async function rundeAbschliessen(runde: string, mitnehmen: boolean) {
  return createBrowserPocketBase().send<Bestellrunde>(
    `/api/club/bestellrunden/${encodeURIComponent(runde)}/abschliessen`,
    { method: 'POST', body: { mitnehmen } },
  )
}

export async function rundeOeffnen(runde: string) {
  return createBrowserPocketBase().send<Bestellrunde>(
    `/api/club/bestellrunden/${encodeURIComponent(runde)}/oeffnen`,
    { method: 'POST' },
  )
}

export type Einstellungen = {
  id: string
  bankverbindung: string
  kalender_token: string
}

// Es gibt genau einen Datensatz, angelegt von der Migration.
export async function ladeEinstellungen(): Promise<Einstellungen | null> {
  const pb = createBrowserPocketBase()
  const liste = await pb
    .collection('einstellungen')
    .getList<Einstellungen>(1, 1)
  return liste.items.at(0) ?? null
}

// Der Auftrag eines Mitglieds in einer Runde samt Positionen und Belegungen;
// ohne Auftrag hat das Mitglied noch nichts eingetragen.
export async function ladeAuftrag(
  runde: string,
  mitglied: string,
): Promise<{
  auftrag: Auftrag | null
  positionen: Array<Position>
  belegungen: Array<PositionsBelegung>
}> {
  const pb = createBrowserPocketBase()
  const gefunden = await pb.collection('auftraege').getFullList<Auftrag>({
    filter: pb.filter('runde = {:runde} && mitglied = {:mitglied}', {
      runde,
      mitglied,
    }),
  })
  const auftrag = gefunden.at(0) ?? null
  if (!auftrag) return { auftrag, positionen: [], belegungen: [] }
  const [positionen, belegungen] = await Promise.all([
    pb.collection('positionen').getFullList<Position>({
      filter: pb.filter('auftrag = {:id}', { id: auftrag.id }),
      sort: 'created',
    }),
    pb.collection('belegungen').getFullList<PositionsBelegung>({
      filter: pb.filter('position.auftrag = {:id}', { id: auftrag.id }),
    }),
  ])
  return { auftrag, positionen, belegungen }
}

// Alles für die Übersicht der Runde (nur Admins): Mitglieder, alle Aufträge
// der Runde und deren Positionen und Belegungen für Stand und Summe.
export async function ladeUebersicht(runde: string) {
  const pb = createBrowserPocketBase()
  const [mitglieder, auftraege, positionen, belegungen] = await Promise.all([
    pb.collection('mitglieder').getFullList<UebersichtMitglied>({
      fields: 'id,name,gesperrt,support',
    }),
    pb.collection('auftraege').getFullList<Auftrag>({
      filter: pb.filter('runde = {:runde}', { runde }),
    }),
    pb.collection('positionen').getFullList<Position>({
      filter: pb.filter('auftrag.runde = {:runde}', { runde }),
    }),
    pb.collection('belegungen').getFullList<PositionsBelegung>({
      filter: pb.filter('position.auftrag.runde = {:runde}', { runde }),
    }),
  ])
  return { mitglieder, auftraege, positionen, belegungen }
}

export async function ladeMitglied(id: string) {
  return createBrowserPocketBase()
    .collection('mitglieder')
    .getOne<UebersichtMitglied>(id, { fields: 'id,name,gesperrt,support' })
}

// Daten wie das Bestelldatum laufen in der App als JJJJ-MM-TT. PocketBase
// speichert sie um 12 Uhr UTC, damit keine Zeitzone den Tag verschiebt.
export function tagAus(wert: string) {
  return wert.slice(0, 10)
}

export function tagFuerPocketBase(tag: string) {
  return `${tag} 12:00:00.000Z`
}

// "01.12.2026" für die Anzeige.
export function tagAnzeigen(wert: string) {
  const [jahr, monat, tag] = tagAus(wert).split('-')
  return jahr && monat && tag ? `${tag}.${monat}.${jahr}` : ''
}
