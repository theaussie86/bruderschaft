import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Bestellrunde } from '@/lib/bestellung'
import type { Motiv, SortimentArtikel } from '@/lib/sortiment'
import { PageHeader } from '@/components/PageHeader'
import { AuftragKarte } from '@/components/bestellung/AuftragKarte'
import { ladeFruehereRunden } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { ladeMotive, ladeSortiment } from '@/lib/sortiment'

// Frühere Runden: die eigenen Aufträge aus abgeschlossenen Bestellrunden, nur
// lesend mit Summe und bezahlt.
export const Route = createFileRoute('/_app/bestellen_/frueher')({
  component: FruehereRunden,
})

function FruehereRunden() {
  const { mitglied } = Route.useRouteContext()
  const [stand, setStand] = useState<{
    runden: Array<Bestellrunde>
    sortiment: Array<SortimentArtikel>
    motive: Array<Motiv>
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      ladeFruehereRunden(mitglied.id),
      ladeSortiment(),
      ladeMotive(),
    ])
      .then(([runden, sortiment, motive]) =>
        setStand({ runden, sortiment, motive }),
      )
      .catch((err: unknown) =>
        setFehler(
          fehlertext(err, 'Die früheren Runden konnten nicht geladen werden.'),
        ),
      )
  }, [mitglied.id])

  return (
    <>
      <Link
        to="/bestellen"
        className="text-ash hover:text-bone mt-5 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold lg:mt-10"
      >
        <ArrowLeft className="size-4" /> Bestellen
      </Link>
      <PageHeader title="Frühere Runden" />
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : stand === null ? (
        <p className="text-ash">Lädt …</p>
      ) : stand.runden.length === 0 ? (
        <div className="card text-ash p-8 text-center">
          Noch keine abgeschlossenen Runden mit einem Auftrag von dir.
        </div>
      ) : (
        <div className="space-y-8">
          {stand.runden.map((r) => (
            <div key={r.id}>
              <h2 className="font-display mb-3 text-2xl font-extrabold uppercase">
                {r.name}
              </h2>
              <AuftragKarte
                runde={r}
                mitglied={mitglied.id}
                name={mitglied.name}
                sortiment={stand.sortiment}
                motive={stand.motive}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
