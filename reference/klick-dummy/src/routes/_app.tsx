import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { CalendarDays, Shirt, UserRound } from 'lucide-react'
import { ClubImage } from '../components/ui'
import { ADMIN_LINKS, Monogram } from '../components/nav'
import { asset } from '../mock/data'
import { memberById, useApp } from '../mock/store'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/_app')({ component: AppShell })

const TABS: Array<{ to: '/bestellen' | '/kalender' | '/profil'; label: string; icon: LucideIcon }> = [
  { to: '/bestellen', label: 'Bestellen', icon: Shirt },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/profil', label: 'Profil', icon: UserRound },
]


function useActiveTab() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/kalender')) return '/kalender'
  if (pathname.startsWith('/profil') || pathname.startsWith('/verwaltung')) return '/profil'
  return '/bestellen'
}

function AppShell() {
  const { role, me } = useApp()
  const { pathname } = useLocation()
  const active = useActiveTab()
  const member = memberById(me)
  const isAdmin = role === 'admin'

  return (
    <div className="mx-auto flex max-w-6xl">
      {/* Sidebar ab lg */}
      <aside className="sticky top-10 hidden h-[calc(100dvh-2.5rem)] w-64 shrink-0 flex-col border-r border-line/60 px-4 py-8 lg:flex">
        <Link to="/bestellen" className="mb-8 flex items-center gap-3 px-2">
          <span className="block size-12 shrink-0 overflow-hidden rounded-xl border border-rust/30 bg-black"><ClubImage src={asset('logo-dunkel.jpg')} alt="Club-Logo" className="size-full scale-[1.9]" /></span>
          <span>
            <span className="block font-display text-2xl leading-none font-extrabold uppercase">Club-App</span>
            <span className="text-xs text-ash">nur für Mitglieder</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => (
            <SideLink key={t.to} to={t.to} label={t.label} icon={t.icon} active={active === t.to && !pathname.startsWith('/verwaltung')} />
          ))}
        </nav>
        {isAdmin && (
          <div className="mt-8">
            <div className="eyebrow mb-2 px-3">Verwaltung</div>
            <nav className="flex flex-col gap-1">
              {ADMIN_LINKS.map((t) => (
                <SideLink key={t.to} to={t.to} label={t.label} icon={t.icon} active={pathname.startsWith(t.to)} small />
              ))}
            </nav>
          </div>
        )}
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line/70 px-3 py-3">
          <Monogram name={member?.name ?? '?'} />
          <div className="min-w-0 text-sm">
            <div className="truncate font-semibold">{member?.name}</div>
            <div className="text-xs text-ash">{isAdmin ? 'Mitglied · Admin' : 'Mitglied'}</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Tab-Leiste mobil */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-coal/90 backdrop-blur-xl lg:hidden"
        aria-label="Hauptnavigation"
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const on = active === t.to
            const Icon = t.icon
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-[12px] font-semibold tracking-wide transition-colors ${
                  on ? 'text-bone' : 'text-smoke hover:text-ash'
                }`}
              >
                <span className={`absolute top-0 h-[3px] w-10 rounded-b-full transition-all ${on ? 'bg-rust' : 'bg-transparent'}`} />
                <Icon className={`size-6 ${on ? 'text-brass' : ''}`} strokeWidth={on ? 2.1 : 1.7} />
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function SideLink({
  to,
  label,
  icon: Icon,
  active,
  small,
}: {
  to: string
  label: string
  icon: LucideIcon
  active: boolean
  small?: boolean
}) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl px-3 font-semibold transition-colors ${small ? 'min-h-10 text-[14px]' : 'min-h-12 text-[16px]'} ${
        active ? 'bg-slate text-bone' : 'text-ash hover:bg-slate/50 hover:text-bone'
      }`}
    >
      <Icon className={`size-5 ${active ? 'text-brass' : 'text-smoke group-hover:text-ash'}`} strokeWidth={1.8} />
      {label}
      {active && <span className="ml-auto h-5 w-[3px] rounded-full bg-rust" />}
    </Link>
  )
}
