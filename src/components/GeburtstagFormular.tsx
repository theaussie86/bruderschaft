import { useState } from 'react'

import { Button } from '@/components/Button'
import { fehlertext, heute } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Geburtstag mit Jahr setzen oder ändern. Wer welchen Geburtstag ändern darf,
// prüft PocketBase (ADR 0002): jedes Mitglied seinen eigenen, Admins alle.
export function GeburtstagFormular({
  mitgliedId,
  wert,
  knopf = 'Speichern',
  hinweis,
  onGespeichert,
}: {
  mitgliedId: string
  wert: string
  knopf?: string
  hinweis?: string
  onGespeichert: (geburtstag: string) => void | Promise<void>
}) {
  const [entwurf, setEntwurf] = useState(wert)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!entwurf) return
    setFehler(null)
    setLaeuft(true)
    try {
      await createBrowserPocketBase()
        .collection('mitglieder')
        .update(mitgliedId, { geburtstag: entwurf })
      await onGespeichert(entwurf)
    } catch (err) {
      setFehler(
        fehlertext(err, 'Der Geburtstag konnte nicht gespeichert werden.'),
      )
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={speichern}>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Geburtsdatum</span>
        <input
          className="field"
          type="date"
          name="geburtstag"
          required
          max={heute()}
          value={entwurf}
          onChange={(e) => setEntwurf(e.target.value)}
        />
      </label>
      {hinweis && <p className="text-smoke text-[13px]">{hinweis}</p>}
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <Button full type="submit" disabled={laeuft || !entwurf}>
        {knopf}
      </Button>
    </form>
  )
}
