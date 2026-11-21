import StarterKit from '@tiptap/starter-kit'

// Das Schema des Protokolltexts, gemeinsam für den Editor und die
// Lese-Ansicht. Vorerst nur Absätze; alles andere aus dem StarterKit ist
// abgeschaltet, damit nichts außerhalb des Schemas im Dokument landet.
export const PROTOKOLL_SCHEMA = [
  StarterKit.configure({
    blockquote: false,
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    hardBreak: false,
    heading: false,
    horizontalRule: false,
    italic: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
    underline: false,
  }),
]

// Typografie für Editor und Lese-Ansicht, ohne Typography-Plugin.
export const DOKUMENT =
  'text-[17px] leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0'
