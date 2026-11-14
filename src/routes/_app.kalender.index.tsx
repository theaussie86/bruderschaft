import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { PageHeader, Segmented } from '../components/ui'
import { TerminRow, isPast } from '../components/termin'
import { parts } from '../lib/format'
import { useApp } from '../mock/store'
import type { Termin } from '../mock/data'

type Ansicht = 'kommend' | 'vergangen'

export const Route = createFileRoute('/_app/kalender/')({
  validateSearch: (s: Record<string, unknown>): { ansicht?: Ansicht } => ({
    ansicht: s.ansicht === 'vergangen' ? 'vergangen' : undefined,
  }),
  component: Kalender,
})

function groupByMonth(list: Array<Termin>) {
  const groups: Array<{ key: string; label: string; items: Array<Termin> }> = []
  for (const t of list) {
    const p = parts(t.start)
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

  const list =
    ansicht === 'kommend'
      ? state.termine.filter((t) => !isPast(t)).sort((a, b) => a.start.localeCompare(b.start))
      : state.termine
          .filter((t) => isPast(t) && !t.cancelled && (t.kind === 'Veranstaltung' || t.kind === 'Sitzung'))
          .sort((a, b) => b.start.localeCompare(a.start))

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
        onChange={(v) => navigate({ to: '/kalender', search: v === 'vergangen' ? { ansicht: v } : {}, replace: true })}
        options={[
          ['kommend', 'Kommend'],
          ['vergangen', 'Vergangen'],
        ]}
      />
      {ansicht === 'vergangen' && (
        <p className="mt-3 text-[14px] text-ash">Das Archiv: Veranstaltungen mit Bildern und Sitzungen mit Protokoll. Stammtische erscheinen hier nicht.</p>
      )}

      <div className="mt-2">
        {groupByMonth(list).map((g) => (
          <section key={g.key}>
            <div className="mt-6 mb-3 flex items-center gap-3">
              <h2 className="eyebrow">{g.label}</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-brass/30 to-transparent" />
            </div>
            <ul className="space-y-2.5">
              {g.items.map((t, i) => (
                <li key={t.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                  <TerminRow t={t} past={ansicht === 'vergangen'} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
