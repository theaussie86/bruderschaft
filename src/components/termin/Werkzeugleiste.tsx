import { useEditorState } from '@tiptap/react'
import {
  Bold,
  Clock,
  Heading,
  IndentDecrease,
  IndentIncrease,
  List,
  ListOrdered,
} from 'lucide-react'

import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { neuerPunkt } from '@/components/termin/protokoll-schema'
import { berlinZeit } from '@/lib/termine'

// Die Werkzeugleiste im Mitschreib-Vollbild (Spec #64): neuer Punkt mit
// Uhrzeit, Überschrift, Fett, Liste, nummerierte Liste, Ein- und Ausrücken.
// Ein- und Ausrücken gehen auch per Tab und Shift+Tab; die Knöpfe sind fürs
// Handy da.
export function Werkzeugleiste({ editor }: { editor: Editor | null }) {
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
    <div
      role="toolbar"
      aria-label="Formatierung"
      className="border-line/60 flex flex-wrap items-center gap-1 border-b px-3 py-2"
    >
      <Knopf
        label="Neuer Punkt mit Uhrzeit"
        onClick={() =>
          kette()
            ?.insertContent(neuerPunkt(berlinZeit(new Date())))
            .run()
        }
      >
        <Clock className="size-5" />
        <span className="hidden pr-1 text-sm font-semibold sm:inline">
          Neuer Punkt
        </span>
      </Knopf>
      <Trenner />
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
      <Trenner />
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
        gesperrt={!zustand?.ein}
        onClick={() => kette()?.sinkListItem('listItem').run()}
      >
        <IndentIncrease className="size-5" />
      </Knopf>
      <Knopf
        label="Ausrücken"
        gesperrt={!zustand?.aus}
        onClick={() => kette()?.liftListItem('listItem').run()}
      >
        <IndentDecrease className="size-5" />
      </Knopf>
    </div>
  )
}

function Trenner() {
  return <span aria-hidden="true" className="bg-line mx-1 h-6 w-px" />
}

function Knopf({
  aktiv,
  gesperrt,
  onClick,
  label,
  children,
}: {
  aktiv?: boolean
  gesperrt?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={aktiv}
      disabled={gesperrt}
      // Der Fokus bleibt im Editor, sonst springt die Schreibmarke.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 disabled:opacity-30 ${
        aktiv ? 'bg-slate text-brass' : 'text-ash hover:bg-slate/60'
      }`}
    >
      {children}
    </button>
  )
}
