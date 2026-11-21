import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Bilder zu jedem Termin (Spec #17, Issue #60). Vor dem Upload kodiert der Browser
// jedes Bild neu als JPEG mit höchstens 2000 px an der längsten Kante. Das
// wandelt HEIC und wirft EXIF samt GPS-Standort weg, weil das Canvas nur die
// Pixel kennt.
export type Bild = {
  id: string
  collectionId: string
  termin: string
  mitglied: string
  datei: string
  expand?: { mitglied?: { name: string } }
}

const LAENGSTE_KANTE = 2000
const QUALITAET = 0.85

export function zielGroesse(breite: number, hoehe: number) {
  const faktor = Math.min(1, LAENGSTE_KANTE / Math.max(breite, hoehe))
  return {
    breite: Math.round(breite * faktor),
    hoehe: Math.round(hoehe * faktor),
  }
}

export async function bildVerkleinern(datei: File): Promise<Blob> {
  // createImageBitmap dreht das Bild nach der EXIF-Ausrichtung, bevor die
  // EXIF-Daten mit dem Neukodieren wegfallen.
  const bitmap = await createImageBitmap(datei, {
    imageOrientation: 'from-image',
  })
  try {
    const { breite, hoehe } = zielGroesse(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = breite
    canvas.height = hoehe
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.')
    ctx.drawImage(bitmap, 0, 0, breite, hoehe)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Das Bild konnte nicht verarbeitet werden.')),
        'image/jpeg',
        QUALITAET,
      ),
    )
  } finally {
    bitmap.close()
  }
}

// Dateien laufen über den Proxy, der den File-Token ergänzt (ADR 0003).
export function bildPfad(b: Bild, thumb?: '400x400') {
  const pfad = `/pb/api/files/${b.collectionId}/${b.id}/${encodeURIComponent(b.datei)}`
  return thumb ? `${pfad}?thumb=${thumb}` : pfad
}

// Den Namen unter einem Bild liefert PocketBase nur Admins mit, weil
// Mitglieder keine anderen Mitglieder lesen.
export async function ladeBilder(terminId: string): Promise<Array<Bild>> {
  const pb = createBrowserPocketBase()
  return pb.collection('bilder').getFullList<Bild>({
    filter: pb.filter('termin = {:terminId}', { terminId }),
    sort: 'created,id',
    expand: 'mitglied',
    fields: 'id,collectionId,termin,mitglied,datei,expand.mitglied.name',
  })
}

// Zahl der Bilder pro Termin, für die Liste im Archiv.
export async function zaehleBilder(): Promise<Map<string, number>> {
  const pb = createBrowserPocketBase()
  const bilder = await pb
    .collection('bilder')
    .getFullList<{ termin: string }>({ fields: 'termin' })
  const anzahl = new Map<string, number>()
  for (const b of bilder) anzahl.set(b.termin, (anzahl.get(b.termin) ?? 0) + 1)
  return anzahl
}

export async function bildHochladen(
  terminId: string,
  mitgliedId: string,
  datei: File,
) {
  const verkleinert = await bildVerkleinern(datei)
  const form = new FormData()
  form.set('termin', terminId)
  form.set('mitglied', mitgliedId)
  form.set('datei', verkleinert, 'bild.jpg')
  return createBrowserPocketBase().collection('bilder').create<Bild>(form)
}

export async function bildLoeschen(id: string) {
  await createBrowserPocketBase().collection('bilder').delete(id)
}
