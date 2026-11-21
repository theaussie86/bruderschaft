import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { TerminVorlage } from '@/components/termin/TerminFormular'
import { PageHeader } from '@/components/PageHeader'
import { TerminFormular } from '@/components/termin/TerminFormular'
import { fehlertext } from '@/lib/geburtstag'
import { formularAusTermin, ladeTermin } from '@/lib/termine'

// Termin anlegen, nur für Admins. Mit `?kopie=` übernimmt das Formular Art,
// Titel, Ort, Infotext und Uhrzeiten eines Termins; das Datum ist neu.
export const Route = createFileRoute('/_app/kalender_/neu')({
  validateSearch: (s: Record<string, unknown>): { kopie?: string } =>
    typeof s.kopie === 'string' ? { kopie: s.kopie } : {},
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin) throw redirect({ to: '/kalender' })
  },
  component: TerminNeu,
})

function TerminNeu() {
  const { kopie } = Route.useSearch()
  const navigate = useNavigate()
  const [vorlage, setVorlage] = useState<TerminVorlage | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!kopie) return
    ladeTermin(kopie)
      .then((t) =>
        setVorlage({
          titel: t.titel,
          art: t.art,
          farbe: t.farbe,
          ort: t.ort,
          infotext: t.infotext,
          ...formularAusTermin(t),
          tag: '',
          endeTag: '',
        }),
      )
      .catch((err: unknown) =>
        setFehler(fehlertext(err, 'Der Termin konnte nicht geladen werden.')),
      )
  }, [kopie])

  return (
    <>
      <Link
        to="/kalender"
        className="text-ash hover:text-bone mt-5 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold lg:mt-10"
      >
        <ArrowLeft className="size-4" /> Kalender
      </Link>
      <PageHeader title={kopie ? 'Termin kopieren' : 'Termin anlegen'} />
      {fehler ? (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      ) : kopie && !vorlage ? (
        <p className="text-ash">Lädt …</p>
      ) : (
        <TerminFormular
          vorlage={vorlage ?? undefined}
          onGespeichert={(t) =>
            navigate({
              to: '/kalender/$terminId',
              params: { terminId: t.id },
              replace: true,
            })
          }
          onAbbrechen={() => navigate({ to: '/kalender' })}
        />
      )}
    </>
  )
}
