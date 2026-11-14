import { describe, expect, test } from 'vitest'

import { auftragsStand, uebersichtZeilen } from '@/lib/uebersicht'

const mitglied = (
  id: string,
  felder: Partial<{ name: string; gesperrt: boolean; support: boolean }> = {},
) => ({ id, name: id, gesperrt: false, support: false, ...felder })

const auftrag = (
  mitgliedId: string,
  felder: Partial<{
    status: 'in_arbeit' | 'fertig' | 'verzicht'
    anmerkung: string
    bezahlt: boolean
  }> = {},
) => ({
  id: `a-${mitgliedId}`,
  mitglied: mitgliedId,
  status: 'in_arbeit' as const,
  anmerkung: '',
  bezahlt: false,
  ...felder,
})

describe('Stand eines Auftrags', () => {
  test('ohne Auftrag ist nichts eingetragen', () => {
    expect(auftragsStand(null, 0)).toBe('leer')
  })

  test('ein angelegter, aber leerer Auftrag zählt als nichts eingetragen', () => {
    expect(auftragsStand(auftrag('m'), 0)).toBe('leer')
  })

  test('mit Position oder Anmerkung ist er in Arbeit', () => {
    expect(auftragsStand(auftrag('m'), 1)).toBe('in_arbeit')
    expect(auftragsStand(auftrag('m', { anmerkung: 'Bitte weit' }), 0)).toBe(
      'in_arbeit',
    )
  })

  test('fertig und Verzicht kommen aus dem Status', () => {
    expect(auftragsStand(auftrag('m', { status: 'fertig' }), 2)).toBe('fertig')
    expect(auftragsStand(auftrag('m', { status: 'verzicht' }), 0)).toBe(
      'verzicht',
    )
  })
})

describe('Zeilen der Übersicht', () => {
  test('alle nicht gesperrten Mitglieder, neue als nichts eingetragen', () => {
    const zeilen = uebersichtZeilen(
      [mitglied('b'), mitglied('a')],
      [auftrag('a', { status: 'fertig', bezahlt: true })],
      { 'a-a': 1 },
    )

    expect(zeilen).toEqual([
      expect.objectContaining({
        mitglied: expect.objectContaining({ id: 'a' }),
        stand: 'fertig',
        bezahlt: true,
        ausgetreten: false,
      }),
      expect.objectContaining({
        mitglied: expect.objectContaining({ id: 'b' }),
        auftrag: null,
        stand: 'leer',
        bezahlt: false,
      }),
    ])
  })

  test('gesperrte nur mit Auftrag, dann als ausgetreten', () => {
    const zeilen = uebersichtZeilen(
      [
        mitglied('mit', { gesperrt: true }),
        mitglied('ohne', { gesperrt: true }),
      ],
      [auftrag('mit')],
      {},
    )

    expect(zeilen.map((z) => [z.mitglied.id, z.ausgetreten])).toEqual([
      ['mit', true],
    ])
  })

  test('das Support-Konto taucht nie auf', () => {
    const zeilen = uebersichtZeilen(
      [mitglied('s', { support: true })],
      [auftrag('s')],
      {},
    )

    expect(zeilen).toEqual([])
  })

  test('Anmerkung wird markiert', () => {
    const [zeile] = uebersichtZeilen(
      [mitglied('a')],
      [auftrag('a', { anmerkung: '  ' })],
      {},
    )
    const [mitText] = uebersichtZeilen(
      [mitglied('a')],
      [auftrag('a', { anmerkung: 'Nummer größer' })],
      {},
    )

    expect(zeile.anmerkung).toBe(false)
    expect(mitText.anmerkung).toBe(true)
  })

  test('sortiert nach Name', () => {
    const zeilen = uebersichtZeilen(
      [mitglied('1', { name: 'Zora' }), mitglied('2', { name: 'Anton' })],
      [],
      {},
    )

    expect(zeilen.map((z) => z.mitglied.name)).toEqual(['Anton', 'Zora'])
  })
})
