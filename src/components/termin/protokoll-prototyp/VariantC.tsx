import { NotebookPen, Radio, Send, X } from 'lucide-react'
import { useState } from 'react'

import { SichtUmschalter, Zustand, uhrzeit } from './gemeinsam'

// PROTOTYP, wegwerfen. Variante C "Mitschreib-Modus": Auf der Terminseite
// steht nur ein großer Knopf. Er öffnet einen Vollbild-Modus wie ein Chat:
// Jede Zeile mit Enter wird ein Eintrag mit Uhrzeit. Mitglieder sehen die
// Einträge als Zeitleiste, während des Stammtischs mit "läuft gerade".
export const name = 'Mitschreib-Modus'

type Eintrag = { id: number; um: string; text: string }

const START: Array<Eintrag> = [
  { id: 1, um: '19:42', text: 'Begrüßung, 14 da' },
  { id: 2, um: '19:50', text: 'Kasse: Stand ok, Hoodies sind bezahlt' },
  { id: 3, um: '20:05', text: 'Rocknacht 2027 fix am 17. Juli' },
  { id: 4, um: '20:12', text: 'Sepp fragt Bands an, bis Februar' },
]

let naechsteId = 10

export function VariantC() {
  const [alsMitglied, setAlsMitglied] = useState(false)
  const [eintraege, setEintraege] = useState(START)
  const [offen, setOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(true)
  const [zeile, setZeile] = useState('')
  const [bearbeite, setBearbeite] = useState<number | null>(null)

  function senden() {
    if (!zeile.trim()) return
    if (bearbeite !== null) {
      setEintraege((es) =>
        es.map((e) => (e.id === bearbeite ? { ...e, text: zeile.trim() } : e)),
      )
      setBearbeite(null)
    } else {
      setEintraege((es) => [
        ...es,
        { id: naechsteId++, um: uhrzeit(), text: zeile.trim() },
      ])
    }
    setZeile('')
  }

  return (
    <section className="mt-8" aria-label="Protokoll">
      <SichtUmschalter
        alsMitglied={alsMitglied}
        setAlsMitglied={setAlsMitglied}
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">Protokoll</h2>
        {laeuft && (
          <span className="text-rust-hi flex items-center gap-1.5 text-xs font-semibold">
            <Radio className="size-3.5 animate-pulse" /> läuft gerade
          </span>
        )}
      </div>

      {!alsMitglied && (
        <button
          type="button"
          onClick={() => {
            setOffen(true)
            setLaeuft(true)
          }}
          className="bg-rust text-bone hover:bg-rust-hi mb-3 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl text-lg font-semibold"
        >
          <NotebookPen className="size-6" />
          {eintraege.length ? 'Weiter mitschreiben' : 'Mitschreiben starten'}
        </button>
      )}

      <ol className="card relative space-y-0 p-5">
        {eintraege.map((e) => (
          <li
            key={e.id}
            className="border-line/60 flex gap-4 border-l pb-4 pl-4 last:pb-0"
          >
            <span className="tnum text-brass w-11 shrink-0 text-sm font-semibold">
              {e.um}
            </span>
            <span className="text-[16px]">{e.text}</span>
          </li>
        ))}
      </ol>

      {offen && (
        <div className="bg-coal fixed inset-0 z-50 flex flex-col">
          <header className="border-line/60 flex items-center justify-between border-b px-5 py-4">
            <div>
              <div className="eyebrow">Mitschreiben</div>
              <div className="text-ash text-sm">
                Stammtisch · Mitglieder lesen live mit
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOffen(false)
                setLaeuft(false)
              }}
              className="border-line flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold"
            >
              <X className="size-4" /> Fertig
            </button>
          </header>
          <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-6">
            {eintraege.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setBearbeite(e.id)
                    setZeile(e.text)
                  }}
                  className={`flex w-full gap-4 rounded-xl p-2 text-left text-xl ${
                    bearbeite === e.id ? 'bg-slate' : 'hover:bg-slate/50'
                  }`}
                >
                  <span className="tnum text-brass w-14 shrink-0 text-base font-semibold">
                    {e.um}
                  </span>
                  <span>{e.text}</span>
                </button>
              </li>
            ))}
          </ol>
          <form
            className="border-line/60 flex gap-2 border-t p-4"
            onSubmit={(ev) => {
              ev.preventDefault()
              senden()
            }}
          >
            <input
              autoFocus
              value={zeile}
              onChange={(e) => setZeile(e.target.value)}
              placeholder={
                bearbeite !== null
                  ? 'Eintrag ändern, Enter'
                  : 'Was wird besprochen? Enter'
              }
              className="field text-xl"
            />
            <button
              type="submit"
              aria-label="Eintrag speichern"
              className="bg-rust text-bone rounded-xl px-5"
            >
              <Send className="size-5" />
            </button>
          </form>
        </div>
      )}
      <Zustand wert={{ laeuftGerade: laeuft, eintraege }} />
    </section>
  )
}
