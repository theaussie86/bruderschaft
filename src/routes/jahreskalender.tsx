import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { BlattEintrag, BlattMonat, BlattTag } from '@/lib/jahreskalender'
import { fehlertext } from '@/lib/geburtstag'
import { ladeJahr } from '@/lib/jahreskalender'

// Der Jahreskalender zum Ausdrucken für den Kühlschrank, im Look der alten
// Excel-Liste: zwölf Monate nebeneinander auf einem A4-Blatt quer. Nur Admins
// drucken ihn, wenn die wichtigen Termine fürs Jahr eingetragen sind. Liegt
// außerhalb der App-Shell, damit nur das Blatt aufs Papier kommt.
export const Route = createFileRoute('/jahreskalender')({
  validateSearch: (s: Record<string, unknown>): { jahr?: number } => {
    const jahr = Number(s.jahr)
    return Number.isInteger(jahr) && jahr >= 2000 && jahr <= 2100
      ? { jahr }
      : {}
  },
  beforeLoad: ({ context }) => {
    if (!context.mitglied) throw redirect({ to: '/login' })
    if (!context.mitglied.admin) throw redirect({ to: '/kalender' })
  },
  component: Jahreskalender,
})

const ZEILEN = Array.from({ length: 31 }, (_, i) => i)

// Gedruckt wird meist im Herbst fürs kommende Jahr, deshalb zeigt die Seite
// ab Oktober schon das nächste.
function standardJahr(jetzt = new Date()) {
  return jetzt.getFullYear() + (jetzt.getMonth() >= 9 ? 1 : 0)
}

function Jahreskalender() {
  const { jahr = standardJahr() } = Route.useSearch()
  const [stand, setStand] = useState<{
    jahr: number
    blatt: Array<BlattMonat>
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let aktuell = true
    setFehler(null)
    ladeJahr(jahr)
      .then((blatt) => {
        if (aktuell) setStand({ jahr, blatt })
      })
      .catch((err: unknown) => {
        if (aktuell)
          setFehler(
            fehlertext(err, 'Der Kalender konnte nicht geladen werden.'),
          )
      })
    return () => {
      aktuell = false
    }
  }, [jahr])

  const blatt = stand?.jahr === jahr ? stand.blatt : null
  const knopf =
    'border-line/70 hover:bg-slate/50 flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-[14px]'

  return (
    <div className="jahreskalender-seite">
      <div className="nicht-drucken mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
        <Link to="/kalender" className={knopf}>
          <ChevronLeft className="size-4" /> Kalender
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/jahreskalender"
            search={{ jahr: jahr - 1 }}
            className={knopf}
            aria-label="Vorheriges Jahr"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="font-display min-w-16 text-center text-2xl font-extrabold">
            {jahr}
          </span>
          <Link
            to="/jahreskalender"
            search={{ jahr: jahr + 1 }}
            className={knopf}
            aria-label="Nächstes Jahr"
          >
            <ChevronRight className="size-4" />
          </Link>
          <button
            type="button"
            className="bg-brass text-coal flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold disabled:opacity-50"
            disabled={!blatt}
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Drucken
          </button>
        </div>
        <p className="text-ash w-full text-[13px]">
          A4 quer. Damit die Farben mitkommen, im Druckdialog
          „Hintergrundgrafiken“ einschalten. Abgesagte Termine stehen nicht
          drauf.
        </p>
      </div>
      {fehler ? (
        <p role="alert" className="text-rust-hi mx-auto max-w-6xl px-4 text-sm">
          {fehler}
        </p>
      ) : blatt === null ? (
        <p className="text-ash mx-auto max-w-6xl px-4">Lädt …</p>
      ) : (
        <div className="jahresblatt-rahmen overflow-x-auto px-4 pb-8">
          <Blatt jahr={jahr} blatt={blatt} />
        </div>
      )}
    </div>
  )
}

function Blatt({ jahr, blatt }: { jahr: number; blatt: Array<BlattMonat> }) {
  return (
    <div className="jahresblatt">
      <header>
        <img src="/club-assets/brand/mail-logo.png" alt="" />
        <h1>Hahna-Kalender {jahr}</h1>
        <img src="/club-assets/brand/mail-logo.png" alt="" />
      </header>
      <table>
        <colgroup>
          {blatt.map((m) => (
            <ColGruppe key={m.name} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {blatt.map((m) => (
              <th key={m.name} colSpan={3}>
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ZEILEN.map((i) => (
            <tr key={i}>
              {blatt.map((m) => {
                const t = m.tage.at(i)
                if (!t) return <td key={m.name} colSpan={3} className="leer" />
                return (
                  <TagZellen
                    key={m.name}
                    farbe={t.farbe}
                    tag={t.tag}
                    wochentag={t.wochentag}
                    eintraege={t.eintraege}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        <span className="stammtisch">Stammtisch</span>
        <span className="veranstaltung">Hahna Aktschn</span>
        <span className="geburtstag">Geburtstag</span>
      </footer>
    </div>
  )
}

function ColGruppe() {
  return (
    <>
      <col className="nr" />
      <col className="wt" />
      <col className="was" />
    </>
  )
}

function TagZellen({
  farbe,
  tag,
  wochentag,
  eintraege,
}: {
  farbe: BlattTag['farbe']
  tag: number
  wochentag: string
  eintraege: Array<BlattEintrag>
}) {
  return (
    <>
      <td className={`nr ${farbe ?? ''}`}>{tag}</td>
      <td className={`wt ${farbe ?? ''}`}>{wochentag}</td>
      <td className={`was ${farbe ?? ''}`}>
        {eintraege.map((e, i) => (
          // Urlaube laufen wie im alten Kalender als "Hahna Aktschn" mit.
          <div key={i} className={e.art === 'urlaub' ? 'veranstaltung' : e.art}>
            <span>{e.fortsetzung ? '\u00a0' : e.text}</span>
          </div>
        ))}
      </td>
    </>
  )
}
