import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { createPocketBase } from '@/lib/pocketbase'

// Platzhalter, bis die ersten Screens stehen. Zeigt, ob die App ihr
// PocketBase erreicht - der schnellste Beleg nach einem Deploy.
const getBackendStatus = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    await createPocketBase().health.check()
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

export const Route = createFileRoute('/')({
  loader: () => getBackendStatus(),
  component: Home,
})

function Home() {
  const { ok } = Route.useLoaderData()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <img src="/club-assets/logo-dunkel.jpg" alt="" className="mx-auto w-40" />
      <h1 className="font-display text-center text-4xl uppercase">Club-App</h1>
      <p className="text-ash text-center">Im Aufbau.</p>
      <p className={`text-center text-sm ${ok ? 'text-patina' : 'text-rust-hi'}`}>
        Backend {ok ? 'verbunden' : 'nicht erreichbar'}
      </p>
    </main>
  )
}
