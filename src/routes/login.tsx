import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { PublicPage } from '@/components/PublicPage'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.mitglied) throw redirect({ to: '/kalender' })
  },
  component: Login,
})

function Login() {
  const router = useRouter()
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function anmelden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setFehler(null)
    setLaeuft(true)
    try {
      // Der Proxy legt das Token ins httpOnly-Cookie (ADR 0003).
      await createBrowserPocketBase()
        .collection('mitglieder')
        .authWithPassword(
          String(form.get('email')),
          String(form.get('passwort')),
        )
      await router.invalidate()
      await router.navigate({ to: '/kalender' })
    } catch {
      setFehler('Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <PublicPage title="Anmelden">
      <form className="space-y-4" onSubmit={anmelden}>
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
        <label className="block">
          <span className="text-ash mb-1.5 block text-sm">Passwort</span>
          <input
            className="field"
            name="passwort"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {fehler && (
          <p role="alert" className="text-rust-hi text-sm">
            {fehler}
          </p>
        )}
        <Button full type="submit" disabled={laeuft}>
          Anmelden
        </Button>
      </form>
      <Link
        to="/passwort-vergessen"
        className="text-brass mt-6 inline-block font-semibold"
      >
        Passwort vergessen?
      </Link>
    </PublicPage>
  )
}
