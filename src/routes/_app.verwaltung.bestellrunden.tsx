import { createFileRoute } from '@tanstack/react-router'
import { FileSpreadsheet, FileText, Plus, RotateCcw } from 'lucide-react'
import { AdminPage, Teaser } from '../components/admin'
import { Button, Pill, notInDummy } from '../components/ui'
import { dateShort } from '../lib/format'
import { actions, findOrder, orderStand, roundMembers, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/verwaltung/bestellrunden')({ component: Bestellrunden })

function Bestellrunden() {
  const state = useApp()
  const anyOpen = state.rounds.some((r) => r.status === 'offen')

  return (
    <AdminPage title="Bestellrunden">
      <Teaser>Es gibt höchstens eine offene Bestellrunde. Eine neue geht erst, wenn keine offen ist.</Teaser>
      <Button full variant="secondary" disabled={anyOpen} onClick={() => notInDummy('Neue Bestellrunde')}>
        <Plus className="size-4" /> Neue Bestellrunde
      </Button>
      <ul className="mt-5 space-y-3">
        {state.rounds.map((r) => {
          const members = roundMembers(state, r.id)
          const done = members.filter((m) => ['fertig', 'verzicht'].includes(orderStand(findOrder(state, r.id, m.id)))).length
          const open = r.status === 'offen'
          return (
            <li key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-2xl leading-none font-extrabold uppercase">{r.name}</div>
                  <div className="mt-1.5 text-[14px] text-ash">
                    {open ? `Bestelldatum ${dateShort(r.orderDate)}` : `abgeschlossen am ${dateShort(r.closedOn ?? r.orderDate)}`}
                    {open && ` · ${done} von ${members.length} erledigt`}
                  </div>
                </div>
                <Pill tone={open ? 'patina' : 'neutral'}>{r.status}</Pill>
              </div>
              {!open && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="quiet" onClick={() => notInDummy('PDF-Download')}>
                    <FileText className="size-4" /> PDF
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => notInDummy('Excel-Download')}>
                    <FileSpreadsheet className="size-4" /> Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={anyOpen}
                    onClick={() => {
                      actions.reopenRound(r.id)
                      actions.toast(`${r.name} wieder geöffnet`)
                    }}
                  >
                    <RotateCcw className="size-4" /> Öffnen
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </AdminPage>
  )
}
