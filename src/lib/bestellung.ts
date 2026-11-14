import type { AuftragStatus } from '@/lib/auftrag'
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
}

export type Position = {
  id: string
  auftrag: string
  artikel: string
  groesse: string
  anzahl: number
}

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

// Der Auftrag eines Mitglieds in einer Runde samt Positionen; ohne Auftrag
// hat das Mitglied noch nichts eingetragen.
export async function ladeAuftrag(
  runde: string,
  mitglied: string,
): Promise<{ auftrag: Auftrag | null; positionen: Array<Position> }> {
  const pb = createBrowserPocketBase()
  const gefunden = await pb.collection('auftraege').getFullList<Auftrag>({
    filter: pb.filter('runde = {:runde} && mitglied = {:mitglied}', {
      runde,
      mitglied,
    }),
  })
  const auftrag = gefunden.at(0) ?? null
  if (!auftrag) return { auftrag, positionen: [] }
  const positionen = await pb.collection('positionen').getFullList<Position>({
    filter: pb.filter('auftrag = {:id}', { id: auftrag.id }),
    sort: 'created',
  })
  return { auftrag, positionen }
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
