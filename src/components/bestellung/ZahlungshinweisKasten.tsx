import { Coins } from 'lucide-react'

import type { Zahlungshinweis } from '@/lib/zahlungshinweis'

// Der Zahlungshinweis unter dem eigenen Auftrag: Betrag, Frist,
// Verwendungszweck und Bankverbindung der Bruderschaft.
export function ZahlungshinweisKasten({
  hinweis,
}: {
  hinweis: Zahlungshinweis
}) {
  return (
    <div className="border-brass/25 bg-brass/[0.06] mt-4 rounded-2xl border p-4">
      <div className="eyebrow mb-1.5 flex items-center gap-2">
        <Coins className="size-4" /> Zahlungshinweis
      </div>
      <p className="text-bone/90 text-[15px] leading-relaxed">
        Bitte überweise <strong className="tnum">{hinweis.betrag}</strong>{' '}
        {hinweis.frist === null ? (
          'zeitnah'
        ) : (
          <>
            bis <strong className="tnum">{hinweis.frist}</strong>
          </>
        )}
        .
      </p>
      <dl className="mt-3 space-y-2 text-[15px]">
        <div>
          <dt className="text-ash text-sm">Verwendungszweck</dt>
          <dd className="font-semibold select-all">
            {hinweis.verwendungszweck}
          </dd>
        </div>
        <div>
          <dt className="text-ash text-sm">Bankverbindung</dt>
          <dd className="text-bone/90 whitespace-pre-line">
            {hinweis.bankverbindung}
          </dd>
        </div>
      </dl>
    </div>
  )
}
