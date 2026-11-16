import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { CalendarDays, LogOut, Shirt, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { VERWALTUNG_LINKS } from '@/components/verwaltung'

// App-Shell für angemeldete Mitglieder: mobil Tab-Leiste unten, ab lg Sidebar.
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied) throw redirect({ to: '/login' })
    // Pflichtschritt beim ersten Login (Spec #17).
    if (!context.mitglied.geburtstag && !context.mitglied.support)
      throw redirect({ to: '/geburtstag' })
    return { mitglied: context.mitglied }
  },
  component: AppShell,
})

const TABS: Array<{
  to: '/bestellen' | '/kalender' | '/profil'
  label: string
  icon: LucideIcon
}> = [
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/bestellen', label: 'Bestellen', icon: Shirt },
  { to: '/profil', label: 'Profil', icon: UserRound },
]

function AppShell() {
  const { mitglied } = Route.useRouteContext()
  const { pathname } = useLocation()
  const aktiv = TABS.find((t) => pathname.startsWith(t.to))?.to

  return (
    <div className="mx-auto flex max-w-6xl">
      <aside className="border-line/60 sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-4 py-8 lg:flex">
        <Link to="/kalender" className="mb-8 flex items-center gap-3 px-2">
          <img
            src="/club-assets/brand/logo-256.webp"
            alt=""
            className="size-12 shrink-0"
          />
          <span>
            <span className="font-display block text-2xl leading-none font-extrabold uppercase">
              Hahna Brothers
            </span>
            <span className="text-ash text-xs">nur für Mitglieder</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Hauptnavigation">
          {TABS.map((t) => (
            <SeitenLink key={t.to} {...t} aktiv={aktiv === t.to} />
          ))}
        </nav>
        {mitglied.admin && (
          <section className="mt-8" aria-label="Verwaltung">
            <div className="eyebrow mb-2 px-3">Verwaltung</div>
            <nav className="flex flex-col gap-1">
              {VERWALTUNG_LINKS.map((l) => (
                <SeitenLink
                  key={l.to}
                  {...l}
                  aktiv={pathname.startsWith(l.to)}
                />
              ))}
            </nav>
          </section>
        )}
        {/* Wer unten links seinen Namen sieht, sucht dort das Abmelden. */}
        <div className="border-line/70 mt-auto overflow-hidden rounded-2xl border text-sm">
          <Link
            to="/profil"
            className="hover:bg-slate/50 block px-3 py-3 transition-colors"
          >
            <div className="truncate font-semibold">{mitglied.name}</div>
            <div className="text-ash text-xs">
              {mitglied.admin ? 'Mitglied · Admin' : 'Mitglied'}
            </div>
          </Link>
          <Link
            to="/abmelden"
            className="border-line/70 text-ash hover:bg-slate/50 hover:text-bone flex min-h-11 items-center gap-2 border-t px-3 font-semibold transition-colors"
          >
            <LogOut className="size-4" strokeWidth={1.8} />
            Abmelden
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      <nav
        className="pb-safe border-line/80 bg-coal/90 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"
        aria-label="Hauptnavigation"
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const an = aktiv === t.to
            const Icon = t.icon
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-[12px] font-semibold tracking-wide transition-colors ${
                  an ? 'text-bone' : 'text-smoke hover:text-ash'
                }`}
              >
                <span
                  className={`absolute top-0 h-[3px] w-10 rounded-b-full ${an ? 'bg-rust' : 'bg-transparent'}`}
                />
                <Icon
                  className={`size-6 ${an ? 'text-brass' : ''}`}
                  strokeWidth={an ? 2.1 : 1.7}
                />
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function SeitenLink({
  to,
  label,
  icon: Icon,
  aktiv,
}: {
  to: string
  label: string
  icon: LucideIcon
  aktiv: boolean
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 text-[16px] font-semibold transition-colors ${
        aktiv
          ? 'bg-slate text-bone'
          : 'text-ash hover:bg-slate/50 hover:text-bone'
      }`}
    >
      <Icon
        className={`size-5 ${aktiv ? 'text-brass' : 'text-smoke group-hover:text-ash'}`}
        strokeWidth={1.8}
      />
      {label}
      {aktiv && <span className="bg-rust ml-auto h-5 w-[3px] rounded-full" />}
    </Link>
  )
}
