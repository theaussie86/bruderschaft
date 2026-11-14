import { createFileRoute } from '@tanstack/react-router'
import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Bestellrunde } from '@/lib/bestellung'
import type { Motiv, SortimentArtikel } from '@/lib/sortiment'
import { PageHeader } from '@/components/PageHeader'
import { AuftragKarte } from '@/components/bestellung/AuftragKarte'
import { ladeOffeneRunde } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { euro } from '@/lib/geld'
import { bildPfad, ladeMotive, ladeSortiment } from '@/lib/sortiment'

export const Route = createFileRoute('/_app/bestellen')({
  component: Bestellen,
})

// Tab Bestellen: der eigene Auftrag in der offenen Bestellrunde, darunter das
// Sortiment zum Ansehen. Ohne offene Runde nur der Hinweis.
function Bestellen() {
  const { mitglied } = Route.useRouteContext()
  const [stand, setStand] = useState<{
    runde: Bestellrunde | null
    sortiment: Array<SortimentArtikel>
    motive: Array<Motiv>
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([ladeOffeneRunde(), ladeSortiment(), ladeMotive()])
      .then(([runde, sortiment, motive]) =>
        setStand({ runde, sortiment, motive }),
      )
      .catch((err: unknown) =>
        setFehler(
          fehlertext(err, 'Die Bestellung konnte nicht geladen werden.'),
        ),
      )
  }, [])

  return (
    <>
      <PageHeader title={stand?.runde ? stand.runde.name : 'Bestellen'} />
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : stand === null ? (
        <p className="text-ash">Lädt …</p>
      ) : (
        <>
          {!stand.runde ? (
            <div className="card p-8 text-center">
              <div className="font-display text-2xl font-bold uppercase">
                Gerade keine Bestellrunde
              </div>
              <p className="text-ash mt-1">
                Sobald ein Admin eine eröffnet, bestellst du hier.
              </p>
            </div>
          ) : mitglied.support ? (
            <p className="text-ash">Das Support-Konto bestellt nicht.</p>
          ) : (
            <AuftragKarte
              runde={stand.runde}
              mitglied={mitglied.id}
              sortiment={stand.sortiment}
              motive={stand.motive}
            />
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
                  className="bg-coal aspect-[4/3] w-full object-cover"
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
