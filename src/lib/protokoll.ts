import type { Termin } from '@/lib/termine'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { berlinTag, berlinZeit } from '@/lib/termine'
// Das Protokoll eines Stammtischs (Spec #17, #62): ein Text, den ein Admin in
// der App schreibt, dazu eine oder mehrere Dateien am Termin, PDF oder Foto,
// ohne Aufbereitung. Nur Admins schreiben, laden hoch und löschen.

// Der geschriebene Protokolltext (Spec #62) ist ein Tiptap/ProseMirror-
// Dokument als JSON, kein HTML. Gelesen wird er über einen schreibgeschützten
// Renderer mit demselben Schema.
export type ProtokollKnoten = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  content?: Array<ProtokollKnoten>
}

// Ein Dokument ohne sichtbaren Text gilt als kein Protokolltext.
export function protokollTextLeer(text: unknown): boolean {
  if (!text || typeof text !== 'object') return true
  const knoten = text as ProtokollKnoten
  if (typeof knoten.text === 'string' && knoten.text.trim() !== '') return false
  return (knoten.content ?? []).every(protokollTextLeer)
}

// "zuletzt gespeichert am 21.11.2026 um 20:41 Uhr", in deutscher Zeit.
export function zuletztGespeichert(wert: string) {
  const [jahr, monat, tag] = berlinTag(wert).split('-')
  return `zuletzt gespeichert am ${tag}.${monat}.${jahr} um ${berlinZeit(wert)} Uhr`
}

export async function protokollTextSpeichern(
  terminId: string,
  protokolltext: ProtokollKnoten,
) {
  return createBrowserPocketBase()
    .collection('termine')
    .update<Termin>(terminId, { protokolltext })
}

// Dateien laufen über den Proxy, der den File-Token ergänzt (ADR 0003).
export function protokollPfad(terminId: string, datei: string) {
  return `/pb/api/files/termine/${terminId}/${encodeURIComponent(datei)}`
}

// PocketBase hängt an jeden Dateinamen eine Zufallsfolge. Gezeigt werden
// deshalb Nummer und Dateityp.
export function protokollBezeichnung(datei: string, index: number) {
  const endung = /\.([a-z0-9]+)$/i.exec(datei)?.[1]?.toLowerCase()
  const art = endung === 'pdf' ? 'PDF' : 'Foto'
  return `Datei ${index + 1} · ${art}`
}

export async function protokollHochladen(
  terminId: string,
  dateien: Array<File>,
) {
  const form = new FormData()
  for (const d of dateien) form.append('protokoll+', d)
  return createBrowserPocketBase()
    .collection('termine')
    .update<Termin>(terminId, form)
}

export async function protokollDateiLoeschen(terminId: string, datei: string) {
  return createBrowserPocketBase()
    .collection('termine')
    .update<Termin>(terminId, { 'protokoll-': [datei] })
}
