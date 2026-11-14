import { useState } from 'react'

import type { Auftrag } from '@/lib/bestellung'
import { Button } from '@/components/Button'
import { centAlsEingabe, korrekturAus } from '@/lib/geld'

// Nur für Admins: bezahlt und Korrektur (Betrag plus oder minus mit
// Begründung). Die Korrektur ändert die Summe, nicht die Preise. Bezahlt gibt
// es nur für Aufträge, die bezahlt werden: abgeschickte und mitbestellte.
export function AdminFelder({
  auftrag,
  disabled,
  onSpeichern,
}: {
  auftrag: Auftrag | null
  disabled: boolean
  onSpeichern: (
    felder: Partial<
      Pick<Auftrag, 'bezahlt' | 'korrektur_betrag' | 'korrektur_grund'>
    >,
  ) => Promise<void>
}) {
  const vorhanden = auftrag?.korrektur_betrag ?? 0
  const [betrag, setBetrag] = useState(
    vorhanden
      ? `${vorhanden < 0 ? '-' : ''}${centAlsEingabe(Math.abs(vorhanden))}`
      : '',
  )
  const [grund, setGrund] = useState(auftrag?.korrektur_grund ?? '')
  const cent = korrekturAus(betrag)
  const gueltig = cent !== null && cent !== 0 && grund.trim() !== ''
  const bezahlt = auftrag?.bezahlt ?? false

  return (
    <div className="border-line mt-6 space-y-3 rounded-2xl border border-dashed p-4">
      <div className="eyebrow">Nur für Admins</div>
      {(auftrag?.status === 'fertig' || auftrag?.mitbestellt) && (
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span>
            <span className="block font-semibold">Bezahlt</span>
            <span className="text-ash block text-[13px]">
              Summe ist auf dem Clubkonto eingegangen
            </span>
          </span>
          <input
            type="checkbox"
            className="accent-patina size-6"
            checked={bezahlt}
            disabled={disabled}
            onChange={(e) => void onSpeichern({ bezahlt: e.target.checked })}
          />
        </label>
      )}
      <form
        className="border-line/60 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (gueltig)
            void onSpeichern({
              korrektur_betrag: cent,
              korrektur_grund: grund.trim(),
            })
        }}
      >
        <div className="mb-2 font-semibold">Korrektur</div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <input
            className="field tnum"
            inputMode="decimal"
            placeholder="-5,00"
            aria-label="Betrag"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
          />
          <input
            className="field"
            placeholder="Begründung, z. B. Porto"
            aria-label="Begründung"
            maxLength={200}
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
          />
        </div>
        <p className="text-ash mt-1.5 text-[13px]">
          Plus schlägt auf, Minus zieht ab. Ändert die Summe, nicht die Preise.
        </p>
        {cent === null && (
          <p className="text-rust-hi mt-1 text-[13px]">
            Bitte einen Betrag wie -5,00 oder 4,50 eingeben.
          </p>
        )}
        <div className="mt-3 flex gap-3">
          <Button type="submit" disabled={disabled || !gueltig}>
            Korrektur speichern
          </Button>
          {!!vorhanden && (
            <button
              type="button"
              className="text-ash hover:text-bone px-3 font-semibold"
              disabled={disabled}
              onClick={() => void onSpeichern({ korrektur_betrag: 0 })}
            >
              Entfernen
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
