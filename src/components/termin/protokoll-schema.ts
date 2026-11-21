import Heading from '@tiptap/extension-heading'
import StarterKit from '@tiptap/starter-kit'

import type { ProtokollKnoten } from '@/lib/protokoll'

// Das Schema des Protokolltexts, gemeinsam für den Editor und die
// Lese-Ansicht (Spec #62, #64). Erlaubt sind nur Absatz, eine Überschrift-
// Ebene, Fett, Aufzählung und nummerierte Liste, beide verschachtelbar. Alles
// andere aus dem StarterKit ist abgeschaltet; was das Schema nicht kennt, fällt
// auch beim Einfügen aus der Zwischenablage weg, nur der Text bleibt.
// Ein schon gespeichertes Protokoll aus reinen Absätzen bleibt gültig.

// Es gibt nur eine Überschrift-Ebene (h3). Eingefügte Überschriften jeder
// Ebene werden zu ihr.
const Ueberschrift = Heading.extend({
  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((ebene) => ({
      tag: `h${ebene}`,
      attrs: { level: 3 },
    }))
  },
}).configure({ levels: [3] })

export const PROTOKOLL_SCHEMA = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    hardBreak: false,
    heading: false,
    horizontalRule: false,
    italic: false,
    link: false,
    strike: false,
    underline: false,
  }),
  Ueberschrift,
]

// Ein neuer Punkt: eine Überschrift, die mit der Uhrzeit (fett) beginnt.
// Danach folgt ein Leerzeichen, damit der Titel nicht fett weiterläuft.
export function neuerPunkt(uhrzeit: string): ProtokollKnoten {
  return {
    type: 'heading',
    attrs: { level: 3 },
    content: [
      { type: 'text', text: uhrzeit, marks: [{ type: 'bold' }] },
      { type: 'text', text: ' ' },
    ],
  }
}

// Typografie für Editor und Lese-Ansicht, ohne Typography-Plugin.
// Überschriften stehen in der Display-Schrift, deutlich größer, in
// Großbuchstaben und mit Linie darunter, damit sie sich klar von Fettschrift
// abheben. Die Uhrzeit in der Überschrift ist Messing.
export const DOKUMENT = [
  'text-[17px] leading-relaxed',
  '[&_p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
  '[&_h3]:font-display [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:border-b [&_h3]:border-line [&_h3]:pb-1.5 [&_h3]:text-[1.45em] [&_h3]:leading-tight [&_h3]:font-bold [&_h3]:tracking-wide [&_h3]:uppercase [&_h3]:text-bone [&_h3:first-child]:mt-0',
  '[&_h3_strong]:text-brass [&_h3_strong]:tnum [&_h3_strong]:mr-1',
  '[&_strong]:font-semibold',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:list-[circle] [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li>p]:my-0 [&_li::marker]:text-smoke',
].join(' ')
