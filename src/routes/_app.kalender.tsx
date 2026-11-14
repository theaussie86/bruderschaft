import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Termin } from '@/lib/termine'
import { PageHeader } from '@/components/PageHeader'
import { TerminZeile } from '@/components/termin/TerminZeile'
import { fehlertext } from '@/lib/geburtstag'
import { ladeKommendeTermine, tagTeile } from '@/lib/termine'

// Tab Kalender, Ansicht "Kommend": heutige und künftige Termine nach Monat,
// abgesagte durchgestrichen. Admins legen hier Termine an.
export const Route = createFileRoute('/_app/kalender')({ component: Kalender })

function nachMonat(termine: Array<Termin>) {
  const gruppen: Array<{ monat: string; termine: Array<Termin> }> = []
  for (const t of termine) {
    const monat = tagTeile(t.beginn).monat
    const letzte = gruppen.at(-1)
    if (letzte?.monat === monat) letzte.termine.push(t)
    else gruppen.push({ monat, termine: [t] })
  }
  return gruppen
}

function Kalender() {
  const { mitglied } = Route.useRouteContext()
  const [termine, setTermine] = useState<Array<Termin> | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    ladeKommendeTermine()
      .then(setTermine)
      .catch((err: unknown) =>
        setFehler(fehlertext(err, 'Die Termine konnten nicht geladen werden.')),
      )
  }, [])

  return (
    <>
      <PageHeader title="Kalender" />
      {mitglied.admin && (
        <Link
          to="/kalender/neu"
          className="border-brass/40 text-brass hover:bg-brass/10 mb-5 flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[15px] font-semibold"
        >
          <Plus className="size-4" /> Termin anlegen
        </Link>
      )}
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : termine === null ? (
        <p className="text-ash">Lädt …</p>
      ) : termine.length === 0 ? (
        <div className="card text-ash p-8 text-center">
          Gerade stehen keine Termine an.
        </div>
      ) : (
        nachMonat(termine).map((g) => (
          <section key={g.monat}>
            <div className="mt-6 mb-3 flex items-center gap-3">
              <h2 className="eyebrow">{g.monat}</h2>
              <span className="from-brass/30 h-px flex-1 bg-gradient-to-r to-transparent" />
            </div>
            <ul className="space-y-2.5">
              {g.termine.map((t) => (
                <li key={t.id}>
                  <TerminZeile termin={t} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}
