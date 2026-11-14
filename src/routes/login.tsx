import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui'
import { PublicPage } from '../components/PublicPage'
import { actions } from '../mock/store'
import type { Role } from '../mock/store'

export const Route = createFileRoute('/login')({ component: Login })

function Login() {
  const navigate = useNavigate()
  const [forgot, setForgot] = useState(false)

  const enter = (role: Role) => {
    actions.setRole(role)
    navigate({ to: '/bestellen' })
  }

  return (
    <PublicPage title={forgot ? 'Passwort vergessen' : 'Anmelden'}>
      {forgot ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            actions.toast('Link verschickt (im Dummy nicht wirklich)')
            setForgot(false)
          }}
        >
          <p className="text-ash">Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.</p>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ash">E-Mail</span>
            <input className="field" type="email" autoComplete="email" placeholder="du@example.org" />
          </label>
          <Button full type="submit">
            Link schicken
          </Button>
          <button type="button" className="min-h-11 w-full text-sm text-brass" onClick={() => setForgot(false)}>
            Zurück zur Anmeldung
          </button>
        </form>
      ) : (
        <>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              enter('mitglied')
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">E-Mail</span>
              <input className="field" type="email" autoComplete="email" placeholder="du@example.org" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ash">Passwort</span>
              <input className="field" type="password" autoComplete="current-password" placeholder="••••••••" />
            </label>
            <Button full type="submit">
              Anmelden
            </Button>
            <button type="button" className="min-h-11 w-full text-sm text-brass" onClick={() => setForgot(true)}>
              Passwort vergessen?
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-[#e2d4b8]/40 p-4">
            <div className="mb-1 text-[12px] font-bold tracking-[0.14em] text-[#e2d4b8] uppercase">Klick-Dummy</div>
            <p className="mb-3 text-sm text-ash">Beliebige Eingabe führt hinein. Oder direkt:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => enter('mitglied')}>
                als Mitglied
              </Button>
              <Button variant="secondary" onClick={() => enter('admin')}>
                als Admin
              </Button>
            </div>
          </div>
        </>
      )}
    </PublicPage>
  )
}
