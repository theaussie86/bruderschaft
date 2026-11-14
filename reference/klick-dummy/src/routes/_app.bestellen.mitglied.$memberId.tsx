import { createFileRoute } from '@tanstack/react-router'
import { UserX } from 'lucide-react'
import { PageHeader, Pill } from '../components/ui'
import { OrderPanel } from '../components/order'
import { currentRound, memberById, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/bestellen/mitglied/$memberId')({ component: MemberOrder })

function MemberOrder() {
  const { memberId } = Route.useParams()
  const state = useApp()
  const round = currentRound(state)
  const member = memberById(memberId)

  if (state.role !== 'admin') {
    return (
      <>
        <PageHeader title="Kein Zugriff" back="/bestellen" />
        <div className="card p-8 text-center text-ash">Fremde Aufträge sieht nur ein Admin. Oben im Banner auf „Admin“ umschalten.</div>
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow={round ? `${round.name} · Admin` : 'Admin'} title={member?.name ?? 'Ehemaliges Mitglied'} back="/bestellen" />
      {member?.status === 'gesperrt' && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rust/40 bg-rust/10 p-4 text-[15px]">
          <UserX className="mt-0.5 size-5 shrink-0 text-rust-hi" />
          <div>
            <div className="font-semibold">Ausgetreten</div>
            <div className="text-ash">Der Auftrag bleibt stehen. Ob er gelöscht oder mitbestellt wird, entscheidest du.</div>
          </div>
        </div>
      )}
      {member?.status === 'eingeladen' && (
        <div className="mb-4">
          <Pill>eingeladen, noch nicht angemeldet</Pill>
        </div>
      )}
      {round && <OrderPanel round={round} memberId={memberId} mode="admin" />}
    </>
  )
}
