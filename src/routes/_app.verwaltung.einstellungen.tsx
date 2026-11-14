import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import type { Einstellungen } from '@/lib/bestellung'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { ladeEinstellungen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { aboLink } from '@/lib/kalender-abo'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

// Verwaltung > Einstellungen: der Zahlungshinweis, den Mitglieder unter ihrem
// Auftrag sehen, sobald die Runde abgeschlossen ist, und der Link des
// Kalender-Abos. Nur Admins ändern beides (ADR 0002).
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
      {einstellungen && (
        <KalenderAboErneuern
          token={einstellungen.kalender_token}
          onErneuert={(kalender_token) =>
            setEinstellungen({ ...einstellungen, kalender_token })
          }
        />
      )}
    </>
  )
}

// Ein neuer Link macht den alten sofort ungültig. Alle Mitglieder müssen das
// Abo dann neu eintragen, deshalb fragt die Seite vorher nach.
function KalenderAboErneuern({
  token,
  onErneuert,
}: {
  token: string
  onErneuert: (token: string) => void
}) {
  const [meldung, setMeldung] = useState<Meldung>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function erneuern() {
    if (
      !window.confirm(
        'Neuen Link erzeugen? Der alte gilt sofort nicht mehr, alle Mitglieder müssen das Abo neu eintragen.',
      )
    )
      return
    setMeldung(null)
    setLaeuft(true)
    try {
      const { kalender_token } = await createBrowserPocketBase().send<{
        kalender_token: string
      }>('/api/club/kalender-abo/erneuern', { method: 'POST' })
      onErneuert(kalender_token)
      setMeldung({ text: 'Neuer Link erzeugt.', fehler: false })
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Der Link konnte nicht erneuert werden.'),
        fehler: true,
      })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <section className="mt-10 space-y-3" aria-label="Kalender-Abo">
      <span className="eyebrow block">Kalender-Abo</span>
      {token && (
        <input
          className="field text-[14px]"
          readOnly
          value={aboLink(window.location.origin, token)}
          aria-label="Abo-Link"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      <span className="text-ash block text-[13px]">
        Gelangt der Link an Fremde, erzeuge einen neuen. Der alte gilt dann
        sofort nicht mehr.
      </span>
      {meldung && (
        <p
          role={meldung.fehler ? 'alert' : 'status'}
          className={`text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
        >
          {meldung.text}
        </p>
      )}
      <Button type="button" disabled={laeuft} onClick={erneuern}>
        Link erneuern
      </Button>
    </section>
  )
}
