import { createFileRoute, redirect } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Verwaltung > Mitglieder: einladen und erneut einladen. Die Rechte prüft
// PocketBase (ADR 0002), die Seite blendet sich nur für Nicht-Admins aus.
export const Route = createFileRoute('/_app/verwaltung/mitglieder')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin) throw redirect({ to: '/bestellen' })
  },
  component: Mitglieder,
})

type Eintrag = {
  id: string
  name: string
  email: string
  verified: boolean
  admin: boolean
}

function fehlertext(err: unknown, standard: string) {
  const message = (err as { response?: { message?: string } }).response?.message
  return message || standard
}

function Mitglieder() {
  const [liste, setListe] = useState<Array<Eintrag> | null>(null)
  const [meldung, setMeldung] = useState<{
    text: string
    fehler: boolean
  } | null>(null)
  const [formOffen, setFormOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  const laden = useCallback(async () => {
    try {
      const items = await createBrowserPocketBase()
        .collection('mitglieder')
        .getFullList<Eintrag>({ filter: 'support = false', sort: 'name' })
      setListe(items)
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Die Mitglieder konnten nicht geladen werden.'),
        fehler: true,
      })
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  async function einladen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formular = e.currentTarget
    const form = new FormData(formular)
    setLaeuft(true)
    setMeldung(null)
    try {
      await createBrowserPocketBase()
        .collection('mitglieder')
        .create({ name: form.get('name'), email: form.get('email') })
      formular.reset()
      setFormOffen(false)
      setMeldung({ text: 'Einladung verschickt.', fehler: false })
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Das Mitglied konnte nicht angelegt werden.'),
        fehler: true,
      })
    } finally {
      setLaeuft(false)
      await laden()
    }
  }

  async function erneutEinladen(m: Eintrag) {
    setMeldung(null)
    try {
      await createBrowserPocketBase().send(
        `/api/club/mitglieder/${encodeURIComponent(m.id)}/einladen`,
        { method: 'POST' },
      )
      setMeldung({
        text: `Neue Einladung an ${m.name} verschickt. Der alte Link gilt nicht mehr.`,
        fehler: false,
      })
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Die Einladung konnte nicht verschickt werden.'),
        fehler: true,
      })
    }
  }

  return (
    <>
      <PageHeader title="Mitglieder" />

      {formOffen ? (
        <form className="card mb-5 space-y-4 p-5" onSubmit={einladen}>
          <label className="block">
            <span className="text-ash mb-1.5 block text-sm">Name</span>
            <input className="field" name="name" maxLength={100} required />
          </label>
          <label className="block">
            <span className="text-ash mb-1.5 block text-sm">E-Mail</span>
            <input className="field" name="email" type="email" required />
          </label>
          <p className="text-smoke text-xs">
            Das Mitglied bekommt eine Mail mit einem Link, über den es sein
            Passwort setzt. Der Link gilt 7 Tage.
          </p>
          <div className="flex gap-3">
            <Button type="submit" disabled={laeuft} className="flex-1">
              Einladen
            </Button>
            <button
              type="button"
              className="text-ash hover:text-bone px-3 font-semibold"
              onClick={() => setFormOffen(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <Button full className="mb-5" onClick={() => setFormOffen(true)}>
          <UserPlus className="size-4" /> Mitglied einladen
        </Button>
      )}

      {meldung && (
        <p
          role={meldung.fehler ? 'alert' : 'status'}
          className={`mb-5 text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
        >
          {meldung.text}
        </p>
      )}

      {liste === null ? (
        <p className="text-ash">Lädt …</p>
      ) : (
        <ul className="card divide-line/60 divide-y overflow-hidden">
          {liste.map((m) => (
            <li
              key={m.id}
              className="flex min-h-16 items-center gap-3 px-4 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {m.name}
                  {m.admin && <Markierung ton="brass">Admin</Markierung>}
                </div>
                {m.email && (
                  <div className="text-ash truncate text-[13px]">{m.email}</div>
                )}
                {!m.verified && (
                  <button
                    type="button"
                    className="text-brass hover:text-bone mt-0.5 text-[13px] font-semibold"
                    onClick={() => erneutEinladen(m)}
                  >
                    Erneut einladen
                  </button>
                )}
              </div>
              {m.verified ? (
                <Markierung ton="patina">aktiv</Markierung>
              ) : (
                <Markierung ton="neutral">eingeladen</Markierung>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const TOENE = {
  brass: 'border-brass/40 text-brass',
  patina: 'border-patina/40 text-patina',
  neutral: 'border-line text-ash',
}

function Markierung({
  ton,
  children,
}: {
  ton: keyof typeof TOENE
  children: React.ReactNode
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${TOENE[ton]}`}
    >
      {children}
    </span>
  )
}
