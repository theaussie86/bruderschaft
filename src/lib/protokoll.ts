import type { Termin } from '@/lib/termine'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Das Protokoll eines Stammtischs (Spec #17): eine oder mehrere Dateien am
// Termin, PDF oder Foto, ohne Aufbereitung. Nur Admins laden hoch und löschen.

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
