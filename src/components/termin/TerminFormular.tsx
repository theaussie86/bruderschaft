import { useState } from 'react'

import type { Termin, TerminArt, TerminFormular as Zeiten } from '@/lib/termine'
import { Button } from '@/components/Button'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { ART_NAME, formularAusTermin, terminDaten } from '@/lib/termine'

export type TerminVorlage = Pick<Termin, 'titel' | 'art' | 'ort' | 'infotext'> &
  Partial<Zeiten>

// Anlegen, Kopieren und Bearbeiten eines Termins. Auch rückwirkend, damit
// ältere Feste ins Archiv kommen. Was gültig ist, prüft PocketBase.
export function TerminFormular({
  termin,
  vorlage,
  onGespeichert,
  onAbbrechen,
}: {
  termin?: Termin
  vorlage?: TerminVorlage
  onGespeichert: (termin: Termin) => void | Promise<void>
  onAbbrechen: () => void
}) {
  const start = termin
    ? { ...termin, ...formularAusTermin(termin) }
    : (vorlage ?? null)
  const [art, setArt] = useState<TerminArt>(start?.art ?? 'stammtisch')
  const [ganztaegig, setGanztaegig] = useState(start?.ganztaegig ?? false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    const daten = {
      titel: text('titel'),
      art,
      ganztaegig,
      ort: text('ort'),
      infotext: text('infotext'),
      ...terminDaten({
        tag: text('tag'),
        von: text('von'),
        endeTag: text('endeTag'),
        bis: text('bis'),
        ganztaegig,
      }),
    }
    setFehler(null)
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      const gespeichert = termin
        ? await pb.collection('termine').update<Termin>(termin.id, daten)
        : await pb.collection('termine').create<Termin>(daten)
      await onGespeichert(gespeichert)
    } catch (err) {
      setFehler(fehlertext(err, 'Der Termin konnte nicht gespeichert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={speichern}>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">Art</legend>
        <div className="border-line/70 grid grid-cols-2 gap-1 rounded-xl border p-1">
          {(['stammtisch', 'veranstaltung'] as const).map((a) => (
            <label
              key={a}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-[15px] font-semibold ${
                art === a ? 'bg-slate text-bone' : 'text-ash hover:text-bone'
              }`}
            >
              <input
                type="radio"
                name="art"
                value={a}
                className="sr-only"
                checked={art === a}
                onChange={() => setArt(a)}
              />
              {ART_NAME[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <Feld label="Titel">
        <input
          className="field"
          name="titel"
          required
          maxLength={200}
          defaultValue={start?.titel ?? 'Stammtisch'}
        />
      </Feld>
      <Feld label="Datum">
        <input
          className="field"
          name="tag"
          type="date"
          required
          defaultValue={start?.tag ?? ''}
        />
      </Feld>
      <label className="flex min-h-12 items-center justify-between gap-3">
        <span className="font-semibold">ganztägig</span>
        <input
          type="checkbox"
          className="accent-rust size-5"
          checked={ganztaegig}
          onChange={(e) => setGanztaegig(e.target.checked)}
        />
      </label>
      {!ganztaegig && (
        <div className="grid grid-cols-2 gap-3">
          <Feld label="Beginn">
            <input
              className="field"
              name="von"
              type="time"
              required
              defaultValue={start?.von ?? ''}
            />
          </Feld>
          <Feld label="Ende (optional)">
            <input
              className="field"
              name="bis"
              type="time"
              defaultValue={start?.bis ?? ''}
            />
          </Feld>
        </div>
      )}
      <Feld
        label={
          ganztaegig
            ? 'Letzter Tag (optional)'
            : 'Ende an einem anderen Tag (optional)'
        }
      >
        <input
          className="field"
          name="endeTag"
          type="date"
          defaultValue={start?.endeTag ?? ''}
        />
      </Feld>
      <Feld label="Ort">
        <input
          className="field"
          name="ort"
          maxLength={200}
          defaultValue={start?.ort ?? ''}
          placeholder="z. B. Vereinsheim"
        />
      </Feld>
      <Feld label="Infotext">
        <textarea
          className="field min-h-24"
          name="infotext"
          maxLength={5000}
          defaultValue={start?.infotext ?? ''}
        />
      </Feld>
      <p className="text-ash text-[14px]">
        Auch rückwirkend möglich, damit ältere Feste ins Archiv kommen. Es gibt
        keine Serien, jeder Termin steht für sich.
      </p>
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={laeuft} className="flex-1">
          {termin ? 'Speichern' : 'Termin anlegen'}
        </Button>
        <button
          type="button"
          className="text-ash hover:text-bone px-3 font-semibold"
          onClick={onAbbrechen}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

function Feld({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
