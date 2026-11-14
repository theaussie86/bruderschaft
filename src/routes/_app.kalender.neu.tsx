import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, PageHeader, Segmented, Switch } from '../components/ui'
import { actions, useApp } from '../mock/store'
import type { TerminKind } from '../mock/data'

export const Route = createFileRoute('/_app/kalender/neu')({ component: TerminNeu })

function TerminNeu() {
  const { role } = useApp()
  const navigate = useNavigate()
  const [kind, setKind] = useState<TerminKind>('Stammtisch')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('2026-12-11')
  const [start, setStart] = useState('19:30')
  const [end, setEnd] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [place, setPlace] = useState('')
  const [info, setInfo] = useState('')

  if (role !== 'admin') {
    return (
      <>
        <PageHeader title="Termin anlegen" back="/kalender" />
        <div className="card p-8 text-center text-ash">Termine legen nur Admins an. Oben im Banner auf „Admin“ umschalten.</div>
      </>
    )
  }

  const valid = title.trim() && date && place.trim()

  return (
    <>
      <PageHeader eyebrow="Kalender · Admin" title="Termin anlegen" back="/kalender" />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          const id = actions.addTermin({
            kind,
            title: title.trim(),
            start: allDay ? date : `${date}T${start}`,
            end: !allDay && end ? `${date}T${end}` : undefined,
            allDay,
            place: place.trim(),
            info: info.trim(),
            images: kind === 'Veranstaltung' ? [] : undefined,
          })
          actions.toast('Termin angelegt')
          navigate({ to: '/kalender/$terminId', params: { terminId: id }, replace: true })
        }}
      >
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Art</span>
          <Segmented<TerminKind>
            value={kind}
            onChange={(k) => {
              setKind(k)
              if (!title || ['Stammtisch', 'Sitzung', 'Veranstaltung'].includes(title)) setTitle(k === 'Stammtisch' ? 'Stammtisch' : '')
            }}
            options={[
              ['Stammtisch', 'Stammtisch'],
              ['Sitzung', 'Sitzung'],
              ['Veranstaltung', 'Veranstaltung'],
            ]}
          />
        </div>
        <Field label="Titel">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'Veranstaltung' ? 'z. B. Sommerfest' : kind} />
        </Field>
        <Field label="Datum">
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex min-h-12 items-center justify-between">
          <span className="font-semibold">ganztägig</span>
          <Switch checked={allDay} onChange={setAllDay} label="ganztägig" />
        </div>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Beginn">
              <input className="field" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Ende (optional)">
              <input className="field" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Ort">
          <input className="field" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="z. B. Vereinsheim" />
        </Field>
        <Field label="Infotext">
          <textarea className="field min-h-24" value={info} onChange={(e) => setInfo(e.target.value)} />
        </Field>
        <p className="text-[14px] text-ash">Auch rückwirkend möglich, damit ältere Feste ins Archiv kommen. Es gibt keine Serien, jeder Termin steht für sich.</p>
        <Button full type="submit" disabled={!valid}>
          Termin anlegen
        </Button>
      </form>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
