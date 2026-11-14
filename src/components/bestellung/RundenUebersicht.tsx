import { Link } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  UserX,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Auftrag, Bestellrunde, Position } from '@/lib/bestellung'
import type { SortimentArtikel } from '@/lib/sortiment'
import type { Stand } from '@/lib/uebersicht'
import { Markierung } from '@/components/Markierung'
import { auftragsSumme } from '@/lib/auftrag'
import { belegteDruckstellen } from '@/lib/belegung'
import { ladeUebersicht, tagAnzeigen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { euro } from '@/lib/geld'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { STAND_TEXT, uebersichtZeilen } from '@/lib/uebersicht'

const REIHENFOLGE: Array<Stand> = ['fertig', 'verzicht', 'in_arbeit', 'leer']
const BALKEN: Record<Stand, string> = {
  fertig: 'bg-patina',
  verzicht: 'bg-patina/45',
  in_arbeit: 'bg-brass',
  leer: 'bg-line',
}

type Daten = Awaited<ReturnType<typeof ladeUebersicht>>

// Summe eines Auftrags aus den aktuellen Preisen plus Korrektur.
function summe(
  auftrag: Auftrag,
  daten: Daten,
  sortiment: Array<SortimentArtikel>,
) {
  const zeilen = daten.positionen
    .filter((p: Position) => p.auftrag === auftrag.id)
    .flatMap((p) => {
      const artikel = sortiment.find((a) => a.id === p.artikel)
      const groesse = artikel?.groessen.find((g) => g.id === p.groesse)
      if (!artikel || !groesse) return []
      const eigene = daten.belegungen.filter((b) => b.position === p.id)
      return [
        {
          anzahl: p.anzahl,
          artikel,
          groesse,
          druckstellen: belegteDruckstellen(artikel.druckstellen, eigene),
        },
      ]
    })
  return auftragsSumme(zeilen, auftrag.korrektur_betrag)
}

// Karte "Übersicht der Runde" über dem eigenen Auftrag, nur für Admins: alle
// Mitglieder mit Stand und bezahlt. Ein Klick auf ein Mitglied öffnet dessen
// Auftrag zum Bearbeiten oder Anlegen.
export function RundenUebersicht({
  runde,
  ich,
  sortiment,
}: {
  runde: Bestellrunde
  ich: string
  sortiment: Array<SortimentArtikel>
}) {
  const [daten, setDaten] = useState<Daten | null>(null)
  const [aufgeklappt, setAufgeklappt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const laden = useCallback(async () => {
    setDaten(await ladeUebersicht(runde.id))
  }, [runde.id])

  useEffect(() => {
    laden().catch((err: unknown) =>
      setFehler(fehlertext(err, 'Die Übersicht konnte nicht geladen werden.')),
    )
  }, [laden])

  async function bezahltSetzen(auftrag: Auftrag) {
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('auftraege')
        .update(auftrag.id, { bezahlt: !auftrag.bezahlt })
      await laden()
    } catch (err) {
      setFehler(fehlertext(err, 'Bezahlt konnte nicht gesetzt werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  if (!daten)
    return fehler ? (
      <p role="alert" className="text-rust-hi mb-6 text-sm">
        {fehler}
      </p>
    ) : null

  const anzahlProAuftrag: Record<string, number> = {}
  for (const p of daten.positionen)
    anzahlProAuftrag[p.auftrag] = (anzahlProAuftrag[p.auftrag] ?? 0) + 1
  const zeilen = uebersichtZeilen(
    daten.mitglieder,
    daten.auftraege,
    anzahlProAuftrag,
  )
  const zahl = (s: Stand) => zeilen.filter((z) => z.stand === s).length
  const erledigt = zahl('fertig') + zahl('verzicht')
  const bezahlt = zeilen.filter((z) => z.bezahlt && z.stand === 'fertig').length
  const ansprechen = zeilen.filter(
    (z) => z.stand === 'leer' || z.stand === 'in_arbeit',
  )

  return (
    <section
      aria-label="Übersicht der Runde"
      className="border-brass/30 bg-anthracite mb-6 overflow-hidden rounded-[20px] border"
    >
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Übersicht der Runde</span>
          <Markierung ton="brass">Admin</Markierung>
        </div>

        <div className="mt-3 flex items-end gap-5">
          <div>
            <div className="tnum font-display text-5xl leading-none font-black">
              {erledigt}
              <span className="text-smoke text-2xl">/{zeilen.length}</span>
            </div>
            <div className="text-ash mt-1 text-sm">erledigt</div>
          </div>
          <div>
            <div className="tnum font-display text-patina text-3xl leading-none font-extrabold">
              {bezahlt}
            </div>
            <div className="text-ash mt-1 text-sm">bezahlt</div>
          </div>
          <div className="text-ash ml-auto text-right text-sm">
            Bestelldatum
            <br />
            <span className="text-bone font-semibold">
              {tagAnzeigen(runde.bestelldatum)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {REIHENFOLGE.map((s) =>
            zahl(s) ? (
              <span key={s} className={BALKEN[s]} style={{ flex: zahl(s) }} />
            ) : null,
          )}
        </div>
        <div className="text-ash mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          {REIHENFOLGE.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${BALKEN[s]}`} />
              {zahl(s)} {STAND_TEXT[s]}
            </span>
          ))}
        </div>

        {ansprechen.length > 0 && (
          <p className="mt-4 text-[15px]">
            <span className="text-ash">Noch ansprechen: </span>
            {ansprechen.map((z) => z.mitglied.name).join(', ')}
          </p>
        )}
        {fehler && (
          <p role="alert" className="text-rust-hi mt-4 text-sm">
            {fehler}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAufgeklappt((v) => !v)}
        className="border-line/70 text-bone/90 hover:bg-slate/40 flex min-h-12 w-full items-center justify-between border-t px-5 text-[15px] font-semibold"
        aria-expanded={aufgeklappt}
      >
        Alle Mitglieder ({zeilen.length})
        <ChevronDown
          className={`text-ash size-5 transition-transform ${aufgeklappt ? 'rotate-180' : ''}`}
        />
      </button>

      {aufgeklappt && (
        <ul className="border-line/70 border-t">
          {zeilen.map((z) => (
            <li
              key={z.mitglied.id}
              className="border-line/40 flex items-center border-b last:border-0"
            >
              <Link
                to="/bestellen/mitglied/$mitgliedId"
                params={{ mitgliedId: z.mitglied.id }}
                className="hover:bg-slate/40 flex min-h-[60px] min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {z.mitglied.name}
                    </span>
                    {z.mitglied.id === ich && (
                      <span className="text-smoke text-[12px]">(du)</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Markierung
                      ton={
                        z.stand === 'fertig' || z.stand === 'verzicht'
                          ? 'patina'
                          : z.stand === 'in_arbeit'
                            ? 'brass'
                            : 'neutral'
                      }
                    >
                      {STAND_TEXT[z.stand]}
                    </Markierung>
                    {z.ausgetreten && (
                      <Markierung ton="neutral">
                        <UserX className="size-3" /> ausgetreten
                      </Markierung>
                    )}
                    {z.anmerkung && (
                      <span
                        className="text-brass flex items-center"
                        title="Anmerkung vorhanden"
                      >
                        <MessageSquare
                          className="size-4"
                          aria-label="Anmerkung vorhanden"
                        />
                      </span>
                    )}
                  </div>
                </div>
                {z.auftrag &&
                  (z.stand === 'fertig' || z.stand === 'in_arbeit') && (
                    <span className="tnum text-ash text-[15px]">
                      {euro(summe(z.auftrag, daten, sortiment))}
                    </span>
                  )}
                <ChevronRight className="text-smoke size-4 shrink-0" />
              </Link>
              <div className="flex w-16 shrink-0 justify-center pr-3">
                {z.auftrag && z.stand === 'fertig' && (
                  <button
                    type="button"
                    disabled={laeuft}
                    onClick={() => z.auftrag && bezahltSetzen(z.auftrag)}
                    aria-pressed={z.bezahlt}
                    aria-label={`${z.mitglied.name} bezahlt`}
                    className={`flex size-11 items-center justify-center rounded-full border transition-colors ${
                      z.bezahlt
                        ? 'border-patina/60 bg-patina/20 text-patina'
                        : 'border-line text-smoke hover:border-ash'
                    }`}
                  >
                    {z.bezahlt ? (
                      <Check className="size-5" strokeWidth={2.5} />
                    ) : (
                      <span className="text-[13px] font-bold">€</span>
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
