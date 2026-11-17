import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'

import type { Sammelbestellung } from '@/lib/sammelbestellung'
import { NICHT_VERFUEGBAR } from '@/lib/sammelbestellung'

// PDF-Renderer der Sammelbestellung, zum Weiterleiten an den Drucker. A4 hoch
// mit einfachen Tabellen; rechnet nichts selbst, alles steht schon im
// Dokument-Modell.

const A4: [number, number] = [595.28, 841.89]
const RAND = 40
const BREITE = A4[0] - 2 * RAND
const SCHRIFT = 9
const ZEILE = 13
const GRAU = rgb(0.4, 0.4, 0.4)

type Spalte = { titel: string; anteil: number; rechts?: boolean }

class Satz {
  private seite!: PDFPage
  private y = 0

  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private fett: PDFFont,
  ) {
    this.neueSeite()
  }

  private neueSeite() {
    this.seite = this.doc.addPage(A4)
    this.y = A4[1] - RAND
  }

  private platz(hoehe: number) {
    if (this.y - hoehe < RAND) this.neueSeite()
  }

  // Standard-Schriften können nur WinAnsi. Alles andere (z. B. Emojis in
  // einem Textdruck) wird zu "?", statt das Dokument scheitern zu lassen.
  private lesbar(text: string, font: PDFFont) {
    const zeichen = new Set(font.getCharacterSet())
    return [...text.replace(/[\r\n\t]+/g, ' ')]
      .map((c) => (zeichen.has(c.codePointAt(0) ?? 0) ? c : '?'))
      .join('')
  }

  // Kürzt einen Text auf die Breite einer Spalte.
  private passend(text: string, font: PDFFont, groesse: number, max: number) {
    let t = this.lesbar(text, font)
    if (font.widthOfTextAtSize(t, groesse) <= max) return t
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, groesse) > max)
      t = t.slice(0, -1)
    return `${t}…`
  }

  // Bricht einen langen Text (z. B. eine Anmerkung) in Zeilen um.
  private umbrechen(text: string, font: PDFFont, groesse: number, max: number) {
    const zeilen: Array<string> = []
    let aktuell = ''
    for (const wort of this.lesbar(text, font).split(' ')) {
      const probe = aktuell ? `${aktuell} ${wort}` : wort
      if (font.widthOfTextAtSize(probe, groesse) <= max || !aktuell)
        aktuell = probe
      else {
        zeilen.push(aktuell)
        aktuell = wort
      }
    }
    if (aktuell) zeilen.push(aktuell)
    return zeilen.map((z) => this.passend(z, font, groesse, max))
  }

  text(
    text: string,
    { groesse = SCHRIFT, fett = false, grau = false, einzug = 0 } = {},
  ) {
    const font = fett ? this.fett : this.normal
    for (const z of this.umbrechen(text, font, groesse, BREITE - einzug)) {
      this.platz(groesse + 4)
      this.y -= groesse + 4
      this.seite.drawText(z, {
        x: RAND + einzug,
        y: this.y,
        size: groesse,
        font,
        color: grau ? GRAU : undefined,
      })
    }
  }

  abstand(hoehe = ZEILE) {
    this.y -= hoehe
  }

  ueberschrift(text: string) {
    this.platz(4 * ZEILE)
    this.abstand(ZEILE / 2)
    this.text(text, { groesse: 13, fett: true })
    this.abstand(4)
  }

  tabelle(spalten: Array<Spalte>, zeilen: Array<Array<string>>, einzug = 0) {
    const breite = BREITE - einzug
    const summe = spalten.reduce((s, c) => s + c.anteil, 0)
    const breiten = spalten.map((c) => (c.anteil / summe) * breite)

    const zeichne = (werte: Array<string>, font: PDFFont) => {
      this.platz(ZEILE)
      this.y -= ZEILE
      let x = RAND + einzug
      werte.forEach((wert, i) => {
        const max = breiten[i] - 6
        const t = this.passend(wert, font, SCHRIFT, max)
        const w = font.widthOfTextAtSize(t, SCHRIFT)
        this.seite.drawText(t, {
          x: spalten[i].rechts ? x + max - w : x,
          y: this.y,
          size: SCHRIFT,
          font,
        })
        x += breiten[i]
      })
    }

    const kopf = () => {
      zeichne(
        spalten.map((c) => c.titel),
        this.fett,
      )
      this.seite.drawLine({
        start: { x: RAND + einzug, y: this.y - 3 },
        end: { x: RAND + BREITE, y: this.y - 3 },
        thickness: 0.5,
        color: GRAU,
      })
      this.y -= 2
    }

    this.platz(2 * ZEILE)
    kopf()
    for (const werte of zeilen) {
      if (this.y - ZEILE < RAND) {
        this.neueSeite()
        kopf()
      }
      zeichne(werte, this.normal)
    }
  }
}

function hinweis(nichtVerfuegbar: boolean) {
  return nichtVerfuegbar ? NICHT_VERFUEGBAR : ''
}

export async function sammelbestellungPdf(
  modell: Sammelbestellung,
): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Sammelbestellung ${modell.kopf.runde}`)
  doc.setCreator(modell.kopf.clubname)
  const satz = new Satz(
    doc,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
  )
  const { kopf } = modell

  satz.text(kopf.clubname, { grau: true })
  satz.text(`Sammelbestellung ${kopf.runde}`, { groesse: 18, fett: true })
  satz.abstand(4)
  satz.text(
    `Erstellt am ${kopf.erstellt} · ${kopf.auftraege} Aufträge · ${kopf.stuecke} Stücke gesamt`,
  )

  satz.ueberschrift('Summen pro Artikel')
  if (modell.summen.length === 0) satz.text('Keine Positionen.', { grau: true })
  else
    satz.tabelle(
      [
        { titel: 'Artikel', anteil: 3 },
        { titel: 'Art.-Nr.', anteil: 1.5 },
        { titel: 'Größe', anteil: 1.2 },
        { titel: 'Belegung', anteil: 5 },
        { titel: 'Anzahl', anteil: 1, rechts: true },
        { titel: 'Hinweis', anteil: 2.2 },
      ],
      modell.summen.map((z) => [
        z.artikel,
        z.artikelnummer,
        z.groesse,
        z.belegung,
        String(z.anzahl),
        hinweis(z.nichtVerfuegbar),
      ]),
    )

  satz.ueberschrift('Drucke pro Motiv')
  if (modell.motive.length === 0) satz.text('Keine Motive.', { grau: true })
  else
    satz.tabelle(
      [
        { titel: 'Nr.', anteil: 1.2 },
        { titel: 'Motiv', anteil: 6 },
        { titel: 'Drucke', anteil: 1, rechts: true },
        { titel: '', anteil: 5.8 },
      ],
      modell.motive.map((m) => [m.nummer, m.motiv, String(m.drucke), '']),
    )

  satz.ueberschrift('Textdrucke')
  if (modell.textdrucke.length === 0)
    satz.text('Keine Textdrucke.', { grau: true })
  else
    satz.tabelle(
      [
        { titel: 'Artikel', anteil: 3 },
        { titel: 'Größe', anteil: 1.2 },
        { titel: 'Druckstelle', anteil: 2 },
        { titel: 'Text', anteil: 3 },
        { titel: 'Anzahl', anteil: 1, rechts: true },
        { titel: 'Mitglied', anteil: 2.6 },
        { titel: 'Hinweis', anteil: 2.2 },
      ],
      modell.textdrucke.map((t) => [
        t.artikel,
        t.groesse,
        t.druckstelle,
        t.text,
        String(t.anzahl),
        t.mitglied,
        hinweis(t.nichtVerfuegbar),
      ]),
    )

  satz.ueberschrift('Liste pro Mitglied')
  if (modell.mitglieder.length === 0)
    satz.text('Keine Aufträge.', { grau: true })
  for (const m of modell.mitglieder) {
    satz.abstand(4)
    satz.text(m.name, { groesse: 10, fett: true })
    satz.tabelle(
      [
        { titel: 'Artikel', anteil: 3 },
        { titel: 'Art.-Nr.', anteil: 1.5 },
        { titel: 'Größe', anteil: 1.2 },
        { titel: 'Belegung', anteil: 5 },
        { titel: 'Anzahl', anteil: 1, rechts: true },
        { titel: 'Hinweis', anteil: 2.2 },
      ],
      m.positionen.map((p) => [
        p.artikel,
        p.artikelnummer,
        p.groesse,
        p.belegung,
        String(p.anzahl),
        hinweis(p.nichtVerfuegbar),
      ]),
      10,
    )
    if (m.anmerkung) satz.text(`Anmerkung: ${m.anmerkung}`, { einzug: 10 })
  }

  return new Uint8Array(await doc.save())
}
