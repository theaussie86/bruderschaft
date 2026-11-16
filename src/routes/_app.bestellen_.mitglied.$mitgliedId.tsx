import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Bestellrunde, UebersichtMitglied } from '@/lib/bestellung'
import type { Motiv, SortimentArtikel } from '@/lib/sortiment'
import { PageHeader } from '@/components/PageHeader'
import { AuftragKarte } from '@/components/bestellung/AuftragKarte'
import { ladeAktuelleRunde, ladeMitglied, ladeRunde } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { ladeMotive, ladeSortiment } from '@/lib/sortiment'

// Auftrag eines Mitglieds, aus der Übersicht der Runde. In der offenen Runde
// bearbeitet ein Admin ihn oder legt ihn an, nach dem Abschluss setzt er nur
// noch Korrektur und bezahlt. Die Rechte prüft PocketBase (ADR 0002).
export const Route = createFileRoute('/_app/bestellen_/mitglied/$mitgliedId')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin && !context.mitglied.support)
      throw redirect({ to: '/bestellen' })
  },
  validateSearch: (search: Record<string, unknown>): { runde?: string } =>
    typeof search.runde === 'string' ? { runde: search.runde } : {},
  component: AuftragEinesMitglieds,
})

function AuftragEinesMitglieds() {
  const { mitgliedId } = Route.useParams()
  const { runde: rundeId } = Route.useSearch()
  const [stand, setStand] = useState<{
    runde: Bestellrunde | null
    mitglied: UebersichtMitglied
    sortiment: Array<SortimentArtikel>
    motive: Array<Motiv>
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      rundeId ? ladeRunde(rundeId) : ladeAktuelleRunde(),
      ladeMitglied(mitgliedId),
      ladeSortiment(),
      ladeMotive(),
    ])
      .then(([runde, mitglied, sortiment, motive]) =>
        setStand({ runde, mitglied, sortiment, motive }),
      )
      .catch((err: unknown) =>
        setFehler(fehlertext(err, 'Der Auftrag konnte nicht geladen werden.')),
      )
  }, [mitgliedId, rundeId])

  return (
    <>
      <Link
        to="/bestellen"
        className="text-ash hover:text-bone mt-5 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold lg:mt-10"
      >
        <ArrowLeft className="size-4" /> Übersicht der Runde
      </Link>
      <PageHeader title={stand?.mitglied.name ?? 'Auftrag'} />
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : stand === null ? (
        <p className="text-ash">Lädt …</p>
      ) : !stand.runde ? (
        <p className="text-ash">Es gibt noch keine Bestellrunde.</p>
      ) : stand.mitglied.support ? (
        <p className="text-ash">Das Support-Konto bestellt nicht.</p>
      ) : (
        <>
          {stand.mitglied.gesperrt && (
            <div className="border-rust/40 bg-rust/10 mb-4 flex items-start gap-3 rounded-2xl border p-4 text-[15px]">
              <UserX className="text-rust-hi mt-0.5 size-5 shrink-0" />
              <div>
                <div className="font-semibold">Ausgetreten</div>
                <div className="text-ash">
                  Der Auftrag bleibt stehen. Ob er gelöscht oder mitbestellt
                  wird, entscheidest du.
                </div>
              </div>
            </div>
          )}
          <AuftragKarte
            runde={stand.runde}
            mitglied={stand.mitglied.id}
            name={stand.mitglied.name}
            sortiment={stand.sortiment}
            motive={stand.motive}
            fuer={stand.mitglied.name}
          />
        </>
      )}
    </>
  )
}
