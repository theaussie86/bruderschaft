import { describe, expect, test } from 'vitest'

import { zahlungshinweis } from '@/lib/zahlungshinweis'

const ABGESCHICKT = {
  auftrag: { status: 'fertig', mitbestellt: false, bezahlt: false },
  rundeOffen: true,
  rundenname: 'Dezember 2026',
  bestelldatum: '2026-12-10 00:00:00.000Z',
  summe: 7800,
  mitglied: 'Christoph Weissteiner',
  bankverbindung: 'Hahna Brothers\nIBAN DE00 1234',
  heute: '2026-11-16',
} as const

describe('Zahlungshinweis', () => {
  test('ein abgeschickter Auftrag bekommt Betrag, Frist, Verwendungszweck und Bankverbindung', () => {
    expect(zahlungshinweis(ABGESCHICKT)).toEqual({
      betrag: '78,00 €',
      frist: '10.12.2026',
      verwendungszweck: 'Christoph Weissteiner, Dezember 2026',
      bankverbindung: 'Hahna Brothers\nIBAN DE00 1234',
    })
  })

  test('am Bestelldatum selbst gilt noch das Datum', () => {
    expect(
      zahlungshinweis({ ...ABGESCHICKT, heute: '2026-12-10' })?.frist,
    ).toBe('10.12.2026')
  })

  test('nach dem Bestelldatum heißt die Frist zeitnah', () => {
    expect(
      zahlungshinweis({ ...ABGESCHICKT, heute: '2026-12-14' })?.frist,
    ).toBe('zeitnah')
  })

  test('nach dem Abschluss bekommt ihn ein mitbestellter Auftrag', () => {
    expect(
      zahlungshinweis({
        ...ABGESCHICKT,
        rundeOffen: false,
        auftrag: { status: 'fertig', mitbestellt: true, bezahlt: false },
      }),
    ).not.toBeNull()
  })

  test.each([
    [
      'in Arbeit',
      { auftrag: { status: 'in_arbeit', mitbestellt: false, bezahlt: false } },
    ],
    [
      'Verzicht',
      { auftrag: { status: 'verzicht', mitbestellt: false, bezahlt: false } },
    ],
    [
      'bezahlt',
      { auftrag: { status: 'fertig', mitbestellt: false, bezahlt: true } },
    ],
    [
      'nach dem Abschluss nicht mitbestellt',
      {
        rundeOffen: false,
        auftrag: { status: 'fertig', mitbestellt: false, bezahlt: false },
      },
    ],
    ['ohne Bankverbindung', { bankverbindung: '  \n ' }],
    ['ohne Betrag', { summe: 0 }],
  ] as const)('kein Zahlungshinweis: %s', (_, abweichung) => {
    expect(zahlungshinweis({ ...ABGESCHICKT, ...abweichung })).toBeNull()
  })
})
