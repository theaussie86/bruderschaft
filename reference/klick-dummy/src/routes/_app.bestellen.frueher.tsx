import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '../components/ui'
import { OrderPanel } from '../components/order'
import { findOrder, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/bestellen/frueher')({ component: Frueher })

function Frueher() {
  const state = useApp()
  const closed = state.rounds.filter((r) => r.status === 'abgeschlossen' && findOrder(state, r.id, state.me))

  return (
    <>
      <PageHeader eyebrow="Bestellen" title="Frühere Runden" back="/bestellen" />
      {closed.length === 0 ? (
        <div className="card p-8 text-center text-ash">Noch keine abgeschlossenen Runden mit einem Auftrag von dir.</div>
      ) : (
        <div className="space-y-8">
          {closed.map((r) => (
            <div key={r.id}>
              <h2 className="mb-3 font-display text-2xl font-extrabold uppercase">{r.name}</h2>
              <OrderPanel round={r} memberId={state.me} mode="self" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
