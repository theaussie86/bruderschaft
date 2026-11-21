import { Check, CloudOff, FileText, Loader2, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  BEISPIEL_DATEIEN,
  SichtUmschalter,
  Zustand,
  uhrzeit,
} from './gemeinsam'

// PROTOTYP, wegwerfen. Variante A "Ein Blatt": Das Protokoll ist ein einziger
// freier Text direkt auf der Terminseite, wie ein Word-Dokument. Speichert
// von selbst, während man tippt. Dateien bleiben darunter als Anhang.
export const name = 'Ein Blatt'

const START = `Anwesend: 14

Kasse
- Stand ok, Hoodies sind bezahlt

Rocknacht 2027
- Termin steht: 17. Juli
- Line-up noch offen, Bands bis Februar anfragen

App
- Vorgestellt, alle dabei
`

export function VariantA() {
  const [alsMitglied, setAlsMitglied] = useState(false)
  const [text, setText] = useState(START)
  const [gespeichert, setGespeichert] = useState({ text: START, um: '20:41' })
  const [offline, setOffline] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const ungespeichert = text !== gespeichert.text

  // Eine Sekunde nach dem letzten Tastendruck "speichern", außer ohne Netz.
  useEffect(() => {
    if (!ungespeichert || offline) return
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => setGespeichert({ text, um: uhrzeit() }),
      1000,
    )
    return () => clearTimeout(timer.current)
  }, [text, offline, ungespeichert])

  return (
    <section className="mt-8" aria-label="Protokoll">
      <SichtUmschalter
        alsMitglied={alsMitglied}
        setAlsMitglied={setAlsMitglied}
      />
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">Protokoll</h2>
        {!alsMitglied && (
          <span className="text-ash flex items-center gap-1.5 text-xs">
            {offline && ungespeichert ? (
              <>
                <CloudOff className="text-rust-hi size-3.5" /> Kein Netz, bleibt
                auf dem Gerät
              </>
            ) : ungespeichert ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Speichert …
              </>
            ) : (
              <>
                <Check className="text-patina size-3.5" /> Gespeichert{' '}
                {gespeichert.um}
              </>
            )}
          </span>
        )}
      </div>

      {alsMitglied ? (
        <div className="card p-5">
          <p className="text-[16px] leading-relaxed whitespace-pre-line">
            {gespeichert.text}
          </p>
          <p className="text-smoke border-line/60 mt-4 border-t pt-3 text-xs">
            Zuletzt geändert um {gespeichert.um} von Christoph
          </p>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.max(10, text.split('\n').length + 2)}
          placeholder="Einfach losschreiben, was besprochen wird …"
          className="field font-[inherit] text-[16px] leading-relaxed"
        />
      )}

      <ul className="card divide-line/60 mt-3 divide-y">
        {BEISPIEL_DATEIEN.map((d) => (
          <li
            key={d}
            className="flex min-h-11 items-center gap-3 px-4 font-semibold"
          >
            <FileText className="text-brass size-5" /> {d}
          </li>
        ))}
        {!alsMitglied && (
          <li className="text-ash px-4 py-3 text-sm">+ Datei anhängen</li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => setOffline((o) => !o)}
        className="mt-3 flex items-center gap-2 font-mono text-xs text-fuchsia-300"
      >
        {offline ? (
          <CloudOff className="size-3.5" />
        ) : (
          <Wifi className="size-3.5" />
        )}
        PROTOTYP · WLAN in der Wirtschaft {offline ? 'weg' : 'da'} (klicken)
      </button>
      <Zustand
        wert={{ protokollText: gespeichert.text, geaendertUm: gespeichert.um }}
      />
    </section>
  )
}
