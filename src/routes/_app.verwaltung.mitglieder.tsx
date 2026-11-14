import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { AdminPage, Teaser } from '../components/admin'
import { Button, Pill, notInDummy } from '../components/ui'
import { Monogram } from '../components/nav'
import { MEMBERS } from '../mock/data'

export const Route = createFileRoute('/_app/verwaltung/mitglieder')({ component: Mitglieder })

function Mitglieder() {
  return (
    <AdminPage title="Mitglieder">
      <Teaser>Angedeutet: einladen, erneut einladen, Admin-Recht, sperren, Daten löschen. Mitglieder selbst sehen diese Liste nicht.</Teaser>
      <Button full onClick={() => notInDummy('Mitglied einladen')}>
        <UserPlus className="size-4" /> Mitglied einladen
      </Button>
      <ul className="card mt-5 divide-y divide-line/60 overflow-hidden">
        {MEMBERS.map((m) => (
          <li key={m.id} className={`flex min-h-16 items-center gap-3 px-4 py-2 ${m.status === 'gesperrt' ? 'opacity-60' : ''}`}>
            <Monogram name={m.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {m.name}
                {m.admin && <Pill tone="brass">Admin</Pill>}
              </div>
              <div className="truncate text-[13px] text-ash">{m.email}</div>
            </div>
            <Pill tone={m.status === 'aktiv' ? 'patina' : m.status === 'gesperrt' ? 'rust' : 'neutral'}>{m.status}</Pill>
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
