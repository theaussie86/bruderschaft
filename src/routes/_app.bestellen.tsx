import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight, History, ImageOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Bestellrunde } from '@/lib/bestellung'
import type { Motiv, SortimentArtikel } from '@/lib/sortiment'
import { PageHeader } from '@/components/PageHeader'
import { AuftragKarte } from '@/components/bestellung/AuftragKarte'
import { RundenUebersicht } from '@/components/bestellung/RundenUebersicht'
import { ladeAktuelleRunde } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { euro } from '@/lib/geld'
import { bildPfad, ladeMotive, ladeSortiment } from '@/lib/sortiment'

export const Route = createFileRoute('/_app/bestellen')({
  component: Bestellen,
})

// Tab Bestellen: der eigene Auftrag in der offenen Bestellrunde, darunter das
// Sortiment zum Ansehen. Admins sehen darüber die Übersicht der Runde. Ohne
// offene Runde steht die zuletzt abgeschlossene da, nur lesend; ohne jede
// Runde nur der Hinweis.
function Bestellen() {
  const { mitglied } = Route.useRouteContext()
  const [stand, setStand] = useState<{
    runde: Bestellrunde | null
    sortiment: Array<SortimentArtikel>
    motive: Array<Motiv>
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(async () => {
    try {
      const [runde, sortiment, motive] = await Promise.all([
        ladeAktuelleRunde(),
        ladeSortiment(),
        ladeMotive(),
      ])
      setStand({ runde, sortiment, motive })
    } catch (err) {
      setFehler(fehlertext(err, 'Die Bestellung konnte nicht geladen werden.'))
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  const offen = stand?.runde?.status === 'offen'

  return (
    <>
      <PageHeader
        title={offen && stand.runde ? stand.runde.name : 'Bestellen'}
      />
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : stand === null ? (
        <p className="text-ash">Lädt …</p>
      ) : (
        <>
          {!offen && (
            <div className="card mb-6 p-8 text-center">
              <div className="font-display text-2xl font-bold uppercase">
                Gerade keine Bestellrunde
              </div>
              <p className="text-ash mt-1">
                Sobald ein Admin eine eröffnet, bestellst du hier.
              </p>
            </div>
          )}
          {stand.runde && (
            <>
              {!offen && (
                <h2 className="font-display mb-3 text-2xl font-extrabold uppercase">
                  {stand.runde.name}
                </h2>
              )}
              {(mitglied.admin || mitglied.support) && (
                <RundenUebersicht
                  key={`uebersicht|${stand.runde.id}|${stand.runde.status}`}
                  runde={stand.runde}
                  ich={mitglied.id}
                  sortiment={stand.sortiment}
                  motive={stand.motive}
                  onRundeGeaendert={laden}
                />
              )}
              {mitglied.support ? (
                <p className="text-ash">Das Support-Konto bestellt nicht.</p>
              ) : (
                <AuftragKarte
                  key={`auftrag|${stand.runde.id}|${stand.runde.status}`}
                  runde={stand.runde}
                  mitglied={mitglied.id}
                  sortiment={stand.sortiment}
                  motive={stand.motive}
                />
              )}
            </>
          )}
          {!mitglied.support && (
            <Link
              to="/bestellen/frueher"
              className="card hover:border-brass/30 mt-4 flex min-h-16 items-center gap-4 px-5 transition-colors"
            >
              <History className="text-brass size-5" />
              <span className="flex-1">
                <span className="block font-semibold">Frühere Runden</span>
                <span className="text-ash block text-sm">
                  Deine Aufträge aus abgeschlossenen Bestellrunden
                </span>
              </span>
              <ChevronRight className="text-smoke size-5" />
            </Link>
          )}
          <SortimentAnsicht
            liste={stand.sortiment.filter((a) => !a.ausgeblendet)}
          />
        </>
      )}
    </>
  )
}

// Das Sortiment, wie Mitglieder es sehen: nur eingeblendete Artikel und
// Größen, ohne Artikelnummer (die ist nur für den Drucker).
function SortimentAnsicht({ liste }: { liste: Array<SortimentArtikel> }) {
  if (liste.length === 0) return null

  return (
    <section aria-label="Sortiment" className="mt-8">
      <div className="eyebrow mb-3">Sortiment</div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {liste.map((a) => {
          const src = bildPfad(a, '800x0')
          const groessen = a.groessen.filter((g) => !g.ausgeblendet)
          return (
            <li key={a.id} className="card overflow-hidden">
              {src ? (
                <img
                  src={src}
                  alt={a.name}
                  className="bg-coal aspect-[4/3] w-full object-contain"
                />
              ) : (
                <div className="bg-coal text-smoke flex aspect-[4/3] items-center justify-center">
                  <ImageOff className="size-6" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 font-semibold">{a.name}</span>
                  <span className="tnum font-semibold">{euro(a.preis)}</span>
                </div>
                {a.beschreibung && (
                  <p className="text-ash mt-1 text-[14px]">{a.beschreibung}</p>
                )}
                {groessen.length > 0 && (
                  <p className="text-ash mt-2 text-[13px]">
                    Größen:{' '}
                    {groessen
                      .map((g) =>
                        g.aufpreis
                          ? `${g.name} (+${euro(g.aufpreis)})`
                          : g.name,
                      )
                      .join(', ')}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
