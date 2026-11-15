import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowRight, LogIn } from 'lucide-react'

import { PublicFooter } from '@/components/PublicPage'
import { createPocketBase } from '@/lib/pocketbase'
import { ladeStartseite } from '@/lib/startseite'

// Der Text ist öffentlich lesbar, deshalb ohne Token. Ist PocketBase nicht
// erreichbar, bleibt die Seite mit Login-Link trotzdem stehen.
const ladeText = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return (await ladeStartseite(createPocketBase()))?.text ?? ''
  } catch {
    return ''
  }
})

export const Route = createFileRoute('/')({
  loader: () => ladeText(),
  component: Startseite,
})

function Startseite() {
  const text = Route.useLoaderData()
  const { mitglied } = Route.useRouteContext()
  return (
    <div className="flex min-h-dvh flex-col px-6">
      {/* Anmelden dezent oben rechts statt großem Button in der Mitte. */}
      <header className="pt-safe mx-auto flex w-full max-w-6xl justify-end">
        <Link
          to={mitglied ? '/kalender' : '/login'}
          className="text-ash hover:text-bone hover:border-line focus-visible:outline-brass mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {mitglied ? (
            <>
              Zur App
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          ) : (
            <>
              <LogIn className="size-4" strokeWidth={2} />
              Anmelden
            </>
          )}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 pb-8 text-center">
        <img src="/club-assets/brand/logo.webp" alt="" className="w-64" />
        <h1 className="font-display text-5xl leading-[0.9] font-black uppercase">
          Hahna Brothers
        </h1>
        {text && (
          <p className="text-ash max-w-xs text-[16px] leading-relaxed whitespace-pre-line">
            {text}
          </p>
        )}
        <p className="text-smoke mt-2 text-sm">
          Zugänge vergibt die Bruderschaft. Eine Registrierung gibt es nicht.
        </p>
      </main>
      <PublicFooter />
    </div>
  )
}
