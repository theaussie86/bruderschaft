import { IndentIncrease, NotebookPen, Radio, Send, X } from 'lucide-react'
import { useState } from 'react'

import { SichtUmschalter, Zustand, uhrzeit } from './gemeinsam'

// PROTOTYP, wegwerfen. Variante D "Mitschreib-Modus mit Einrückung" (C1):
// wie C, aber in der Eingabezeile rückt Tab den nächsten Eintrag als
// Unterpunkt ein, Shift+Tab rückt aus. Bis zu zwei Ebenen. Tippt man einen
// Eintrag an, ändert Tab dessen Ebene. Keine Bibliothek, Zeitleiste bleibt.
export const name = 'Mitschreiben + Einrückung'

type Eintrag = { id: number; um: string; text: string; ebene: number }

const START: Array<Eintrag> = [
  { id: 1, um: '19:42', text: 'Begrüßung, 14 da', ebene: 0 },
  { id: 2, um: '19:50', text: 'Kasse', ebene: 0 },
  { id: 3, um: '19:51', text: 'Stand ok', ebene: 1 },
  { id: 4, um: '19:52', text: 'Hoodies sind alle bezahlt', ebene: 1 },
  { id: 5, um: '20:05', text: 'Rocknacht 2027', ebene: 0 },
  { id: 6, um: '20:06', text: 'Termin fix: 17. Juli', ebene: 1 },
  { id: 7, um: '20:09', text: 'Bands anfragen', ebene: 1 },
  { id: 8, um: '20:10', text: 'Sepp kümmert sich, bis Februar', ebene: 2 },
]

const MAX_EBENE = 2
let naechsteId = 20

function Zeile({ e, gross }: { e: Eintrag; gross?: boolean }) {
  return (
    <div className="flex gap-4">
      <span
        className={`tnum w-12 shrink-0 font-semibold ${
          e.ebene === 0 ? 'text-brass' : 'text-smoke'
        } ${gross ? 'text-base' : 'text-sm'}`}
      >
        {e.um}
      </span>
      <span
        style={{ paddingLeft: `${e.ebene * 1.5}rem` }}
        className={`flex gap-2 ${e.ebene === 0 ? 'font-semibold' : ''}`}
      >
        {e.ebene > 0 && (
          <span className="text-smoke">{e.ebene === 1 ? '–' : '·'}</span>
        )}
        {e.text}
      </span>
    </div>
  )
}

export function VariantD() {
  const [alsMitglied, setAlsMitglied] = useState(false)
  const [eintraege, setEintraege] = useState(START)
  const [offen, setOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(true)
  const [zeile, setZeile] = useState('')
  const [ebene, setEbene] = useState(1)
  const [bearbeite, setBearbeite] = useState<number | null>(null)

  function senden() {
    if (!zeile.trim()) return
    if (bearbeite !== null) {
      setEintraege((es) =>
        es.map((e) =>
          e.id === bearbeite ? { ...e, text: zeile.trim(), ebene } : e,
        ),
      )
      setBearbeite(null)
    } else {
      setEintraege((es) => [
        ...es,
        { id: naechsteId++, um: uhrzeit(), text: zeile.trim(), ebene },
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
          <NotebookPen className="size-6" /> Weiter mitschreiben
        </button>
      )}

      <ol className="card space-y-2.5 p-5 text-[16px]">
        {eintraege.map((e) => (
          <li key={e.id} className={e.ebene === 0 ? 'pt-2 first:pt-0' : ''}>
            <Zeile e={e} />
          </li>
        ))}
      </ol>

      {offen && (
        <div className="bg-coal fixed inset-0 z-50 flex flex-col">
          <header className="border-line/60 flex items-center justify-between border-b px-5 py-4">
            <div>
              <div className="eyebrow">Mitschreiben</div>
              <div className="text-ash text-sm">
                Tab rückt ein, Shift+Tab rückt aus
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
          <ol className="flex-1 space-y-1 overflow-y-auto px-5 py-6 text-xl">
            {eintraege.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setBearbeite(e.id)
                    setZeile(e.text)
                    setEbene(e.ebene)
                  }}
                  className={`w-full rounded-xl p-2 text-left ${
                    bearbeite === e.id ? 'bg-slate' : 'hover:bg-slate/50'
                  }`}
                >
                  <Zeile e={e} gross />
                </button>
              </li>
            ))}
          </ol>
          <form
            className="border-line/60 flex items-center gap-2 border-t p-4"
            onSubmit={(ev) => {
              ev.preventDefault()
              senden()
            }}
          >
            {/* Für Handys ohne Tab-Taste: Knopf schaltet die Ebene durch. */}
            <button
              type="button"
              onClick={() => setEbene((x) => (x + 1) % (MAX_EBENE + 1))}
              className="border-line text-ash flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold"
              aria-label="Ebene wechseln"
            >
              <IndentIncrease className="size-4" />
              {ebene === 0 ? 'Punkt' : ebene === 1 ? 'Unter' : 'Unter²'}
            </button>
            <input
              autoFocus
              value={zeile}
              onChange={(e) => setZeile(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Tab') return
                e.preventDefault()
                setEbene((x) =>
                  e.shiftKey ? Math.max(0, x - 1) : Math.min(MAX_EBENE, x + 1),
                )
              }}
              style={{ paddingLeft: `${0.95 + ebene * 1.5}rem` }}
              placeholder={
                bearbeite !== null
                  ? 'Eintrag ändern, Enter'
                  : ebene === 0
                    ? 'Neuer Hauptpunkt, Enter'
                    : 'Unterpunkt, Enter'
              }
              className="field text-xl"
            />
            <button
              type="submit"
              aria-label="Eintrag speichern"
              className="bg-rust text-bone min-h-12 rounded-xl px-5"
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
