import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { PublicPage } from '@/components/PublicPage'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

export const Route = createFileRoute('/passwort-vergessen')({
  component: PasswortVergessen,
})

function PasswortVergessen() {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [gesendet, setGesendet] = useState(false)

  async function anfordern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('mitglieder')
        .requestPasswordReset(String(form.get('email')))
      setGesendet(true)
    } catch {
      setFehler('Das hat nicht geklappt. Versuche es bitte später noch einmal.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <PublicPage title="Passwort vergessen">
      {gesendet ? (
        <p className="text-ash mb-6">
          Wenn die Adresse bei uns bekannt ist, ist eine Mail mit einem Link
          unterwegs. Der Link gilt 7 Tage.
        </p>
      ) : (
        <form className="mb-6 space-y-4" onSubmit={anfordern}>
          <p className="text-ash">
            Gib deine E-Mail-Adresse ein. Du bekommst einen Link, über den du
            ein neues Passwort setzt.
          </p>
          <label className="block">
            <span className="text-ash mb-1.5 block text-sm">E-Mail</span>
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          {fehler && (
            <p role="alert" className="text-rust-hi text-sm">
              {fehler}
            </p>
          )}
          <Button full type="submit" disabled={laeuft}>
            Link anfordern
          </Button>
        </form>
      )}
      <Link to="/login" className="text-brass font-semibold">
        Zur Anmeldung
      </Link>
    </PublicPage>
  )
}
