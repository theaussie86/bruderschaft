import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Cake, UserPlus } from 'lucide-react'
import { AdminPage, Teaser } from '../components/admin'
import { Button, Pill, Sheet, notInDummy } from '../components/ui'
import { Monogram } from '../components/nav'
import { MEMBERS } from '../mock/data'
import { dateShort } from '../lib/format'
import { actions, useApp } from '../mock/store'
import type { Member } from '../mock/data'

export const Route = createFileRoute('/_app/verwaltung/mitglieder')({ component: Mitglieder })

function Mitglieder() {
  const state = useApp()
  const [edit, setEdit] = useState<Member | null>(null)
  const [draft, setDraft] = useState('')
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
              <button
                className="mt-0.5 flex items-center gap-1 text-[13px] text-ash hover:text-bone"
                onClick={() => {
                  setEdit(m)
                  setDraft(state.birthdays[m.id] ?? '')
                }}
              >
                <Cake className="size-3.5" /> {state.birthdays[m.id] ? dateShort(state.birthdays[m.id]) : 'Geburtstag fehlt'}
              </button>
            </div>
            <Pill tone={m.status === 'aktiv' ? 'patina' : m.status === 'gesperrt' ? 'rust' : 'neutral'}>{m.status}</Pill>
          </li>
        ))}
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={`Geburtstag von ${edit?.name ?? ''}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!edit || !draft) return
            actions.setBirthday(edit.id, draft)
            setEdit(null)
            actions.toast('Geburtstag korrigiert')
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Geburtsdatum</span>
            <input className="field" type="date" required max="2026-11-14" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <Button full type="submit" className="mt-2">
            Speichern
          </Button>
        </form>
      </Sheet>
    </AdminPage>
  )
}
