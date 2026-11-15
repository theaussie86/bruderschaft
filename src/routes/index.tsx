import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

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
  return (
    <div className="flex min-h-dvh flex-col px-6">
      <main className="pt-safe mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 pt-8 text-center">
        <img src="/club-assets/brand/logo.webp" alt="" className="w-64" />
        <h1 className="font-display text-5xl leading-[0.9] font-black uppercase">
          Hahna Brothers
        </h1>
        {text && (
          <p className="text-ash max-w-xs text-[16px] leading-relaxed whitespace-pre-line">
            {text}
          </p>
        )}
        <Link
          to="/login"
          className="bg-rust text-bone hover:bg-rust-hi mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-[17px] font-semibold transition-colors"
        >
          Anmelden
        </Link>
        <p className="text-smoke text-sm">
          Zugänge vergibt die Bruderschaft. Eine Registrierung gibt es nicht.
        </p>
      </main>
      <PublicFooter />
    </div>
  )
}
