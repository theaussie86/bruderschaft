import { EyeOff, Plus } from 'lucide-react'
import { useState } from 'react'

import type { Motiv } from '@/lib/sortiment'
import { Button } from '@/components/Button'
import { Markierung } from '@/components/Markierung'
import { Pfeile } from '@/components/Pfeile'
import { Vorschau } from '@/components/Vorschau'
import { Aktionen } from '@/components/sortiment/Aktionen'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { naechsteSortierung } from '@/lib/reihenfolge'

// Die gemeinsame Motivliste für alle Artikel: anlegen, Name und Bild ändern,
// Reihenfolge bestimmen, ausblenden und nie Bestelltes löschen.
export function Motive({
  motive,
  onVerschieben,
  onGeaendert,
  onFehler,
}: {
  motive: Array<Motiv>
  onVerschieben: (id: string, richtung: -1 | 1) => void
  onGeaendert: () => Promise<void>
  onFehler: (text: string) => void
}) {
  // 'neu' für ein neues Motiv, sonst die ID des Motivs in Bearbeitung.
  const [offen, setOffen] = useState<string | null>(null)

  async function fertig() {
    setOffen(null)
    await onGeaendert()
  }

  return (
    <section className="mt-8" aria-labelledby="motive-titel">
      <h2 id="motive-titel" className="eyebrow mb-3">
        Motive
      </h2>
      <p className="text-ash mb-3 text-[13px]">
        Eine gemeinsame Liste für alle Artikel. Welche Motive an einer
        Druckstelle wählbar sind, legst du bei der Druckstelle fest.
      </p>
      {motive.length === 0 && (
        <p className="text-smoke mb-3 text-sm">Noch keine Motive angelegt.</p>
      )}
      <ul className="space-y-3">
        {motive.map((m, i) => (
          <li
            key={m.id}
            className={`card p-4 ${m.ausgeblendet ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3">
              <Pfeile
                name={m.name}
                oben={i > 0}
                unten={i < motive.length - 1}
                onVerschieben={(r) => onVerschieben(m.id, r)}
              />
              <Vorschau eintrag={m} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-semibold">
                {m.nummer && (
                  <span className="text-brass tabular-nums">
                    Nr. {m.nummer}
                  </span>
                )}
                {m.name}
                {m.ausgeblendet && (
                  <Markierung ton="neutral">
                    <EyeOff className="size-3" /> ausgeblendet
                  </Markierung>
                )}
              </div>
              <button
                type="button"
                className="text-brass hover:text-bone text-[13px] font-semibold"
                aria-expanded={offen === m.id}
                onClick={() => setOffen(offen === m.id ? null : m.id)}
              >
                {offen === m.id ? 'Schließen' : 'Ändern'}
              </button>
            </div>
            {offen === m.id && (
              <>
                <MotivFormular
                  motiv={m}
                  sortierung={m.sortierung}
                  onFertig={fertig}
                  onFehler={onFehler}
                />
                <Aktionen
                  collection="motive"
                  eintrag={m}
                  onGeaendert={fertig}
                  onFehler={onFehler}
                />
              </>
            )}
          </li>
        ))}
      </ul>
      {offen === 'neu' ? (
        <div className="card mt-3 p-4">
          <MotivFormular
            sortierung={naechsteSortierung(motive)}
            onFertig={fertig}
            onFehler={onFehler}
          />
        </div>
      ) : (
        <Button full className="mt-3" onClick={() => setOffen('neu')}>
          <Plus className="size-4" /> Motiv anlegen
        </Button>
      )}
    </section>
  )
}

function MotivFormular({
  motiv,
  sortierung,
  onFertig,
  onFehler,
}: {
  motiv?: Motiv
  sortierung: number
  onFertig: () => Promise<void>
  onFehler: (text: string) => void
}) {
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('sortierung', String(sortierung))
    const bild = form.get('bild')
    if (!(bild instanceof File) || bild.size === 0) form.delete('bild')

    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      if (motiv) await pb.collection('motive').update(motiv.id, form)
      else await pb.collection('motive').create(form)
      await onFertig()
    } catch (err) {
      onFehler(fehlertext(err, 'Das Motiv konnte nicht gespeichert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={speichern}>
      <label className="block">
        <span className="text-ash mb-1 block text-xs">Name</span>
        <input
          className="field"
          name="name"
          maxLength={100}
          required
          defaultValue={motiv?.name}
          placeholder="z. B. Brotherhood"
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1 block text-xs">
          Nummer (optional, steht im Ausdruck für den Drucker)
        </span>
        <input
          className="field"
          name="nummer"
          maxLength={20}
          defaultValue={motiv?.nummer}
          placeholder="z. B. 12"
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1 block text-xs">
          {motiv?.bild ? 'Bild ersetzen (optional)' : 'Bild (optional)'}
        </span>
        <input
          className="field"
          name="bild"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      <Button type="submit" disabled={laeuft}>
        {motiv ? 'Speichern' : 'Anlegen'}
      </Button>
    </form>
  )
}
