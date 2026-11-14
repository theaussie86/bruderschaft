// Ausgeblendetes im Sortiment (Spec #17): Eine Position ist nicht mehr
// verfügbar, sobald ihr Artikel, ihre Größe oder eine belegte Druckstelle
// bzw. ein gewähltes Motiv ausgeblendet ist. Sie bleibt gültig und wird
// überall nur markiert.

export const NICHT_VERFUEGBAR = 'nicht mehr verfügbar'

type Flag = { ausgeblendet: boolean }

export function nichtVerfuegbar(
  artikel: Flag,
  groesse: Flag,
  belegungen: Array<{ druckstelle: Flag; motiv?: Flag | null }> = [],
) {
  return (
    artikel.ausgeblendet ||
    groesse.ausgeblendet ||
    belegungen.some(
      (b) => b.druckstelle.ausgeblendet || !!b.motiv?.ausgeblendet,
    )
  )
}

// Dasselbe für eine Position mit IDs, wie sie aus PocketBase kommt. Was im
// Sortiment fehlt, zählt nicht als ausgeblendet.
export function positionNichtVerfuegbar(
  position: { id: string; artikel: string; groesse: string },
  sortiment: Array<
    Flag & {
      id: string
      groessen: Array<Flag & { id: string }>
      druckstellen: Array<Flag & { id: string }>
    }
  >,
  motive: Array<Flag & { id: string }>,
  belegungen: Array<{ position: string; druckstelle: string; motiv: string }>,
) {
  const artikel = sortiment.find((a) => a.id === position.artikel)
  if (!artikel) return false
  const groesse = artikel.groessen.find((g) => g.id === position.groesse)
  const eigene = belegungen
    .filter((b) => b.position === position.id)
    .map((b) => ({
      druckstelle: artikel.druckstellen.find((d) => d.id === b.druckstelle) ?? {
        ausgeblendet: false,
      },
      motiv: motive.find((m) => m.id === b.motiv),
    }))
  return nichtVerfuegbar(artikel, groesse ?? { ausgeblendet: false }, eigene)
}
