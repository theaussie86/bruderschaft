import { Plus } from 'lucide-react'
import { useState } from 'react'

import type {
  Druckstelle,
  DruckstellenArt,
  Motiv,
  SortimentArtikel,
} from '@/lib/sortiment'
import { Button } from '@/components/Button'
import { Pfeile } from '@/components/Pfeile'
import { fehlertext } from '@/lib/geburtstag'
import { centAlsEingabe, centAus, euro } from '@/lib/geld'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { naechsteSortierung } from '@/lib/reihenfolge'

// Druckstellen eines Artikels in der Verwaltung: Freitext-Name, Art (Motiv
// oder Text), Pflicht, Aufpreis, erlaubte Motive, Reihenfolge.
export function Druckstellen({
  artikel,
  motive,
  onVerschieben,
  onGeaendert,
  onFehler,
}: {
  artikel: SortimentArtikel
  motive: Array<Motiv>
  onVerschieben: (id: string, richtung: -1 | 1) => void
  onGeaendert: () => Promise<void>
  onFehler: (text: string) => void
}) {
  // 'neu' für eine neue Druckstelle, sonst die ID der Druckstelle in Bearbeitung.
  const [offen, setOffen] = useState<string | null>(null)
  const { druckstellen } = artikel

  async function fertig() {
    setOffen(null)
    await onGeaendert()
  }

  return (
    <section className="mt-4" aria-label={`Druckstellen von ${artikel.name}`}>
      <div className="eyebrow mb-2">Druckstellen</div>
      {druckstellen.length === 0 && (
        <p className="text-smoke mb-2 text-[13px]">Noch keine Druckstellen.</p>
      )}
      <ul className="divide-line/60 divide-y">
        {druckstellen.map((d, i) => (
          <li key={d.id} className="py-1.5">
            <div className="flex items-center gap-2">
              <Pfeile
                name={d.name}
                oben={i > 0}
                unten={i < druckstellen.length - 1}
                onVerschieben={(r) => onVerschieben(d.id, r)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{d.name}</span>
                {d.ausgeblendet && (
                  <span className="text-smoke ml-2 text-[13px]">
                    ausgeblendet
                  </span>
                )}
                <span className="text-ash block text-[13px]">
                  {beschreibung(d, motive)}
                </span>
              </span>
              <span className="text-ash tnum text-[13px]">
                {d.aufpreis ? `+${euro(d.aufpreis)}` : 'kein Aufpreis'}
              </span>
              <button
                type="button"
                className="text-brass hover:text-bone text-[13px] font-semibold"
                aria-expanded={offen === d.id}
                onClick={() => setOffen(offen === d.id ? null : d.id)}
              >
                {offen === d.id ? 'Schließen' : 'Ändern'}
              </button>
            </div>
            {offen === d.id && (
              <DruckstelleFormular
                artikelId={artikel.id}
                druckstelle={d}
                motive={motive}
                sortierung={d.sortierung}
                onFertig={fertig}
                onFehler={onFehler}
              />
            )}
          </li>
        ))}
      </ul>
      {offen === 'neu' ? (
        <DruckstelleFormular
          artikelId={artikel.id}
          motive={motive}
          sortierung={naechsteSortierung(druckstellen)}
          onFertig={fertig}
          onFehler={onFehler}
        />
      ) : (
        <button
          type="button"
          className="text-ash hover:text-bone mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold"
          onClick={() => setOffen('neu')}
        >
          <Plus className="size-4" /> Druckstelle hinzufügen
        </button>
      )}
    </section>
  )
}

function beschreibung(d: Druckstelle, motive: Array<Motiv>) {
  const pflicht = d.pflicht ? 'Pflicht' : 'optional'
  if (d.art === 'text') return `Textfeld, ${pflicht}`
  const namen = motive
    .filter((m) => d.erlaubte_motive.includes(m.id))
    .map((m) => m.name)
  return `Motiv, ${pflicht}: ${namen.length ? namen.join(', ') : 'noch keine Motive erlaubt'}`
}

function DruckstelleFormular({
  artikelId,
  druckstelle,
  motive,
  sortierung,
  onFertig,
  onFehler,
}: {
  artikelId: string
  druckstelle?: Druckstelle
  motive: Array<Motiv>
  sortierung: number
  onFertig: () => Promise<void>
  onFehler: (text: string) => void
}) {
  const [art, setArt] = useState<DruckstellenArt>(druckstelle?.art ?? 'motiv')
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const aufpreis = centAus(String(form.get('aufpreis') ?? ''))
    if (aufpreis === null) {
      onFehler('Bitte einen Aufpreis wie 5,00 eingeben oder leer lassen.')
      return
    }
    const daten = {
      artikel: artikelId,
      name: String(form.get('name') ?? ''),
      art,
      pflicht: form.get('pflicht') === 'on',
      aufpreis,
      // Eine Text-Druckstelle hat keine Motive (Hook in PocketBase).
      erlaubte_motive:
        art === 'motiv' ? form.getAll('erlaubte_motive').map(String) : [],
      sortierung,
    }
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      if (druckstelle)
        await pb.collection('druckstellen').update(druckstelle.id, daten)
      else await pb.collection('druckstellen').create(daten)
      await onFertig()
    } catch (err) {
      onFehler(
        fehlertext(err, 'Die Druckstelle konnte nicht gespeichert werden.'),
      )
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="mt-2 space-y-3" onSubmit={speichern}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-32 flex-1">
          <span className="text-ash mb-1 block text-xs">Druckstelle</span>
          <input
            className="field"
            name="name"
            maxLength={50}
            required
            defaultValue={druckstelle?.name}
            placeholder="z. B. vorne, Ärmel links"
          />
        </label>
        <label className="w-32">
          <span className="text-ash mb-1 block text-xs">Aufpreis in Euro</span>
          <input
            className="field"
            name="aufpreis"
            inputMode="decimal"
            defaultValue={
              druckstelle?.aufpreis ? centAlsEingabe(druckstelle.aufpreis) : ''
            }
            placeholder="0,00"
          />
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <legend className="text-ash mb-1 text-xs">Art</legend>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input
            type="radio"
            name="art"
            checked={art === 'motiv'}
            onChange={() => setArt('motiv')}
          />
          Motivauswahl
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input
            type="radio"
            name="art"
            checked={art === 'text'}
            onChange={() => setArt('text')}
          />
          Textfeld
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input
            type="checkbox"
            name="pflicht"
            defaultChecked={druckstelle?.pflicht}
          />
          Pflicht
        </label>
      </fieldset>
      {art === 'motiv' && (
        <fieldset className="text-sm">
          <legend className="text-ash mb-1 text-xs">Erlaubte Motive</legend>
          {motive.length === 0 ? (
            <p className="text-smoke text-[13px]">
              Noch keine Motive. Lege sie unten unter Motive an.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-5">
              {motive.map((m) => (
                <label
                  key={m.id}
                  className="inline-flex min-h-10 items-center gap-2"
                >
                  <input
                    type="checkbox"
                    name="erlaubte_motive"
                    value={m.id}
                    defaultChecked={druckstelle?.erlaubte_motive.includes(m.id)}
                  />
                  {m.name}
                  {m.ausgeblendet && (
                    <span className="text-smoke text-[13px]">
                      (ausgeblendet)
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      {art === 'text' && (
        <p className="text-smoke text-[13px]">
          Das Mitglied schreibt hier eigenen Text, z. B. seinen Spitznamen.
        </p>
      )}
      <Button type="submit" disabled={laeuft}>
        {druckstelle ? 'Speichern' : 'Hinzufügen'}
      </Button>
    </form>
  )
}
