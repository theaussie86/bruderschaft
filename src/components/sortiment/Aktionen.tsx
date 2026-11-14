import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { SortimentCollection } from '@/lib/sortiment'
import { fehlertext } from '@/lib/geburtstag'
import {
  artikelKopieren,
  sichtbarkeitSetzen,
  sortimentLoeschen,
} from '@/lib/sortiment'

const KNOPF =
  'text-ash hover:text-bone inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold disabled:opacity-40'

// Ausblenden oder Einblenden, Löschen mit Rückfrage und bei Artikeln
// Kopieren. Was schon bestellt wurde, lässt sich nur ausblenden; die Meldung
// dazu kommt von PocketBase.
export function Aktionen({
  collection,
  eintrag,
  onGeaendert,
  onFehler,
}: {
  collection: SortimentCollection
  eintrag: { id: string; name: string; ausgeblendet: boolean }
  onGeaendert: (meldung?: string) => Promise<void> | void
  onFehler: (text: string) => void
}) {
  const [laeuft, setLaeuft] = useState(false)

  async function ausfuehren(
    aktion: () => Promise<unknown>,
    fehler: string,
    meldung?: string,
  ) {
    setLaeuft(true)
    try {
      await aktion()
      await onGeaendert(meldung)
    } catch (err) {
      onFehler(fehlertext(err, fehler))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-4">
      <button
        type="button"
        className={KNOPF}
        disabled={laeuft}
        onClick={() =>
          ausfuehren(
            () =>
              sichtbarkeitSetzen(collection, eintrag.id, !eintrag.ausgeblendet),
            'Die Sichtbarkeit konnte nicht geändert werden.',
          )
        }
      >
        {eintrag.ausgeblendet ? (
          <>
            <Eye className="size-3.5" /> Einblenden
          </>
        ) : (
          <>
            <EyeOff className="size-3.5" /> Ausblenden
          </>
        )}
      </button>
      {collection === 'artikel' && (
        <button
          type="button"
          className={KNOPF}
          disabled={laeuft}
          onClick={() =>
            ausfuehren(
              () => artikelKopieren(eintrag.id),
              'Der Artikel konnte nicht kopiert werden.',
              `${eintrag.name} kopiert.`,
            )
          }
        >
          <Copy className="size-3.5" /> Kopieren
        </button>
      )}
      <button
        type="button"
        className={`${KNOPF} hover:text-rust-hi`}
        disabled={laeuft}
        onClick={() => {
          if (!window.confirm(`"${eintrag.name}" wirklich löschen?`)) return
          void ausfuehren(
            () => sortimentLoeschen(collection, eintrag.id),
            `"${eintrag.name}" konnte nicht gelöscht werden.`,
            `${eintrag.name} gelöscht.`,
          )
        }}
      >
        <Trash2 className="size-3.5" /> Löschen
      </button>
    </div>
  )
}
