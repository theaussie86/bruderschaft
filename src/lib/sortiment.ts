import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Sortiment aus PocketBase, wie es Verwaltung und Mitglieder lesen. Preise in
// Cent (siehe src/lib/geld.ts).
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

export type ArtikelMitGroessen = Artikel & { groessen: Array<Groesse> }

const REIHENFOLGE = 'sortierung,created'

export async function ladeSortiment(): Promise<Array<ArtikelMitGroessen>> {
  const pb = createBrowserPocketBase()
  const [artikel, groessen] = await Promise.all([
    pb.collection('artikel').getFullList<Artikel>({ sort: REIHENFOLGE }),
    pb.collection('groessen').getFullList<Groesse>({ sort: REIHENFOLGE }),
  ])
  return artikel.map((a) => ({
    ...a,
    groessen: groessen.filter((g) => g.artikel === a.id),
  }))
}

// Bilder laufen über den Proxy, der den File-Token ergänzt (ADR 0003).
export function artikelBild(a: Artikel, thumb?: '200x200' | '800x0') {
  if (!a.bild) return null
  const pfad = `/pb/api/files/${a.collectionId}/${a.id}/${encodeURIComponent(a.bild)}`
  return thumb ? `${pfad}?thumb=${thumb}` : pfad
}
