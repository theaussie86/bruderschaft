import { EditorContent, useEditor } from '@tiptap/react'
import { Save, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { Termin } from '@/lib/termine'
import type { ProtokollKnoten } from '@/lib/protokoll'
import {
  DOKUMENT,
  PROTOKOLL_SCHEMA,
} from '@/components/termin/protokoll-schema'
import { Werkzeugleiste } from '@/components/termin/Werkzeugleiste'
import { protokollDokument, protokollTextSpeichern } from '@/lib/protokoll'
import {
  entwurfAnbieten,
  entwurfEntfernen,
  entwurfLesen,
  entwurfSichern,
  speicherStatus,
  speichernMitEntwurf,
} from '@/lib/protokoll-entwurf'

// Das Vollbild zum Mitschreiben des Protokolls (Spec #62). Ein Admin schreibt
// den Text und speichert ihn mit dem großen Knopf oder Strg/Cmd+S; erst dann
// sehen ihn die Mitglieder. Es gilt der zuletzt gespeicherte Stand. Der
// Editor rendert erst im Browser, nicht auf dem Server.
//
// Schutz vor Textverlust (Issue #65): Der Kopf zeigt, ob gespeichert ist.
// Jeder Tastendruck landet als Entwurf im Browser, der beim nächsten Öffnen
// angeboten wird. Bis der Admin den Entwurf übernimmt oder verwirft, ist der
// Editor gesperrt, damit nichts Getipptes ungesichert verloren geht. Wer mit
// ungespeicherten Änderungen schließt, wird gefragt.
export function Mitschreiben({
  termin,
  onGespeichert,
  onSchliessen,
}: {
  termin: Termin
  onGespeichert: (t: Termin) => void
  onSchliessen: () => void
}) {
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [schliessenFragen, setSchliessenFragen] = useState(false)
  // Der gespeicherte Stand so, wie der Editor ihn liest, und wann er
  // gespeichert wurde. Daran misst sich "Nicht gespeichert".
  const [gespeichert, setGespeichert] = useState<{
    text: unknown
    um: string | undefined
  }>({ text: termin.protokolltext, um: termin.protokoll_gespeichert })
  const [dokument, setDokument] = useState<unknown>(termin.protokolltext)
  const [angebot, setAngebot] = useState<ProtokollKnoten | null>(null)

  const editor = useEditor({
    extensions: PROTOKOLL_SCHEMA,
    // Nur ein geprüftes Dokument, eine Zeichenkette läse Tiptap als HTML.
    content: protokollDokument(termin.protokolltext),
    immediatelyRender: false,
    autofocus: 'end',
    onCreate: ({ editor: e }) => {
      const geladen = e.getJSON()
      setGespeichert((g) => ({ ...g, text: geladen }))
      setDokument(geladen)
      const entwurf = entwurfLesen(window.localStorage, termin.id)
      if (entwurfAnbieten(entwurf, geladen)) {
        e.setEditable(false)
        setAngebot(entwurf)
      }
    },
    onUpdate: ({ editor: e }) => {
      const jetzt = e.getJSON() as ProtokollKnoten
      setDokument(jetzt)
      entwurfSichern(window.localStorage, termin.id, jetzt)
    },
    editorProps: {
      attributes: {
        class: `${DOKUMENT} min-h-full text-xl outline-none`,
        'aria-label': 'Protokolltext',
      },
    },
  })

  const status = speicherStatus(dokument, gespeichert.text, gespeichert.um)

  async function speichern(): Promise<boolean> {
    if (!editor) return false
    setFehler(null)
    setLaeuft(true)
    const stand = editor.getJSON() as ProtokollKnoten
    const ergebnis = await speichernMitEntwurf({
      speicher: window.localStorage,
      terminId: termin.id,
      dokument: stand,
      aktuell: () => editor.getJSON() as ProtokollKnoten,
      senden: (d) => protokollTextSpeichern(termin.id, d),
    })
    setLaeuft(false)
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler)
      return false
    }
    setGespeichert({
      text: stand,
      um: ergebnis.termin.protokoll_gespeichert,
    })
    onGespeichert(ergebnis.termin)
    return true
  }

  function entwurfUebernehmen() {
    if (!editor || !angebot) return
    setAngebot(null)
    editor.setEditable(true)
    editor.commands.setContent(angebot)
    setDokument(editor.getJSON())
    editor.commands.focus('end')
  }

  function entwurfVerwerfen() {
    setAngebot(null)
    entwurfEntfernen(window.localStorage, termin.id)
    editor?.setEditable(true)
    editor?.commands.focus('end')
  }

  function schliessen() {
    if (status.ungespeichert) setSchliessenFragen(true)
    else onSchliessen()
  }

  function verwerfenUndSchliessen() {
    entwurfEntfernen(window.localStorage, termin.id)
    onSchliessen()
  }

  async function speichernUndSchliessen() {
    if (await speichern()) onSchliessen()
  }

  // Strg/Cmd+S speichert wie der Knopf, auch außerhalb des Editors.
  const speichernRef = useRef(speichern)
  speichernRef.current = speichern
  const kannSpeichern = status.ungespeichert && !laeuft && !!editor
  useEffect(() => {
    function taste(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault()
        if (kannSpeichern) void speichernRef.current()
      }
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [kannSpeichern])

  // Schließt jemand den Tab mit ungespeicherten Änderungen, fragt der
  // Browser nach. Der Entwurf auf dem Gerät bleibt ohnehin.
  useEffect(() => {
    if (!status.ungespeichert) return
    function warnen(ev: BeforeUnloadEvent) {
      ev.preventDefault()
    }
    window.addEventListener('beforeunload', warnen)
    return () => window.removeEventListener('beforeunload', warnen)
  }, [status.ungespeichert])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Protokoll mitschreiben"
      className="bg-coal fixed inset-0 z-50 flex flex-col"
    >
      <header className="border-line/60 flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="eyebrow">Mitschreiben</div>
          <div className="text-ash truncate text-sm">{termin.titel}</div>
        </div>
        <div className="flex items-center gap-3">
          {status.text && (
            <span
              role="status"
              className={`text-sm ${
                status.ungespeichert ? 'text-rust-hi font-semibold' : 'text-ash'
              }`}
            >
              {status.text}
            </span>
          )}
          <button
            type="button"
            onClick={() => void speichern()}
            disabled={!kannSpeichern}
            className="bg-rust text-bone hover:bg-rust-hi disabled:bg-slate disabled:text-smoke flex min-h-12 items-center gap-2 rounded-xl px-5 text-[16px] font-semibold"
          >
            <Save className="size-5" /> {laeuft ? 'Speichert …' : 'Speichern'}
          </button>
          <button
            type="button"
            aria-label="Schließen"
            onClick={schliessen}
            className="border-line flex min-h-12 min-w-12 items-center justify-center rounded-xl border"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {schliessenFragen && (
        <div
          role="alert"
          className="border-rust/50 bg-rust/10 flex flex-wrap items-center gap-3 border-b px-5 py-3"
        >
          <span className="flex-1 font-semibold">
            Deine Änderungen sind noch nicht gespeichert.
          </span>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => void speichernUndSchliessen()}
            className="bg-rust text-bone hover:bg-rust-hi min-h-11 rounded-xl px-4 font-semibold"
          >
            Speichern und schließen
          </button>
          <button
            type="button"
            disabled={laeuft}
            onClick={verwerfenUndSchliessen}
            className="text-ash hover:text-bone min-h-11 px-3 font-semibold"
          >
            Verwerfen
          </button>
        </div>
      )}

      {angebot && (
        <div
          role="alert"
          className="border-brass/50 bg-brass/10 flex flex-wrap items-center gap-3 border-b px-5 py-3"
        >
          <span className="flex-1 font-semibold">
            Auf diesem Gerät liegt ein Entwurf, der noch nicht gespeichert ist.
          </span>
          <button
            type="button"
            onClick={entwurfUebernehmen}
            className="bg-brass text-coal min-h-11 rounded-xl px-4 font-semibold"
          >
            Entwurf übernehmen
          </button>
          <button
            type="button"
            onClick={entwurfVerwerfen}
            className="text-ash hover:text-bone min-h-11 px-3 font-semibold"
          >
            Verwerfen
          </button>
        </div>
      )}

      {fehler && (
        <p
          role="alert"
          className="border-rust/50 bg-rust/10 text-rust-hi border-b px-5 py-3 font-semibold"
        >
          {fehler}
        </p>
      )}

      {!angebot && <Werkzeugleiste editor={editor} />}

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto h-full max-w-3xl">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  )
}
