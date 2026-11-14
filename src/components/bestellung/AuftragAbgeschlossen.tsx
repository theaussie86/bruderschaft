import { Check, Coins, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  Auftrag,
  Bestellrunde,
  Einstellungen,
  Position,
  PositionsBelegung,
} from '@/lib/bestellung'
import type { Motiv, SortimentArtikel } from '@/lib/sortiment'
import { Markierung } from '@/components/Markierung'
import { AdminFelder } from '@/components/bestellung/AdminFelder'
import { belegungsText } from '@/lib/belegung'
import { ladeAuftrag, ladeEinstellungen, tagAnzeigen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { euro, euroMitVorzeichen } from '@/lib/geld'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Ein Auftrag in einer abgeschlossenen Bestellrunde, nur lesend. Ein
// mitbestellter Auftrag zeigt die festgehaltenen Preise, die Summe, bezahlt
// und für das Mitglied den Zahlungshinweis. Ein weggelassener Auftrag steht
// als "nicht mitbestellt" ohne Summe da. Admins ändern noch Korrektur und
// bezahlt (Spec #17).
export function AuftragAbgeschlossen({
  runde,
  mitglied,
  sortiment,
  motive,
  fuer,
}: {
  runde: Bestellrunde
  mitglied: string
  sortiment: Array<SortimentArtikel>
  motive: Array<Motiv>
  fuer?: string
}) {
  const [stand, setStand] = useState<{
    auftrag: Auftrag | null
    positionen: Array<Position>
    belegungen: Array<PositionsBelegung>
    einstellungen: Einstellungen | null
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const laden = useCallback(async () => {
    const [auftrag, einstellungen] = await Promise.all([
      ladeAuftrag(runde.id, mitglied),
      ladeEinstellungen(),
    ])
    setStand({ ...auftrag, einstellungen })
  }, [runde.id, mitglied])

  useEffect(() => {
    laden().catch((err: unknown) =>
      setFehler(fehlertext(err, 'Der Auftrag konnte nicht geladen werden.')),
    )
  }, [laden])

  async function speichern(felder: Partial<Auftrag>) {
    if (!stand?.auftrag) return
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('auftraege')
        .update(stand.auftrag.id, felder)
      await laden()
    } catch (err) {
      setFehler(fehlertext(err, 'Der Auftrag konnte nicht geändert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  if (!stand)
    return fehler ? (
      <p role="alert" className="text-rust-hi text-sm">
        {fehler}
      </p>
    ) : (
      <p className="text-ash">Lädt …</p>
    )

  const { auftrag, positionen, belegungen, einstellungen } = stand
  const mitbestellt = !!auftrag?.mitbestellt
  const markierung = !auftrag
    ? 'nichts eingetragen'
    : auftrag.status === 'verzicht'
      ? 'Verzicht'
      : mitbestellt
        ? auftrag.bezahlt
          ? 'bezahlt'
          : 'mitbestellt'
        : 'nicht mitbestellt'
  const zeilen = positionen.map((p) => {
    const artikel = sortiment.find((a) => a.id === p.artikel)
    const groesse = artikel?.groessen.find((g) => g.id === p.groesse)
    const eigene = belegungen.filter((b) => b.position === p.id)
    return {
      ...p,
      name: artikel?.name ?? 'Artikel',
      groesse: groesse?.name ?? '',
      druck: artikel ? belegungsText(artikel.druckstellen, motive, eigene) : '',
    }
  })
  const korrektur = auftrag?.korrektur_betrag ?? 0
  const summe = auftrag?.summe ?? 0
  const hinweis = einstellungen?.zahlungshinweis.trim() ?? ''

  return (
    <section
      className="card overflow-hidden"
      aria-label={fuer ? `Auftrag von ${fuer}` : 'Dein Auftrag'}
    >
      <div className="border-line/60 flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <div className="eyebrow">
            {fuer ? `Auftrag von ${fuer}` : 'Dein Auftrag'}
          </div>
          <div className="text-ash mt-0.5 text-sm">
            abgeschlossen am {tagAnzeigen(runde.abgeschlossen_am)}
          </div>
        </div>
        <Markierung ton={mitbestellt ? 'patina' : 'neutral'}>
          {markierung}
        </Markierung>
      </div>

      <div className="px-5 pt-1 pb-5">
        {!auftrag ? (
          <p className="text-ash py-8 text-center">
            In dieser Runde ist nichts eingetragen.
          </p>
        ) : auftrag.status === 'verzicht' ? (
          <div className="py-8 text-center">
            <div className="font-display text-2xl font-bold uppercase">
              Diesmal nichts
            </div>
          </div>
        ) : (
          <>
            {zeilen.length > 0 && (
              <ul className="divide-line/60 divide-y">
                {zeilen.map((z) => (
                  <li key={z.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{z.name}</div>
                      <div className="text-ash text-[13px]">
                        Größe {z.groesse}
                        {z.druck && ` · ${z.druck}`}
                        {mitbestellt && ` · ${euro(z.stueckpreis)} pro Stück`}
                      </div>
                    </div>
                    <span className="tnum text-ash">{z.anzahl}×</span>
                    {mitbestellt && (
                      <span className="tnum w-20 text-right font-semibold">
                        {euro(z.anzahl * z.stueckpreis)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {mitbestellt ? (
              <div className="border-line/60 mt-4 space-y-1.5 border-t pt-4">
                {!!korrektur && (
                  <>
                    <div className="text-ash flex items-baseline justify-between gap-3 text-[15px]">
                      <span>Zwischensumme</span>
                      <span className="tnum">{euro(summe - korrektur)}</span>
                    </div>
                    <div className="text-ash flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="truncate">
                        Korrektur · {auftrag.korrektur_grund}
                      </span>
                      <span className="tnum">
                        {euroMitVorzeichen(korrektur)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Summe</span>
                  <span className="tnum text-xl font-bold">{euro(summe)}</span>
                </div>
                <div
                  className={`flex items-center gap-2 pt-1 text-[15px] ${auftrag.bezahlt ? 'text-patina' : 'text-ash'}`}
                >
                  {auftrag.bezahlt ? (
                    <>
                      <Check className="size-4" /> bezahlt
                    </>
                  ) : (
                    'noch nicht bezahlt'
                  )}
                </div>
              </div>
            ) : (
              <p className="text-ash mt-4 flex items-center gap-2 text-sm">
                <Lock className="size-4 shrink-0" /> Beim Abschließen nicht
                fertig, daher nicht mitbestellt.
              </p>
            )}

            {auftrag.anmerkung.trim() && (
              <div className="mt-4">
                <div className="text-ash mb-1 text-sm">Anmerkung</div>
                <p className="text-[15px] whitespace-pre-line">
                  {auftrag.anmerkung}
                </p>
              </div>
            )}

            {mitbestellt && !fuer && !auftrag.bezahlt && hinweis && (
              <div className="border-brass/25 bg-brass/[0.06] mt-4 rounded-2xl border p-4">
                <div className="eyebrow mb-1.5 flex items-center gap-2">
                  <Coins className="size-4" /> Zahlungshinweis
                </div>
                <p className="text-bone/90 text-[15px] leading-relaxed whitespace-pre-line">
                  {hinweis}
                </p>
              </div>
            )}

            {fuer && mitbestellt && (
              <AdminFelder
                key={`${auftrag.korrektur_betrag}|${auftrag.korrektur_grund}`}
                auftrag={auftrag}
                disabled={laeuft}
                onSpeichern={speichern}
              />
            )}
          </>
        )}

        {fehler && (
          <p role="alert" className="text-rust-hi mt-4 text-sm">
            {fehler}
          </p>
        )}
      </div>
    </section>
  )
}
