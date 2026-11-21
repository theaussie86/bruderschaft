import { useState } from 'react'

import type { Anschrift } from '@/lib/anschrift'
import { ANSCHRIFT_FELDER } from '@/lib/anschrift'
import { Button } from '@/components/Button'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Vollen Namen und Anschrift setzen oder ändern, alle Felder freiwillig. Wer
// welche Anschrift ändern darf, prüft PocketBase (ADR 0002): jedes Mitglied
// seine eigene, Admins alle.
export function AnschriftFormular({
  mitgliedId,
  wert,
  hinweis,
  onGespeichert,
}: {
  mitgliedId: string
  wert: Anschrift
  hinweis?: string
  onGespeichert: () => void | Promise<void>
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const text = (feld: keyof Anschrift) => String(form.get(feld) ?? '').trim()
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('mitglieder')
        .update(
          mitgliedId,
          Object.fromEntries(ANSCHRIFT_FELDER.map((f) => [f, text(f)])),
        )
      await onGespeichert()
    } catch (err) {
      setFehler(
        fehlertext(err, 'Name und Anschrift konnten nicht gespeichert werden.'),
      )
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={speichern}>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Vor- und Nachname</span>
        <input
          className="field"
          name="voller_name"
          autoComplete="name"
          maxLength={150}
          defaultValue={wert.voller_name}
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">
          Straße und Hausnummer
        </span>
        <input
          className="field"
          name="strasse"
          autoComplete="street-address"
          maxLength={150}
          defaultValue={wert.strasse}
        />
      </label>
      <div className="flex gap-3">
        <label className="block w-28 shrink-0">
          <span className="text-ash mb-1.5 block text-sm">PLZ</span>
          <input
            className="field"
            name="plz"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={10}
            defaultValue={wert.plz}
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="text-ash mb-1.5 block text-sm">Ort</span>
          <input
            className="field"
            name="ort"
            autoComplete="address-level2"
            maxLength={100}
            defaultValue={wert.ort}
          />
        </label>
      </div>
      {hinweis && <p className="text-smoke text-[13px]">{hinweis}</p>}
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <Button full type="submit" disabled={laeuft}>
        Speichern
      </Button>
    </form>
  )
}
