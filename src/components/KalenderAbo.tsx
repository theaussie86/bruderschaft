import { useEffect, useState } from 'react'

import { Button } from '@/components/Button'
import { ladeEinstellungen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { aboLink } from '@/lib/kalender-abo'

// Der gemeinsame Abo-Link zum Kopieren (Profil). Kalender-Apps holen darüber
// alle Termine und Geburtstage.
export function KalenderAbo() {
  const [link, setLink] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<{
    text: string
    fehler: boolean
  } | null>(null)

  useEffect(() => {
    ladeEinstellungen()
      .then((e) => {
        if (e?.kalender_token)
          setLink(aboLink(window.location.origin, e.kalender_token))
        else setMeldung({ text: 'Kein Abo-Link vorhanden.', fehler: true })
      })
      .catch((err: unknown) =>
        setMeldung({
          text: fehlertext(err, 'Der Abo-Link konnte nicht geladen werden.'),
          fehler: true,
        }),
      )
  }, [])

  async function kopieren() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setMeldung({ text: 'Link kopiert.', fehler: false })
    } catch {
      setMeldung({
        text: 'Kopieren ging nicht. Markiere den Link und kopiere ihn selbst.',
        fehler: true,
      })
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-ash text-[14px]">
        Füge diesen Link in deiner Kalender-App als Abo hinzu. Dann stehen alle
        Termine und Geburtstage in deinem Kalender. Gib ihn nicht weiter.
      </p>
      {link && (
        <input
          className="field text-[14px]"
          readOnly
          value={link}
          aria-label="Abo-Link"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      {meldung && (
        <p
          role={meldung.fehler ? 'alert' : 'status'}
          className={`text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
        >
          {meldung.text}
        </p>
      )}
      <Button full type="button" disabled={!link} onClick={kopieren}>
        Link kopieren
      </Button>
    </div>
  )
}
