// Belegung der Druckstellen einer Position: pro Druckstelle ein Motiv oder
// ein Text. Die Regeln prüft PocketBase (ADR 0002); hier liegt nur, was die
// App zum Anzeigen und Ausfüllen braucht.

type DruckstelleInfo = {
  id: string
  name: string
  art: 'motiv' | 'text'
  pflicht: boolean
  aufpreis: number
  erlaubte_motive: Array<string>
  ausgeblendet: boolean
}

type MotivInfo = { id: string; name: string; ausgeblendet: boolean }

export type Belegung = {
  id: string
  druckstelle: string
  motiv: string
  text: string
}

// Die Wahl im Formular, pro Druckstelle. Fehlt eine Druckstelle, bleibt sie
// leer.
export type Wahl = Partial<Record<string, { motiv?: string; text?: string }>>

export function waehlbareDruckstellen<TDruckstelle extends DruckstelleInfo>(
  druckstellen: Array<TDruckstelle>,
) {
  return druckstellen.filter((d) => !d.ausgeblendet)
}

export function waehlbareMotive<TMotiv extends MotivInfo>(
  druckstelle: DruckstelleInfo,
  motive: Array<TMotiv>,
) {
  return motive.filter(
    (m) => !m.ausgeblendet && druckstelle.erlaubte_motive.includes(m.id),
  )
}

function belegt(eintrag: Wahl[string] | undefined) {
  return !!eintrag && (!!eintrag.motiv || !!eintrag.text?.trim())
}

export function wahlAus(belegungen: Array<Belegung>): Wahl {
  const wahl: Wahl = {}
  for (const b of belegungen)
    wahl[b.druckstelle] = b.motiv ? { motiv: b.motiv } : { text: b.text }
  return wahl
}

// Startwahl aus bestehenden Belegungen. Eine Pflicht-Druckstelle mit nur
// einem wählbaren Motiv ist vorausgewählt.
export function startWahl(
  druckstellen: Array<DruckstelleInfo>,
  motive: Array<MotivInfo>,
  belegungen: Array<Belegung>,
): Wahl {
  const wahl = wahlAus(belegungen)
  for (const d of waehlbareDruckstellen(druckstellen)) {
    if (wahl[d.id] || !d.pflicht || d.art !== 'motiv') continue
    const erlaubt = waehlbareMotive(d, motive)
    if (erlaubt.length === 1) wahl[d.id] = { motiv: erlaubt[0].id }
  }
  return wahl
}

export function fehlendePflicht<TDruckstelle extends DruckstelleInfo>(
  druckstellen: Array<TDruckstelle>,
  wahl: Wahl,
) {
  return waehlbareDruckstellen(druckstellen).filter(
    (d) => d.pflicht && !belegt(wahl[d.id]),
  )
}

// Was beim Speichern einer Wahl in PocketBase passiert. Ausgeblendete
// Druckstellen bleiben, wie sie sind.
export function wahlSpeichern(
  druckstellen: Array<DruckstelleInfo>,
  bestehende: Array<Belegung>,
  wahl: Wahl,
) {
  const anlegen: Array<{ druckstelle: string; motiv: string; text: string }> =
    []
  const aendern: Array<{ id: string; motiv: string; text: string }> = []
  const loeschen: Array<string> = []
  for (const d of waehlbareDruckstellen(druckstellen)) {
    const alt = bestehende.find((b) => b.druckstelle === d.id)
    const eintrag = wahl[d.id]
    if (!belegt(eintrag)) {
      if (alt) loeschen.push(alt.id)
      continue
    }
    const neu =
      d.art === 'motiv'
        ? { motiv: eintrag?.motiv ?? '', text: '' }
        : { motiv: '', text: eintrag?.text?.trim() ?? '' }
    if (!alt) anlegen.push({ druckstelle: d.id, ...neu })
    else if (alt.motiv !== neu.motiv || alt.text !== neu.text)
      aendern.push({ id: alt.id, ...neu })
  }
  return { anlegen, aendern, loeschen }
}

// Die Druckstellen, die an einer Position belegt sind, für die Aufpreise.
export function belegteDruckstellen<TDruckstelle extends DruckstelleInfo>(
  druckstellen: Array<TDruckstelle>,
  belegungen: Array<Belegung>,
) {
  return druckstellen.filter((d) =>
    belegungen.some((b) => b.druckstelle === d.id),
  )
}

// "vorne: Brotherhood · hinten: „Spitzname“" in Reihenfolge der Druckstellen.
export function belegungsText(
  druckstellen: Array<DruckstelleInfo>,
  motive: Array<MotivInfo>,
  belegungen: Array<Belegung>,
) {
  return druckstellen
    .flatMap((d) => {
      const b = belegungen.find((x) => x.druckstelle === d.id)
      if (!b) return []
      const inhalt = b.motiv
        ? (motive.find((m) => m.id === b.motiv)?.name ?? 'Motiv')
        : `„${b.text}“`
      return [`${d.name}: ${inhalt}`]
    })
    .join(' · ')
}
