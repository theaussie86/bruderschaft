import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Sortiment aus PocketBase, wie es Verwaltung und Mitglieder lesen. Preise und
// Aufpreise in Cent (siehe src/lib/geld.ts).
export type Artikel = {
  id: string
  collectionId: string
  name: string
  preis: number
  bild: string
  beschreibung: string
  artikelnummer: string
  sortierung: number
  ausgeblendet: boolean
}

export type Groesse = {
  id: string
  artikel: string
  name: string
  aufpreis: number
  sortierung: number
  ausgeblendet: boolean
}

export type DruckstellenArt = 'motiv' | 'text'

export type Druckstelle = {
  id: string
  artikel: string
  name: string
  art: DruckstellenArt
  pflicht: boolean
  aufpreis: number
  erlaubte_motive: Array<string>
  sortierung: number
  ausgeblendet: boolean
}

export type Motiv = {
  id: string
  collectionId: string
  name: string
  nummer: string
  bild: string
  sortierung: number
  ausgeblendet: boolean
}

export type SortimentArtikel = Artikel & {
  groessen: Array<Groesse>
  druckstellen: Array<Druckstelle>
}

const REIHENFOLGE = 'sortierung,created'

export async function ladeSortiment(): Promise<Array<SortimentArtikel>> {
  const pb = createBrowserPocketBase()
  const [artikel, groessen, druckstellen] = await Promise.all([
    pb.collection('artikel').getFullList<Artikel>({ sort: REIHENFOLGE }),
    pb.collection('groessen').getFullList<Groesse>({ sort: REIHENFOLGE }),
    pb
      .collection('druckstellen')
      .getFullList<Druckstelle>({ sort: REIHENFOLGE }),
  ])
  return artikel.map((a) => ({
    ...a,
    groessen: groessen.filter((g) => g.artikel === a.id),
    druckstellen: druckstellen.filter((d) => d.artikel === a.id),
  }))
}

export async function ladeMotive(): Promise<Array<Motiv>> {
  const pb = createBrowserPocketBase()
  return pb.collection('motive').getFullList<Motiv>({ sort: REIHENFOLGE })
}

// Bilder von Artikeln und Motiven laufen über den Proxy, der den File-Token
// ergänzt (ADR 0003).
export function bildPfad(
  r: { id: string; collectionId: string; bild: string },
  thumb?: '200x200f' | '800x0',
) {
  if (!r.bild) return null
  const pfad = `/pb/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(r.bild)}`
  return thumb ? `${pfad}?thumb=${thumb}` : pfad
}

export type SortimentCollection =
  'artikel' | 'groessen' | 'druckstellen' | 'motive'

// Ausblenden statt Löschen: Ausgeblendetes ist für neue Positionen nicht
// wählbar, bestehende bleiben gültig (prüft PocketBase, ADR 0002).
export async function sichtbarkeitSetzen(
  collection: SortimentCollection,
  id: string,
  ausgeblendet: boolean,
) {
  await createBrowserPocketBase()
    .collection(collection)
    .update(id, { ausgeblendet })
}

// Löschen geht nur, solange nie bestellt wurde. Sonst lehnt PocketBase mit
// einer Meldung ab, die zum Ausblenden rät.
export async function sortimentLoeschen(
  collection: SortimentCollection,
  id: string,
) {
  await createBrowserPocketBase().collection(collection).delete(id)
}

// Kopie mit Bild, Größen, Druckstellen und erlaubten Motiven, z. B. für eine
// neue Farbe.
export async function artikelKopieren(id: string) {
  return createBrowserPocketBase().send<Artikel>(
    `/api/club/artikel/${encodeURIComponent(id)}/kopieren`,
    { method: 'POST' },
  )
}
