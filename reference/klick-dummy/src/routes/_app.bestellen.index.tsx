import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight, History } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { AdminRoundCard, OrderPanel } from '../components/order'
import { currentRound, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/bestellen/')({ component: Bestellen })

function Bestellen() {
  const state = useApp()
  const round = currentRound(state)
  const isAdmin = state.role === 'admin'

  return (
    <>
      <PageHeader eyebrow={round ? `Bestellrunde · ${round.status}` : 'Bestellrunde'} title={round ? round.name : 'Bestellen'} />

      {!round ? (
        <div className="card p-8 text-center">
          <div className="font-display text-2xl font-bold uppercase">Gerade keine Bestellrunde</div>
          <p className="mt-1 text-ash">Sobald ein Admin eine eröffnet, bestellst du hier.</p>
        </div>
      ) : (
        <>
          {isAdmin && <AdminRoundCard round={round} />}
          <OrderPanel round={round} memberId={state.me} mode="self" />
        </>
      )}

      <Link
        to="/bestellen/frueher"
        className="card mt-4 flex min-h-16 items-center gap-4 px-5 transition-colors hover:border-brass/30"
      >
        <History className="size-5 text-brass" />
        <span className="flex-1">
          <span className="block font-semibold">Frühere Runden</span>
          <span className="block text-sm text-ash">Deine Aufträge aus abgeschlossenen Bestellrunden</span>
        </span>
        <ChevronRight className="size-5 text-smoke" />
      </Link>
    </>
  )
}
