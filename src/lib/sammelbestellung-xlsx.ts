import ExcelJS from 'exceljs'

import type { Sammelbestellung } from '@/lib/sammelbestellung'
import { NICHT_VERFUEGBAR } from '@/lib/sammelbestellung'

// Excel-Renderer der Sammelbestellung: ein Blatt pro Abschnitt, damit der
// Admin vor dem Versand nachbearbeiten kann. Rechnet nichts selbst, alles
// steht schon im Dokument-Modell.

function hinweis(nichtVerfuegbar: boolean) {
  return nichtVerfuegbar ? NICHT_VERFUEGBAR : ''
}

// Leere Texte bleiben leere Zellen.
function zeile(werte: Array<string | number>) {
  return werte.map((w) => (w === '' ? null : w))
}

function blatt(
  mappe: ExcelJS.Workbook,
  name: string,
  spalten: Array<{ header: string; width: number }>,
) {
  const ws = mappe.addWorksheet(name)
  ws.columns = spalten
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

export async function sammelbestellungXlsx(
  modell: Sammelbestellung,
): Promise<Uint8Array<ArrayBuffer>> {
  const mappe = new ExcelJS.Workbook()
  mappe.creator = modell.kopf.clubname
  mappe.title = `Sammelbestellung ${modell.kopf.runde}`

  const kopf = mappe.addWorksheet('Kopf')
  kopf.columns = [{ width: 20 }, { width: 40 }]
  kopf.addRows([
    ['Club', modell.kopf.clubname],
    ['Bestellrunde', modell.kopf.runde],
    ['Erstellt am', modell.kopf.erstellt],
    ['Aufträge', modell.kopf.auftraege],
    ['Stücke gesamt', modell.kopf.stuecke],
  ])
  kopf.getColumn(1).font = { bold: true }

  const summen = blatt(mappe, 'Summen', [
    { header: 'Artikel', width: 24 },
    { header: 'Artikelnummer', width: 16 },
    { header: 'Größe', width: 12 },
    { header: 'Belegung', width: 40 },
    { header: 'Anzahl', width: 10 },
    { header: 'Hinweis', width: 22 },
  ])
  for (const z of modell.summen)
    summen.addRow(
      zeile([
        z.artikel,
        z.artikelnummer,
        z.groesse,
        z.belegung,
        z.anzahl,
        hinweis(z.nichtVerfuegbar),
      ]),
    )

  const motive = blatt(mappe, 'Motive', [
    { header: 'Motiv', width: 30 },
    { header: 'Drucke', width: 10 },
  ])
  for (const m of modell.motive) motive.addRow([m.motiv, m.drucke])

  const texte = blatt(mappe, 'Textdrucke', [
    { header: 'Artikel', width: 24 },
    { header: 'Größe', width: 12 },
    { header: 'Druckstelle', width: 18 },
    { header: 'Text', width: 24 },
    { header: 'Anzahl', width: 10 },
    { header: 'Mitglied', width: 24 },
    { header: 'Hinweis', width: 22 },
  ])
  for (const t of modell.textdrucke)
    texte.addRow(
      zeile([
        t.artikel,
        t.groesse,
        t.druckstelle,
        t.text,
        t.anzahl,
        t.mitglied,
        hinweis(t.nichtVerfuegbar),
      ]),
    )

  const mitglieder = blatt(mappe, 'Mitglieder', [
    { header: 'Mitglied', width: 24 },
    { header: 'Artikel', width: 24 },
    { header: 'Artikelnummer', width: 16 },
    { header: 'Größe', width: 12 },
    { header: 'Belegung', width: 40 },
    { header: 'Anzahl', width: 10 },
    { header: 'Hinweis', width: 22 },
    { header: 'Anmerkung', width: 40 },
  ])
  for (const m of modell.mitglieder)
    m.positionen.forEach((p, i) =>
      mitglieder.addRow(
        zeile([
          m.name,
          p.artikel,
          p.artikelnummer,
          p.groesse,
          p.belegung,
          p.anzahl,
          hinweis(p.nichtVerfuegbar),
          i === 0 ? m.anmerkung : '',
        ]),
      ),
    )

  return new Uint8Array(await mappe.xlsx.writeBuffer())
}
