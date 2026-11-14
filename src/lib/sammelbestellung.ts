// Dokument-Modell der Sammelbestellung (Spec #17, Format aus #7): aus den
// Daten einer abgeschlossenen Bestellrunde werden Kopf, Summenzeilen, Drucke
// pro Motiv, Textdrucke und die Liste pro Mitglied. Reine Funktion ohne I/O;
// die Renderer für PDF und Excel bauen darauf auf.
//
// Preise, Summen, Korrekturen und bezahlt kommen gar nicht erst herein, damit
// sie nie im Dokument für den Drucker landen können.

type Sortiert = { id: string; sortierung: number; ausgeblendet: boolean }

export type Rundendaten = {
  clubname: string
  runde: string
  erstellt: Date
  artikel: Array<Sortiert & { name: string; artikelnummer: string }>
  groessen: Array<Sortiert & { artikel: string; name: string }>
  druckstellen: Array<
    Sortiert & { artikel: string; name: string; art: 'motiv' | 'text' }
  >
  motive: Array<Sortiert & { name: string }>
  mitglieder: Array<{ id: string; name: string }>
  auftraege: Array<{
    id: string
    mitglied: string
    mitbestellt: boolean
    anmerkung: string
  }>
  positionen: Array<{
    id: string
    auftrag: string
    artikel: string
    groesse: string
    anzahl: number
  }>
  belegungen: Array<{
    position: string
    druckstelle: string
    motiv: string
    text: string
  }>
}

export type Summenzeile = {
  artikel: string
  artikelnummer: string
  groesse: string
  belegung: string
  anzahl: number
  nichtVerfuegbar: boolean
}

export type Textdruck = {
  artikel: string
  groesse: string
  druckstelle: string
  text: string
  mitglied: string
  anzahl: number
  nichtVerfuegbar: boolean
}

export type MitgliedPosition = Summenzeile

export type Sammelbestellung = {
  kopf: {
    clubname: string
    runde: string
    erstellt: string
    auftraege: number
    stuecke: number
  }
  summen: Array<Summenzeile>
  motive: Array<{ motiv: string; drucke: number }>
  textdrucke: Array<Textdruck>
  mitglieder: Array<{
    name: string
    anmerkung: string
    positionen: Array<MitgliedPosition>
  }>
}

export const OHNE_DRUCK = 'ohne Druck'
export const NICHT_VERFUEGBAR = 'nicht mehr verfügbar'

const datumFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// Admin-Reihenfolge: nach `sortierung`, bei Gleichstand wie geliefert.
function rang<T extends { sortierung: number }>(liste: Array<T>) {
  const sortiert = liste
    .map((e, i) => ({ e, i }))
    .sort((x, y) => x.e.sortierung - y.e.sortierung || x.i - y.i)
  return new Map(sortiert.map(({ e }, i) => [e, i]))
}

function nachName(x: string, y: string) {
  return x.localeCompare(y, 'de')
}

export function sammelbestellung(d: Rundendaten): Sammelbestellung {
  const artikelRang = rang(d.artikel)
  const groessenRang = rang(d.groessen)
  const druckstellenRang = rang(d.druckstellen)
  const motivRang = rang(d.motive)
  const artikelVon = new Map(d.artikel.map((a) => [a.id, a]))
  const groesseVon = new Map(d.groessen.map((g) => [g.id, g]))
  const druckstelleVon = new Map(d.druckstellen.map((s) => [s.id, s]))
  const motivVon = new Map(d.motive.map((m) => [m.id, m]))
  const nameVon = new Map(d.mitglieder.map((m) => [m.id, m.name]))

  const auftraege = d.auftraege.filter((a) => a.mitbestellt)
  const mitbestellt = new Set(auftraege.map((a) => a.id))

  // Jede Position mit allem, was das Dokument von ihr braucht.
  const positionen = d.positionen
    .filter((p) => mitbestellt.has(p.auftrag))
    .flatMap((p) => {
      const artikel = artikelVon.get(p.artikel)
      const groesse = groesseVon.get(p.groesse)
      if (!artikel || !groesse) return []
      const belegungen = d.belegungen
        .filter((b) => b.position === p.id)
        .flatMap((b) => {
          const druckstelle = druckstelleVon.get(b.druckstelle)
          if (!druckstelle) return []
          const motiv = b.motiv ? motivVon.get(b.motiv) : undefined
          return [{ druckstelle, motiv, text: b.text }]
        })
        .sort(
          (x, y) =>
            (druckstellenRang.get(x.druckstelle) ?? 0) -
            (druckstellenRang.get(y.druckstelle) ?? 0),
        )
      const nichtVerfuegbar =
        artikel.ausgeblendet ||
        groesse.ausgeblendet ||
        belegungen.some(
          (b) => b.druckstelle.ausgeblendet || b.motiv?.ausgeblendet,
        )
      return [{ ...p, artikel, groesse, belegungen, nichtVerfuegbar }]
    })

  type Pos = (typeof positionen)[number]

  function belegung(p: Pos, mitText: boolean) {
    if (p.belegungen.length === 0) return OHNE_DRUCK
    return p.belegungen
      .map((b) => {
        const inhalt = b.motiv ? b.motiv.name : mitText ? `„${b.text}“` : 'Text'
        return `${b.druckstelle.name}: ${inhalt}`
      })
      .join(' · ')
  }

  // Sortierschlüssel einer Position: Artikel, Größe, dann pro Druckstelle das
  // Motiv in Admin-Reihenfolge (Text nach den Motiven).
  function schluessel(p: Pos) {
    return [
      artikelRang.get(p.artikel) ?? 0,
      groessenRang.get(p.groesse) ?? 0,
      ...p.belegungen.flatMap((b) => [
        druckstellenRang.get(b.druckstelle) ?? 0,
        b.motiv ? (motivRang.get(b.motiv) ?? 0) : d.motive.length,
      ]),
    ]
  }

  function vergleiche(x: Pos, y: Pos) {
    const a = schluessel(x)
    const b = schluessel(y)
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = (a[i] ?? -1) - (b[i] ?? -1)
      if (diff !== 0) return diff
    }
    return 0
  }

  function zeile(p: Pos, mitText: boolean): Summenzeile {
    return {
      artikel: p.artikel.name,
      artikelnummer: p.artikel.artikelnummer,
      groesse: p.groesse.name,
      belegung: belegung(p, mitText),
      anzahl: p.anzahl,
      nichtVerfuegbar: p.nichtVerfuegbar,
    }
  }

  const sortiert = [...positionen].sort(vergleiche)

  const summen: Array<Summenzeile> = []
  const summeZu = new Map<string, Summenzeile>()
  for (const p of sortiert) {
    const neu = zeile(p, false)
    const key = [p.artikel.id, p.groesse.id, neu.belegung].join('\u0000')
    const vorhanden = summeZu.get(key)
    if (vorhanden) vorhanden.anzahl += p.anzahl
    else {
      summeZu.set(key, neu)
      summen.push(neu)
    }
  }

  const drucke = new Map<Rundendaten['motive'][number], number>()
  for (const p of positionen)
    for (const b of p.belegungen)
      if (b.motiv) drucke.set(b.motiv, (drucke.get(b.motiv) ?? 0) + p.anzahl)
  const motive = [...drucke]
    .sort(([x], [y]) => (motivRang.get(x) ?? 0) - (motivRang.get(y) ?? 0))
    .map(([m, anzahl]) => ({ motiv: m.name, drucke: anzahl }))

  const mitgliedVon = (p: Pos) => {
    const auftrag = auftraege.find((a) => a.id === p.auftrag)
    return (auftrag && nameVon.get(auftrag.mitglied)) ?? 'Unbekannt'
  }

  const textdrucke = sortiert
    .flatMap((p) =>
      p.belegungen
        .filter((b) => !b.motiv)
        .map((b) => ({
          rang: druckstellenRang.get(b.druckstelle) ?? 0,
          zeile: {
            artikel: p.artikel.name,
            groesse: p.groesse.name,
            druckstelle: b.druckstelle.name,
            text: b.text,
            mitglied: mitgliedVon(p),
            anzahl: p.anzahl,
            nichtVerfuegbar: p.nichtVerfuegbar,
          },
          p,
        })),
    )
    .sort(
      (x, y) =>
        (artikelRang.get(x.p.artikel) ?? 0) -
          (artikelRang.get(y.p.artikel) ?? 0) ||
        (groessenRang.get(x.p.groesse) ?? 0) -
          (groessenRang.get(y.p.groesse) ?? 0) ||
        x.rang - y.rang ||
        nachName(x.zeile.mitglied, y.zeile.mitglied),
    )
    .map((t) => t.zeile)

  const mitglieder = auftraege
    .map((a) => ({
      name: nameVon.get(a.mitglied) ?? 'Unbekannt',
      anmerkung: a.anmerkung.trim(),
      positionen: sortiert
        .filter((p) => p.auftrag === a.id)
        .map((p) => zeile(p, true)),
    }))
    .sort((x, y) => nachName(x.name, y.name))

  return {
    kopf: {
      clubname: d.clubname,
      runde: d.runde,
      erstellt: datumFormat.format(d.erstellt),
      auftraege: auftraege.length,
      stuecke: positionen.reduce((s, p) => s + p.anzahl, 0),
    },
    summen,
    motive,
    textdrucke,
    mitglieder,
  }
}
