import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Cake,
  CalendarPlus,
  ChevronRight,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/Button'
import { PasswortFeld } from '@/components/PasswortFeld'
import { GeburtstagFormular } from '@/components/GeburtstagFormular'
import { KalenderAbo } from '@/components/KalenderAbo'
import { PageHeader } from '@/components/PageHeader'
import { RechtlicheLinks } from '@/components/PublicPage'
import { VERWALTUNG_LINKS } from '@/components/verwaltung'
import { fehlertext, geburtstagAnzeigen } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

export const Route = createFileRoute('/_app/profil')({ component: Profil })

const MINDESTLAENGE = 8

type Bereich = 'geburtstag' | 'passwort' | 'kalender'

function Profil() {
  const { mitglied } = Route.useRouteContext()
  const router = useRouter()
  const [offen, setOffen] = useState<Bereich | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)

  function umschalten(bereich: Bereich) {
    setMeldung(null)
    setOffen(offen === bereich ? null : bereich)
  }

  return (
    <>
      <PageHeader title="Profil" />

      <div className="card p-5">
        <div className="font-display text-3xl leading-none font-extrabold uppercase">
          {mitglied.name}
        </div>
        <div className="text-ash mt-1 truncate">{mitglied.email}</div>
        <div className="text-smoke mt-1.5 text-[13px]">
          Name und E-Mail ändert nur ein Admin.
        </div>
      </div>

      {meldung && (
        <p role="status" className="text-patina mt-4 text-sm">
          {meldung}
        </p>
      )}

      <ul className="card divide-line/60 mt-4 divide-y overflow-hidden">
        <Zeile
          icon={Cake}
          label="Geburtstag"
          hinweis={
            mitglied.geburtstag
              ? geburtstagAnzeigen(mitglied.geburtstag)
              : 'Noch nicht angegeben'
          }
          offen={offen === 'geburtstag'}
          onClick={() => umschalten('geburtstag')}
        >
          <GeburtstagFormular
            mitgliedId={mitglied.id}
            wert={mitglied.geburtstag}
            hinweis="Mit Jahr. Im Kalender steht dein Geburtstag mit dem Alter, das du wirst."
            onGespeichert={async () => {
              await router.invalidate()
              setOffen(null)
              setMeldung('Geburtstag gespeichert.')
            }}
          />
        </Zeile>
        <Zeile
          icon={CalendarPlus}
          label="Kalender-Abo"
          hinweis="Termine und Geburtstage im eigenen Kalender"
          offen={offen === 'kalender'}
          onClick={() => umschalten('kalender')}
        >
          <KalenderAbo />
        </Zeile>
        <Zeile
          icon={KeyRound}
          label="Passwort ändern"
          offen={offen === 'passwort'}
          onClick={() => umschalten('passwort')}
        >
          <PasswortFormular
            mitgliedId={mitglied.id}
            email={mitglied.email}
            onGeaendert={async () => {
              await router.invalidate()
              setOffen(null)
              setMeldung('Passwort geändert.')
            }}
          />
        </Zeile>
      </ul>

      {mitglied.admin && (
        <section className="mt-8" aria-label="Verwaltung">
          <div className="eyebrow mb-2">Verwaltung</div>
          <ul className="card divide-line/60 divide-y overflow-hidden">
            {VERWALTUNG_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="hover:bg-slate/40 flex min-h-14 items-center gap-3.5 px-5"
                >
                  <l.icon className="text-brass size-5" strokeWidth={1.8} />
                  <span className="flex-1 font-semibold">{l.label}</span>
                  <ChevronRight className="text-smoke size-5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        to="/abmelden"
        className="border-line bg-anthracite text-bone mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-5 font-semibold"
      >
        <LogOut className="size-4" /> Abmelden
      </Link>

      <RechtlicheLinks className="mt-6" />
    </>
  )
}

function Zeile({
  icon: Icon,
  label,
  hinweis,
  offen,
  onClick,
  children,
}: {
  icon: LucideIcon
  label: string
  hinweis?: string
  offen: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={offen}
        className="hover:bg-slate/40 flex min-h-16 w-full items-center gap-3.5 px-5 text-left"
      >
        <Icon className="text-brass size-5" strokeWidth={1.8} />
        <span className="flex-1">
          <span className="block font-semibold">{label}</span>
          {hinweis && (
            <span className="text-ash block text-[13px]">{hinweis}</span>
          )}
        </span>
        <ChevronRight
          className={`text-smoke size-5 transition-transform ${offen ? 'rotate-90' : ''}`}
        />
      </button>
      {offen && <div className="px-5 pb-5">{children}</div>}
    </li>
  )
}

// PocketBase verlangt das alte Passwort und macht beim Ändern alle Sitzungen
// ungültig. Deshalb meldet sich das Mitglied gleich mit dem neuen Passwort
// wieder an; der Proxy legt das neue Token ins Cookie.
function PasswortFormular({
  mitgliedId,
  email,
  onGeaendert,
}: {
  mitgliedId: string
  email: string
  onGeaendert: () => Promise<void>
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function aendern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const alt = String(form.get('alt'))
    const neu = String(form.get('neu'))
    if (neu !== String(form.get('wiederholung'))) {
      setFehler('Die beiden neuen Passwörter stimmen nicht überein.')
      return
    }
    setFehler(null)
    setLaeuft(true)
    const pb = createBrowserPocketBase()
    try {
      await pb.collection('mitglieder').update(mitgliedId, {
        oldPassword: alt,
        password: neu,
        passwordConfirm: neu,
      })
    } catch (err) {
      setFehler(
        fehlertext(
          err,
          'Das Passwort konnte nicht geändert werden. Prüfe das aktuelle Passwort.',
        ),
      )
      setLaeuft(false)
      return
    }
    try {
      await pb.collection('mitglieder').authWithPassword(email, neu)
    } finally {
      setLaeuft(false)
    }
    await onGeaendert()
  }

  return (
    <form className="space-y-3" onSubmit={aendern}>
      <PasswortFeld
        name="alt"
        placeholder="Aktuelles Passwort"
        aria-label="Aktuelles Passwort"
        autoComplete="current-password"
        required
      />
      <PasswortFeld
        name="neu"
        placeholder="Neues Passwort"
        aria-label="Neues Passwort"
        autoComplete="new-password"
        minLength={MINDESTLAENGE}
        required
      />
      <PasswortFeld
        name="wiederholung"
        placeholder="Neues Passwort wiederholen"
        aria-label="Neues Passwort wiederholen"
        autoComplete="new-password"
        minLength={MINDESTLAENGE}
        required
      />
      <p className="text-smoke text-[13px]">
        Mindestens {MINDESTLAENGE} Zeichen.
      </p>
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <Button full type="submit" disabled={laeuft}>
        Speichern
      </Button>
    </form>
  )
}
