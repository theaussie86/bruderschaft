import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CalendarPlus, ChevronRight, Copy, KeyRound, LogOut } from 'lucide-react'
import { Button, PageHeader, SectionTitle, Sheet } from '../components/ui'
import { ADMIN_LINKS, Monogram } from '../components/nav'
import { actions, memberById, useApp } from '../mock/store'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/_app/profil')({ component: Profil })

function Profil() {
  const state = useApp()
  const navigate = useNavigate()
  const me = memberById(state.me)
  const isAdmin = state.role === 'admin'
  const [sheet, setSheet] = useState<'pw' | 'abo' | null>(null)

  return (
    <>
      <PageHeader eyebrow="Dein Zugang" title="Profil" />

      <div className="card flex items-center gap-4 p-5">
        <Monogram name={me?.name ?? '?'} size="lg" />
        <div className="min-w-0">
          <div className="font-display text-3xl leading-none font-extrabold uppercase">{me?.name}</div>
          <div className="mt-1 truncate text-ash">{me?.email}</div>
          <div className="mt-1.5 text-[13px] text-smoke">Name und E-Mail ändert nur ein Admin.</div>
        </div>
      </div>

      <ul className="card mt-4 divide-y divide-line/60 overflow-hidden">
        <Row icon={KeyRound} label="Passwort ändern" onClick={() => setSheet('pw')} />
        <Row icon={CalendarPlus} label="Kalender abonnieren" hint="Alle Termine im eigenen Kalender" onClick={() => setSheet('abo')} />
      </ul>

      {isAdmin && (
        <div className="lg:hidden">
          <SectionTitle>Verwaltung</SectionTitle>
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {ADMIN_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="flex min-h-14 items-center gap-3.5 px-5 hover:bg-slate/40">
                  <l.icon className="size-5 text-brass" strokeWidth={1.8} />
                  <span className="flex-1 font-semibold">{l.label}</span>
                  <ChevronRight className="size-5 text-smoke" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="secondary" full className="mt-8" onClick={() => navigate({ to: '/' })}>
        <LogOut className="size-4" /> Abmelden
      </Button>

      <Sheet open={sheet === 'pw'} onClose={() => setSheet(null)} title="Passwort ändern">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSheet(null)
            actions.toast('Passwort geändert (im Dummy nicht wirklich)')
          }}
        >
          <input className="field" type="password" placeholder="Aktuelles Passwort" autoComplete="current-password" />
          <input className="field" type="password" placeholder="Neues Passwort" autoComplete="new-password" />
          <input className="field" type="password" placeholder="Neues Passwort wiederholen" autoComplete="new-password" />
          <Button full type="submit" className="mt-2">
            Speichern
          </Button>
        </form>
      </Sheet>

      <Sheet open={sheet === 'abo'} onClose={() => setSheet(null)} title="Kalender abonnieren">
        <p className="mb-3 text-ash">Diesen Link in Google- oder Apple-Kalender als Abo einfügen. Neue und abgesagte Termine kommen dann von selbst an.</p>
        <div className="tnum mb-4 rounded-xl border border-line bg-coal p-3.5 font-mono text-[13px] break-all text-bone/90">{state.settings.calendarLink}</div>
        <Button
          full
          onClick={() => {
            (navigator.clipboard as Clipboard | undefined)?.writeText(state.settings.calendarLink).catch(() => {})
            setSheet(null)
            actions.toast('Link kopiert')
          }}
        >
          <Copy className="size-4" /> Link kopieren
        </Button>
        <p className="mt-3 text-[13px] text-smoke">Der Link ist geheim und für alle Mitglieder gleich. Bitte nicht weitergeben.</p>
      </Sheet>
    </>
  )
}

function Row({ icon: Icon, label, hint, onClick }: { icon: LucideIcon; label: string; hint?: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="flex min-h-16 w-full items-center gap-3.5 px-5 text-left hover:bg-slate/40">
        <Icon className="size-5 text-brass" strokeWidth={1.8} />
        <span className="flex-1">
          <span className="block font-semibold">{label}</span>
          {hint && <span className="block text-[13px] text-ash">{hint}</span>}
        </span>
        <ChevronRight className="size-5 text-smoke" />
      </button>
    </li>
  )
}
