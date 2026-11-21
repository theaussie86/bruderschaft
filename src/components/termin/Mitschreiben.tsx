import { EditorContent, useEditor } from '@tiptap/react'
import { Save, X } from 'lucide-react'
import { useState } from 'react'

import type { Termin } from '@/lib/termine'
import type { ProtokollKnoten } from '@/lib/protokoll'
import {
  DOKUMENT,
  PROTOKOLL_SCHEMA,
} from '@/components/termin/protokoll-schema'
import { fehlertext } from '@/lib/geburtstag'
import { protokollTextSpeichern } from '@/lib/protokoll'

// Das Vollbild zum Mitschreiben des Protokolls (Spec #62). Ein Admin schreibt
// den Text und speichert ihn mit dem großen Knopf; erst dann sehen ihn die
// Mitglieder. Es gilt der zuletzt gespeicherte Stand. Der Editor rendert erst
// im Browser, nicht auf dem Server.
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

  const editor = useEditor({
    extensions: PROTOKOLL_SCHEMA,
    content: termin.protokolltext ?? '',
    immediatelyRender: false,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: `${DOKUMENT} min-h-full text-xl outline-none`,
        'aria-label': 'Protokolltext',
      },
    },
  })

  async function speichern() {
    if (!editor) return
    setFehler(null)
    setLaeuft(true)
    try {
      onGespeichert(
        await protokollTextSpeichern(
          termin.id,
          editor.getJSON() as ProtokollKnoten,
        ),
      )
    } catch (err) {
      setFehler(
        fehlertext(err, 'Das Protokoll konnte nicht gespeichert werden.'),
      )
    } finally {
      setLaeuft(false)
    }
  }

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
          <button
            type="button"
            onClick={() => void speichern()}
            disabled={laeuft || !editor}
            className="bg-rust text-bone hover:bg-rust-hi disabled:bg-slate disabled:text-smoke flex min-h-12 items-center gap-2 rounded-xl px-5 text-[16px] font-semibold"
          >
            <Save className="size-5" /> {laeuft ? 'Speichert …' : 'Speichern'}
          </button>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onSchliessen}
            className="border-line flex min-h-12 min-w-12 items-center justify-center rounded-xl border"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {fehler && (
        <p
          role="alert"
          className="border-rust/50 bg-rust/10 text-rust-hi border-b px-5 py-3 font-semibold"
        >
          {fehler}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto h-full max-w-3xl">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  )
}
