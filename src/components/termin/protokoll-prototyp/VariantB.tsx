import { CheckCircle2, CircleDot, Gavel, Plus, Undo2, X } from 'lucide-react'
import { useState } from 'react'

import { SichtUmschalter, Zustand } from './gemeinsam'

// PROTOTYP, wegwerfen. Variante B "Punkte": Das Protokoll ist eine Liste von
// Punkten. Jeder Punkt ist Info, Beschluss oder Aufgabe (mit wer). Offene
// Aufgaben vom letzten Stammtisch lassen sich übernehmen. Mitglieder sehen
// oben, was beschlossen wurde und wer was zu tun hat.
export const name = 'Punkte'

type Art = 'info' | 'beschluss' | 'aufgabe'
type Punkt = {
  id: number
  titel: string
  notiz: string
  art: Art
  wer?: string
}

const ART: Record<Art, { name: string; ton: string }> = {
  info: { name: 'Info', ton: 'text-ash border-line' },
  beschluss: { name: 'Beschluss', ton: 'text-brass border-brass/60' },
  aufgabe: { name: 'Aufgabe', ton: 'text-patina border-patina/60' },
}

const START: Array<Punkt> = [
  {
    id: 1,
    titel: 'Kasse',
    notiz: 'Stand ok, Hoodies sind bezahlt.',
    art: 'info',
  },
  {
    id: 2,
    titel: 'Rocknacht 2027 am 17. Juli',
    notiz: 'Termin steht.',
    art: 'beschluss',
  },
  {
    id: 3,
    titel: 'Bands für die Rocknacht anfragen',
    notiz: 'Bis Februar.',
    art: 'aufgabe',
    wer: 'Sepp',
  },
]

const VOM_LETZTEN_MAL: Array<Punkt> = [
  {
    id: 101,
    titel: 'Angebot Zeltverleih einholen',
    notiz: 'Offen vom Stammtisch am 16. Oktober.',
    art: 'aufgabe',
    wer: 'Toni',
  },
]

let naechsteId = 10

export function VariantB() {
  const [alsMitglied, setAlsMitglied] = useState(false)
  const [punkte, setPunkte] = useState(START)
  const [uebernehmbar, setUebernehmbar] = useState(VOM_LETZTEN_MAL)
  const [neu, setNeu] = useState('')
  const [neuArt, setNeuArt] = useState<Art>('info')

  function aendern(id: number, teil: Partial<Punkt>) {
    setPunkte((ps) => ps.map((p) => (p.id === id ? { ...p, ...teil } : p)))
  }

  function hinzu() {
    if (!neu.trim()) return
    setPunkte((ps) => [
      ...ps,
      { id: naechsteId++, titel: neu.trim(), notiz: '', art: neuArt },
    ])
    setNeu('')
  }

  const beschluesse = punkte.filter((p) => p.art === 'beschluss')
  const aufgaben = punkte.filter((p) => p.art === 'aufgabe')

  return (
    <section className="mt-8" aria-label="Protokoll">
      <SichtUmschalter
        alsMitglied={alsMitglied}
        setAlsMitglied={setAlsMitglied}
      />
      <h2 className="eyebrow mb-3">Protokoll</h2>

      {alsMitglied ? (
        <>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <div className="text-brass mb-2 flex items-center gap-2 text-sm font-semibold">
                <Gavel className="size-4" /> {beschluesse.length} Beschlüsse
              </div>
              <ul className="space-y-1 text-[15px]">
                {beschluesse.map((p) => (
                  <li key={p.id}>{p.titel}</li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <div className="text-patina mb-2 flex items-center gap-2 text-sm font-semibold">
                <CircleDot className="size-4" /> {aufgaben.length} Aufgaben
              </div>
              <ul className="space-y-1 text-[15px]">
                {aufgaben.map((p) => (
                  <li key={p.id}>
                    {p.titel}
                    {p.wer && <span className="text-ash"> · {p.wer}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ol className="card divide-line/60 divide-y">
            {punkte.map((p, i) => (
              <li key={p.id} className="flex gap-3 p-4">
                <span className="tnum text-smoke w-5 shrink-0">{i + 1}.</span>
                <div>
                  <div className="font-semibold">{p.titel}</div>
                  {p.notiz && <p className="text-ash text-[15px]">{p.notiz}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          {uebernehmbar.length > 0 && (
            <div className="border-patina/40 bg-patina/10 mb-3 rounded-2xl border p-4">
              <div className="mb-2 text-sm font-semibold">
                Offen vom letzten Stammtisch
              </div>
              {uebernehmbar.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[15px]">
                    {p.titel} <span className="text-ash">· {p.wer}</span>
                  </span>
                  <button
                    type="button"
                    className="text-patina flex min-h-11 items-center gap-1 text-sm font-semibold"
                    onClick={() => {
                      setPunkte((ps) => [...ps, p])
                      setUebernehmbar((u) => u.filter((x) => x.id !== p.id))
                    }}
                  >
                    <Undo2 className="size-4" /> Übernehmen
                  </button>
                </div>
              ))}
            </div>
          )}

          <ol className="space-y-2">
            {punkte.map((p, i) => (
              <li key={p.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="tnum text-smoke mt-2.5 w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      value={p.titel}
                      onChange={(e) => aendern(p.id, { titel: e.target.value })}
                      className="w-full bg-transparent font-semibold outline-none"
                    />
                    <textarea
                      value={p.notiz}
                      onChange={(e) => aendern(p.id, { notiz: e.target.value })}
                      placeholder="Notiz …"
                      rows={2}
                      className="text-ash w-full resize-none bg-transparent text-[15px] outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(ART) as Array<Art>).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => aendern(p.id, { art: a })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            p.art === a
                              ? ART[a].ton
                              : 'border-line/40 text-smoke'
                          }`}
                        >
                          {ART[a].name}
                        </button>
                      ))}
                      {p.art === 'aufgabe' && (
                        <input
                          value={p.wer ?? ''}
                          onChange={(e) =>
                            aendern(p.id, { wer: e.target.value })
                          }
                          placeholder="Wer?"
                          className="field w-28 py-1 text-sm"
                        />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Punkt entfernen"
                    onClick={() =>
                      setPunkte((ps) => ps.filter((x) => x.id !== p.id))
                    }
                    className="text-smoke hover:text-rust-hi p-2"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              hinzu()
            }}
          >
            <select
              value={neuArt}
              onChange={(e) => setNeuArt(e.target.value as Art)}
              className="field w-auto"
            >
              {(Object.keys(ART) as Array<Art>).map((a) => (
                <option key={a} value={a}>
                  {ART[a].name}
                </option>
              ))}
            </select>
            <input
              value={neu}
              onChange={(e) => setNeu(e.target.value)}
              placeholder="Neuer Punkt, Enter"
              className="field"
            />
            <button
              type="submit"
              aria-label="Punkt hinzufügen"
              className="bg-rust text-bone rounded-xl px-4"
            >
              <Plus className="size-5" />
            </button>
          </form>
          <p className="text-smoke mt-2 flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="size-3.5" /> Jede Änderung wird sofort
            gespeichert.
          </p>
        </>
      )}
      <Zustand wert={punkte} />
    </section>
  )
}
