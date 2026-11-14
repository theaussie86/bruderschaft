import { describe, expect, test } from 'vitest'

import type { Rundendaten } from '@/lib/sammelbestellung'
import { sammelbestellung } from '@/lib/sammelbestellung'

// Ein kleines Sortiment: Hoodie (vorne Motiv, hinten Text) vor Mütze (ohne
// Druckstellen). Die Admin-Reihenfolge steht in `sortierung`, nicht in der
// Reihenfolge der Listen.
function daten(felder: Partial<Rundendaten> = {}): Rundendaten {
  return {
    clubname: 'Testclub',
    runde: 'Winter 2026',
    erstellt: new Date('2026-11-14T10:00:00Z'),
    artikel: [
      {
        id: 'muetze',
        name: 'Mütze',
        artikelnummer: '',
        sortierung: 1,
        ausgeblendet: false,
      },
      {
        id: 'hoodie',
        name: 'Hoodie',
        artikelnummer: 'H-100',
        sortierung: 0,
        ausgeblendet: false,
      },
    ],
    groessen: [
      {
        id: 'xl',
        artikel: 'hoodie',
        name: 'XL',
        sortierung: 1,
        ausgeblendet: false,
      },
      {
        id: 'm',
        artikel: 'hoodie',
        name: 'M',
        sortierung: 0,
        ausgeblendet: false,
      },
      {
        id: 'one',
        artikel: 'muetze',
        name: 'One Size',
        sortierung: 0,
        ausgeblendet: false,
      },
    ],
    druckstellen: [
      {
        id: 'hinten',
        artikel: 'hoodie',
        name: 'hinten',
        art: 'text',
        sortierung: 1,
        ausgeblendet: false,
      },
      {
        id: 'vorne',
        artikel: 'hoodie',
        name: 'vorne',
        art: 'motiv',
        sortierung: 0,
        ausgeblendet: false,
      },
    ],
    motive: [
      { id: 'adler', name: 'Adler', sortierung: 1, ausgeblendet: false },
      { id: 'logo', name: 'Logo', sortierung: 0, ausgeblendet: false },
    ],
    mitglieder: [
      { id: 'bert', name: 'Bert' },
      { id: 'anna', name: 'Anna' },
      { id: 'carl', name: 'Carl' },
    ],
    auftraege: [
      { id: 'a-bert', mitglied: 'bert', mitbestellt: true, anmerkung: '' },
      {
        id: 'a-anna',
        mitglied: 'anna',
        mitbestellt: true,
        anmerkung: '  Bitte weit  ',
      },
      {
        id: 'a-carl',
        mitglied: 'carl',
        mitbestellt: false,
        anmerkung: 'zu spät',
      },
    ],
    positionen: [
      {
        id: 'p1',
        auftrag: 'a-bert',
        artikel: 'hoodie',
        groesse: 'xl',
        anzahl: 2,
      },
      {
        id: 'p2',
        auftrag: 'a-anna',
        artikel: 'muetze',
        groesse: 'one',
        anzahl: 1,
      },
      {
        id: 'p3',
        auftrag: 'a-anna',
        artikel: 'hoodie',
        groesse: 'xl',
        anzahl: 1,
      },
      {
        id: 'p4',
        auftrag: 'a-anna',
        artikel: 'hoodie',
        groesse: 'm',
        anzahl: 1,
      },
      {
        id: 'p5',
        auftrag: 'a-carl',
        artikel: 'hoodie',
        groesse: 'm',
        anzahl: 5,
      },
    ],
    belegungen: [
      { position: 'p1', druckstelle: 'vorne', motiv: 'logo', text: '' },
      { position: 'p1', druckstelle: 'hinten', motiv: '', text: 'Bertl' },
      { position: 'p3', druckstelle: 'vorne', motiv: 'logo', text: '' },
      { position: 'p3', druckstelle: 'hinten', motiv: '', text: 'Anni' },
      { position: 'p4', druckstelle: 'vorne', motiv: 'adler', text: '' },
      { position: 'p5', druckstelle: 'vorne', motiv: 'adler', text: '' },
    ],
    ...felder,
  }
}

describe('Dokument-Modell der Sammelbestellung', () => {
  test('Kopf mit Clubname, Runde, Datum, Aufträgen und Stücken', () => {
    expect(sammelbestellung(daten()).kopf).toEqual({
      clubname: 'Testclub',
      runde: 'Winter 2026',
      erstellt: '14.11.2026',
      auftraege: 2,
      stuecke: 5,
    })
  })

  test('nur mitbestellte Aufträge zählen', () => {
    const modell = sammelbestellung(daten())
    expect(modell.mitglieder.map((m) => m.name)).toEqual(['Anna', 'Bert'])
    expect(JSON.stringify(modell)).not.toContain('zu spät')
    expect(modell.summen.reduce((s, z) => s + z.anzahl, 0)).toBe(5)
  })

  test('Summen pro Artikel × Größe × Belegung in Admin-Reihenfolge, Text nur als "Text"', () => {
    expect(sammelbestellung(daten()).summen).toEqual([
      {
        artikel: 'Hoodie',
        artikelnummer: 'H-100',
        groesse: 'M',
        belegung: 'vorne: Adler',
        anzahl: 1,
        nichtVerfuegbar: false,
      },
      {
        artikel: 'Hoodie',
        artikelnummer: 'H-100',
        groesse: 'XL',
        belegung: 'vorne: Logo · hinten: Text',
        anzahl: 3,
        nichtVerfuegbar: false,
      },
      {
        artikel: 'Mütze',
        artikelnummer: '',
        groesse: 'One Size',
        belegung: 'ohne Druck',
        anzahl: 1,
        nichtVerfuegbar: false,
      },
    ])
  })

  test('verschiedene Motive an derselben Druckstelle sind eigene Zeilen, nach Motiv-Reihenfolge', () => {
    const d = daten()
    d.belegungen = d.belegungen.map((b) =>
      b.position === 'p4' ? { ...b, motiv: 'adler' } : b,
    )
    d.positionen.push({
      id: 'p6',
      auftrag: 'a-bert',
      artikel: 'hoodie',
      groesse: 'm',
      anzahl: 4,
    })
    d.belegungen.push({
      position: 'p6',
      druckstelle: 'vorne',
      motiv: 'logo',
      text: '',
    })
    const m = sammelbestellung(d).summen.filter((z) => z.groesse === 'M')
    expect(m.map((z) => [z.belegung, z.anzahl])).toEqual([
      ['vorne: Logo', 4],
      ['vorne: Adler', 1],
    ])
  })

  test('Drucke pro Motiv über alle Artikel, mit Anzahl', () => {
    expect(sammelbestellung(daten()).motive).toEqual([
      { motiv: 'Logo', drucke: 3 },
      { motiv: 'Adler', drucke: 1 },
    ])
  })

  test('Textdrucke einzeln mit Artikel, Größe, Druckstelle, Text und Mitglied', () => {
    expect(sammelbestellung(daten()).textdrucke).toEqual([
      {
        artikel: 'Hoodie',
        groesse: 'XL',
        druckstelle: 'hinten',
        text: 'Anni',
        mitglied: 'Anna',
        anzahl: 1,
        nichtVerfuegbar: false,
      },
      {
        artikel: 'Hoodie',
        groesse: 'XL',
        druckstelle: 'hinten',
        text: 'Bertl',
        mitglied: 'Bert',
        anzahl: 2,
        nichtVerfuegbar: false,
      },
    ])
  })

  test('Liste pro Mitglied nach Name, Positionen in Admin-Reihenfolge, mit Anmerkung', () => {
    expect(sammelbestellung(daten()).mitglieder).toEqual([
      {
        name: 'Anna',
        anmerkung: 'Bitte weit',
        positionen: [
          {
            artikel: 'Hoodie',
            artikelnummer: 'H-100',
            groesse: 'M',
            belegung: 'vorne: Adler',
            anzahl: 1,
            nichtVerfuegbar: false,
          },
          {
            artikel: 'Hoodie',
            artikelnummer: 'H-100',
            groesse: 'XL',
            belegung: 'vorne: Logo · hinten: „Anni“',
            anzahl: 1,
            nichtVerfuegbar: false,
          },
          {
            artikel: 'Mütze',
            artikelnummer: '',
            groesse: 'One Size',
            belegung: 'ohne Druck',
            anzahl: 1,
            nichtVerfuegbar: false,
          },
        ],
      },
      {
        name: 'Bert',
        anmerkung: '',
        positionen: [
          {
            artikel: 'Hoodie',
            artikelnummer: 'H-100',
            groesse: 'XL',
            belegung: 'vorne: Logo · hinten: „Bertl“',
            anzahl: 2,
            nichtVerfuegbar: false,
          },
        ],
      },
    ])
  })

  test('Namen mit Umlauten sortieren deutsch', () => {
    const d = daten()
    d.mitglieder = [
      { id: 'bert', name: 'Zoe' },
      { id: 'anna', name: 'Ömer' },
    ]
    expect(sammelbestellung(d).mitglieder.map((m) => m.name)).toEqual([
      'Ömer',
      'Zoe',
    ])
  })

  test('Ausgeblendetes markiert die betroffenen Positionen als nicht verfügbar', () => {
    const d = daten()
    d.motive = d.motive.map((m) =>
      m.id === 'adler' ? { ...m, ausgeblendet: true } : m,
    )
    const modell = sammelbestellung(d)
    expect(
      modell.summen.map((z) => [z.groesse, z.belegung, z.nichtVerfuegbar]),
    ).toEqual([
      ['M', 'vorne: Adler', true],
      ['XL', 'vorne: Logo · hinten: Text', false],
      ['One Size', 'ohne Druck', false],
    ])
    expect(
      modell.mitglieder[0].positionen.map((p) => p.nichtVerfuegbar),
    ).toEqual([true, false, false])
  })

  test('ausgeblendeter Artikel und ausgeblendete Druckstelle markieren ihre Positionen und Textdrucke', () => {
    const d = daten()
    d.artikel = d.artikel.map((a) =>
      a.id === 'muetze' ? { ...a, ausgeblendet: true } : a,
    )
    d.druckstellen = d.druckstellen.map((x) =>
      x.id === 'hinten' ? { ...x, ausgeblendet: true } : x,
    )
    const modell = sammelbestellung(d)
    expect(modell.summen.map((z) => [z.groesse, z.nichtVerfuegbar])).toEqual([
      ['M', false],
      ['XL', true],
      ['One Size', true],
    ])
    expect(modell.textdrucke.length).toBeGreaterThan(0)
    expect(modell.textdrucke.every((t) => t.nichtVerfuegbar)).toBe(true)
  })

  test('ohne mitbestellte Aufträge bleibt das Dokument leer', () => {
    const d = daten()
    d.auftraege = d.auftraege.map((a) => ({ ...a, mitbestellt: false }))
    const modell = sammelbestellung(d)
    expect(modell.kopf.auftraege).toBe(0)
    expect(modell.kopf.stuecke).toBe(0)
    expect(modell.summen).toEqual([])
    expect(modell.motive).toEqual([])
    expect(modell.textdrucke).toEqual([])
    expect(modell.mitglieder).toEqual([])
  })
})
