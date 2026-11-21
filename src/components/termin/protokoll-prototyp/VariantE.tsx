import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Clock,
  Heading,
  IndentDecrease,
  IndentIncrease,
  List,
  ListOrdered,
  NotebookPen,
  Radio,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { SichtUmschalter, Zustand, uhrzeit } from './gemeinsam'
import type { ReactNode } from 'react'


// PROTOTYP, wegwerfen. Variante E "Mitschreiben als Dokument" (C2): Der
// Vollbild-Modus aus C, aber mit Tiptap-Editor statt Einzeleinträgen. Ein
// durchgehendes Dokument mit Überschriften, Listen, Einrückung (Tab /
// Shift+Tab in Listen) und Fett. Uhrzeit per Knopf an der Schreibmarke.
// Mitglieder sehen das gerenderte HTML. In echt müsste das HTML beim Anzeigen
// bereinigt werden.
export const name = 'Mitschreiben als Dokument (Tiptap)'

const START = `
<h3><strong>19:42</strong> Begrüßung</h3>
<p>14 da.</p>
<h3><strong>19:50</strong> Kasse</h3>
<ul><li><p>Stand ok</p></li><li><p>Hoodies sind alle bezahlt</p></li></ul>
<h3><strong>20:05</strong> Rocknacht 2027</h3>
<ul>
  <li><p>Termin fix: <strong>17. Juli</strong></p></li>
  <li><p>Bands anfragen</p>
    <ul><li><p>Sepp kümmert sich, bis Februar</p></li></ul>
  </li>
</ul>
`

// Typografie für Editor und Lese-Ansicht, ohne Typography-Plugin.
const DOKUMENT =
  'text-[16px] leading-relaxed [&_h3]:mt-5 [&_h3]:mb-1 [&_h3]:font-semibold [&_h3]:text-bone [&_h3:first-child]:mt-0 [&_h3_strong]:text-brass [&_h3_strong]:tnum [&_h3_strong]:mr-2 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:list-[circle] [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li::marker]:text-smoke'

function Knopf({
  aktiv,
  onClick,
  label,
  children,
}: {
  aktiv?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg ${
        aktiv ? 'bg-slate text-brass' : 'text-ash hover:bg-slate/60'
      }`}
    >
      {children}
    </button>
  )
}

export function VariantE() {
  const [alsMitglied, setAlsMitglied] = useState(false)
  const [offen, setOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(true)
  const [html, setHtml] = useState(START)

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [3] } })],
    content: START,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
    editorProps: {
      attributes: {
        class: `${DOKUMENT} min-h-full text-xl outline-none`,
      },
    },
  })

  const zustand = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            fett: e.isActive('bold'),
            ueberschrift: e.isActive('heading'),
            liste: e.isActive('bulletList'),
            nummern: e.isActive('orderedList'),
            ein: e.can().sinkListItem('listItem'),
            aus: e.can().liftListItem('listItem'),
          }
        : null,
  })

  const kette = () => editor?.chain().focus()

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
            setTimeout(() => editor?.commands.focus('end'), 0)
          }}
          className="bg-rust text-bone hover:bg-rust-hi mb-3 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl text-lg font-semibold"
        >
          <NotebookPen className="size-6" /> Weiter mitschreiben
        </button>
      )}

      <div
        className={`card p-5 ${DOKUMENT}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Der Editor bleibt immer im Baum, damit sein Inhalt nicht verloren
          geht; ohne "offen" ist er nur versteckt. */}
      <div
        className={`bg-coal fixed inset-0 z-50 flex-col ${offen ? 'flex' : 'hidden'}`}
      >
        <header className="border-line/60 flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="eyebrow">Mitschreiben</div>
            <div className="text-ash text-sm">
              In Listen: Tab rückt ein, Shift+Tab rückt aus
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

        <div className="border-line/60 flex flex-wrap items-center gap-1 border-b px-3 py-2">
          <Knopf
            label="Neuer Punkt mit Uhrzeit"
            onClick={() =>
              kette()
                ?.insertContent(`<h3><strong>${uhrzeit()}</strong> </h3>`)
                .run()
            }
          >
            <Clock className="size-5" />
          </Knopf>
          <Knopf
            label="Überschrift"
            aktiv={zustand?.ueberschrift}
            onClick={() => kette()?.toggleHeading({ level: 3 }).run()}
          >
            <Heading className="size-5" />
          </Knopf>
          <Knopf
            label="Fett"
            aktiv={zustand?.fett}
            onClick={() => kette()?.toggleBold().run()}
          >
            <Bold className="size-5" />
          </Knopf>
          <span className="bg-line mx-1 h-6 w-px" />
          <Knopf
            label="Liste"
            aktiv={zustand?.liste}
            onClick={() => kette()?.toggleBulletList().run()}
          >
            <List className="size-5" />
          </Knopf>
          <Knopf
            label="Nummerierte Liste"
            aktiv={zustand?.nummern}
            onClick={() => kette()?.toggleOrderedList().run()}
          >
            <ListOrdered className="size-5" />
          </Knopf>
          <Knopf
            label="Einrücken"
            onClick={() => kette()?.sinkListItem('listItem').run()}
          >
            <IndentIncrease
              className={`size-5 ${zustand?.ein ? '' : 'opacity-30'}`}
            />
          </Knopf>
          <Knopf
            label="Ausrücken"
            onClick={() => kette()?.liftListItem('listItem').run()}
          >
            <IndentDecrease
              className={`size-5 ${zustand?.aus ? '' : 'opacity-30'}`}
            />
          </Knopf>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      <Zustand wert={{ laeuftGerade: laeuft, html }} />
    </section>
  )
}
