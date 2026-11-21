import { describe, expect, test } from 'vitest'

import type { ProtokollKnoten } from '@/lib/protokoll'
import { SPEICHERUNGEN } from '@/lib/cookie-hinweis'
import {
  ENTWURF_PRAEFIX,
  entwurfAnbieten,
  entwurfEntfernen,
  entwurfLesen,
  entwurfSichern,
  speicherStatus,
  speichernMitEntwurf,
} from '@/lib/protokoll-entwurf'

// Der Browser-Speicher als einfache Map, so wie localStorage ihn anbietet.
function speicher(start: Record<string, string> = {}) {
  const werte = new Map(Object.entries(start))
  return {
    getItem: (k: string) => werte.get(k) ?? null,
    setItem: (k: string, v: string) => void werte.set(k, v),
    removeItem: (k: string) => void werte.delete(k),
  }
}

function dok(...absaetze: Array<string>): ProtokollKnoten {
  return {
    type: 'doc',
    content: absaetze.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  }
}

describe('Entwurf auf dem Gerät', () => {
  test('bleibt pro Termin erhalten', () => {
    const s = speicher()

    entwurfSichern(s, 'termin1', dok('14 da.'))
    entwurfSichern(s, 'termin2', dok('Kasse ok'))

    expect(entwurfLesen(s, 'termin1')).toEqual(dok('14 da.'))
    expect(entwurfLesen(s, 'termin2')).toEqual(dok('Kasse ok'))
  })

  test('ist nach dem Entfernen weg, andere Termine bleiben', () => {
    const s = speicher()
    entwurfSichern(s, 'termin1', dok('14 da.'))
    entwurfSichern(s, 'termin2', dok('Kasse ok'))

    entwurfEntfernen(s, 'termin1')

    expect(entwurfLesen(s, 'termin1')).toBeNull()
    expect(entwurfLesen(s, 'termin2')).toEqual(dok('Kasse ok'))
  })

  test('gesperrter oder kaputter Speicher stört das Schreiben nicht', () => {
    const gesperrt = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }

    expect(() => entwurfSichern(gesperrt, 'termin1', dok('x'))).not.toThrow()
    expect(entwurfLesen(gesperrt, 'termin1')).toBeNull()
    expect(() => entwurfEntfernen(gesperrt, 'termin1')).not.toThrow()
    expect(
      entwurfLesen(
        speicher({ 'protokoll-entwurf:termin1': '{kaputt' }),
        'termin1',
      ),
    ).toBeNull()
  })
})

describe('Hinweis auf den Entwurf', () => {
  test('die Cookie-Seite und die Datenschutzerklärung nennen ihn', () => {
    const eintrag = SPEICHERUNGEN.find((s) =>
      s.name.startsWith(ENTWURF_PRAEFIX),
    )

    expect(eintrag?.art).toBe('localStorage')
  })
})

describe('Speichern mit Entwurf', () => {
  test('entfernt nach erfolgreichem Speichern den Entwurf', async () => {
    const s = speicher()
    entwurfSichern(s, 'termin1', dok('14 da.'))

    const ergebnis = await speichernMitEntwurf({
      speicher: s,
      terminId: 'termin1',
      dokument: dok('14 da.'),
      aktuell: () => dok('14 da.'),
      senden: (d) => Promise.resolve({ id: 'termin1', protokolltext: d }),
    })

    expect(ergebnis).toEqual({
      ok: true,
      termin: { id: 'termin1', protokolltext: dok('14 da.') },
    })
    expect(entwurfLesen(s, 'termin1')).toBeNull()
  })

  test('behält den Entwurf, wenn während des Speicherns weitergeschrieben wurde', async () => {
    const s = speicher()

    await speichernMitEntwurf({
      speicher: s,
      terminId: 'termin1',
      dokument: dok('14 da.'),
      aktuell: () => dok('14 da.', 'Kasse ok'),
      senden: (d) => Promise.resolve({ id: 'termin1', protokolltext: d }),
    })

    expect(entwurfLesen(s, 'termin1')).toEqual(dok('14 da.', 'Kasse ok'))
  })

  test('ohne Netz: verständliche Meldung, der Entwurf bleibt', async () => {
    const s = speicher()

    const ergebnis = await speichernMitEntwurf({
      speicher: s,
      terminId: 'termin1',
      dokument: dok('14 da.'),
      aktuell: () => dok('14 da.'),
      // So meldet das PocketBase-SDK einen Abbruch ohne Antwort.
      senden: () =>
        Promise.reject(
          Object.assign(new Error('Failed to fetch'), {
            status: 0,
            response: {},
          }),
        ),
    })

    expect(ergebnis).toEqual({
      ok: false,
      fehler:
        'Keine Verbindung. Dein Text ist auf diesem Gerät gesichert. Versuch es gleich noch einmal.',
    })
    expect(entwurfLesen(s, 'termin1')).toEqual(dok('14 da.'))
  })

  test('lehnt der Server ab, steht seine Meldung da und der Entwurf bleibt', async () => {
    const s = speicher()

    const ergebnis = await speichernMitEntwurf({
      speicher: s,
      terminId: 'termin1',
      dokument: dok('14 da.'),
      aktuell: () => dok('14 da.'),
      senden: () =>
        Promise.reject(
          Object.assign(new Error('Forbidden'), {
            status: 403,
            response: { message: 'Nur Admins dürfen das.' },
          }),
        ),
    })

    expect(ergebnis).toEqual({ ok: false, fehler: 'Nur Admins dürfen das.' })
    expect(entwurfLesen(s, 'termin1')).toEqual(dok('14 da.'))
  })
})

describe('Status im Kopf des Vollbilds', () => {
  test('"Nicht gespeichert", sobald der Text vom gespeicherten Stand abweicht', () => {
    expect(
      speicherStatus(
        dok('14 da.', 'Kasse ok'),
        dok('14 da.'),
        '2026-11-20 19:41:00.000Z',
      ),
    ).toEqual({ ungespeichert: true, text: 'Nicht gespeichert' })
  })

  test('"Gespeichert um HH:MM" in deutscher Zeit, solange nichts geändert ist', () => {
    expect(
      speicherStatus(dok('14 da.'), dok('14 da.'), '2026-11-20 19:41:00.000Z'),
    ).toEqual({ ungespeichert: false, text: 'Gespeichert um 20:41' })
  })

  test('ohne Text und ohne Speicherung steht nichts da', () => {
    expect(speicherStatus({ type: 'doc' }, null, undefined)).toEqual({
      ungespeichert: false,
      text: null,
    })
  })
})

describe('Entwurf beim Öffnen anbieten', () => {
  test('nicht, wenn es keinen Entwurf gibt', () => {
    expect(entwurfAnbieten(null, dok('14 da.'))).toBe(false)
  })

  test('nicht, wenn er dem gespeicherten Stand entspricht', () => {
    // PocketBase kann die Schlüssel im JSON anders ordnen als der Editor.
    const gespeichert = {
      content: [
        { content: [{ text: '14 da.', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    }

    expect(entwurfAnbieten(dok('14 da.'), gespeichert)).toBe(false)
  })

  test('nicht, wenn Entwurf und gespeicherter Stand beide leer sind', () => {
    expect(
      entwurfAnbieten({ type: 'doc', content: [{ type: 'paragraph' }] }, null),
    ).toBe(false)
  })

  test('wenn er vom gespeicherten Stand abweicht', () => {
    expect(entwurfAnbieten(dok('14 da.', 'Kasse ok'), dok('14 da.'))).toBe(true)
    expect(entwurfAnbieten(dok('14 da.'), null)).toBe(true)
  })
})
