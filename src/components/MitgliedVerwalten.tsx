import { useState } from 'react'

import { Button } from '@/components/Button'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Aktionen eines Admins an einem Mitglied: Admin-Recht, Sperre, Mail,
// Löschen. Was erlaubt ist (z. B. dass immer ein Admin bleibt), prüft
// PocketBase (ADR 0002); die Seite zeigt nur dessen Meldung.
export type VerwaltetesMitglied = {
  id: string
  name: string
  email: string
  admin: boolean
  gesperrt: boolean
}

// PocketBase verweigert das Löschen, solange Aufträge oder Bilder auf das
// Mitglied zeigen, und meldet das ohne Feldfehler.
const LOESCHEN_VERWEIGERT =
  'Das Mitglied hat schon Aufträge oder Bilder und lässt sich nicht löschen. Sperre es stattdessen.'

export function MitgliedVerwalten({
  mitglied,
  onGeaendert,
}: {
  mitglied: VerwaltetesMitglied
  onGeaendert: (meldung: string) => void | Promise<void>
}) {
  const [email, setEmail] = useState(mitglied.email)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [loeschenFragen, setLoeschenFragen] = useState(false)

  async function ausfuehren(
    aktion: () => Promise<unknown>,
    erfolg: string,
    standardFehler: string,
  ) {
    setFehler(null)
    setLaeuft(true)
    try {
      await aktion()
      await onGeaendert(erfolg)
    } catch (err) {
      setFehler(fehlertext(err, standardFehler))
    } finally {
      setLaeuft(false)
    }
  }

  const mitglieder = () => createBrowserPocketBase().collection('mitglieder')

  function aendern(felder: Partial<VerwaltetesMitglied>, erfolg: string) {
    return ausfuehren(
      () => mitglieder().update(mitglied.id, felder),
      erfolg,
      'Die Änderung konnte nicht gespeichert werden.',
    )
  }

  function mailSpeichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (email === mitglied.email) return
    void aendern({ email }, `Mail von ${mitglied.name} geändert.`)
  }

  async function loeschen() {
    setFehler(null)
    setLaeuft(true)
    try {
      await mitglieder().delete(mitglied.id)
      await onGeaendert(`${mitglied.name} gelöscht.`)
    } catch (err) {
      const status = (err as { status?: number }).status
      const data = (err as { response?: { data?: object } }).response?.data
      setFehler(
        status === 400 && Object.keys(data ?? {}).length === 0
          ? LOESCHEN_VERWEIGERT
          : fehlertext(err, 'Das Mitglied konnte nicht gelöscht werden.'),
      )
      setLoeschenFragen(false)
    } finally {
      setLaeuft(false)
    }
  }

  const knopf =
    'border-line text-bone hover:border-ash min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={mailSpeichern}>
        <label className="block">
          <span className="text-ash mb-1.5 block text-sm">E-Mail</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <p className="text-smoke text-[13px]">
          Die neue Mail gilt sofort für die Anmeldung, ohne Bestätigungsmail.
        </p>
        <Button
          type="submit"
          disabled={laeuft || email === mitglied.email}
          className="min-h-11"
        >
          Mail speichern
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={knopf}
          disabled={laeuft}
          onClick={() =>
            aendern(
              { admin: !mitglied.admin },
              mitglied.admin
                ? `${mitglied.name} ist kein Admin mehr.`
                : `${mitglied.name} ist jetzt Admin.`,
            )
          }
        >
          {mitglied.admin ? 'Admin-Recht entziehen' : 'Zum Admin machen'}
        </button>
        <button
          type="button"
          className={knopf}
          disabled={laeuft}
          onClick={() =>
            aendern(
              { gesperrt: !mitglied.gesperrt },
              mitglied.gesperrt
                ? `Sperre von ${mitglied.name} aufgehoben.`
                : `${mitglied.name} ist gesperrt und kann sich nicht mehr anmelden.`,
            )
          }
        >
          {mitglied.gesperrt ? 'Sperre aufheben' : 'Sperren (Austritt)'}
        </button>
        {!loeschenFragen && (
          <button
            type="button"
            className={`${knopf} text-rust-hi`}
            disabled={laeuft}
            onClick={() => setLoeschenFragen(true)}
          >
            Löschen
          </button>
        )}
      </div>

      {loeschenFragen && (
        <div className="border-rust/40 space-y-3 rounded-xl border p-4">
          <p className="text-sm">
            {mitglied.name} endgültig löschen? Das geht nur bei falsch
            angelegten Mitgliedern ohne Aufträge und Bilder.
          </p>
          <div className="flex gap-3">
            <Button type="button" disabled={laeuft} onClick={loeschen}>
              Endgültig löschen
            </Button>
            <button
              type="button"
              className="text-ash hover:text-bone px-3 font-semibold"
              onClick={() => setLoeschenFragen(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
    </div>
  )
}
