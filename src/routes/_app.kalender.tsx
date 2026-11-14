import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Termin } from '@/lib/termine'
import { PageHeader } from '@/components/PageHeader'
import { Umschalter } from '@/components/Umschalter'
import { TerminZeile } from '@/components/termin/TerminZeile'
import { zaehleBilder } from '@/lib/bilder'
import { fehlertext } from '@/lib/geburtstag'
import { ladeArchiv, ladeKommendeTermine, tagTeile } from '@/lib/termine'

// Tab Kalender mit dem Umschalter "Kommend / Archiv". Kommend: heutige und
// künftige Termine nach Monat, abgesagte durchgestrichen. Archiv: vergangene,
// nicht abgesagte Veranstaltungen und Stammtische mit Protokoll, neueste zuerst. Admins legen hier Termine an.
type Ansicht = 'kommend' | 'archiv'

export const Route = createFileRoute('/_app/kalender')({
  validateSearch: (s: Record<string, unknown>): { ansicht?: 'archiv' } =>
    s.ansicht === 'archiv' ? { ansicht: 'archiv' } : {},
  component: Kalender,
})

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

type Stand = {
  ansicht: Ansicht
  termine: Array<Termin>
  bilder: Map<string, number>
}

function Kalender() {
  const { mitglied } = Route.useRouteContext()
  const { ansicht = 'kommend' } = Route.useSearch()
  const navigate = useNavigate()
  const [stand, setStand] = useState<Stand | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let aktuell = true
    setFehler(null)
    const laden =
      ansicht === 'archiv'
        ? Promise.all([ladeArchiv(), zaehleBilder()])
        : Promise.all([ladeKommendeTermine(), new Map<string, number>()])
    laden
      .then(([termine, bilder]) => {
        if (aktuell) setStand({ ansicht, termine, bilder })
      })
      .catch((err: unknown) => {
        if (aktuell)
          setFehler(
            fehlertext(err, 'Die Termine konnten nicht geladen werden.'),
          )
      })
    return () => {
      aktuell = false
    }
  }, [ansicht])

  const geladen = stand?.ansicht === ansicht ? stand : null

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
      <Umschalter<Ansicht>
        wert={ansicht}
        onWechsel={(w) =>
          void navigate({
            to: '/kalender',
            search: w === 'archiv' ? { ansicht: 'archiv' } : {},
            replace: true,
          })
        }
        optionen={[
          ['kommend', 'Kommend'],
          ['archiv', 'Archiv'],
        ]}
      />
      {ansicht === 'archiv' && (
        <p className="text-ash mt-3 text-[14px]">
          Vergangene Veranstaltungen mit ihren Bildern und Stammtische mit
          Protokoll.
        </p>
      )}
      <div className="mt-2">
        {fehler ? (
          <p role="alert" className="text-rust-hi mt-4 text-sm">
            {fehler}
          </p>
        ) : geladen === null ? (
          <p className="text-ash mt-4">Lädt …</p>
        ) : geladen.termine.length === 0 ? (
          <div className="card text-ash mt-4 p-8 text-center">
            {ansicht === 'archiv'
              ? 'Im Archiv ist noch nichts.'
              : 'Gerade stehen keine Termine an.'}
          </div>
        ) : (
          nachMonat(geladen.termine).map((g) => (
            <section key={g.monat}>
              <div className="mt-6 mb-3 flex items-center gap-3">
                <h2 className="eyebrow">{g.monat}</h2>
                <span className="from-brass/30 h-px flex-1 bg-gradient-to-r to-transparent" />
              </div>
              <ul className="space-y-2.5">
                {g.termine.map((t) => (
                  <li key={t.id}>
                    <TerminZeile
                      termin={t}
                      bilder={
                        ansicht === 'archiv'
                          ? (geladen.bilder.get(t.id) ?? 0)
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  )
}
