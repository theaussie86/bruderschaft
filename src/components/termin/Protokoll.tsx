import { FilePlus, FileText, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import type { Termin } from '@/lib/termine'
import { fehlertext } from '@/lib/geburtstag'
import {
  protokollBezeichnung,
  protokollDateiLoeschen,
  protokollHochladen,
  protokollPfad,
} from '@/lib/protokoll'

// Das Protokoll eines Stammtischs: alle Mitglieder öffnen die Dateien, Admins
// laden weitere hoch und löschen einzelne.
export function Protokoll({
  termin,
  admin,
  onGeaendert,
}: {
  termin: Termin
  admin: boolean
  onGeaendert: (t: Termin) => void
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [loeschenFragen, setLoeschenFragen] = useState<string | null>(null)
  const eingabe = useRef<HTMLInputElement>(null)
  const dateien = termin.protokoll ?? []

  if (!admin && dateien.length === 0) return null

  async function ausfuehren(aktion: () => Promise<Termin>, meldung: string) {
    setFehler(null)
    setLaeuft(true)
    try {
      onGeaendert(await aktion())
    } catch (err) {
      setFehler(fehlertext(err, meldung))
    } finally {
      setLaeuft(false)
      setLoeschenFragen(null)
    }
  }

  return (
    <section className="mt-8" aria-label="Protokoll">
      <h2 className="eyebrow mb-3">Protokoll</h2>

      {fehler && (
        <p role="alert" className="text-rust-hi mb-3 text-sm">
          {fehler}
        </p>
      )}

      {dateien.length === 0 ? (
        <div className="card text-ash p-5 text-[15px]">
          Zu diesem Stammtisch gibt es noch kein Protokoll.
        </div>
      ) : (
        <ul className="card divide-line/60 divide-y">
          {dateien.map((d, i) => (
            <li key={d} className="flex items-center gap-2 px-4 py-1.5">
              <a
                href={protokollPfad(termin.id, d)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brass flex min-h-11 flex-1 items-center gap-3 font-semibold"
              >
                <FileText className="text-brass size-5 shrink-0" />
                {protokollBezeichnung(d, i)}
              </a>
              {admin &&
                (loeschenFragen === d ? (
                  <span className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      disabled={laeuft}
                      className="text-rust-hi min-h-11 px-2 font-semibold"
                      onClick={() =>
                        void ausfuehren(
                          () => protokollDateiLoeschen(termin.id, d),
                          'Die Datei konnte nicht gelöscht werden.',
                        )
                      }
                    >
                      Löschen
                    </button>
                    <button
                      type="button"
                      className="text-ash hover:text-bone min-h-11 px-2 font-semibold"
                      onClick={() => setLoeschenFragen(null)}
                    >
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={laeuft}
                    aria-label={`${protokollBezeichnung(d, i)} löschen`}
                    className="text-ash hover:text-rust-hi flex size-11 items-center justify-center"
                    onClick={() => setLoeschenFragen(d)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <>
          <input
            ref={eingabe}
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const gewaehlt = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (gewaehlt.length === 0) return
              void ausfuehren(
                () => protokollHochladen(termin.id, gewaehlt),
                'Das Protokoll konnte nicht hochgeladen werden.',
              )
            }}
          />
          <button
            type="button"
            disabled={laeuft}
            onClick={() => eingabe.current?.click()}
            className="border-brass/50 text-brass hover:bg-brass/5 mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-[15px] font-semibold disabled:opacity-60"
          >
            <FilePlus className="size-5" />
            {laeuft ? 'Lädt hoch …' : 'Dateien hochladen (PDF oder Foto)'}
          </button>
        </>
      )}
    </section>
  )
}
