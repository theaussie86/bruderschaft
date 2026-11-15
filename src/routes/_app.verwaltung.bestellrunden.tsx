import { createFileRoute, redirect } from '@tanstack/react-router'
import { Plus, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Bestellrunde } from '@/lib/bestellung'
import { Button } from '@/components/Button'
import { Markierung } from '@/components/Markierung'
import { SammelbestellungDownload } from '@/components/bestellung/SammelbestellungDownload'
import { PageHeader } from '@/components/PageHeader'
import {
  ladeRunden,
  rundeOeffnen,
  tagAnzeigen,
  tagAus,
  tagFuerPocketBase,
} from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Verwaltung > Bestellrunden: eine Runde eröffnen, Name und Bestelldatum der
// offenen Runde ändern, abgeschlossene Runden wieder öffnen. Höchstens eine
// offene Runde prüft PocketBase (ADR 0002).
export const Route = createFileRoute('/_app/verwaltung/bestellrunden')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin) throw redirect({ to: '/kalender' })
  },
  component: Bestellrunden,
})

type Meldung = { text: string; fehler: boolean } | null

function Bestellrunden() {
  const [runden, setRunden] = useState<Array<Bestellrunde> | null>(null)
  const [meldung, setMeldung] = useState<Meldung>(null)
  // 'neu' für das Eröffnen, sonst die ID der Runde in Bearbeitung.
  const [offen, setOffen] = useState<string | null>(null)

  const laden = useCallback(async () => {
    try {
      setRunden(await ladeRunden())
    } catch (err) {
      setMeldung({
        text: fehlertext(
          err,
          'Die Bestellrunden konnten nicht geladen werden.',
        ),
        fehler: true,
      })
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  async function fertig(text: string | null) {
    setOffen(null)
    if (text) setMeldung({ text, fehler: false })
    await laden()
  }

  const eineOffen = runden?.some((r) => r.status === 'offen') ?? false

  async function oeffnen(r: Bestellrunde) {
    setMeldung(null)
    try {
      await rundeOeffnen(r.id)
      setMeldung({
        text: `${r.name} ist wieder offen. Es gelten die aktuellen Preise.`,
        fehler: false,
      })
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Die Runde konnte nicht geöffnet werden.'),
        fehler: true,
      })
    }
    await laden()
  }

  return (
    <>
      <PageHeader title="Bestellrunden" />
      <p className="text-ash mb-4 text-[15px]">
        Es gibt höchstens eine offene Bestellrunde. Eine neue geht erst, wenn
        keine offen ist.
      </p>

      {offen === 'neu' ? (
        <div className="card mb-5 p-5">
          <RundeFormular onFertig={fertig} />
        </div>
      ) : (
        <Button
          full
          className="mb-5"
          disabled={runden === null || eineOffen}
          onClick={() => setOffen('neu')}
        >
          <Plus className="size-4" /> Bestellrunde eröffnen
        </Button>
      )}

      {meldung && (
        <p
          role={meldung.fehler ? 'alert' : 'status'}
          className={`mb-5 text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
        >
          {meldung.text}
        </p>
      )}

      {runden === null ? (
        <p className="text-ash">Lädt …</p>
      ) : runden.length === 0 ? (
        <p className="text-ash">Noch keine Bestellrunde.</p>
      ) : (
        <ul className="space-y-3">
          {runden.map((r) => {
            const istOffen = r.status === 'offen'
            return (
              <li key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl leading-none font-extrabold uppercase">
                      {r.name}
                    </div>
                    <div className="text-ash mt-1.5 text-[14px]">
                      {istOffen || !r.abgeschlossen_am
                        ? `Bestelldatum ${tagAnzeigen(r.bestelldatum)}`
                        : `abgeschlossen am ${tagAnzeigen(r.abgeschlossen_am)}`}
                    </div>
                    {istOffen && (
                      <button
                        type="button"
                        className="text-brass hover:text-bone mt-1 text-[13px] font-semibold"
                        aria-expanded={offen === r.id}
                        onClick={() => setOffen(offen === r.id ? null : r.id)}
                      >
                        {offen === r.id ? 'Schließen' : 'Bearbeiten'}
                      </button>
                    )}
                    {!istOffen && (
                      <button
                        type="button"
                        className="text-brass hover:text-bone disabled:text-smoke mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold disabled:cursor-not-allowed"
                        disabled={eineOffen}
                        title={
                          eineOffen
                            ? 'Geht erst, wenn keine andere Runde offen ist.'
                            : undefined
                        }
                        onClick={() => void oeffnen(r)}
                      >
                        <RotateCcw className="size-3.5" /> Wieder öffnen
                      </button>
                    )}
                  </div>
                  <Markierung ton={istOffen ? 'patina' : 'neutral'}>
                    {r.status}
                  </Markierung>
                </div>
                {!istOffen && (
                  <div className="mt-4">
                    <SammelbestellungDownload runde={r.id} klein />
                  </div>
                )}
                {offen === r.id && (
                  <div className="border-line/60 mt-4 border-t pt-4">
                    <RundeFormular runde={r} onFertig={fertig} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function RundeFormular({
  runde,
  onFertig,
}: {
  runde?: Bestellrunde
  onFertig: (meldung: string | null) => void | Promise<void>
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const daten = {
      name: String(form.get('name') ?? ''),
      bestelldatum: tagFuerPocketBase(String(form.get('bestelldatum') ?? '')),
    }
    setFehler(null)
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      if (runde) await pb.collection('bestellrunden').update(runde.id, daten)
      else await pb.collection('bestellrunden').create(daten)
      await onFertig(
        runde ? `${daten.name} gespeichert.` : `${daten.name} eröffnet.`,
      )
    } catch (err) {
      setFehler(
        fehlertext(err, 'Die Bestellrunde konnte nicht gespeichert werden.'),
      )
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={speichern}>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Name</span>
        <input
          className="field"
          name="name"
          maxLength={100}
          required
          defaultValue={runde?.name}
          placeholder="z. B. Winter 2026"
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Bestelldatum</span>
        <input
          className="field"
          name="bestelldatum"
          type="date"
          required
          defaultValue={runde ? tagAus(runde.bestelldatum) : ''}
        />
        <span className="text-smoke mt-1 block text-xs">
          Nur eine Ansage für die Mitglieder. Die Runde schließt erst, wenn ein
          Admin sie abschließt.
        </span>
      </label>
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={laeuft} className="flex-1">
          {runde ? 'Speichern' : 'Eröffnen'}
        </Button>
        <button
          type="button"
          className="text-ash hover:text-bone px-3 font-semibold"
          onClick={() => onFertig(null)}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
