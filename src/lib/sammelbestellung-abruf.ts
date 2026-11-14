import PocketBase from 'pocketbase'

import type { Rundendaten } from '@/lib/sammelbestellung'
import { sammelbestellung } from '@/lib/sammelbestellung'
import { sammelbestellungPdf } from '@/lib/sammelbestellung-pdf'
import { sammelbestellungXlsx } from '@/lib/sammelbestellung-xlsx'
import { tokenAusCookieHeader } from '@/lib/sitzung'

// Download der Sammelbestellung (Spec #17): wird bei jedem Abruf aus der
// abgeschlossenen Runde erzeugt und nie gespeichert. Gelesen wird mit dem
// Token des Admins aus dem Cookie, nicht mit einem Superuser (ADR 0002).

export const FORMATE = {
  pdf: { typ: 'application/pdf', erzeuge: sammelbestellungPdf },
  xlsx: {
    typ: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    erzeuge: sammelbestellungXlsx,
  },
} as const

export type Format = keyof typeof FORMATE

const REIHENFOLGE = 'sortierung,created'

function fehler(status: number, message: string) {
  return Response.json({ status, message }, { status })
}

// "Winter 2026/27" wird zu "Sammelbestellung-Winter-2026-27.pdf"; der volle
// Name mit Umlauten steht in filename*.
function dateiname(runde: string, format: Format) {
  const name = `Sammelbestellung ${runde}`
  const ascii = name
    .normalize('NFKD')
    .replace(/[^\w -]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
  const voll = name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-')
  return `attachment; filename="${ascii}.${format}"; filename*=UTF-8''${encodeURIComponent(`${voll}.${format}`)}`
}

export async function sammelbestellungAbrufen(
  request: Request,
  pocketbaseUrl: string,
  rundeId: string,
  format: string,
): Promise<Response> {
  if (!(format in FORMATE)) return fehler(404, 'Nicht gefunden.')
  const ziel = FORMATE[format as Format]

  const token = tokenAusCookieHeader(request.headers.get('cookie'))
  if (!token) return fehler(401, 'Bitte melde dich an.')

  const pb = new PocketBase(pocketbaseUrl)
  pb.autoCancellation(false)
  pb.authStore.save(token, null)
  let ich
  try {
    ich = (await pb.collection('mitglieder').authRefresh()).record
  } catch {
    return fehler(401, 'Bitte melde dich an.')
  }
  if (!ich.admin && !ich.support)
    return fehler(403, 'Nur Admins rufen die Sammelbestellung ab.')

  let runde
  try {
    runde = await pb
      .collection('bestellrunden')
      .getOne<{ id: string; name: string; status: string }>(rundeId)
  } catch {
    return fehler(404, 'Die Bestellrunde gibt es nicht.')
  }
  if (runde.status !== 'abgeschlossen')
    return fehler(409, 'Die Bestellrunde ist noch nicht abgeschlossen.')

  const filter = pb.filter
  const [
    club,
    artikel,
    groessen,
    druckstellen,
    motive,
    mitglieder,
    auftraege,
    positionen,
    belegungen,
  ] = await Promise.all([
    pb.send<{ name: string }>('/api/club/clubname', { method: 'GET' }),
    pb
      .collection('artikel')
      .getFullList<Rundendaten['artikel'][number]>({ sort: REIHENFOLGE }),
    pb
      .collection('groessen')
      .getFullList<Rundendaten['groessen'][number]>({ sort: REIHENFOLGE }),
    pb
      .collection('druckstellen')
      .getFullList<Rundendaten['druckstellen'][number]>({ sort: REIHENFOLGE }),
    pb
      .collection('motive')
      .getFullList<Rundendaten['motive'][number]>({ sort: REIHENFOLGE }),
    pb
      .collection('mitglieder')
      .getFullList<Rundendaten['mitglieder'][number]>({ fields: 'id,name' }),
    pb.collection('auftraege').getFullList<Rundendaten['auftraege'][number]>({
      filter: filter('runde = {:runde} && mitbestellt = true', {
        runde: runde.id,
      }),
      fields: 'id,mitglied,mitbestellt,anmerkung',
    }),
    pb.collection('positionen').getFullList<Rundendaten['positionen'][number]>({
      filter: filter('auftrag.runde = {:runde} && auftrag.mitbestellt = true', {
        runde: runde.id,
      }),
      sort: 'created',
      fields: 'id,auftrag,artikel,groesse,anzahl',
    }),
    pb.collection('belegungen').getFullList<Rundendaten['belegungen'][number]>({
      filter: filter(
        'position.auftrag.runde = {:runde} && position.auftrag.mitbestellt = true',
        { runde: runde.id },
      ),
      fields: 'position,druckstelle,motiv,text',
    }),
  ])

  const modell = sammelbestellung({
    clubname: club.name,
    runde: runde.name,
    erstellt: new Date(),
    artikel,
    groessen,
    druckstellen,
    motive,
    mitglieder,
    auftraege,
    positionen,
    belegungen,
  })

  return new Response(await ziel.erzeuge(modell), {
    headers: {
      'content-type': ziel.typ,
      'content-disposition': dateiname(runde.name, format as Format),
      'cache-control': 'no-store',
    },
  })
}
