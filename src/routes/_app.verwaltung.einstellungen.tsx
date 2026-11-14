import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import type { Einstellungen } from '@/lib/bestellung'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { ladeEinstellungen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Verwaltung > Einstellungen: der Zahlungshinweis, den Mitglieder unter ihrem
// Auftrag sehen, sobald die Runde abgeschlossen ist. Nur Admins ändern ihn
// (ADR 0002).
export const Route = createFileRoute('/_app/verwaltung/einstellungen')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin && !context.mitglied.support)
      throw redirect({ to: '/bestellen' })
  },
  component: EinstellungenSeite,
})

type Meldung = { text: string; fehler: boolean } | null

function EinstellungenSeite() {
  const [einstellungen, setEinstellungen] = useState<
    Einstellungen | null | undefined
  >(undefined)
  const [hinweis, setHinweis] = useState('')
  const [meldung, setMeldung] = useState<Meldung>(null)
  const [laeuft, setLaeuft] = useState(false)

  useEffect(() => {
    ladeEinstellungen()
      .then((e) => {
        setEinstellungen(e)
        setHinweis(e?.zahlungshinweis ?? '')
      })
      .catch((err: unknown) =>
        setMeldung({
          text: fehlertext(
            err,
            'Die Einstellungen konnten nicht geladen werden.',
          ),
          fehler: true,
        }),
      )
  }, [])

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!einstellungen) return
    setMeldung(null)
    setLaeuft(true)
    try {
      const neu = await createBrowserPocketBase()
        .collection('einstellungen')
        .update<Einstellungen>(einstellungen.id, { zahlungshinweis: hinweis })
      setEinstellungen(neu)
      setMeldung({ text: 'Zahlungshinweis gespeichert.', fehler: false })
    } catch (err) {
      setMeldung({
        text: fehlertext(
          err,
          'Der Zahlungshinweis konnte nicht gespeichert werden.',
        ),
        fehler: true,
      })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <>
      <PageHeader title="Einstellungen" />
      {einstellungen === undefined && !meldung ? (
        <p className="text-ash">Lädt …</p>
      ) : (
        <form className="space-y-3" onSubmit={speichern}>
          <label className="block">
            <span className="eyebrow mb-2 block">Zahlungshinweis</span>
            <textarea
              className="field min-h-32 leading-relaxed"
              maxLength={2000}
              value={hinweis}
              disabled={!einstellungen}
              placeholder="Bankverbindung und Verwendungszweck, z. B. Name und Runde"
              onChange={(e) => setHinweis(e.target.value)}
            />
            <span className="text-ash mt-1.5 block text-[13px]">
              Sehen Mitglieder unter ihrem Auftrag, sobald die Runde
              abgeschlossen ist. Änderung wirkt sofort.
            </span>
          </label>
          {meldung && (
            <p
              role={meldung.fehler ? 'alert' : 'status'}
              className={`text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
            >
              {meldung.text}
            </p>
          )}
          <Button type="submit" disabled={laeuft || !einstellungen}>
            Speichern
          </Button>
        </form>
      )}
    </>
  )
}
