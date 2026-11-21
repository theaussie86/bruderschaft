import { EditorContent, useEditor } from '@tiptap/react'

import type { ProtokollKnoten } from '@/lib/protokoll'
import {
  DOKUMENT,
  PROTOKOLL_SCHEMA,
} from '@/components/termin/protokoll-schema'

// Der gespeicherte Protokolltext zum Lesen: ein schreibgeschützter Editor mit
// demselben Schema wie beim Mitschreiben. Aus dem JSON entsteht nur, was das
// Schema kennt, eingeschleustes HTML kommt so nicht in den Browser.
export function ProtokollText({ text }: { text: ProtokollKnoten }) {
  const editor = useEditor(
    {
      extensions: PROTOKOLL_SCHEMA,
      content: text,
      editable: false,
      immediatelyRender: false,
      editorProps: { attributes: { class: `${DOKUMENT} outline-none` } },
    },
    [text],
  )

  return <EditorContent editor={editor} />
}
