import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { PageHeader, Segmented } from '../components/ui'
import { BirthdayRow, TerminRow, isPast } from '../components/termin'
import { birthdayIn, parts } from '../lib/format'
import { HEUTE, MEMBERS } from '../mock/data'
import { useApp } from '../mock/store'
import type { Birthday } from '../components/termin'
import type { Termin } from '../mock/data'

type Eintrag = { kind: 'termin'; date: string; t: Termin } | { kind: 'geburtstag'; date: string; b: Birthday }

/** Geburtstage aktiver Mitglieder (nicht ausgetreten) von heute an für die nächsten 6 Monate. */
function upcomingBirthdays(birthdays: Record<string, string>): Array<Birthday> {
  const year = Number(HEUTE.slice(0, 4))
  const end = new Date(HEUTE)
  end.setUTCMonth(end.getUTCMonth() + 6)
  const limit = end.toISOString().slice(0, 10)
  const out: Array<Birthday> = []
  for (const m of MEMBERS) {
    const bd = birthdays[m.id]
    if (m.status === 'gesperrt' || !bd) continue
    for (const y of [year, year + 1]) {
      const date = birthdayIn(bd, y)
      if (date >= HEUTE && date <= limit) out.push({ memberId: m.id, name: m.name, date, age: y - Number(bd.slice(0, 4)) })
    }
  }
  return out
}

type Ansicht = 'kommend' | 'archiv'

export const Route = createFileRoute('/_app/kalender/')({
  validateSearch: (s: Record<string, unknown>): { ansicht?: Ansicht } => ({
    ansicht: s.ansicht === 'archiv' ? 'archiv' : undefined,
  }),
  component: Kalender,
})

function groupByMonth(list: Array<Eintrag>) {
  const groups: Array<{ key: string; label: string; items: Array<Eintrag> }> = []
  for (const t of list) {
    const p = parts(t.date)
    let g = groups.find((x) => x.key === p.key)
    if (!g) {
      g = { key: p.key, label: `${p.monthLong} ${p.year}`, items: [] }
      groups.push(g)
    }
    g.items.push(t)
  }
  return groups
}

function Kalender() {
  const { ansicht = 'kommend' } = Route.useSearch()
  const navigate = useNavigate()
  const state = useApp()
  const isAdmin = state.role === 'admin'

  const toEintrag = (t: Termin): Eintrag => ({ kind: 'termin', date: t.start, t })
  const list: Array<Eintrag> =
    ansicht === 'kommend'
      ? [
          ...state.termine.filter((t) => !isPast(t)).map(toEintrag),
          ...upcomingBirthdays(state.birthdays).map((b): Eintrag => ({ kind: 'geburtstag', date: b.date, b })),
        ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'termin' ? -1 : 1))
      : state.termine
          .filter((t) => isPast(t) && !t.cancelled && (t.kind === 'Veranstaltung' || !!t.protocol?.length))
          .sort((a, b) => b.start.localeCompare(a.start))
          .map(toEintrag)

  return (
    <>
      <PageHeader
        eyebrow="Club-Leben"
        title="Kalender"
        action={
          isAdmin ? (
            <Link
              to="/kalender/neu"
              className="mb-0.5 flex min-h-11 items-center gap-1.5 rounded-xl border border-brass/40 px-3.5 text-[14px] font-semibold text-brass hover:bg-brass/10"
            >
              <Plus className="size-4" /> Termin anlegen
            </Link>
          ) : undefined
        }
      />
      <Segmented<Ansicht>
        value={ansicht}
        onChange={(v) => navigate({ to: '/kalender', search: v === 'archiv' ? { ansicht: v } : {}, replace: true })}
        options={[
          ['kommend', 'Kommend'],
          ['archiv', 'Archiv'],
        ]}
      />
      {ansicht === 'archiv' && (
        <p className="mt-3 text-[14px] text-ash">Das Archiv: Veranstaltungen mit Bildern und Stammtische mit Protokoll.</p>
      )}

      <div className="mt-2">
        {groupByMonth(list).map((g) => (
          <section key={g.key}>
            <div className="mt-6 mb-3 flex items-center gap-3">
              <h2 className="eyebrow">{g.label}</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-brass/30 to-transparent" />
            </div>
            <ul className="space-y-2.5">
              {g.items.map((e, i) => (
                <li key={e.kind === 'termin' ? e.t.id : `bd-${e.b.memberId}-${e.date}`} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                  {e.kind === 'termin' ? <TerminRow t={e.t} past={ansicht === 'archiv'} /> : <BirthdayRow b={e.b} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
