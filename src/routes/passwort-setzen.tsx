import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { PasswortFeld } from '@/components/PasswortFeld'
import { PublicPage } from '@/components/PublicPage'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Ziel des Links aus der Einladung und aus "Passwort vergessen". PocketBase
// setzt das Mitglied dabei auf aktiv.
export const Route = createFileRoute('/passwort-setzen')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: PasswortSetzen,
})

const MINDESTLAENGE = 8

function PasswortSetzen() {
  const { token } = Route.useSearch()
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fertig, setFertig] = useState(false)

  async function setzen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const passwort = String(form.get('passwort'))
    if (passwort !== String(form.get('wiederholung'))) {
      setFehler('Die beiden Passwörter stimmen nicht überein.')
      return
    }
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('mitglieder')
        .confirmPasswordReset(token, passwort, passwort)
      setFertig(true)
    } catch {
      setFehler(
        'Der Link ist abgelaufen oder wurde schon benutzt. Fordere über "Passwort vergessen" einen neuen an oder bitte einen Admin um eine neue Einladung.',
      )
    } finally {
      setLaeuft(false)
    }
  }

  if (fertig) {
    return (
      <PublicPage title="Passwort gesetzt">
        <p className="text-ash mb-6">Du kannst dich jetzt anmelden.</p>
        <Link to="/login" className="text-brass font-semibold">
          Zur Anmeldung
        </Link>
      </PublicPage>
    )
  }

  if (!token) {
    return (
      <PublicPage title="Passwort setzen">
        <p className="text-ash mb-6">
          Der Link ist unvollständig. Öffne ihn bitte direkt aus der Mail.
        </p>
        <Link to="/passwort-vergessen" className="text-brass font-semibold">
          Neuen Link anfordern
        </Link>
      </PublicPage>
    )
  }

  return (
    <PublicPage title="Passwort setzen">
      <form className="space-y-4" onSubmit={setzen}>
        <label className="block">
          <span className="text-ash mb-1.5 block text-sm">Neues Passwort</span>
          <PasswortFeld
            name="passwort"
            autoComplete="new-password"
            minLength={MINDESTLAENGE}
            required
          />
          <span className="text-smoke mt-1 block text-xs">
            Mindestens {MINDESTLAENGE} Zeichen.
          </span>
        </label>
        <label className="block">
          <span className="text-ash mb-1.5 block text-sm">
            Passwort wiederholen
          </span>
          <PasswortFeld
            name="wiederholung"
            autoComplete="new-password"
            minLength={MINDESTLAENGE}
            required
          />
        </label>
        {fehler && (
          <p role="alert" className="text-rust-hi text-sm">
            {fehler}
          </p>
        )}
        <Button full type="submit" disabled={laeuft}>
          Passwort setzen
        </Button>
      </form>
    </PublicPage>
  )
}
